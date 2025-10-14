import Redis, { type RedisOptions } from 'ioredis';

// Redis connection singleton
let redis: Redis | null = null;

export const getRedis = (redisUrl?: string): Redis | null => {
  if (!redis) {
    const url = redisUrl || process.env.REDIS_URL;

    if (!url) {
      console.warn('⚠️ Redis URL not provided, Redis functionality disabled');
      return null;
    }

    try {
      const options: RedisOptions = {
        maxRetriesPerRequest: 3,
        lazyConnect: false, // Connect immediately
        enableReadyCheck: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      };

      redis = new Redis(url, options);

      redis.on('error', err => {
        console.error('❌ Redis connection error:', err);
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('ready', () => {
        console.log('✅ Redis ready for commands');
      });

      redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });
    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis, functionality disabled:', error);
      return null;
    }
  }

  return redis;
};

// Redis key generators
export const RedisKeys = {
  // OTP related keys
  otp: (email: string) => `otp:${email}`,
  otpCooldown: (email: string) => `otp_cooldown:${email}`,
  otpAttempts: (email: string) => `otp_attempts:${email}`,
  otpLock: (email: string) => `otp_lock:${email}`,

  // Enhanced OTP rate limiting keys
  otpSentCount: (email: string) => `otp_sent_count:${email}`,
  otpAttemptFail: (email: string) => `otp_attempt_fail:${email}`,
  otpIpLimit: (ip: string) => `otp_ip_limit:${ip}`,
  otpIpSentCount: (ip: string) => `otp_ip_sent_count:${ip}`,

  // Password reset related keys
  passwordResetOtp: (email: string) => `password_reset_otp:${email}`,
  passwordResetCooldown: (email: string) => `password_reset_cooldown:${email}`,
  passwordResetAttempts: (email: string) => `password_reset_attempts:${email}`,
  passwordResetLock: (email: string) => `password_reset_lock:${email}`,
  passwordResetVerified: (email: string) => `password_reset_verified:${email}`,

  // Session related keys
  refreshToken: (tokenHash: string) => `refresh_token:${tokenHash}`,
  userSession: (sessionId: string) => `user_session:${sessionId}`,

  // Registration related keys
  registrationData: (email: string) => `registration_data:${email}`,

  // Rate limiting keys
  loginAttempts: (email: string) => `login_attempts:${email}`,
  loginLock: (email: string) => `login_lock:${email}`,
};

// Enhanced OTP rate limiting constants
export const OTP_LIMITS = {
  // OTP expiry and cooldown
  OTP_EXPIRY_MINUTES: 5, // OTP expires in 5 minutes
  COOLDOWN_SECONDS: 60, // 60 seconds between OTP requests

  // Email-based rate limiting
  MAX_SEND_ATTEMPTS_PER_HOUR: 5, // Maximum 5 OTP sends per email per hour
  MAX_VERIFY_ATTEMPTS: 5, // Maximum 5 verification attempts before lock
  VERIFY_LOCK_MINUTES: 15, // Lock for 15 minutes after max verify attempts

  // IP-based rate limiting
  MAX_IP_SEND_ATTEMPTS_PER_HOUR: 10, // Maximum 10 OTP sends per IP per hour
  IP_LOCK_MINUTES: 60, // Lock IP for 1 hour after exceeding limit

  // Legacy compatibility
  MAX_ATTEMPTS_PER_HOUR: 5, // Backward compatibility
  WRONG_ATTEMPTS_LOCK_MINUTES: 15, // Backward compatibility
  HOUR_LOCK_MINUTES: 60, // Backward compatibility
  MAX_WRONG_ATTEMPTS: 5, // Backward compatibility
};

// Redis utility functions
export class RedisService {
  private redis: Redis | null;

  constructor(redisUrl?: string) {
    this.redis = getRedis(redisUrl);
  }

  // OTP Management - disabled if no Redis
  async setOTP(email: string, otp: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.otp(email);
    await this.redis.setex(key, OTP_LIMITS.OTP_EXPIRY_MINUTES * 60, otp);
  }

  async getOTP(email: string): Promise<string | null> {
    if (!this.redis) return null;
    const key = RedisKeys.otp(email);
    return await this.redis.get(key);
  }

