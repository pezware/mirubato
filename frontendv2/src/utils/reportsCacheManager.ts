/**
 * Cache manager for practice reports data
 * Implements client-side caching for computed analytics to improve performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface ReportsCacheConfig {
  analytics: {
    ttl: number // Time to live in milliseconds
  }
  pieceStats: {
    ttl: number
  }
  composerFilter: {
    ttl: number
  }
}

const DEFAULT_CONFIG: ReportsCacheConfig = {
  analytics: {
    ttl: 5 * 60 * 1000, // 5 minutes
  },
  pieceStats: {
    ttl: 10 * 60 * 1000, // 10 minutes
  },
  composerFilter: {
    ttl: 15 * 60 * 1000, // 15 minutes
  },
}

export class ReportsCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private config: ReportsCacheConfig

  constructor(config: Partial<ReportsCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Generate cache key based on parameters
   */
  private getCacheKey(namespace: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    return `${namespace}:${sortedParams}`
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  /**
   * Get analytics data from cache
   */
  getAnalytics(
    timeFilter: string,
    selectedDate: string | null,
    selectedComposer: string | null,
    entriesHash: string
  ): any | null {
    const key = this.getCacheKey('analytics', {
      timeFilter,
      selectedDate,
      selectedComposer,
      entriesHash,
    })

    const entry = this.cache.get(key)
    if (entry && this.isValid(entry)) {
      return entry.data
    }

    // Clean up expired entry
    if (entry) {
      this.cache.delete(key)
    }

    return null
  }

  /**
   * Set analytics data in cache
   */
  setAnalytics(
    timeFilter: string,
    selectedDate: string | null,
    selectedComposer: string | null,
    entriesHash: string,
    data: any
  ): void {
    const key = this.getCacheKey('analytics', {
      timeFilter,
      selectedDate,
      selectedComposer,
      entriesHash,
    })

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.analytics.ttl,
    })
  }

  /**
   * Get piece statistics from cache
   */
  getPieceStats(
    sortBy: string,
    composerFilter: string | null,
    entriesHash: string
  ): any | null {
    const key = this.getCacheKey('pieceStats', {
      sortBy,
      composerFilter,
      entriesHash,
    })

    const entry = this.cache.get(key)
    if (entry && this.isValid(entry)) {
      return entry.data
    }

    if (entry) {
      this.cache.delete(key)
    }

    return null
  }

  /**
   * Set piece statistics in cache
   */
  setPieceStats(
    sortBy: string,
    composerFilter: string | null,
    entriesHash: string,
    data: any
  ): void {
    const key = this.getCacheKey('pieceStats', {
      sortBy,
      composerFilter,
      entriesHash,
    })

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.pieceStats.ttl,
    })
  }

  /**
   * Get composers list from cache
   */
  getComposers(entriesHash: string): string[] | null {
    const key = this.getCacheKey('composers', { entriesHash })

    const entry = this.cache.get(key)
    if (entry && this.isValid(entry)) {
      return entry.data
    }

    if (entry) {
      this.cache.delete(key)
    }

    return null
  }

  /**
   * Set composers list in cache
   */
  setComposers(entriesHash: string, composers: string[]): void {
    const key = this.getCacheKey('composers', { entriesHash })

    this.cache.set(key, {
      data: composers,
      timestamp: Date.now(),
      ttl: this.config.composerFilter.ttl,
    })
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    entries: Array<{ key: string; age: number; ttl: number }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    }))

    return {
      size: this.cache.size,
      entries,
    }
  }

  /**
   * Generate hash for entries array to detect changes
   */
  static generateEntriesHash(entries: any[]): string {
    // Simple hash based on entry count and total duration
    // This is sufficient for cache invalidation
    const count = entries.length
    const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0)
    const latestTimestamp = entries.reduce((latest, e) => {
      const timestamp = new Date(e.timestamp).getTime()
      return timestamp > latest ? timestamp : latest
    }, 0)

    return `${count}:${totalDuration}:${latestTimestamp}`
  }
}

// Export singleton instance
export const reportsCache = new ReportsCacheManager()
