import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { emailPerformanceMonitor } from './email-performance-monitor';

// Resend email service for Render deployment
class ResendEmailService {
  private resend: Resend | null = null;
  private useResend: boolean;

  constructor() {
    // Use Resend if API key is available, fallback to SMTP
    this.useResend = !!process.env.RESEND_API_KEY;

    if (this.useResend) {
      try {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        console.log('✅ Resend email service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Resend:', error);
        this.useResend = false;
      }
    }
  }

  async sendEmail(to: string, subject: string, html: string, env?: any): Promise<void> {
    if (this.useResend && this.resend) {
      return this.sendViaResend(to, subject, html);
    } else {
      return this.sendViaSMTP(to, subject, html, env);
    }
  }

  private async sendViaResend(to: string, subject: string, html: string): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`🚀 Sending email via Resend to ${to}...`);

      const result = await this.resend!.emails.send({
        from: 'Hamsoya <noreply@hamsoya.com>',
        to: [to],
        subject,
        html,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Resend email sent successfully to ${to} in ${duration}ms. ID: ${result.data?.id}`);

      // Record performance metrics
      emailPerformanceMonitor.recordEmailMetrics({
        timestamp: Date.now(),
        email: to,
        templateName: 'resend-enhanced',
        renderTime: 0,
        sendTime: duration,
        totalTime: duration,
        success: true,
        attempt: 1,
        fallbackUsed: false,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Resend email failed after ${duration}ms:`, error);

      // Record failure metrics
      emailPerformanceMonitor.recordEmailMetrics({
        timestamp: Date.now(),
        email: to,
        templateName: 'resend-enhanced',
        renderTime: 0,
        sendTime: duration,
        totalTime: duration,
        success: false,
        attempt: 1,
        fallbackUsed: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  private async sendViaSMTP(to: string, subject: string, html: string, env?: any): Promise<void> {
    const config = getEmailConfig(env);
    const transporter = createTransporter(config);

    const startTime = Date.now();

    try {
      await transporter.sendMail({
        from: `"Hamsoya" <${config.user}>`,
        to,
        subject,
        html,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ SMTP email sent successfully to ${to} in ${duration}ms`);

      // Record performance metrics
      emailPerformanceMonitor.recordEmailMetrics({
        timestamp: Date.now(),
        email: to,
        templateName: 'smtp-legacy',
        renderTime: 0,
        sendTime: duration,
        totalTime: duration,
        success: true,
        attempt: 1,
        fallbackUsed: false,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ SMTP email failed after ${duration}ms:`, error);

      // Record failure metrics
      emailPerformanceMonitor.recordEmailMetrics({
        timestamp: Date.now(),
        email: to,
        templateName: 'smtp-legacy',
        renderTime: 0,
        sendTime: duration,
        totalTime: duration,
        success: false,
        attempt: 1,
        fallbackUsed: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      if (this.useResend && this.resend) {
        // Resend doesn't have a direct health check, but we can verify API key format
        return process.env.RESEND_API_KEY!.startsWith('re_');
      } else {
        // For SMTP, we could implement a connection test
        return !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;
      }
    } catch {
      return false;
    }
  }

  // Get service info for debugging
  getServiceInfo() {
    return {
      useResend: this.useResend,
      hasResendAPIKey: !!process.env.RESEND_API_KEY,
      hasSMTPCredentials: !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD,
      resendAPIKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) + '...',
    };
  }
}

// Export singleton instance
export const renderEmailService = new ResendEmailService();

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
  // Try multiple ways to get environment variables
  const config = {
    host: env?.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(String(env?.SMTP_PORT || process.env.SMTP_PORT || '465')),
    service: env?.SMTP_SERVICE || process.env.SMTP_SERVICE || 'gmail',
    user: env?.SMTP_USER || process.env.SMTP_USER,
    password: env?.SMTP_PASSWORD || process.env.SMTP_PASSWORD,
  };

  console.log('[EMAIL-CONFIG] Checking SMTP configuration:', {
    host: config.host,
    port: config.port,
    service: config.service,
    hasUser: !!config.user,
    hasPassword: !!config.password,
    userLength: config.user?.length || 0,
    passwordLength: config.password?.length || 0,
  });

  if (!config.user || !config.password) {
    const errorMsg = `SMTP_USER and SMTP_PASSWORD environment variables are required. Current values: user=${config.user ? '[SET]' : '[NOT SET]'}, password=${config.password ? '[SET]' : '[NOT SET]'}`;
    console.error('[EMAIL-CONFIG]', errorMsg);
    throw new Error(errorMsg);
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
    // Optimized settings for Render deployment
    pool: true, // Use connection pooling for better reliability
    connectionTimeout: 30000, // 30 seconds for connection (Render can be slow)
    greetingTimeout: 10000, // 10 seconds for greeting
    socketTimeout: 60000, // 60 seconds for socket operations (Render timeout)
    maxConnections: 5,
    maxMessages: 10,
    // Render-specific optimizations
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  };

  // Add service-specific or host/port configuration
  if (config.service && config.service !== 'custom') {
    // Use service-based configuration (e.g., 'gmail', 'outlook', etc.)
    transportConfig.service = config.service;
  } else {
    // Use manual host/port configuration with Render optimizations
    transportConfig.host = config.host;
    transportConfig.port = config.port;
    transportConfig.secure = config.port === 465;

    // Add TLS options for better compatibility
    if (config.port === 465) {
      transportConfig.tls = {
        rejectUnauthorized: false, // Sometimes needed for Render
        ciphers: 'SSLv3',
      };
    }
  }

  console.log('[EMAIL-TRANSPORT] Creating transporter with config:', {
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
    service: transportConfig.service,
    hasAuth: !!(transportConfig.auth?.user && transportConfig.auth?.pass),
  });

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
    // Create simple HTML template for legacy support
    const html = createLegacyTemplate(options.template, options.data);

    // Use the new render email service
    await renderEmailService.sendEmail(options.to, options.subject, html, env);

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

    // Fast fallback to Resend service
    console.log('🔄 Fast fallback to Resend email service...');
    const fallbackStart = Date.now();

    try {
      // Generate simple HTML template for Resend
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email - Hamsoya</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Verify Your Email</h1>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Your verification code is:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 24px; font-weight: bold; color: #4CAF50; background-color: #f0f8f0; padding: 15px 25px; border-radius: 5px; border: 2px dashed #4CAF50;">${otp}</span>
              </div>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">Please use this code to verify your email address.</p>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 14px; text-align: center;">Best regards,<br>Hamsoya Team</p>
            </div>
          </body>
        </html>
      `;

      await renderEmailService.sendEmail(email, 'Verify Your Email - Hamsoya', html, env);

      const fallbackTime = Date.now() - fallbackStart;
      const totalTime = Date.now() - startTime;
      console.log(
        `✅ Fallback email sent successfully in ${fallbackTime}ms (total: ${totalTime}ms)`
      );

      // Record fallback success metrics
      emailPerformanceMonitor.recordEmailMetrics({
        timestamp: Date.now(),
        email,
        templateName: 'user-activation-mail-resend',
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
      throw new Error('Failed to send email via both enhanced and Resend methods');
    }
  }
};

// Enhanced password reset email (now using Resend)
export const sendEnhancedPasswordResetEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  const startTime = Date.now();
  console.log(`🚀 Sending password reset email to ${email}...`);

  try {
    // Generate HTML template for password reset
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Hamsoya</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset Request</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Your reset code is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 24px; font-weight: bold; color: #ff9800; background-color: #fff3e0; padding: 15px 25px; border-radius: 5px; border: 2px dashed #ff9800;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">Please use this code to reset your password. This code will expire in 5 minutes.</p>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">If you didn't request this reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 14px; text-align: center;">Best regards,<br>Hamsoya Team</p>
          </div>
        </body>
      </html>
    `;

    await renderEmailService.sendEmail(email, 'Password Reset Request - Hamsoya', html, env);

    const duration = Date.now() - startTime;
    console.log(`✅ Password reset email sent successfully to ${email} in ${duration}ms`);

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);

    // Fallback to legacy email if Resend fails
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
