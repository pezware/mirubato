/**
 * Error handling utilities
 */

import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ApiError, ApiResponse } from '../types/api'

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
  constructor(message: string, provider?: string, details?: Record<string, unknown>) {
    super('AI_SERVICE_ERROR', message, 503, { provider, ...details })
  }
}

// Alias for consistency with handlers
export class APIError extends DictionaryError {
  constructor(message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super('API_ERROR', message, statusCode, details)
  }
}

export const errorHandler = (err: Error, c: Context): Response => {
  console.error('Error:', err)
  console.error('Error stack:', err.stack)

  // Handle HTTPException from Hono
  if (err instanceof HTTPException) {
    const response: ApiResponse<never> = {
      status: 'error',
      error: {
        code: 'HTTP_ERROR',
        message: err.message,
        timestamp: new Date().toISOString()
      }
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
        timestamp: new Date().toISOString()
      }
    }
    
    // Add rate limit headers if applicable
    if (err instanceof RateLimitError && err.details?.retry_after) {
      c.header('Retry-After', err.details.retry_after.toString())
    }
    
    return c.json(response, err.statusCode as any)
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as any
    const response: ApiResponse<never> = {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: zodError.errors || [],
        timestamp: new Date().toISOString()
      }
    }
    return c.json(response, 400 as any)
  }

  // Generic error response
  const response: ApiResponse<never> = {
    status: 'error',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  }
  
  return c.json(response, 500 as any)
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler<T = unknown>(
  handler: (c: Context) => Promise<Response>
) {
  return async (c: Context): Promise<Response> => {
    try {
      return await handler(c)
    } catch (error) {
      throw error // Will be caught by the error handler
    }
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
      ...meta
    }
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
      stack: error.stack
    },
    context,
    timestamp: new Date().toISOString()
  })
}