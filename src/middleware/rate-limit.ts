import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRedis } from '../lib/redis';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (c: Context) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

// General rate limiting middleware
export const rateLimit = (options: RateLimitOptions) => {
  return async (c: Context, next: Next) => {
    const redis = getRedis(c.env?.REDIS_URL);

    // Generate key for rate limiting
    const key = options.keyGenerator
      ? options.keyGenerator(c)
      : `rate_limit:${
          c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
        }`;

    try {
      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      // Check if limit exceeded
      if (count >= options.maxRequests) {
        throw new HTTPException(429, {
          message: options.message || 'Too many requests, please try again later.',
        });
      }

      // Increment counter
      const newCount = await redis.incr(key);

      // Set expiry on first request
      if (newCount === 1) {
        await redis.pexpire(key, options.windowMs);
      }

      // Add rate limit headers
      c.header('X-RateLimit-Limit', options.maxRequests.toString());
      c.header('X-RateLimit-Remaining', Math.max(0, options.maxRequests - newCount).toString());
      c.header('X-RateLimit-Reset', new Date(Date.now() + options.windowMs).toISOString());

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }

      // If Redis fails, allow the request but log the error
      console.error('Rate limiting error:', error);
      await next();
    }
  };
};

// Specific rate limiters for different endpoints

// Login rate limiting (per IP)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: c =>
    `login_rate_limit:${
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    }`,
  message: 'Too many login attempts, please try again in 15 minutes.',
});

// Registration rate limiting (per IP)
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 registrations per hour
  keyGenerator: c =>
    `register_rate_limit:${
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    }`,
  message: 'Too many registration attempts, please try again in 1 hour.',
});

// OTP request rate limiting (per IP)
export const otpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // 10 OTP requests per hour
  keyGenerator: c =>
    `otp_rate_limit:${
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    }`,
  message: 'Too many OTP requests, please try again in 1 hour.',
});

// Password reset rate limiting (per IP)
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 password reset attempts per hour
  keyGenerator: c =>
    `password_reset_rate_limit:${
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    }`,
  message: 'Too many password reset attempts, please try again in 1 hour.',
});

// General API rate limiting (per IP)
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  keyGenerator: c =>
    `api_rate_limit:${
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    }`,
  message: 'Too many API requests, please try again later.',
});

// Strict rate limiting for sensitive operations
export const strictRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // 3 requests per 5 minutes
  keyGenerator: c =>
    `strict_rate_limit:${
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    }`,
  message: 'Too many requests for this sensitive operation, please try again in 5 minutes.',
});

// User-specific rate limiting (for authenticated users)
export const userRateLimit = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return rateLimit({
    ...options,
    keyGenerator: c => {
      const user = c.get('user');
      if (user) {
        return `user_rate_limit:${user.id}`;
      }
      // Fallback to IP-based rate limiting for unauthenticated users
      return `ip_rate_limit:${
        c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      }`;
    },
  });
};

// Email-specific rate limiting
export const emailRateLimit = (windowMs: number, maxRequests: number, message?: string) => {
  return async (c: Context, next: Next) => {
    const body = await c.req.json();
    const email = body?.email;

    if (!email) {
      await next();
      return;
    }

    const redis = getRedis(c.env?.REDIS_URL);
    const key = `email_rate_limit:${email}`;

    try {
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        throw new HTTPException(429, {
          message: message || 'Too many requests for this email, please try again later.',
        });
      }

      const newCount = await redis.incr(key);

      if (newCount === 1) {
        await redis.pexpire(key, windowMs);
      }

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }

      console.error('Email rate limiting error:', error);
      await next();
    }
  };
};
