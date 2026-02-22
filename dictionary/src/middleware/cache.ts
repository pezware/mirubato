/**
 * Cache Middleware for Dictionary API
 */

import { Context, Next } from 'hono'
import { Env } from '../types/env'
import { CacheService } from '../services/storage/cache-service'

export interface CacheOptions {
  ttl?: number
  key?: (c: Context) => string
  condition?: (c: Context) => boolean
  varyBy?: string[]
}

/**
 * Cache middleware for GET requests
 */
export function cache(options: CacheOptions = {}) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      return await next()
    }

    // Check condition if provided
    if (options.condition && !options.condition(c)) {
      return await next()
    }

    // const cacheService = new CacheService(c.env.CACHE, c.env)

    // Generate cache key
    const cacheKey = options.key
      ? options.key(c)
      : generateCacheKey(c, options.varyBy)

    // Try to get from cache
    try {
      const cached = await c.env.CACHE.get(cacheKey, 'json')

      if (
        cached &&
        typeof cached === 'object' &&
        'data' in cached &&
        'headers' in cached
      ) {
        // Add cache headers
        c.header('X-Cache', 'HIT')
        c.header('X-Cache-Key', cacheKey)

        // Restore cached headers
        const headers = cached.headers as Record<string, string>
        Object.entries(headers).forEach(([key, value]) => {
          if (!key.toLowerCase().startsWith('x-cache')) {
            c.header(key, value)
          }
        })

        return c.json(cached.data as Record<string, unknown>)
      }
    } catch (error) {
      console.error('Cache read error:', error)
      // Continue without cache on error
    }

    // Cache miss - proceed with request
    await next()

    // Don't cache errors or non-JSON responses
    if (
      c.res.status >= 400 ||
      !c.res.headers.get('content-type')?.includes('application/json')
    ) {
      c.header('X-Cache', 'SKIP')
      return
    }

    // Store response in cache
    try {
      const response = await c.res.clone()
      const data = await response.json()

      // Capture relevant headers
      const headers: Record<string, string> = {}
      const headersToCache = ['content-type', 'etag', 'last-modified']

      headersToCache.forEach(header => {
        const value = c.res.headers.get(header)
        if (value) headers[header] = value
      })

      await c.env.CACHE.put(
        cacheKey,
        JSON.stringify({ data, headers }),
        { expirationTtl: options.ttl || 300 } // Default 5 minutes
      )

      c.header('X-Cache', 'MISS')
      c.header('X-Cache-Key', cacheKey)
    } catch (error) {
      console.error('Cache write error:', error)
      // Don't fail the request if caching fails
    }
  }
}

/**
 * Cache invalidation middleware
 */
export function invalidateCache(
  patterns: string[] | ((c: Context) => string[])
) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    await next()

    // Only invalidate on successful mutations
    if (
      c.res.status >= 200 &&
      c.res.status < 300 &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)
    ) {
      try {
        const cacheService = new CacheService(c.env.CACHE, c.env)
        const keysToInvalidate =
          typeof patterns === 'function' ? patterns(c) : patterns

        // Invalidate each pattern
        for (const pattern of keysToInvalidate) {
          if (pattern === 'search:*') {
            await cacheService.invalidateSearches()
          } else if (pattern.startsWith('term:')) {
            const term = pattern.substring(5)
            await cacheService.invalidateTerm(term)
          } else if (pattern.startsWith('id:')) {
            const id = pattern.substring(3)
            await cacheService.invalidateId(id)
          }
        }
      } catch (error) {
        console.error('Cache invalidation error:', error)
        // Don't fail the request if invalidation fails
      }
    }
  }
}

/**
 * Edge cache headers middleware
 */
export function edgeCache(
  options: {
    maxAge?: number
    sMaxAge?: number
    staleWhileRevalidate?: number
    public?: boolean
  } = {}
) {
  return async (c: Context, next: Next) => {
    await next()

    // Only add cache headers for successful GET requests
    if (c.req.method === 'GET' && c.res.status >= 200 && c.res.status < 300) {
      const parts: string[] = []

      if (options.public !== false) {
        parts.push('public')
      }

      if (options.maxAge !== undefined) {
        parts.push(`max-age=${options.maxAge}`)
      }

      if (options.sMaxAge !== undefined) {
        parts.push(`s-maxage=${options.sMaxAge}`)
      }

      if (options.staleWhileRevalidate !== undefined) {
        parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
      }

      if (parts.length > 0) {
        c.header('Cache-Control', parts.join(', '))
      }
    }
  }
}

/**
 * Generate cache key from request
 */
function generateCacheKey(c: Context, varyBy?: string[]): string {
  const url = new URL(c.req.url)
  const parts = [c.req.method, url.pathname]

  // Add query parameters
  if (url.search) {
    const params = new URLSearchParams(url.search)
    const sortedParams = Array.from(params.entries()).sort()
    parts.push(sortedParams.map(([k, v]) => `${k}=${v}`).join('&'))
  }

  // Add vary headers
  if (varyBy) {
    varyBy.forEach(header => {
      const value = c.req.header(header)
      if (value) {
        parts.push(`${header}:${value}`)
      }
    })
  }

  // Add user ID if authenticated
  const userId = c.get('userId')
  if (userId) {
    parts.push(`user:${userId}`)
  }

  return `api:${parts.join(':')}`
}

/**
 * Conditional request middleware (ETags)
 */
export function conditionalRequest() {
  return async (c: Context, next: Next) => {
    await next()

    // Only for successful GET requests
    if (c.req.method !== 'GET' || c.res.status !== 200) {
      return
    }

    // Generate ETag from response
    const response = await c.res.clone()
    const body = await response.text()
    const etag = await generateETag(body)

    // Set ETag header
    c.header('ETag', etag)

    // Check If-None-Match
    const ifNoneMatch = c.req.header('If-None-Match')
    if (ifNoneMatch && ifNoneMatch === etag) {
      return c.body(null, 304)
    }
  }
}

/**
 * Generate ETag from content
 */
async function generateETag(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `"${hashHex.substring(0, 32)}"`
}
