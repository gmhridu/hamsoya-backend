import ejs from 'ejs';
import fs from 'fs/promises';
import nodemailer from 'nodemailer';
import path from 'path';
import { emailPerformanceMonitor } from './email-performance-monitor';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  service: string;
  user: string;
  password: string;
}

// Cached transporter and template cache for performance
let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfig: EmailConfig | null = null;
const templateCache = new Map<string, string>();

// Get email configuration from environment
const getEmailConfig = (env?: any): EmailConfig => {
  const config = {
    host: env?.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(env?.SMTP_PORT || process.env.SMTP_PORT || '465'),
    service: env?.SMTP_SERVICE || process.env.SMTP_SERVICE || 'gmail',
    user: env?.SMTP_USER || process.env.SMTP_USER,
    password: env?.SMTP_PASSWORD || process.env.SMTP_PASSWORD,
  };

  if (!config.user || !config.password) {
    throw new Error('SMTP_USER and SMTP_PASSWORD environment variables are required');
  }

  return config;
};

// Create or reuse transporter for better performance
const getTransporter = (env?: any): nodemailer.Transporter => {
  const config = getEmailConfig(env);

  // Check if we can reuse the cached transporter
  if (
    cachedTransporter &&
    cachedConfig &&
    cachedConfig.user === config.user &&
    cachedConfig.password === config.password &&
    cachedConfig.host === config.host &&
    cachedConfig.port === config.port
  ) {
    return cachedTransporter;
  }

  // Create new transporter with optimized and reliable settings
  // Use service-based configuration if service is specified, otherwise use host/port
  const transportConfig: any = {
    auth: {
      user: config.user,
      pass: config.password,
    },
    // Optimized connection pooling for reliable email delivery
    pool: true, // Use connection pooling
    maxConnections: 3, // Reduced for Gmail stability
    maxMessages: 50, // Reduced for Gmail stability
    rateDelta: 1000, // 1 second between rate limit checks
    rateLimit: 5, // Max 5 messages per second for Gmail limits

    // Balanced timeout settings for reliable email delivery
    connectionTimeout: 15000, // 15 seconds for connection (increased for reliability)
    greetingTimeout: 10000, // 10 seconds for greeting (increased for reliability)
    socketTimeout: 20000, // 20 seconds for socket operations (increased for reliability)

    // Connection reliability improvements
    keepAlive: true,
    maxIdleTime: 30000, // Keep connections alive for 30 seconds

    // Security and performance optimizations
    disableFileAccess: true,
    disableUrlAccess: true,

    // Reduced retry logic for faster failure detection
    retry: {
      attempts: 2, // Reduced from 3 to 2 for faster failure
      delay: 500, // Reduced from 1000ms to 500ms for faster retry
    },
  };

  // Add service-specific or host/port configuration
  if (config.service && config.service !== 'custom') {
    // Use service-based configuration (e.g., 'gmail', 'outlook', etc.)
    transportConfig.service = config.service;
  } else {
    // Use manual host/port configuration
    transportConfig.host = config.host;
    transportConfig.port = config.port;
    transportConfig.secure = config.port === 465;
  }

  cachedTransporter = nodemailer.createTransport(transportConfig);

  // Verify SMTP connection on first use to catch configuration issues early
  cachedTransporter.verify(error => {
    if (error) {
      console.error('❌ SMTP connection verification failed:', error);
      // Don't throw here, let individual sends handle the error
    } else {
      console.log('✅ SMTP connection verified successfully');
    }
  });

  cachedConfig = config;
  return cachedTransporter!; // We know it's not null at this point
};

// Template rendering function using EJS with improved path resolution
const renderEmailTemplate = async (templateName: string, data: any): Promise<string> => {
  try {
    // Try multiple possible template paths for better compatibility
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'templates', 'emails', `${templateName}.ejs`),
      path.join(
        process.cwd(),
        'apps',
        'backend',
        'src',
        'templates',
        'emails',
        `${templateName}.ejs`
      ),
      path.join(__dirname, '..', 'templates', 'emails', `${templateName}.ejs`),
      path.join(__dirname, '..', '..', 'templates', 'emails', `${templateName}.ejs`),
    ];

    let templatePath: string | null = null;

    // Find the first existing template path
    for (const possiblePath of possiblePaths) {
      try {
        await fs.access(possiblePath);
        templatePath = possiblePath;
        break;
      } catch {
        // Continue to next path
      }
    }

    if (!templatePath) {
      throw new Error(
        `Email template not found: ${templateName}.ejs. Tried paths: ${possiblePaths.join(', ')}`
      );
    }

    // Check cache first for better performance
    const cacheKey = `${templateName}:${templatePath}`;
    let templateContent = templateCache.get(cacheKey);

    if (!templateContent) {
      try {
        // Use async file operations for better performance
        templateContent = await fs.readFile(templatePath, 'utf-8');
        templateCache.set(cacheKey, templateContent);
        console.log(`📧 Template loaded and cached: ${templatePath}`);
      } catch (error) {
        console.error(`❌ Failed to read template file: ${templatePath}`, error);
        throw new Error(`Failed to read email template: ${templatePath}`);
      }
    } else {
      console.log(`📧 Template served from cache: ${templateName}`);
    }

    // Render the template with EJS using cached content
    const html = ejs.render(templateContent, {
      ...data,
      process: { env: process.env }, // Make process.env available in templates
    });

    return html;
  } catch (error) {
    console.error(`Error rendering email template ${templateName}:`, error);
    throw new Error(`Failed to render email template: ${templateName}`);
  }
};

// Email sending interface
interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

