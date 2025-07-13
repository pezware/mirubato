import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'

interface CacheOptions {
  maxAge?: number // seconds
  sMaxAge?: number // edge cache seconds
  staleWhileRevalidate?: number
  public?: boolean
  immutable?: boolean
  mustRevalidate?: boolean
}

/**
 * Cache control middleware
 * Sets appropriate cache headers based on content type
 */
export const cacheControl = (options: CacheOptions = {}) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    await next()

    // Don't cache errors or non-success responses
    if (c.res.status >= 400) {
      c.header('Cache-Control', 'no-store')
      return
    }

    const directives: string[] = []

    if (options.public !== false) {
      directives.push('public')
    }

    if (options.maxAge !== undefined) {
      directives.push(`max-age=${options.maxAge}`)
    }

    if (options.sMaxAge !== undefined) {
      directives.push(`s-maxage=${options.sMaxAge}`)
    }

    if (options.staleWhileRevalidate !== undefined) {
      directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
    }

    if (options.immutable) {
      directives.push('immutable')
    }

    if (options.mustRevalidate) {
      directives.push('must-revalidate')
    }

    if (directives.length > 0) {
      c.header('Cache-Control', directives.join(', '))
    }
  })
}

/**
 * Edge cache middleware using Cache API
 */
export const edgeCache = (options: { ttl: number }) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    // Skip caching for non-GET requests
    if (c.req.method !== 'GET') {
      await next()
      return
    }

    // Skip caching for authenticated requests
    if (c.req.header('Authorization')) {
      await next()
      return
    }

    const cache = caches.default
    const cacheKey = new Request(c.req.url, {
      method: 'GET',
      headers: { 'Cache-Control': 'max-age=' + options.ttl },
    })

    // Check cache
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      // Add cache hit header
      const response = new Response(cachedResponse.body, cachedResponse)
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Process request
    await next()

    // Cache successful responses
    if (c.res.status === 200) {
      const response = c.res.clone()
      response.headers.set('X-Cache', 'MISS')

      // Store in cache
      c.executionCtx.waitUntil(cache.put(cacheKey, response))
    }
  })
}

/**
 * KV cache middleware for expensive operations
 */
export const kvCache = (options: { key: string; ttl: number }) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const cacheKey = `cache:${options.key}:${c.req.url}`

    // Try to get from cache
    const cached = await c.env.CACHE.get(cacheKey, 'json')
    if (cached) {
      c.header('X-Cache', 'HIT')
      return c.json(cached)
    }

    // Process request
    await next()

    // Cache successful JSON responses
    if (c.res.status === 200) {
      const contentType = c.res.headers.get('Content-Type')
      if (contentType?.includes('application/json')) {
        const data = await c.res.json()

        // Store in KV
        c.executionCtx.waitUntil(
          c.env.CACHE.put(cacheKey, JSON.stringify(data), {
            expirationTtl: options.ttl,
          })
        )

        // Return new response with cache header
        c.header('X-Cache', 'MISS')
        return c.json(data)
      }
    }
  })
}

/**
 * Preset cache configurations
 */
export const cachePresets = {
  // No caching
  noStore: cacheControl({ maxAge: 0 }),

  // Static assets (1 year)
  static: cacheControl({
    maxAge: 31536000,
    immutable: true,
    public: true,
  }),

  // Dynamic content (1 minute browser, 5 minutes edge)
  dynamic: cacheControl({
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
  }),

  // API responses (no browser cache, 1 minute edge)
  api: cacheControl({
    maxAge: 0,
    sMaxAge: 60,
    mustRevalidate: true,
  }),
}
