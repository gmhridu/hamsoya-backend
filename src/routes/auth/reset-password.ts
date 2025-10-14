import { Hono } from 'hono';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { ResetPasswordSchema } from '../../types/auth';
import { errorResponse, successResponse } from '../../utils/response-builder';

const app = new Hono();

// POST /api/auth/reset-password
app.post('/', zValidator('json', ResetPasswordSchema), async c => {
  try {
    const input = c.req.valid('json');
    const authService = new AuthService(c.env);

    const result = await authService.resetPassword(input);

    return c.json(successResponse(result), 200);
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof Error) {
      return c.json(errorResponse(error.message), 400);
    }

    return c.json(errorResponse('Failed to reset password'), 500);
  }
});

export default app;
