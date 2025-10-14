import { Hono } from 'hono';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { VerifyOTPSchema } from '../../types/auth';
import { AppError } from '../../utils/error-handler';
import { errorResponse, successResponse, otpErrorResponse } from '../../utils/response-builder';

const app = new Hono();

// Helper function to get client IP
const getClientIP = (c: any): string => {
  const forwarded = c.req.header('x-forwarded-for');
  const realIP = c.req.header('x-real-ip');
  const cfConnectingIP = c.req.header('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  return c.env?.CF_CONNECTING_IP || 'unknown';
};

// POST /api/auth/verify-forgot-password-enhanced
app.post('/', zValidator('json', VerifyOTPSchema), async c => {
  try {
    const input = c.req.valid('json');
    const clientIP = getClientIP(c);
    const authService = new AuthService(c.env);

    // Enhanced forgot password OTP verification with detailed error handling
    const result = await authService.verifyForgotPasswordOTPEnhanced(input, clientIP);

    return c.json(successResponse(result, 'OTP verified successfully'), 200);
  } catch (error) {
    if (error instanceof AppError) {
      let statusCode = error.statusCode;
      let errorCode = 'VERIFICATION_FAILED';
      let userFriendlyMessage = 'Verification failed. Please try again.';
      let remainingAttempts: number | undefined;
      let lockDuration: number | undefined;

      // Parse error message for specific error types
      if (error.message.includes('Invalid OTP') && error.message.includes('attempts remaining')) {
        errorCode = 'OTP_INVALID';
        statusCode = 400;
        userFriendlyMessage = error.message;

        // Extract remaining attempts from error message
        const attemptsMatch = error.message.match(/(\d+) attempts remaining/);
        if (attemptsMatch) {
          remainingAttempts = parseInt(attemptsMatch[1], 10);
        }
      } else if (error.message.includes('OTP expired') || error.message.includes('not found')) {
        errorCode = 'OTP_EXPIRED';
        statusCode = 400;
        userFriendlyMessage = 'Your verification code has expired. Please request a new one.';
      } else if (error.message.includes('Invalid OTP format')) {
        errorCode = 'OTP_INVALID_FORMAT';
        statusCode = 400;
        userFriendlyMessage = 'Please enter a valid 6-digit verification code.';
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
      } else if (error.message.includes('User not found')) {
        errorCode = 'USER_NOT_FOUND';
        statusCode = 404;
        userFriendlyMessage = 'User not found. Please check your email address.';
      }

      return c.json(
        otpErrorResponse(errorCode, userFriendlyMessage, statusCode, remainingAttempts, lockDuration),
        statusCode as any
      );
    }

    console.error('Verify forgot password enhanced error:', error);

    if (error instanceof Error) {
      return c.json(errorResponse(error.message), 400);
    }

    return c.json(errorResponse('Failed to verify OTP'), 500);
  }
});

export default app;
