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

    console.log(`[REGISTER] Attempting registration for email: ${input.email}`);

    const result = await authService.register(input);

    console.log(`[REGISTER] Registration successful for email: ${input.email}`);

    return c.json(successResponse(result, 'User registered successfully'), 201);
  } catch (error) {
    console.error(`[REGISTER] Registration failed for email: ${c.req.valid('json')?.email || 'unknown'}`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        NODE_ENV: (c.env as any)?.NODE_ENV || process.env.NODE_ENV,
        hasSMTPCredentials: !!((c.env as any)?.SMTP_USER && (c.env as any)?.SMTP_PASSWORD),
        hasJWTSecrets: !!((c.env as any)?.JWT_ACCESS_SECRET && (c.env as any)?.JWT_REFRESH_SECRET),
      }
    });

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
