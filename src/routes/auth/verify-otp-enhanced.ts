import { Hono } from 'hono';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { VerifyOTPSchema } from '../../types/auth';
import { AppError } from '../../utils/error-handler';
import { successResponse } from '../../utils/response-builder';

const app = new Hono();

// Helper function to get client IP
const getClientIP = (c: any): string => {
  const forwarded = c.req.header('x-forwarded-for');
  const realIP = c.req.header('x-real-ip');
  const cfConnectingIP = c.req.header('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return c.req.header('remote-addr') || 'unknown';
};

// POST /api/auth/verify-otp
app.post('/', zValidator('json', VerifyOTPSchema), async c => {
  try {
    const input = c.req.valid('json');
    const clientIP = getClientIP(c);
    const authService = new AuthService(c.env);

    // Enhanced OTP verification with brute-force protection
    const result = await authService.verifyOTPEnhanced(input, clientIP);

    return c.json(successResponse(result, 'OTP verified successfully'), 200);
  } catch (error) {
    if (error instanceof AppError) {
      let statusCode = error.statusCode;
      let errorCode = 'VERIFICATION_FAILED';
      let userFriendlyMessage = 'Verification failed. Please try again.';
      let remainingAttempts: number | undefined;
      let lockDuration: number | undefined;

      // Map specific errors to codes and user-friendly messages
      if (error.message.includes('expired')) {
        errorCode = 'OTP_EXPIRED';
        userFriendlyMessage = 'Your verification code has expired. Please request a new one.';
        statusCode = 400;
      } else if (error.message.includes('Invalid OTP')) {
        errorCode = 'OTP_INVALID';
        statusCode = 400;

        // Extract remaining attempts from error message
        const attemptsMatch = error.message.match(/(\d+) attempts remaining/);
        if (attemptsMatch) {
          remainingAttempts = parseInt(attemptsMatch[1], 10);
          if (remainingAttempts === 1) {
            userFriendlyMessage = `Invalid verification code. You have 1 attempt remaining before your account is temporarily locked for security.`;
          } else {
            userFriendlyMessage = `Invalid verification code. You have ${remainingAttempts} attempts remaining.`;
          }
        } else {
          userFriendlyMessage =
            'Invalid verification code. Please double-check your code and try again.';
        }
      } else if (error.message.includes('Too many') || error.message.includes('locked')) {
        errorCode = 'OTP_MAX_ATTEMPTS';
        statusCode = 429;

        // Extract lock duration from error message
        const lockMatch = error.message.match(/(\d+) minutes/);
        if (lockMatch) {
          lockDuration = parseInt(lockMatch[1], 10);
          userFriendlyMessage = `For security reasons, your account has been temporarily locked due to multiple incorrect attempts. Please try again in ${lockDuration} minutes.`;
        } else {
          userFriendlyMessage =
            'For security reasons, your account has been temporarily locked due to multiple incorrect attempts. Please try again later.';
        }
      } else if (error.message.includes('not found')) {
        errorCode = 'OTP_NOT_FOUND';
        userFriendlyMessage = 'Verification code not found. Please request a new one.';
        statusCode = 400;
      } else if (error.message.includes('already verified')) {
        errorCode = 'OTP_ALREADY_VERIFIED';
        userFriendlyMessage = 'This code has already been used. Please request a new one.';
        statusCode = 400;
      } else if (error.message.includes('Registration data expired')) {
        errorCode = 'REGISTRATION_EXPIRED';
        userFriendlyMessage =
          'Your registration session has expired. Please start the registration process again.';
        statusCode = 400;
      }

      // Use enhanced error response with structured data
      const response = {
        success: false,
        error: userFriendlyMessage,
        errorCode,
        userFriendlyMessage,
        remainingAttempts,
        lockDuration,
        statusCode,
        timestamp: new Date().toISOString(),
      };

      return c.json(response, statusCode as any);
    }

    if (error instanceof Error) {
      const response = {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        errorCode: 'INTERNAL_ERROR',
        userFriendlyMessage: 'An unexpected error occurred. Please try again.',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      };
      return c.json(response, 500);
    }

    const response = {
      success: false,
      error: 'Verification failed. Please try again.',
      errorCode: 'VERIFICATION_FAILED',
      userFriendlyMessage: 'Verification failed. Please try again.',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    };
    return c.json(response, 500);
  }
});

export default app;
