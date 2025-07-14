/**
 * Environment types for Cloudflare Workers
 */

import type { Ai } from '@cloudflare/ai'

export interface Env {
  // D1 Database
  DB: D1Database

  // KV Namespace for caching
  CACHE: KVNamespace

  // R2 Bucket for exports
  STORAGE: R2Bucket

  // Cloudflare AI
  AI: Ai

  // Environment variables
  QUALITY_THRESHOLD: string
  CACHE_TTL: string
  ENVIRONMENT: string
  API_SERVICE_URL: string
  CORS_ORIGIN?: string
  LOG_LEVEL?: string

  // API Keys (secrets)
  JWT_SECRET?: string
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GOOGLE_API_KEY?: string
  METRICS_API_KEY?: string

  // Optional services
  QUEUE?: Queue // For batch processing
  DURABLE_OBJECTS?: DurableObjectNamespace // For rate limiting

  // Add index signature for Hono compatibility
  [key: string]: unknown
}

// Context variables that will be set by middleware
export interface Variables {
  userId?: string
  userRoles?: string[]
  user?: any
  apiKey?: any
  userEmail?: string
  userScopes?: string[]
  userTier?: string
  jwtPayload?: any
  apiKeyId?: string
  apiKeyName?: string
  apiKeyScopes?: string[]
  serviceName?: string
  // Validation
  validatedQuery?: any
  validatedParams?: any
  validatedBody?: any
  // Request tracking
  requestId?: string
}

export interface Context {
  env: Env
  request: Request
  waitUntil: (promise: Promise<any>) => void
  passThroughOnException: () => void
}
