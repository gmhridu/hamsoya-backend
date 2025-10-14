import { Hono } from 'hono';
import { zValidator } from '../../lib/zod-validator-fix';
import { AuthService } from '../../services/auth.service';
import { RegisterSchema } from '../../types/auth';
import { AppError } from '../../utils/error-handler';
import { errorResponse, successResponse } from '../../utils/response-builder';

const app = new Hono();

// POST /api/auth/register
app.post('/', zValidator('json', RegisterSchema), async c => {
  try {
    const input = c.req.valid('json');
    const authService = new AuthService(c.env);

    const result = await authService.register(input);

    return c.json(successResponse(result, 'User registered successfully'), 201);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        errorResponse(error.message, undefined, error.statusCode),
        error.statusCode as any
      );
    }

    if (error instanceof Error) {
      return c.json(errorResponse(error.message, undefined, 400), 400);
    }

    return c.json(errorResponse('Registration failed', undefined, 500), 500);
  }
});

export default app;
