import { Hono } from 'hono';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { errorResponse, successResponse } from '../../utils/response-builder';
import { z } from 'zod';

const app = new Hono();

// Schema for resend verification request
const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// POST /api/auth/resend-verification
app.post('/', zValidator('json', ResendVerificationSchema), async c => {
  try {
    const input = c.req.valid('json');
    const authService = new AuthService(c.env);

    const result = await authService.sendVerificationOTP(input.email);

    return c.json(successResponse(result, 'Verification email sent successfully'), 200);
  } catch (error) {
    console.error('Resend verification error:', error);

    if (error instanceof Error) {
      return c.json(errorResponse(error.message), 400);
    }

    return c.json(errorResponse('Failed to resend verification email'), 500);
  }
});

export default app;
