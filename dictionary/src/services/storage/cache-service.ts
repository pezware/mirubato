/**
 * Cache Service for Dictionary
 */

import { Env } from '../../types/env'
import { DictionaryEntry } from '../../types/dictionary'

export class CacheService {
  private readonly DEFAULT_TTL = 3600 // 1 hour
  
  constructor(
    private kv: KVNamespace,
    private env: Env
  ) {}

  /**
   * Get TTL from environment or use default
   */
  private getTTL(): number {
    return parseInt(this.env.CACHE_TTL || String(this.DEFAULT_TTL))
  }

  /**
   * Cache a dictionary entry
   */
  async cacheTerm(term: string, entry: DictionaryEntry): Promise<void> {
    const key = this.getTermKey(term)
    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: this.getTTL()
    })

    // Also cache by ID
    const idKey = this.getIdKey(entry.id)
    await this.kv.put(idKey, JSON.stringify(entry), {
      expirationTtl: this.getTTL()
    })
  }

  /**
   * Get cached dictionary entry by term
   */
  async getCachedTerm(term: string): Promise<DictionaryEntry | null> {
    const key = this.getTermKey(term)
    const cached = await this.kv.get(key, 'json')
    return cached as DictionaryEntry | null
  }

  /**
   * Get cached dictionary entry by ID
   */
  async getCachedById(id: string): Promise<DictionaryEntry | null> {
    const key = this.getIdKey(id)
    const cached = await this.kv.get(key, 'json')
    return cached as DictionaryEntry | null
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(
    query: string,
    filters: Record<string, unknown>,
    results: DictionaryEntry[],
    total: number
  ): Promise<void> {
    const key = this.getSearchKey(query, filters)
    const data = {
      results,
      total,
      cached_at: new Date().toISOString()
    }
    
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: Math.floor(this.getTTL() / 2) // Shorter TTL for search results
    })
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    query: string,
    filters: Record<string, unknown>
  ): Promise<{ results: DictionaryEntry[], total: number } | null> {
    const key = this.getSearchKey(query, filters)
    const cached = await this.kv.get(key, 'json') as any
    
    if (cached) {
      return {
        results: cached.results,
        total: cached.total
      }
    }
    
    return null
  }

  /**
   * Cache batch query results
   */
  async cacheBatch(terms: string[], entries: Map<string, DictionaryEntry>): Promise<void> {
    // Cache individual entries
    const promises: Promise<void>[] = []
    
    for (const [normalizedTerm, entry] of entries) {
      promises.push(this.cacheTerm(normalizedTerm, entry))
    }
    
    await Promise.all(promises)
  }

  /**
   * Cache embeddings for semantic search
   */
  async cacheEmbedding(term: string, embedding: number[]): Promise<void> {
    const key = this.getEmbeddingKey(term)
    await this.kv.put(key, JSON.stringify(embedding), {
      expirationTtl: this.getTTL() * 24 // Longer TTL for embeddings
    })
  }

  /**
   * Get cached embedding
   */
  async getCachedEmbedding(term: string): Promise<number[] | null> {
    const key = this.getEmbeddingKey(term)
    const cached = await this.kv.get(key, 'json')
    return cached as number[] | null
  }

  /**
   * Cache export data
   */
  async cacheExport(exportId: string, data: any): Promise<void> {
    const key = this.getExportKey(exportId)
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: 3600 * 24 // 24 hours for exports
    })
  }

  /**
   * Get cached export
   */
  async getCachedExport(exportId: string): Promise<any | null> {
    const key = this.getExportKey(exportId)
    return await this.kv.get(key, 'json')
  }

  /**
   * Invalidate cache for a term
   */
  async invalidateTerm(term: string): Promise<void> {
    const key = this.getTermKey(term)
    await this.kv.delete(key)
  }

  /**
   * Invalidate cache for an entry ID
   */
  async invalidateId(id: string): Promise<void> {
    const key = this.getIdKey(id)
    await this.kv.delete(key)
  }

  /**
   * Invalidate all search caches
   */
  async invalidateSearches(): Promise<void> {
    // List all search keys and delete them
    const list = await this.kv.list({ prefix: 'search:' })
    const promises = list.keys.map(key => this.kv.delete(key.name))
    await Promise.all(promises)
  }

  /**
   * Warm cache with popular terms
   */
  async warmCache(entries: DictionaryEntry[]): Promise<void> {
    const promises = entries.map(entry => 
      this.cacheTerm(entry.normalized_term, entry)
    )
    await Promise.all(promises)
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    terms: number
    searches: number
    embeddings: number
    exports: number
  }> {
    const [terms, searches, embeddings, exports] = await Promise.all([
      this.kv.list({ prefix: 'term:', limit: 1000 }),
      this.kv.list({ prefix: 'search:', limit: 1000 }),
      this.kv.list({ prefix: 'embedding:', limit: 1000 }),
      this.kv.list({ prefix: 'export:', limit: 1000 })
    ])

    return {
      terms: terms.keys.length,
      searches: searches.keys.length,
      embeddings: embeddings.keys.length,
      exports: exports.keys.length
    }
  }

  /**
   * Generate cache keys
   */
  private getTermKey(term: string): string {
    return `term:${term.toLowerCase().trim()}`
  }

  private getIdKey(id: string): string {
    return `id:${id}`
  }

  private getSearchKey(query: string, filters: Record<string, unknown>): string {
    const filterStr = filters ? JSON.stringify(filters) : ''
    return `search:${query.toLowerCase().trim()}:${filterStr}`
  }

  private getEmbeddingKey(term: string): string {
    return `embedding:${term.toLowerCase().trim()}`
  }

  private getExportKey(exportId: string): string {
    return `export:${exportId}`
  }
}