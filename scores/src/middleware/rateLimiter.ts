/**
 * Rate Limiting Middleware for Scores Service
 * Uses shared @mirubato/workers-utils package
 */

import { Context } from 'hono'
import {
  rateLimit,
  createRateLimiters,
  type RateLimitOptions,
} from '@mirubato/workers-utils'

// Re-export for backward compatibility
export { rateLimit, type RateLimitOptions }

/**
 * Pre-configured rate limiters for scores service
 */
export const rateLimiters = createRateLimiters({
  // For expensive operations like PDF rendering
  strict: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message:
      'Rate limit exceeded for expensive operation. Please try again later.',
  },

  // For normal API endpoints
  standard: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  },

  // For authenticated users (using user ID as key)
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    keyGenerator: (c: Context) =>
      c.get('userId') || c.req.header('cf-connecting-ip') || 'anonymous',
  },

  // Per-score rate limiting
  perScore: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute per score
    keyGenerator: (c: Context) => {
      const scoreId = c.req.param('scoreId') || 'unknown'
      const ip = c.req.header('cf-connecting-ip') || 'anonymous'
      return `${ip}:${scoreId}`
    },
  },
})
