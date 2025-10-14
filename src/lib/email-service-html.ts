import fs from 'fs/promises';
import nodemailer from 'nodemailer';
import path from 'path';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  service: string;
  user: string;
  password: string;
}

// Cached transporter and configuration for performance
let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfig: EmailConfig | null = null;
let cachedHtmlTemplate: string | null = null;

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
  return cachedTransporter!;
};

// Load and cache HTML template
const loadHtmlTemplate = async (): Promise<string> => {
  if (cachedHtmlTemplate) {
    return cachedHtmlTemplate;
  }

  try {
    // Try multiple possible paths for the HTML template
    const possiblePaths = [
      path.join(process.cwd(), 'email-template-preview.html'),
      path.join(process.cwd(), 'apps', 'backend', 'email-template-preview.html'),
      path.resolve('./email-template-preview.html'),
      path.resolve('./apps/backend/email-template-preview.html'),
      path.resolve('../email-template-preview.html'),
    ];

    let templateContent: string | null = null;
    let templatePath: string | null = null;

    for (const templatePathCandidate of possiblePaths) {
      try {
        templateContent = await fs.readFile(templatePathCandidate, 'utf-8');
        templatePath = templatePathCandidate;
        break;
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    if (!templateContent || !templatePath) {
      throw new Error('HTML email template not found in any of the expected locations');
    }

    console.log(`✅ HTML email template loaded from: ${templatePath}`);
    cachedHtmlTemplate = templateContent;
    return templateContent;
  } catch (error) {
    console.error('Error loading HTML email template:', error);
    throw new Error('Failed to load HTML email template');
  }
};

// Render HTML template with variable substitution
const renderHtmlTemplate = async (data: { name: string; otp: string }): Promise<string> => {
  try {
    const template = await loadHtmlTemplate();
    const currentYear = new Date().getFullYear();

    // Replace placeholders with actual values
    let html = template
      .replace(/John Doe/g, data.name)
      .replace(/123456/g, data.otp)
      .replace(/\$\{new Date\(\)\.getFullYear\(\)\}/g, currentYear.toString());

    return html;
  } catch (error) {
    console.error('Error rendering HTML email template:', error);
    throw new Error('Failed to render HTML email template');
  }
};

// Email sending interface
interface SendEmailOptions {
  to: string;
  subject: string;
  data: { name: string; otp: string };
}

// Enhanced email sending function with HTML templates, retry logic, and better error handling
export const sendEmailWithHTML = async (options: SendEmailOptions, env?: any): Promise<void> => {
  const startTime = Date.now();
  const maxRetries = 3;
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use cached transporter for better performance
      const transporter = getTransporter(env);
      const config = getEmailConfig(env);

      // Render template with HTML (uses caching) - this should be very fast
      const renderStart = Date.now();
      const html = await renderHtmlTemplate(options.data);
      const renderTime = Date.now() - renderStart;

      // Send email with optimized settings and enhanced logging
      const sendStart = Date.now();
      const emailOptions = {
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
        // Enhanced headers for better deliverability
        headers: {
          'X-Mailer': 'Hamsoya Email System',
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Return-Path': config.user,
          'Reply-To': config.user,
          'List-Unsubscribe': '<mailto:unsubscribe@hamsoya.com>',
          'X-Entity-ID': 'Hamsoya-Email-Service',
          'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
          Precedence: 'bulk',
          'X-Campaign-ID': 'email-verification',
          'X-Message-Source': 'Hamsoya-Backend',
        },
      };

      console.log(
        `📤 Sending email to ${options.to} via SMTP server ${config.host}:${config.port}`
      );
      console.log(`📧 Email details: Subject="${options.subject}", From="${emailOptions.from}"`);

      const result = await transporter.sendMail(emailOptions);
      const sendTime = Date.now() - sendStart;
      const totalTime = Date.now() - startTime;

      // Enhanced success logging with SMTP response details
      console.log(
        `✅ HTML Email sent to ${options.to} | Render: ${renderTime}ms | Send: ${sendTime}ms | Total: ${totalTime}ms | Attempt: ${attempt}`
      );
      console.log(
        `📨 SMTP Response: ${JSON.stringify(
          {
            messageId: result.messageId,
            response: result.response,
            accepted: result.accepted,
            rejected: result.rejected,
            pending: result.pending,
            envelope: result.envelope,
          },
          null,
          2
        )}`
      );

      // Check for delivery warnings
      if (result.rejected && result.rejected.length > 0) {
        console.warn(`⚠️  Some recipients were rejected: ${result.rejected.join(', ')}`);
      }

      if (result.pending && result.pending.length > 0) {
        console.warn(`⏳ Some recipients are pending: ${result.pending.join(', ')}`);
      }

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
    `❌ Failed to send HTML email after ${totalTime}ms and ${maxRetries} attempts:`,
    lastError
  );

  throw new Error(`Failed to send HTML email after ${maxRetries} attempts: ${lastError.message}`);
};

// Enhanced OTP verification email with HTML template
export const sendEnhancedOTPVerificationEmailHTML = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  await sendEmailWithHTML(
    {
      to: email,
      subject: 'Verify Your Email - Hamsoya',
      data: { name, otp },
    },
    env
  );
};

// Performance monitoring for email sending
export const sendEmailWithTimingHTML = async (
  options: SendEmailOptions,
  env?: any
): Promise<{ success: boolean; duration: number }> => {
  const startTime = Date.now();

  try {
    await sendEmailWithHTML(options, env);
    const duration = Date.now() - startTime;

    console.log(`📊 HTML Email sent in ${duration}ms`);

    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`📊 HTML Email failed after ${duration}ms:`, error);

    return { success: false, duration };
  }
};
