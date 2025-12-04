/**
 * Shared error handling utilities for Cloudflare Workers
 */

import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

/**
 * Standard API response structure
 */
export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
    timestamp: string
  }
  meta?: {
    request_id: string
    timestamp: string
    version: string
    latency_ms: number
  }
}

/**
 * Base error class for all Worker services
 */
export class WorkerError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'WorkerError'
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('NOT_FOUND', message, 404, details)
    this.name = 'NotFoundError'
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', message, 401, details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization/permission error (403)
 */
export class AuthorizationError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, 403, details)
    this.name = 'AuthorizationError'
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends WorkerError {
  constructor(message: string, retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', message, 429, { retry_after: retryAfter })
    this.name = 'RateLimitError'
  }
}

/**
 * External service error (503)
 */
export class ServiceError extends WorkerError {
  constructor(
    message: string,
    service?: string,
    details?: Record<string, unknown>
  ) {
    super('SERVICE_ERROR', message, 503, { service, ...details })
    this.name = 'ServiceError'
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends WorkerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('INTERNAL_ERROR', message, 500, details)
    this.name = 'InternalError'
  }
}

/**
 * Generic API error with configurable status code
 */
export class APIError extends WorkerError {
  constructor(
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super('API_ERROR', message, statusCode, details)
    this.name = 'APIError'
  }
}

/**
 * Environment type for error handler
 */
interface ErrorHandlerEnv {
  LOG_LEVEL?: string
  ENVIRONMENT?: string
}

/**
 * Centralized error handler for Hono applications
 */
export function createErrorHandler<T extends ErrorHandlerEnv>() {
  return (err: Error, c: Context<{ Bindings: T }>): Response => {
    const env = c.env as ErrorHandlerEnv

    // Log error details based on LOG_LEVEL
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
    if (err instanceof WorkerError) {
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
        c.header('Retry-After', String(err.details.retry_after))
      }

      return c.json(
        response,
        err.statusCode as 400 | 401 | 403 | 404 | 429 | 500 | 503
      )
    }

    // Handle Zod validation errors
    if (err.name === 'ZodError') {
      const zodError = err as { errors?: unknown[] }
      const response: ApiResponse<never> = {
        status: 'error',
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { errors: zodError.errors || [] },
          timestamp: new Date().toISOString(),
        },
      }
      return c.json(response, 400)
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

    return c.json(response, 500)
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