  async deleteOTP(email: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.otp(email);
    await this.redis.del(key);
  }

  // Password Reset OTP Management - disabled if no Redis
  async setPasswordResetOTP(email: string, otp: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.passwordResetOtp(email);
    await this.redis.setex(key, OTP_LIMITS.OTP_EXPIRY_MINUTES * 60, otp);
  }

  async getPasswordResetOTP(email: string): Promise<string | null> {
    if (!this.redis) return null;
    const key = RedisKeys.passwordResetOtp(email);
    return await this.redis.get(key);
  }

  async deletePasswordResetOTP(email: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.passwordResetOtp(email);
    await this.redis.del(key);
  }

  // Cooldown Management - disabled if no Redis
  async setCooldown(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<void> {
    if (!this.redis) return;
    const key =
      type === 'otp' ? RedisKeys.otpCooldown(email) : RedisKeys.passwordResetCooldown(email);
    await this.redis.setex(key, OTP_LIMITS.COOLDOWN_SECONDS, '1');
  }

  async checkCooldown(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<boolean> {
    if (!this.redis) return false;
    const key =
      type === 'otp' ? RedisKeys.otpCooldown(email) : RedisKeys.passwordResetCooldown(email);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async getCooldownRemaining(
    email: string,
    type: 'otp' | 'password_reset' = 'otp'
  ): Promise<number> {
    if (!this.redis) return 0;
    const key =
      type === 'otp' ? RedisKeys.otpCooldown(email) : RedisKeys.passwordResetCooldown(email);
    const ttl = await this.redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  }

  // Attempt tracking - disabled if no Redis
  async incrementAttempts(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<number> {
    if (!this.redis) return 0;
    const key =
      type === 'otp' ? RedisKeys.otpAttempts(email) : RedisKeys.passwordResetAttempts(email);
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      // Set expiry for the first attempt (1 hour)
      await this.redis.expire(key, 3600);
    }

    return attempts;
  }

  async getAttempts(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<number> {
    if (!this.redis) return 0;
    const key =
      type === 'otp' ? RedisKeys.otpAttempts(email) : RedisKeys.passwordResetAttempts(email);
    const attempts = await this.redis.get(key);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  async resetAttempts(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<void> {
    if (!this.redis) return;
    const key =
      type === 'otp' ? RedisKeys.otpAttempts(email) : RedisKeys.passwordResetAttempts(email);
    await this.redis.del(key);
  }

  // Lock Management - disabled if no Redis
  async setLock(
    email: string,
    minutes: number,
    type: 'otp' | 'password_reset' = 'otp'
  ): Promise<void> {
    if (!this.redis) return;
    const key = type === 'otp' ? RedisKeys.otpLock(email) : RedisKeys.passwordResetLock(email);
    await this.redis.setex(key, minutes * 60, '1');
  }

  async checkLock(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<boolean> {
    if (!this.redis) return false;
    const key = type === 'otp' ? RedisKeys.otpLock(email) : RedisKeys.passwordResetLock(email);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async removeLock(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<void> {
    if (!this.redis) return;
    const key = type === 'otp' ? RedisKeys.otpLock(email) : RedisKeys.passwordResetLock(email);
    await this.redis.del(key);
  }

  // Password reset verification tracking - disabled if no Redis
  async setPasswordResetVerified(email: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.passwordResetVerified(email);
    await this.redis.setex(key, 600, '1'); // 10 minutes to complete password reset
  }

  async checkPasswordResetVerified(email: string): Promise<boolean> {
    if (!this.redis) return false;
    const key = RedisKeys.passwordResetVerified(email);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async removePasswordResetVerified(email: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.passwordResetVerified(email);
    await this.redis.del(key);
  }

  // Session Management - disabled if no Redis
  async setRefreshToken(tokenHash: string, userId: string, expirySeconds: number): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.refreshToken(tokenHash);
    await this.redis.setex(key, expirySeconds, userId);
  }

  async getRefreshToken(tokenHash: string): Promise<string | null> {
    if (!this.redis) return null;
    const key = RedisKeys.refreshToken(tokenHash);
    return await this.redis.get(key);
  }

  async deleteRefreshToken(tokenHash: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.refreshToken(tokenHash);
    await this.redis.del(key);
  }

  // Registration data methods - disabled if no Redis
  async setRegistrationData(email: string, data?: any): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.registrationData(email);
    // Store for 30 minutes (1800 seconds)
    await this.redis.setex(key, 1800, JSON.stringify(data));
  }

  async getRegistrationData(email: string): Promise<any | null> {
    if (!this.redis) return null;
    const key = RedisKeys.registrationData(email);
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteRegistrationData(email: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.registrationData(email);
    await this.redis.del(key);
  }

  // Enhanced OTP send count management - disabled if no Redis
  async incrementOTPSendCount(email: string): Promise<number> {
    if (!this.redis) return 0;
    const key = RedisKeys.otpSentCount(email);
    const count = await this.redis.incr(key);

    // Set expiry to 1 hour on first increment
    if (count === 1) {
      await this.redis.expire(key, 3600); // 1 hour
    }

    return count;
  }

  async getOTPSendCount(email: string): Promise<number> {
    if (!this.redis) return 0;
    const key = RedisKeys.otpSentCount(email);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  // Enhanced OTP verification failure tracking - disabled if no Redis
  async incrementOTPFailCount(email: string): Promise<number> {
    if (!this.redis) return 0;
    const key = RedisKeys.otpAttemptFail(email);
    const count = await this.redis.incr(key);

    // Set expiry to 15 minutes on first increment
    if (count === 1) {
      await this.redis.expire(key, OTP_LIMITS.VERIFY_LOCK_MINUTES * 60);
    }

    return count;
  }

  async getOTPFailCount(email: string): Promise<number> {
    if (!this.redis) return 0;
    const key = RedisKeys.otpAttemptFail(email);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  // IP-based rate limiting - disabled if no Redis
  async incrementIPSendCount(ip: string): Promise<number> {
    if (!this.redis) return 0;
    const key = RedisKeys.otpIpSentCount(ip);
    const count = await this.redis.incr(key);

    // Set expiry to 1 hour on first increment
    if (count === 1) {
      await this.redis.expire(key, 3600); // 1 hour
    }

    return count;
  }

  async getIPSendCount(ip: string): Promise<number> {
    if (!this.redis) return 0;
    const key = RedisKeys.otpIpSentCount(ip);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async setIPLock(ip: string): Promise<void> {
    if (!this.redis) return;
    const key = RedisKeys.otpIpLimit(ip);
    await this.redis.setex(key, OTP_LIMITS.IP_LOCK_MINUTES * 60, '1');
  }

  async checkIPLock(ip: string): Promise<boolean> {
    if (!this.redis) return false;
    const key = RedisKeys.otpIpLimit(ip);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  // Cleanup utility - disabled if no Redis
  async cleanup(email: string, type: 'otp' | 'password_reset' = 'otp'): Promise<void> {
    if (!this.redis) return;
    const keys =
      type === 'otp'
        ? [
            RedisKeys.otp(email),
            RedisKeys.otpCooldown(email),
            RedisKeys.otpAttempts(email),
            RedisKeys.otpLock(email),
            RedisKeys.otpSentCount(email),
            RedisKeys.otpAttemptFail(email),
          ]
        : [
            RedisKeys.passwordResetOtp(email),
            RedisKeys.passwordResetCooldown(email),
            RedisKeys.passwordResetAttempts(email),
            RedisKeys.passwordResetLock(email),
            RedisKeys.passwordResetVerified(email),
          ];

    await this.redis.del(...keys);
  }

  // Enhanced cleanup for all OTP-related keys including IP - disabled if no Redis
  async cleanupAll(email: string, ip?: string): Promise<void> {
    if (!this.redis) return;
    const keys = [
      RedisKeys.otp(email),
      RedisKeys.otpCooldown(email),
      RedisKeys.otpAttempts(email),
      RedisKeys.otpLock(email),
      RedisKeys.otpSentCount(email),
      RedisKeys.otpAttemptFail(email),
    ];

    if (ip) {
      keys.push(RedisKeys.otpIpSentCount(ip));
    }

    await this.redis.del(...keys);
  }
}
