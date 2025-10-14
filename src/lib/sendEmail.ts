import nodemailer from 'nodemailer';
import { emailPerformanceMonitor } from './email-performance-monitor';

// Email configuration
interface EmailConfig {
  host: string;
  port: number;
  service: string;
  user: string;
  password: string;
}

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

// Create optimized transporter for legacy emails (fast fallback)
const createTransporter = (config: EmailConfig) => {
  const transportConfig: any = {
    auth: {
      user: config.user,
      pass: config.password,
    },
    // Optimized settings for fast legacy email delivery
    pool: false, // Don't use pooling for legacy (simpler, faster for single sends)
    connectionTimeout: 10000, // 10 seconds for connection (matches enhanced service)
    greetingTimeout: 5000, // 5 seconds for greeting (matches enhanced service)
    socketTimeout: 15000, // 15 seconds for socket operations (matches enhanced service)
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

  return nodemailer.createTransport(transportConfig);
};

// Legacy email sending interface (for backward compatibility)
interface LegacyEmailOptions {
  to: string;
  subject: string;
  template: 'otpVerification' | 'passwordReset' | 'welcome';
  data: any;
}

// Legacy send email function (uses basic HTML templates)
export const sendEmail = async (options: LegacyEmailOptions, env?: any): Promise<void> => {
  try {
    const config = getEmailConfig(env);
    const transporter = createTransporter(config);

    // Create simple HTML template for legacy support
    const html = createLegacyTemplate(options.template, options.data);

    // Send email
    await transporter.sendMail({
      from: `"Hamsoya" <${config.user}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    console.log(`✅ Legacy email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send legacy email:', error);
    throw new Error('Failed to send email');
  }
};

// Simple legacy template creator
const createLegacyTemplate = (template: string, data: any): string => {
  const { name, otp } = data;

  switch (template) {
    case 'otpVerification':
      return `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Verify Your Email - Hamsoya</h2>
            <p>Hi ${name},</p>
            <p>Your verification code is: <strong>${otp}</strong></p>
            <p>Please use this code to verify your email address.</p>
            <p>Best regards,<br>Hamsoya Team</p>
          </body>
        </html>
      `;
    case 'passwordReset':
      return `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Password Reset - Hamsoya</h2>
            <p>Hi ${name},</p>
            <p>Your password reset code is: <strong>${otp}</strong></p>
            <p>Please use this code to reset your password.</p>
            <p>Best regards,<br>Hamsoya Team</p>
          </body>
        </html>
      `;
    case 'welcome':
      return `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to Hamsoya!</h2>
            <p>Hi ${name},</p>
            <p>Welcome to Hamsoya! Your account has been successfully created.</p>
            <p>Start exploring our organic products today!</p>
            <p>Best regards,<br>Hamsoya Team</p>
          </body>
        </html>
      `;
    default:
      return `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hamsoya</h2>
            <p>Hi ${name},</p>
            <p>Thank you for using Hamsoya!</p>
            <p>Best regards,<br>Hamsoya Team</p>
          </body>
        </html>
      `;
  }
};

// Legacy predefined email functions (for backward compatibility)
export const sendOTPVerificationEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  await sendEmail(
    {
      to: email,
      subject: 'Verify Your Email - Hamsoya',
      template: 'otpVerification',
      data: { name, otp },
    },
    env
  );
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  await sendEmail(
    {
      to: email,
      subject: 'Password Reset Request - Hamsoya',
      template: 'passwordReset',
      data: { name, otp },
    },
    env
  );
};

export const sendWelcomeEmail = async (email: string, name: string, env?: any): Promise<void> => {
  await sendEmail(
    {
      to: email,
      subject: 'Welcome to Hamsoya! 🎉',
      template: 'welcome',
      data: { name },
    },
    env
  );
};

// Enhanced email sending functions using HTML templates

// Enhanced OTP verification email with HTML template and fast fallback
export const sendEnhancedOTPVerificationEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  const startTime = Date.now();
  console.log(`🚀 Sending HTML OTP verification email to ${email}...`);

  try {
    // Use the professional EJS email service with timeout
    const emailService = await import('./email-service-ejs');

    // Set a timeout for the enhanced email attempt (max 15 seconds to allow SMTP timeouts to work)
    const enhancedEmailPromise = emailService.sendEnhancedOTPVerificationEmailEJS(
      email,
      name,
      otp,
      env
    );

    // Race the enhanced email against a timeout (increased to allow SMTP-level retries)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Enhanced email timeout')), 15000);
    });

    await Promise.race([enhancedEmailPromise, timeoutPromise]);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Enhanced EJS OTP email sent successfully to ${email} in ${totalTime}ms`);
    return;
  } catch (error) {
    const enhancedTime = Date.now() - startTime;
    console.error(
      `❌ Enhanced HTML email failed after ${enhancedTime}ms:`,
      error instanceof Error ? error.message : error
    );

    // Fast fallback to legacy email (should be under 2 seconds)
    console.log('🔄 Fast fallback to legacy email template...');
    const fallbackStart = Date.now();

    try {
      await sendOTPVerificationEmail(email, name, otp, env);
      const fallbackTime = Date.now() - fallbackStart;
      const totalTime = Date.now() - startTime;
      console.log(
        `✅ Fallback email sent successfully in ${fallbackTime}ms (total: ${totalTime}ms)`
      );

      // Record fallback success metrics
      emailPerformanceMonitor.recordEmailMetrics({
        timestamp: Date.now(),
        email,
        templateName: 'user-activation-mail-legacy',
        renderTime: 0,
        sendTime: fallbackTime,
        totalTime,
        success: true,
        attempt: 1,
        fallbackUsed: true,
      });
    } catch (fallbackError) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Fallback email also failed after ${totalTime}ms:`, fallbackError);
      throw new Error('Failed to send email via both enhanced and legacy methods');
    }
  }
};

