import { Hono } from 'hono';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { VerifyOTPSchema } from '../../types/auth';
import { AppError } from '../../utils/error-handler';
import { errorResponse, successResponse } from '../../utils/response-builder';

const app = new Hono();

// POST /api/auth/verify
app.post('/', zValidator('json', VerifyOTPSchema), async c => {
  try {
    const input = c.req.valid('json');
    const authService = new AuthService(c.env);

    const result = await authService.verifyOTP(input);

    return c.json(successResponse(result, 'Email verified successfully'), 200);
  } catch (error) {
    if (error instanceof AppError) {
      let userFriendlyMessage = error.message;
      let errorCode = 'VERIFICATION_FAILED';
      let remainingAttempts: number | undefined;
      let lockDuration: number | undefined;

      // Improve error messages for better user experience
      if (error.message.includes('attempts remaining')) {
        const match = error.message.match(/(\d+) attempts remaining/);
        if (match) {
          remainingAttempts = parseInt(match[1], 10);
          errorCode = 'OTP_INVALID';
          if (remainingAttempts === 1) {
            userFriendlyMessage = `Invalid verification code. You have 1 attempt remaining before your account is temporarily locked for security.`;
          } else {
            userFriendlyMessage = `Invalid verification code. You have ${remainingAttempts} attempts remaining.`;
          }
        }
      } else if (error.message.includes('locked')) {
        errorCode = 'ACCOUNT_LOCKED';
        const lockMatch = error.message.match(/(\d+) minutes/);
        if (lockMatch) {
          lockDuration = parseInt(lockMatch[1], 10);
          userFriendlyMessage = `For security reasons, your account has been temporarily locked due to multiple incorrect attempts. Please try again in ${lockDuration} minutes.`;
        }
      } else if (error.message.includes('expired')) {
        errorCode = 'OTP_EXPIRED';
        userFriendlyMessage =
          'Your verification code has expired. Please request a new verification code to continue.';
      } else if (error.message.includes('not found')) {
        errorCode = 'OTP_NOT_FOUND';
        userFriendlyMessage =
          'No verification code found for your email. Please request a new verification code.';
      }

      return c.json(
        errorResponse(userFriendlyMessage, {
          errorCode,
          remainingAttempts,
          lockDuration,
          canRetry: remainingAttempts ? remainingAttempts > 0 : false,
        }),
        error.statusCode as any
      );
    }

    if (error instanceof Error) {
      return c.json(errorResponse('Verification failed. Please try again.', undefined, 400), 400);
    }

    return c.json(errorResponse('Verification failed. Please try again.', undefined, 500), 500);
  }
});

export default app;
