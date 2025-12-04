/**
 * Rate Limiting Middleware for Dictionary API
 * Uses shared @mirubato/workers-utils package with service-specific configurations
 */

// Re-export everything from shared package
// The shared package uses a minimal RateLimitEnv interface that requires only CACHE
// Dictionary's Env extends this, so the middleware is compatible
export {
  rateLimit,
  tieredRateLimit,
  slidingWindowRateLimit,
  progressiveRateLimit,
  type RateLimitOptions,
  type RateLimitEnv,
} from '@mirubato/workers-utils'
