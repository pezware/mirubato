/**
 * @mirubato/workers-utils
 * Shared utilities for Cloudflare Workers
 */

// Error handling
export {
  WorkerError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ServiceError,
  InternalError,
  APIError,
  createErrorHandler,
  createApiResponse,
  logError,
} from './errors'

export type { ApiResponse } from './errors'

// Rate limiting
export {
  rateLimit,
  tieredRateLimit,
  slidingWindowRateLimit,
  progressiveRateLimit,
  createRateLimiters,
  defaultRateLimiters,
} from './rate-limit'

export type { RateLimitOptions, RateLimitEnv } from './rate-limit'
