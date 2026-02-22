/**
 * Error handling utilities
 */

import { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { HTTPException } from 'hono/http-exception'
import { ApiResponse } from '../types/api'

export class DictionaryError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DictionaryError'
  }
}

export class ValidationError extends DictionaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

export class NotFoundError extends DictionaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('NOT_FOUND', message, 404, details)
  }
}

export class AuthenticationError extends DictionaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', message, 401, details)
  }
}

export class AuthorizationError extends DictionaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, 403, details)
  }
}

export class RateLimitError extends DictionaryError {
  constructor(message: string, retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', message, 429, { retry_after: retryAfter })
  }
}

export class AIServiceError extends DictionaryError {
  constructor(
    message: string,
    provider?: string,
    details?: Record<string, unknown>
  ) {
    super('AI_SERVICE_ERROR', message, 503, { provider, ...details })
  }
}

export class InternalError extends DictionaryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INTERNAL_ERROR', message, 500, details)
  }
}

// Alias for consistency with handlers
export class APIError extends DictionaryError {
  constructor(
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super('API_ERROR', message, statusCode, details)
  }
}

export const errorHandler = (err: Error, c: Context): Response => {
  // Log error details based on LOG_LEVEL
  const env = c.env as Record<string, unknown>
  if (env.LOG_LEVEL === 'debug' || env.ENVIRONMENT !== 'production') {
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
      timestamp: new Date().toISOString(),
    })
  } else {
    console.error(`Error: ${err.message} at ${c.req.method} ${c.req.path}`)
  }

  // Handle HTTPException from Hono
  if (err instanceof HTTPException) {
    const response: ApiResponse<never> = {
      status: 'error',
      error: {
        code: 'HTTP_ERROR',
        message: err.message,
        timestamp: new Date().toISOString(),
      },
    }
    return c.json(response, err.status)
  }

  // Handle our custom errors
  if (err instanceof DictionaryError) {
    const response: ApiResponse<never> = {
      status: 'error',
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      },
    }

    // Add rate limit headers if applicable
    if (err instanceof RateLimitError && err.details?.retry_after) {
      c.header('Retry-After', err.details.retry_after.toString())
    }

    return c.json(response, err.statusCode as ContentfulStatusCode)
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as Error & { errors?: unknown[] }
    const response: ApiResponse<never> = {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: { errors: zodError.errors || [] },
        timestamp: new Date().toISOString(),
      },
    }
    return c.json(response, 400 as ContentfulStatusCode)
  }

  // Generic error response
  const response: ApiResponse<never> = {
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
  }

  return c.json(response, 500 as ContentfulStatusCode)
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(handler: (c: Context) => Promise<Response>) {
  return async (c: Context): Promise<Response> => {
    return await handler(c)
  }
}

/**
 * Create a standardized API response
 */
export function createApiResponse<T>(
  data: T,
  meta?: Partial<ApiResponse<T>['meta']>
): ApiResponse<T> {
  return {
    status: 'success',
    data,
    meta: {
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      latency_ms: 0, // Will be set by timing middleware
      ...meta,
    },
  }
}

/**
 * Log errors with context
 */
export function logError(
  error: Error,
  context: {
    request_id?: string
    user_id?: string
    operation?: string
    [key: string]: unknown
  }
): void {
  console.error('Error occurred:', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    timestamp: new Date().toISOString(),
  })
}
