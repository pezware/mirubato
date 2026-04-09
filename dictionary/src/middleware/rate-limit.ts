/**
 * Rate Limiting Middleware for Dictionary API
 * Wraps shared @mirubato/workers-utils rate limiters with the app's full Hono env type.
 * Workers-utils uses a minimal RateLimitEnv (only CACHE), which is structurally compatible
 * with Dictionary's Env but Hono 4.12.12 requires exact generic matches.
 */

import type { MiddlewareHandler } from 'hono'
import {
  rateLimit as baseRateLimit,
  tieredRateLimit as baseTieredRateLimit,
  slidingWindowRateLimit as baseSlidingWindowRateLimit,
  progressiveRateLimit as baseProgressiveRateLimit,
  type RateLimitOptions,
  type RateLimitEnv,
} from '@mirubato/workers-utils'
import type { Env, Variables } from '../types/env'

type AppEnv = { Bindings: Env; Variables: Variables }

export type { RateLimitOptions, RateLimitEnv }

export function rateLimit(
  options: RateLimitOptions
): MiddlewareHandler<AppEnv> {
  return baseRateLimit(options) as unknown as MiddlewareHandler<AppEnv>
}

export function tieredRateLimit(
  options: Parameters<typeof baseTieredRateLimit>[0]
): MiddlewareHandler<AppEnv> {
  return baseTieredRateLimit(options) as unknown as MiddlewareHandler<AppEnv>
}

export function slidingWindowRateLimit(
  options: Parameters<typeof baseSlidingWindowRateLimit>[0]
): MiddlewareHandler<AppEnv> {
  return baseSlidingWindowRateLimit(
    options
  ) as unknown as MiddlewareHandler<AppEnv>
}

export function progressiveRateLimit(
  options: Parameters<typeof baseProgressiveRateLimit>[0]
): MiddlewareHandler<AppEnv> {
  return baseProgressiveRateLimit(
    options
  ) as unknown as MiddlewareHandler<AppEnv>
}
