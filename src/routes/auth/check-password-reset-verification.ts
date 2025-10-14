import { Hono } from 'hono';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../utils/response-builder';

const app = new Hono();

const CheckPasswordResetVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// POST /api/auth/check-password-reset-verification
app.post('/', zValidator('json', CheckPasswordResetVerificationSchema), async c => {
  try {
    const { email } = c.req.valid('json');
    const authService = new AuthService(c.env);

    const result = await authService.checkPasswordResetVerification(email);

    return c.json(successResponse(result), 200);
  } catch (error) {
    console.error('Check password reset verification error:', error);

    if (error instanceof Error) {
      return c.json(errorResponse(error.message), 400);
    }

    return c.json(errorResponse('Failed to check verification status'), 500);
  }
});

export default app;
