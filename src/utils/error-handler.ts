import { TRPCError } from '@trpc/server';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleError = (error: unknown): TRPCError => {
  console.error('❌ Error occurred:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Validation failed',
      cause: error.issues,
    });
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    const code =
      error.statusCode >= 500
        ? 'INTERNAL_SERVER_ERROR'
        : error.statusCode === 401
        ? 'UNAUTHORIZED'
        : error.statusCode === 403
        ? 'FORBIDDEN'
        : error.statusCode === 404
        ? 'NOT_FOUND'
        : 'BAD_REQUEST';

    return new TRPCError({
      code,
      message: error.message,
    });
  }

  // Handle JWT errors
  if (error instanceof Error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }

    // Handle database constraint errors
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return new TRPCError({
        code: 'CONFLICT',
        message: 'Resource already exists',
      });
    }
  }

  // Generic server error
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
};