// Enhanced password reset email (now using EJS)
export const sendEnhancedPasswordResetEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  try {
    console.log(`🚀 Sending password reset email to ${email}...`);

    // Use the EJS email service directly
    const emailService = await import('./email-service-ejs');
    const result = await emailService.sendEmailWithTiming(
      {
        to: email,
        subject: 'Password Reset Request - Hamsoya',
        template: 'password-reset',
        data: { name, otp },
      },
      env
    );

    if (result.success) {
      console.log(`✅ Password reset email sent successfully to ${email} in ${result.duration}ms`);
    } else {
      throw new Error('Email sending failed');
    }
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);

    // Fallback to legacy email if EJS fails
    console.log('🔄 Falling back to legacy email template...');
    try {
      await sendPasswordResetEmail(email, name, otp, env);
      console.log('✅ Fallback email sent successfully');
    } catch (fallbackError) {
      console.error('❌ Fallback email also failed:', fallbackError);
      throw new Error('Failed to send password reset email');
    }
  }
};

// Enhanced welcome email (now using EJS)
export const sendEnhancedWelcomeEmail = async (
  email: string,
  name: string,
  env?: any
): Promise<void> => {
  try {
    console.log(`🚀 Sending welcome email to ${email}...`);

    // Use the EJS email service directly
    const emailService = await import('./email-service-ejs');
    const result = await emailService.sendEmailWithTiming(
      {
        to: email,
        subject: 'Welcome to Hamsoya! 🎉',
        template: 'welcome',
        data: { name },
      },
      env
    );

    if (result.success) {
      console.log(`✅ Welcome email sent successfully to ${email} in ${result.duration}ms`);
    } else {
      throw new Error('Email sending failed');
    }
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);

    // Fallback to legacy email if EJS fails
    console.log('🔄 Falling back to legacy email template...');
    try {
      await sendWelcomeEmail(email, name, env);
      console.log('✅ Fallback email sent successfully');
    } catch (fallbackError) {
      console.error('❌ Fallback email also failed:', fallbackError);
      throw new Error('Failed to send welcome email');
    }
  }
};
