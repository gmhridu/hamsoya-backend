import { Resend } from 'resend';
import { emailPerformanceMonitor } from './email-performance-monitor';

// Resend-only email service for Render deployment
class ResendEmailService {
  private resend: Resend | null = null;

  constructor() {
    // Always use Resend - no SMTP fallback
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable is required');
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    try {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      console.log('✅ Resend email service initialized with API key:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
    } catch (error) {
      console.error('❌ Failed to initialize Resend:', error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, html: string, env?: any): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend service not initialized');
    }

    const startTime = Date.now();

    try {
      console.log(`🚀 Sending email via Resend to ${to}...`);

      const result = await this.resend.emails.send({
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
        templateName: 'resend-only',
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
        templateName: 'resend-only',
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
      return !!this.resend && !!process.env.RESEND_API_KEY;
    } catch {
      return false;
    }
  }

  // Get service info for debugging
  getServiceInfo() {
    return {
      service: 'resend-only',
      hasResendAPIKey: !!process.env.RESEND_API_KEY,
      resendAPIKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) + '...',
      noSMTP: true,
    };
  }
}

// Export singleton instance
export const renderEmailService = new ResendEmailService();

// Simplified email interface for Resend-only implementation
interface ResendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Direct Resend email function (no SMTP fallback)
export const sendResendEmail = async (options: ResendEmailOptions): Promise<void> => {
  try {
    await renderEmailService.sendEmail(options.to, options.subject, options.html);
    console.log(`✅ Resend email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send Resend email:', error);
    throw new Error('Failed to send email');
  }
};

// Simplified email functions using Resend only
export const sendOTPVerificationEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
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

  await sendResendEmail({
    to: email,
    subject: 'Verify Your Email - Hamsoya',
    html,
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
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

  await sendResendEmail({
    to: email,
    subject: 'Password Reset Request - Hamsoya',
    html,
  });
};

export const sendWelcomeEmail = async (email: string, name: string, env?: any): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Hamsoya!</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Hamsoya! 🎉</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Welcome to Hamsoya! Your account has been successfully created.</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Start exploring our premium organic food products today!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://hamsoya.vercel.app'}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Shopping</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 14px; text-align: center;">Best regards,<br>Hamsoya Team</p>
        </div>
      </body>
    </html>
  `;

  await sendResendEmail({
    to: email,
    subject: 'Welcome to Hamsoya! 🎉',
    html,
  });
};

// Enhanced email sending functions using Resend only

// Enhanced OTP verification email using Resend
export const sendEnhancedOTPVerificationEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
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

  await sendResendEmail({
    to: email,
    subject: 'Verify Your Email - Hamsoya',
    html,
  });
};

// Enhanced password reset email using Resend
export const sendEnhancedPasswordResetEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
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

  await sendResendEmail({
    to: email,
    subject: 'Password Reset Request - Hamsoya',
    html,
  });
};

// Enhanced welcome email using Resend
export const sendEnhancedWelcomeEmail = async (
  email: string,
  name: string,
  env?: any
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Hamsoya!</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Hamsoya! 🎉</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Welcome to Hamsoya! Your account has been successfully created.</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Start exploring our premium organic food products today!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://hamsoya.vercel.app'}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Shopping</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 14px; text-align: center;">Best regards,<br>Hamsoya Team</p>
        </div>
      </body>
    </html>
  `;

  await sendResendEmail({
    to: email,
    subject: 'Welcome to Hamsoya! 🎉',
    html,
  });
};
