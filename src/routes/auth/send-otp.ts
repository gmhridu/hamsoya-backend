import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { AppError } from '../../utils/error-handler';
import { errorResponse, successResponse } from '../../utils/response-builder';

const app = new Hono();

// Schema for send OTP request
const SendOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Helper function to get client IP
const getClientIP = (c: any): string => {
  // Try various headers for IP detection
  const forwarded = c.req.header('x-forwarded-for');
  const realIP = c.req.header('x-real-ip');
  const cfConnectingIP = c.req.header('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback to connection remote address
  return c.req.header('remote-addr') || 'unknown';
};

// POST /api/auth/send-otp
app.post('/', zValidator('json', SendOTPSchema), async c => {
  try {
    const input = c.req.valid('json');
    const clientIP = getClientIP(c);
    const authService = new AuthService(c.env);

    // Enhanced rate limiting and security checks
    const result = await authService.sendOTPWithRateLimit(input.email, clientIP);

    return c.json(successResponse(result, 'OTP sent successfully'), 200);
  } catch (error) {
    console.error('Send OTP error:', error);

    if (error instanceof AppError) {
      // Map specific error codes to HTTP status codes
      let statusCode = error.statusCode;

      // Rate limiting errors
      if (
        error.message.includes('Too many requests') ||
        error.message.includes('rate limit') ||
        error.message.includes('cooldown')
      ) {
        statusCode = 429;
      }

      // Validation errors
      if (error.message.includes('Invalid email') || error.message.includes('already exists')) {
        statusCode = 400;
      }

      return c.json(errorResponse(error.message, undefined, statusCode), statusCode as any);
    }

    if (error instanceof Error) {
      return c.json(errorResponse(error.message, undefined, 400), 400);
    }

    return c.json(errorResponse('Failed to send OTP', undefined, 500), 500);
  }
});

export default app;
