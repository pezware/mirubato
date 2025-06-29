/**
 * PDF Caching utilities using Browser Cache API and IndexedDB
 */

interface CacheConfig {
  maxAge: number // in milliseconds
  maxSize: number // in MB
  version: string
}

const DEFAULT_CONFIG: CacheConfig = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100, // 100MB
  version: '1.0',
}

export class PdfCache {
  private cacheName: string
  private config: CacheConfig
  // Note: IndexedDB integration will be added in future iteration

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.cacheName = `pdf-cache-v${this.config.version}`
  }

  /**
   * Cache a PDF response
   */
  async cachePdf(url: string, response: Response): Promise<boolean> {
    try {
      if (!('caches' in window)) {
        console.warn('Cache API not supported')
        return false
      }

      const cache = await caches.open(this.cacheName)

      // Clone the response to avoid consuming it
      const responseClone = response.clone()

      // Add cache headers
      const headers = new Headers(responseClone.headers)
      headers.set('cached-at', new Date().toISOString())
      headers.set('cache-version', this.config.version)

      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers,
      })

      await cache.put(url, cachedResponse)

      // Clean up old entries
      await this.cleanupCache()

      return true
    } catch (error) {
      console.error('Failed to cache PDF:', error)
      return false
    }
  }

  /**
   * Retrieve a cached PDF
   */
  async getCachedPdf(url: string): Promise<Response | null> {
    try {
      if (!('caches' in window)) {
        return null
      }

      const cache = await caches.open(this.cacheName)
      const response = await cache.match(url)

      if (!response) {
        return null
      }

      // Check if cache is still valid
      const cachedAt = response.headers.get('cached-at')
      if (cachedAt) {
        const age = Date.now() - new Date(cachedAt).getTime()
        if (age > this.config.maxAge) {
          // Cache expired, remove it
          await cache.delete(url)
          return null
        }
      }

      return response
    } catch (error) {
      console.error('Failed to retrieve cached PDF:', error)
      return null
    }
  }

  /**
   * Check if a PDF is cached
   */
  async isCached(url: string): Promise<boolean> {
    const cached = await this.getCachedPdf(url)
    return cached !== null
  }

  /**
   * Clean up old cache entries
   */
  private async cleanupCache(): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName)
      const requests = await cache.keys()

      const entries = await Promise.all(
        requests.map(async request => {
          const response = await cache.match(request)
          return {
            request,
            response,
            cachedAt: response?.headers.get('cached-at'),
          }
        })
      )

      // Sort by cache date (oldest first)
      entries.sort((a, b) => {
        const aTime = a.cachedAt ? new Date(a.cachedAt).getTime() : 0
        const bTime = b.cachedAt ? new Date(b.cachedAt).getTime() : 0
        return aTime - bTime
      })

      // Calculate total size (rough estimate)
      let totalSize = 0
      const sizeLimitBytes = this.config.maxSize * 1024 * 1024

      for (const entry of entries.reverse()) {
        // Start with newest
        if (entry.response) {
          const contentLength = entry.response.headers.get('content-length')
          const size = contentLength ? parseInt(contentLength, 10) : 1024 * 1024 // 1MB estimate

          if (totalSize + size > sizeLimitBytes) {
            // Remove this entry
            await cache.delete(entry.request)
          } else {
            totalSize += size
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup cache:', error)
    }
  }

  /**
   * Clear all cached PDFs
   */
  async clearCache(): Promise<void> {
    try {
      await caches.delete(this.cacheName)
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    entries: number
    estimatedSize: number
    oldestEntry?: Date
    newestEntry?: Date
  }> {
    try {
      const cache = await caches.open(this.cacheName)
      const requests = await cache.keys()

      const entries = await Promise.all(
        requests.map(async request => {
          const response = await cache.match(request)
          return {
            cachedAt: response?.headers.get('cached-at'),
            contentLength: response?.headers.get('content-length'),
          }
        })
      )

      const dates = entries
        .map(e => (e.cachedAt ? new Date(e.cachedAt) : null))
        .filter(Boolean) as Date[]

      const estimatedSize = entries.reduce((total, entry) => {
        const size = entry.contentLength
          ? parseInt(entry.contentLength, 10)
          : 1024 * 1024
        return total + size
      }, 0)

      return {
        entries: requests.length,
        estimatedSize,
        oldestEntry:
          dates.length > 0
            ? new Date(Math.min(...dates.map(d => d.getTime())))
            : undefined,
        newestEntry:
          dates.length > 0
            ? new Date(Math.max(...dates.map(d => d.getTime())))
            : undefined,
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return { entries: 0, estimatedSize: 0 }
    }
  }
}

// Global instance
export const pdfCache = new PdfCache()

/**
 * Enhanced fetch with caching
 */
export async function fetchWithCache(url: string): Promise<Response> {
  // Try to get from cache first
  const cached = await pdfCache.getCachedPdf(url)
  if (cached) {
    console.log('PDF loaded from cache:', url)
    return cached
  }

  // Fetch from network
  const response = await fetch(url)

  if (
    response.ok &&
    response.headers.get('content-type')?.includes('application/pdf')
  ) {
    // Cache the response
    await pdfCache.cachePdf(url, response.clone())
    console.log('PDF cached:', url)
  }

  return response
}
