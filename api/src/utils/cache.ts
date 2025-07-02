import { Context } from 'hono'
import type { Env } from '../index'

/**
 * Cache configuration for different API endpoints
 */
export const API_CACHE_CONFIG = {
  // Autocomplete suggestions (change infrequently)
  autocomplete: {
    browserTTL: 300, // 5 minutes
    edgeTTL: 3600, // 1 hour
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'CDN-Cache-Control': 'public, max-age=3600',
    },
  },
  // Public data (composers, instruments)
  public: {
    browserTTL: 3600, // 1 hour
    edgeTTL: 86400, // 1 day
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'CDN-Cache-Control': 'public, max-age=86400',
    },
  },
  // User-specific data (no caching)
  private: {
    browserTTL: 0,
    edgeTTL: 0,
    headers: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
  // Health checks (brief caching)
  health: {
    browserTTL: 0,
    edgeTTL: 60, // 60 seconds (minimum for KV storage)
    headers: {
      'Cache-Control': 'no-cache',
      'CDN-Cache-Control': 'public, max-age=60',
    },
  },
}

/**
 * Determine if a request should be cached based on the endpoint
 */
export function shouldCacheEndpoint(
  pathname: string
): keyof typeof API_CACHE_CONFIG | null {
  // Autocomplete endpoints
  if (pathname.includes('/autocomplete/')) {
    return 'autocomplete'
  }

  // Public data endpoints
  if (pathname.match(/\/(composers|instruments|genres|difficulties)$/)) {
    return 'public'
  }

  // Health endpoints
  if (pathname.match(/\/(health|livez|readyz)$/)) {
    return 'health'
  }

  // User-specific endpoints (don't cache)
  if (pathname.includes('/users/') || pathname.includes('/practice/')) {
    return null
  }

  // Default: no caching
  return null
}

/**
 * Add appropriate cache headers based on endpoint type
 */
export function addApiCacheHeaders(
  response: Response,
  pathname: string
): Response {
  const cacheType = shouldCacheEndpoint(pathname)

  // Don't cache if no cache type or if it's private
  if (!cacheType || cacheType === 'private') {
    const headers = new Headers(response.headers)
    Object.entries(API_CACHE_CONFIG.private.headers).forEach(([key, value]) => {
      headers.set(key, value)
    })
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  // Apply cache headers for cacheable endpoints
  const cacheConfig = API_CACHE_CONFIG[cacheType]
  const headers = new Headers(response.headers)

  Object.entries(cacheConfig.headers).forEach(([key, value]) => {
    headers.set(key, value)
  })

  // Add Vary header for proper caching
  if (!headers.has('Vary')) {
    headers.set('Vary', 'Accept, Accept-Encoding, Authorization')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Cache middleware for API responses
 */
export async function apiCacheMiddleware(
  c: Context<{ Bindings: Env }>,
  next: () => Promise<void>
) {
  const pathname = new URL(c.req.url).pathname

  // Skip caching for non-GET requests
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  // Skip caching for authenticated requests (unless it's autocomplete)
  const hasAuth =
    c.req.header('Authorization') ||
    c.req.header('Cookie')?.includes('auth-token')
  if (hasAuth && !pathname.includes('/autocomplete/')) {
    await next()
    return
  }

  // Check if this endpoint should be cached
  const cacheType = shouldCacheEndpoint(pathname)
  if (!cacheType) {
    await next()
    return
  }

  // Try to get from KV cache first
  const cacheKey = `api:${pathname}:${c.req.url.split('?')[1] || 'default'}`

  try {
    const cached = await c.env.MUSIC_CATALOG?.get(cacheKey)
    if (cached) {
      const data = JSON.parse(cached)
      // Return cached response with appropriate headers
      const response = c.json(data, 200)
      return addApiCacheHeaders(response, pathname)
    }
  } catch (error) {
    console.warn('Cache retrieval failed:', error)
  }

  // Proceed with request
  await next()

  // Cache successful responses
  if (c.res.status === 200 && cacheType !== 'private') {
    try {
      const body = await c.res.clone().json()
      const ttl = API_CACHE_CONFIG[cacheType].edgeTTL

      if (c.env.MUSIC_CATALOG && ttl > 0) {
        await c.env.MUSIC_CATALOG.put(cacheKey, JSON.stringify(body), {
          expirationTtl: ttl,
        })
      }
    } catch (error) {
      console.warn('Cache storage failed:', error)
    }
  }

  // Add cache headers to response
  c.res = addApiCacheHeaders(c.res, pathname)
}
