// src/lib/error-handler.ts - Centralized error handling

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logError } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

export function handleError(error: unknown, context?: string): NextResponse {
  // Log the error
  const errorContext = context || 'API Error';
  logError(`${errorContext}: ${error instanceof Error ? error.message : 'Unknown error'}`, error);

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(issue.message);
    });

    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: 'A record with this value already exists',
            code: 'UNIQUE_CONSTRAINT_ERROR',
            details: { field: error.meta?.target },
          },
          { status: 409 }
        );
      case 'P2025':
        return NextResponse.json(
          {
            error: 'Record not found',
            code: 'NOT_FOUND',
          },
          { status: 404 }
        );
      case 'P2003':
        return NextResponse.json(
          {
            error: 'Foreign key constraint failed',
            code: 'FOREIGN_KEY_ERROR',
            details: { field: error.meta?.field_name },
          },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          {
            error: 'Database error',
            code: 'DATABASE_ERROR',
          },
          { status: 500 }
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        error: 'Invalid data provided',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;

    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }

  // Unknown error
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  );
}

// Async error wrapper
export function asyncHandler(
  handler: (...args: any[]) => Promise<NextResponse>
) {
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}

// Error response helpers
export function successResponse(data: any, status: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      details,
    },
    { status }
  );
}
