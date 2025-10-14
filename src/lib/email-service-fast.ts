import nodemailer from 'nodemailer';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  service: string;
  user: string;
  password: string;
}

// Cached transporter for performance
let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfig: EmailConfig | null = null;

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

// Create or reuse transporter for maximum performance
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

  // Create new transporter with maximum performance settings
  const transportConfig: any = {
    auth: {
      user: config.user,
      pass: config.password,
    },
    // Maximum performance connection pooling
    pool: true,
    maxConnections: 20, // High connection count for maximum throughput
    maxMessages: 500, // High message count per connection
    rateDelta: 100, // Very fast rate limit checks (100ms)
    rateLimit: 50, // Very high rate limit (50 messages per second)

    // Fast but reliable timeout settings
    connectionTimeout: 10000, // 10 seconds for connection (increased for reliability)
    greetingTimeout: 8000, // 8 seconds for greeting (increased for reliability)
    socketTimeout: 15000, // 15 seconds for socket operations (increased for reliability)

    // Connection optimizations
    keepAlive: true,
    maxIdleTime: 60000, // Keep connections alive for 1 minute

    // Security and performance optimizations
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false, // Disable logging for maximum performance
    debug: false, // Disable debug for maximum performance

    // Minimal retry logic for fastest failure detection
    retry: {
      attempts: 1, // Only 1 attempt for maximum speed
      delay: 100, // 100ms delay for immediate retry
    },
  };

  // Add service-specific or host/port configuration
  if (config.service && config.service !== 'custom') {
    transportConfig.service = config.service;
  } else {
    transportConfig.host = config.host;
    transportConfig.port = config.port;
    transportConfig.secure = config.port === 465;
  }

  cachedTransporter = nodemailer.createTransport(transportConfig);

  // Skip verification for maximum speed (assume configuration is correct)
  cachedConfig = config;
  return cachedTransporter!;
};

// Generate simple HTML template for OTP
const generateSimpleOTPHTML = (name: string, otp: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email - Hamsoya</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #22c55e; margin: 0; font-size: 28px;">🌱 Hamsoya</h1>
      <p style="color: #666; margin: 5px 0 0 0;">Premium Organic Foods</p>
    </div>

    <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Verify Your Email Address</h2>

    <p style="color: #555; font-size: 16px; line-height: 1.6;">Hi ${name},</p>

    <p style="color: #555; font-size: 16px; line-height: 1.6;">
      Welcome to Hamsoya! Please use the verification code below to complete your account setup:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: #f0f9ff; border: 2px dashed #22c55e; border-radius: 8px; padding: 20px; display: inline-block;">
        <span style="font-size: 32px; font-weight: bold; color: #22c55e; letter-spacing: 4px;">${otp}</span>
      </div>
    </div>

    <p style="color: #555; font-size: 14px; line-height: 1.6;">
      This code will expire in 5 minutes. If you didn't request this verification, please ignore this email.
    </p>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
      <p style="color: #888; font-size: 12px; margin: 0;">
        © 2024 Hamsoya. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

// Ultra-fast email sending function
export const sendFastOTPEmail = async (
  email: string,
  name: string,
  otp: string,
  env?: any
): Promise<void> => {
  const startTime = Date.now();

  try {
    const transporter = getTransporter(env);
    const config = getEmailConfig(env);

    // Generate simple HTML (no file I/O, no template engine)
    const html = generateSimpleOTPHTML(name, otp);

    // Send email with minimal options for maximum speed
    await transporter.sendMail({
      from: `"Hamsoya" <${config.user}>`,
      to: email,
      subject: 'Verify Your Email - Hamsoya',
      html,
      // Performance optimizations
      priority: 'high',
      encoding: 'utf8',
      disableFileAccess: true,
      disableUrlAccess: true,
    });

    const totalTime = Date.now() - startTime;
    console.log(`⚡ Fast OTP email sent to ${email} in ${totalTime}ms`);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Fast email failed after ${totalTime}ms:`, error);
    throw error;
  }
};
