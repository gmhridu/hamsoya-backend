import { generateOTP, isValidOTP } from '../lib/crypto';
import { RedisService } from '../lib/redis';
import { sendOTPVerificationEmail, sendPasswordResetEmail } from '../lib/sendEmail';
import { AppError } from '../utils/error-handler';

export class OTPService {
  private redis: RedisService;
  private env: any;

  constructor(env?: any) {
    this.env = env;
    this.redis = new RedisService(env?.REDIS_URL);
  }

  // Generate and send OTP
  async generateAndSendOTP(
    email: string,
    name: string,
    type: 'verification' | 'password_reset' = 'verification'
  ): Promise<{ message: string }> {
    // Check rate limiting
    await this.checkRateLimit(email, type);

    // Generate OTP
    const otp = generateOTP();

    // Store in Redis
    await this.redis.setOTP(email, otp);
    await this.redis.setCooldown(email, type === 'verification' ? 'otp' : 'password_reset');

    // Send email immediately using optimized enhanced templates
    console.log(`🚀 Sending ${type} email to ${email}...`);
    const emailStart = Date.now();

    try {
      if (type === 'verification') {
        // Use direct import for better performance (no dynamic import delay)
        const { sendEnhancedOTPVerificationEmail } = require('../lib/sendEmail');
        await sendEnhancedOTPVerificationEmail(email, name, otp, this.env);
      } else {
        const { sendEnhancedPasswordResetEmail } = require('../lib/sendEmail');
        await sendEnhancedPasswordResetEmail(email, name, otp, this.env);
      }

      const emailTime = Date.now() - emailStart;
      console.log(`✅ ${type} email sent successfully in ${emailTime}ms`);
    } catch (error) {
      const emailTime = Date.now() - emailStart;
      console.error(`❌ Enhanced email failed after ${emailTime}ms, using fallback:`, error);

      // Fast fallback to regular email templates
      if (type === 'verification') {
        await sendOTPVerificationEmail(email, name, otp, this.env);
      } else {
        await sendPasswordResetEmail(email, name, otp, this.env);
      }
    }

    return {
      message: `${
        type === 'verification' ? 'Verification' : 'Password reset'
      } OTP sent to your email`,
    };
  }

  // Verify OTP
  async verifyOTP(
    email: string,
    otp: string,
    type: 'verification' | 'password_reset' = 'verification'
  ): Promise<{ valid: boolean; message: string }> {
    // Validate OTP format
    if (!isValidOTP(otp)) {
      throw new AppError('Invalid OTP format', 400);
    }

    const redisType = type === 'verification' ? 'otp' : 'password_reset';

    // Check if locked
    const isLocked = await this.redis.checkLock(email, redisType);
    if (isLocked) {
      throw new AppError('Too many failed attempts. Please try again later.', 429);
    }

    // Get stored OTP
    const storedOTP = await this.redis.getOTP(email);
    if (!storedOTP) {
      throw new AppError('OTP expired or not found', 400);
    }

    // Verify OTP
    if (otp !== storedOTP) {
      // Increment wrong attempts
      const attempts = await this.redis.incrementAttempts(email, redisType);

      if (attempts >= 3) {
        await this.redis.setLock(email, 30, redisType); // Lock for 30 minutes
        await this.redis.cleanup(email, redisType);
        throw new AppError('Too many failed attempts. Account locked for 30 minutes.', 429);
      }

      return {
        valid: false,
        message: `Invalid OTP. ${3 - attempts} attempts remaining.`,
      };
    }

    // OTP is valid - cleanup
    await this.redis.cleanup(email, redisType);

    return {
      valid: true,
      message: 'OTP verified successfully',
    };
  }

  // Check if OTP exists for email
  async hasValidOTP(email: string): Promise<boolean> {
    const otp = await this.redis.getOTP(email);
    return !!otp;
  }

  // Clear OTP for email
  async clearOTP(email: string): Promise<void> {
    await this.redis.deleteOTP(email);
  }

  // Get remaining cooldown time
  async getCooldownTime(
    email: string,
    type: 'verification' | 'password_reset' = 'verification'
  ): Promise<number> {
    const redisType = type === 'verification' ? 'otp' : 'password_reset';
    const inCooldown = await this.redis.checkCooldown(email, redisType);

    if (!inCooldown) {
      return 0;
    }

    return 60;
  }

  // Check rate limiting
  private async checkRateLimit(
    email: string,
    type: 'verification' | 'password_reset'
  ): Promise<void> {
    const redisType = type === 'verification' ? 'otp' : 'password_reset';

    // Check cooldown
    const inCooldown = await this.redis.checkCooldown(email, redisType);
    if (inCooldown) {
      throw new AppError('Please wait 60 seconds before requesting another OTP', 429);
    }

    // Check hourly limit
    const attempts = await this.redis.getAttempts(email, redisType);
    if (attempts >= 2) {
      await this.redis.setLock(email, 60, redisType); // Lock for 1 hour
      throw new AppError('Too many OTP requests. Please try again in 1 hour.', 429);
    }

    // Check if locked
    const isLocked = await this.redis.checkLock(email, redisType);
    if (isLocked) {
      throw new AppError('Account is temporarily locked. Please try again later.', 429);
    }

    // Increment attempts
    await this.redis.incrementAttempts(email, redisType);
  }
}
