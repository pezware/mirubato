import { HTTPException } from 'hono/http-exception'

/**
 * Custom API error class
 */
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Common error responses
 */
export const Errors = {
  // Auth errors
  InvalidCredentials: () =>
    new HTTPException(401, { message: 'Invalid credentials' }),
  InvalidToken: () =>
    new HTTPException(401, { message: 'Invalid or expired token' }),
  TokenExpired: () => new HTTPException(401, { message: 'Token has expired' }),
  Unauthorized: () => new HTTPException(401, { message: 'Unauthorized' }),

  // Validation errors
  InvalidInput: (message: string) => new HTTPException(400, { message }),
  MissingField: (field: string) =>
    new HTTPException(400, { message: `Missing required field: ${field}` }),
  InvalidEmail: () =>
    new HTTPException(400, { message: 'Invalid email address' }),

  // Rate limiting
  RateLimitExceeded: () =>
    new HTTPException(429, { message: 'Too many requests' }),

  // Sync errors
  SyncConflict: (message: string) => new HTTPException(409, { message }),
  InvalidSyncToken: () =>
    new HTTPException(400, { message: 'Invalid sync token' }),

  // Server errors
  InternalError: (message = 'Internal server error') =>
    new HTTPException(500, { message }),
  DatabaseError: () => new HTTPException(500, { message: 'Database error' }),

  // Not found
  NotFound: (resource: string) =>
    new HTTPException(404, { message: `${resource} not found` }),
  UserNotFound: () => new HTTPException(404, { message: 'User not found' }),
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: Error) {
  if (error instanceof APIError) {
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
    }
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  return {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  }
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      // Convert other errors to APIError
      throw Errors.InternalError(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }) as T
}