// Enhanced email sending function with EJS templates, retry logic, and better error handling
export const sendEmailWithEJS = async (options: SendEmailOptions, env?: any): Promise<void> => {
  const startTime = Date.now();
  const maxRetries = 3;
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use cached transporter for better performance
      const transporter = getTransporter(env);
      const config = getEmailConfig(env);

      // Render template with EJS (uses caching) - this should be very fast
      const renderStart = Date.now();
      const html = await renderEmailTemplate(options.template, options.data);
      const renderTime = Date.now() - renderStart;

      // Send email with optimized settings
      const sendStart = Date.now();
      await transporter.sendMail({
        from: `"Hamsoya" <${config.user}>`,
        to: options.to,
        subject: options.subject,
        html,
        // Performance optimizations
        priority: 'high', // High priority for immediate delivery
        encoding: 'utf8',
        // Additional optimizations for faster delivery
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const sendTime = Date.now() - sendStart;
      const totalTime = Date.now() - startTime;

      console.log(
        `✅ Email sent to ${options.to} | Render: ${renderTime}ms | Send: ${sendTime}ms | Total: ${totalTime}ms | Attempt: ${attempt}`
      );

      // Record successful metrics
      emailPerformanceMonitor.recordEmailMetrics({
        timestamp: Date.now(),
        email: options.to,
        templateName: options.template,
        renderTime,
        sendTime,
        totalTime,
        success: true,
        attempt,
        fallbackUsed: false,
      });

      return; // Success, exit retry loop
    } catch (error) {
      lastError = error as Error;
      const totalTime = Date.now() - startTime;

      // Log specific error types for better debugging
      if (error instanceof Error) {
        if (
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('Greeting never received')
        ) {
          console.error(
            `❌ SMTP timeout error on attempt ${attempt}/${maxRetries} after ${totalTime}ms:`,
            error.message
          );
        } else if (error.message.includes('ECONNREFUSED')) {
          console.error(
            `❌ SMTP connection refused on attempt ${attempt}/${maxRetries} after ${totalTime}ms:`,
            error.message
          );
        } else {
          console.error(
            `❌ SMTP error on attempt ${attempt}/${maxRetries} after ${totalTime}ms:`,
            error.message
          );
        }
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`❌ All ${maxRetries} email sending attempts failed after ${totalTime}ms`);
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 second delay
      console.log(`🔄 Retrying email send in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  const totalTime = Date.now() - startTime;
  console.error(
    `❌ Failed to send email after ${totalTime}ms and ${maxRetries} attempts:`,
    lastError
  );

  // Record failed metrics
  emailPerformanceMonitor.recordEmailMetrics({
    timestamp: Date.now(),
    email: options.to,
    templateName: options.template,
    renderTime: 0,
    sendTime: 0,
    totalTime,
    success: false,
    error: lastError.message,
    attempt: maxRetries,
    fallbackUsed: false,
  });

  throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`);
};

// Enhanced OTP verification email with new template
export const sendEnhancedOTPVerificationEmailEJS = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  await sendEmailWithEJS(
    {
      to: email,
      subject: 'Verify Your Email - Hamsoya',
      template: 'otp-verification',
      data: { name, otp },
    },
    env
  );
};

// Enhanced password reset email with new template
export const sendEnhancedPasswordResetEmailEJS = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  await sendEmailWithEJS(
    {
      to: email,
      subject: 'Password Reset Request - Hamsoya',
      template: 'password-reset',
      data: { name, otp },
    },
    env
  );
};

// Enhanced welcome email with new template
export const sendEnhancedWelcomeEmailEJS = async (
  email: string,
  name: string,
  env?: any
): Promise<void> => {
  await sendEmailWithEJS(
    {
      to: email,
      subject: 'Welcome to Hamsoya! 🎉',
      template: 'welcome',
      data: { name },
    },
    env
  );
};

// Test email generation function
export const generateTestEmailEJS = async (
  templateName: string,
  testData: any
): Promise<string> => {
  try {
    return await renderEmailTemplate(templateName, testData);
  } catch (error) {
    console.error('Error generating test email:', error);
    throw error;
  }
};

// Email template validation with improved path resolution
export const validateEmailTemplate = async (templateName: string): Promise<boolean> => {
  try {
    // Try multiple possible template paths
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'templates', 'emails', `${templateName}.ejs`),
      path.join(
        process.cwd(),
        'apps',
        'backend',
        'src',
        'templates',
        'emails',
        `${templateName}.ejs`
      ),
      path.join(__dirname, '..', 'templates', 'emails', `${templateName}.ejs`),
      path.join(__dirname, '..', '..', 'templates', 'emails', `${templateName}.ejs`),
    ];

    for (const templatePath of possiblePaths) {
      try {
        await fs.access(templatePath);
        console.log(`✅ Template found: ${templatePath}`);
        return true;
      } catch {
        // Continue to next path
      }
    }

    console.warn(`⚠️ Template not found: ${templateName}.ejs`);
    return false;
  } catch (error) {
    console.error('Error validating email template:', error);
    return false;
  }
};

// List available email templates
export const listEmailTemplates = async (): Promise<string[]> => {
  try {
    const templatesDir = path.join(process.cwd(), 'src', 'templates', 'emails');

    try {
      const files = await fs.readdir(templatesDir);
      return files.filter(file => file.endsWith('.ejs')).map(file => file.replace('.ejs', ''));
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Error listing email templates:', error);
    return [];
  }
};

// Performance monitoring for email sending
export const sendEmailWithTiming = async (
  options: SendEmailOptions,
  env?: any
): Promise<{ success: boolean; duration: number }> => {
  const startTime = Date.now();

  try {
    await sendEmailWithEJS(options, env);
    const duration = Date.now() - startTime;

    console.log(`📊 Email sent in ${duration}ms`);

    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`📊 Email failed after ${duration}ms:`, error);

    return { success: false, duration };
  }
};
