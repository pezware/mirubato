// Cache utilities for scores service

/**
 * Cache configuration for different content types
 */
export const CACHE_CONFIG = {
  // Immutable content (PDFs, specific versions)
  immutable: {
    browserTTL: 31536000, // 1 year
    edgeTTL: 31536000, // 1 year
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
  // Static content that might change (images, rendered scores)
  static: {
    browserTTL: 86400, // 1 day
    edgeTTL: 604800, // 1 week
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'CDN-Cache-Control': 'public, max-age=604800',
    },
  },
  // Dynamic content (metadata, lists)
  dynamic: {
    browserTTL: 0, // No browser cache
    edgeTTL: 300, // 5 minutes
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'CDN-Cache-Control': 'public, max-age=300',
    },
  },
  // API responses
  api: {
    browserTTL: 0, // No browser cache
    edgeTTL: 60, // 1 minute
    headers: {
      'Cache-Control': 'no-cache',
      'CDN-Cache-Control': 'public, max-age=60',
    },
  },
}

/**
 * Get cache key for Cloudflare Cache API
 */
export function getCacheKey(request: Request): Request {
  const url = new URL(request.url)
  // Normalize URL for caching (remove query params that don't affect content)
  url.searchParams.sort() // Sort params for consistent keys
  return new Request(url.toString(), request)
}

/**
 * Check if content should be cached
 */
export function shouldCache(request: Request, response: Response): boolean {
  // Only cache successful GET requests
  if (request.method !== 'GET') return false
  if (response.status !== 200) return false

  // Don't cache authenticated requests
  if (request.headers.get('Authorization')) return false
  if (request.headers.get('Cookie')?.includes('auth-token')) return false

  return true
}

/**
 * Add cache headers to response based on content type
 */
export function addCacheHeaders(
  response: Response,
  contentType: string,
  options?: {
    isVersioned?: boolean
    isPublic?: boolean
  }
): Response {
  const headers = new Headers(response.headers)

  // Determine cache strategy based on content type and options
  let cacheConfig = CACHE_CONFIG.dynamic

  if (options?.isVersioned || contentType.includes('pdf')) {
    // Versioned content and PDFs are immutable
    cacheConfig = CACHE_CONFIG.immutable
  } else if (contentType.includes('musicxml')) {
    // Music files are generally static
    cacheConfig = CACHE_CONFIG.static
  } else if (contentType.includes('image')) {
    // Images are static but might be updated
    cacheConfig = CACHE_CONFIG.static
  } else if (contentType.includes('json')) {
    // JSON responses are API calls
    cacheConfig = CACHE_CONFIG.api
  }

  // Apply cache headers
  Object.entries(cacheConfig.headers).forEach(([key, value]) => {
    headers.set(key, value)
  })

  // Add ETag for conditional requests
  if (!headers.has('ETag') && response.body) {
    // For files from R2, use the httpEtag if available
    const r2Etag = response.headers.get('ETag')
    if (r2Etag) {
      headers.set('ETag', r2Etag)
    }
  }

  // Add Vary header for proper caching with different representations
  if (!headers.has('Vary')) {
    headers.set('Vary', 'Accept, Accept-Encoding')
  }

  // Security headers for public content
  if (options?.isPublic) {
    headers.set('X-Content-Type-Options', 'nosniff')
    // Allow PDFs to be embedded in iframes from mirubato domains
    if (contentType.includes('pdf')) {
      // Remove X-Frame-Options to allow embedding
      headers.delete('X-Frame-Options')
      // Use CSP frame-ancestors instead for better control
      headers.set(
        'Content-Security-Policy',
        'frame-ancestors https://mirubato.com https://staging.mirubato.com http://www-mirubato.localhost:4000'
      )
    } else {
      headers.set('X-Frame-Options', 'SAMEORIGIN')
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Cache response using Cloudflare Cache API
 */
export async function cacheResponse(
  request: Request,
  response: Response,
  _c?: any
): Promise<void> {
  try {
    // Only cache if conditions are met
    if (!shouldCache(request, response)) return

    // Get cache instance
    const cache = await caches.open('v1')
    const cacheKey = getCacheKey(request)

    // Clone response for caching (can only read body once)
    const responseToCache = response.clone()

    // Store in cache
    await cache.put(cacheKey, responseToCache)
  } catch (error) {
    // Don't fail the request if caching fails
    console.warn('Failed to cache response:', error)
  }
}

/**
 * Get cached response using Cloudflare Cache API
 */
export async function getCachedResponse(
  request: Request,
  _c?: any
): Promise<Response | null> {
  try {
    // Only check cache for GET requests
    if (request.method !== 'GET') return null

    // Get cache instance
    const cache = await caches.open('v1')
    const cacheKey = getCacheKey(request)

    // Check cache
    const cachedResponse = await cache.match(cacheKey)

    if (cachedResponse) {
      // Add cache hit header for debugging
      const headers = new Headers(cachedResponse.headers)
      headers.set('X-Cache-Status', 'HIT')
      headers.set('X-Cache-Key', cacheKey.url)

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      })
    }

    return null
  } catch (error) {
    // Don't fail the request if cache check fails
    console.warn('Failed to check cache:', error)
    return null
  }
}

/**
 * Purge cache for a specific URL pattern
 */
export async function purgeCache(pattern: string, c?: any): Promise<void> {
  try {
    const cache = await caches.open('v1')

    // For Cloudflare Workers, we need to construct the full URL
    const url = new URL(pattern, c.req.url)
    const request = new Request(url.toString())

    await cache.delete(request)
  } catch (error) {
    console.error('Failed to purge cache:', error)
  }
}

/**
 * Handle conditional requests (If-None-Match, If-Modified-Since)
 */
export function handleConditionalRequest(
  request: Request,
  response: Response
): Response | null {
  const etag = response.headers.get('ETag')
  const lastModified = response.headers.get('Last-Modified')

  // Check If-None-Match
  if (etag && request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      statusText: 'Not Modified',
      headers: {
        ETag: etag,
        'Cache-Control': response.headers.get('Cache-Control') || '',
      },
    })
  }

  // Check If-Modified-Since
  if (lastModified && request.headers.get('If-Modified-Since')) {
    const ifModifiedSince = new Date(request.headers.get('If-Modified-Since')!)
    const lastModifiedDate = new Date(lastModified)

    if (lastModifiedDate <= ifModifiedSince) {
      return new Response(null, {
        status: 304,
        statusText: 'Not Modified',
        headers: {
          'Last-Modified': lastModified,
          'Cache-Control': response.headers.get('Cache-Control') || '',
        },
      })
    }
  }

  return null
}
