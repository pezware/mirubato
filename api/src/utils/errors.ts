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
