import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export const errorHandler = (err: Error, c: Context) => {
  console.error('❌ Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation Error',
        details: err.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    );
  }

  // Handle HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        status: err.status,
      },
      err.status
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return c.json(
      {
        error: 'Invalid token',
        message: 'Authentication failed',
      },
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    return c.json(
      {
        error: 'Token expired',
        message: 'Please refresh your token',
      },
      401
    );
  }

  // Handle database errors
  if (err.message.includes('duplicate key')) {
    return c.json(
      {
        error: 'Duplicate Entry',
        message: 'Resource already exists',
      },
      409
    );
  }

  // Generic server error
  return c.json(
    {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    },
    500
  );
};
