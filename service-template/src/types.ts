import type { D1Database, KVNamespace, R2Bucket, Queue, Ai } from '@cloudflare/workers-types'
import type { Context as HonoContext } from 'hono'

/**
 * Cloudflare Worker Environment bindings
 */
export interface Env {
  // Core bindings
  DB: D1Database
  CACHE: KVNamespace

  // Optional bindings (uncomment as needed)
  // STORAGE_BUCKET: R2Bucket
  // QUEUE: Queue
  // AI: Ai

  // Secrets (set via wrangler secret)
  JWT_SECRET: string

  // Environment variables
  ENVIRONMENT: 'local' | 'development' | 'staging' | 'production'
  CORS_ORIGIN: string
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Extended Hono context with JWT payload
 */
export interface AuthContext extends HonoContext<{ Bindings: Env }> {
  get: {
    (key: 'jwtPayload'): JWTPayload | undefined
  }
}

/**
 * JWT payload structure (matches Mirubato auth)
 */
export interface JWTPayload {
  sub: string // user ID
  email: string
  name?: string
  exp: number
  iat: number
}

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Standard health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: boolean
    cache: boolean
    storage?: boolean
  }
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}
