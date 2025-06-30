import { createHash } from 'crypto'

export interface PdfMetadata {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  pageCount?: number
  r2Prefix?: string
  error?: string
  lastUpdated: string
  processingStartedAt?: string
  processingCompletedAt?: string
}

export class PdfCacheManager {
  constructor(private kv: KVNamespace) {}

  /**
   * Generate a cache key for a PDF based on its content hash
   */
  async generateCacheKey(r2Key: string, env: Env): Promise<string> {
    // Get the file from R2 to calculate hash
    const object = await env.SCORES_BUCKET.get(r2Key)
    if (!object) {
      throw new Error('PDF not found in R2')
    }

    // Read the first 1MB for hash calculation (enough for uniqueness)
    const buffer = await object.arrayBuffer()
    const chunk = new Uint8Array(buffer.slice(0, 1024 * 1024))

    const hash = createHash('sha256')
    hash.update(chunk)
    return hash.digest('hex')
  }

  /**
   * Get PDF metadata from cache
   */
  async getMetadata(documentHash: string): Promise<PdfMetadata | null> {
    const key = `pdf:${documentHash}`
    const data = await this.kv.get(key, { type: 'json' })
    return data as PdfMetadata | null
  }

  /**
   * Set PDF metadata in cache
   */
  async setMetadata(
    documentHash: string,
    metadata: PdfMetadata,
    ttl?: number
  ): Promise<void> {
    const key = `pdf:${documentHash}`
    await this.kv.put(key, JSON.stringify(metadata), {
      expirationTtl: ttl || 86400 * 30, // 30 days default
    })
  }

  /**
   * Update PDF processing status
   */
  async updateStatus(
    documentHash: string,
    status: PdfMetadata['status'],
    error?: string
  ): Promise<void> {
    const existing = await this.getMetadata(documentHash)
    const metadata: PdfMetadata = {
      ...existing,
      status,
      lastUpdated: new Date().toISOString(),
    }

    if (status === 'processing' && !metadata.processingStartedAt) {
      metadata.processingStartedAt = new Date().toISOString()
    }

    if (status === 'completed') {
      metadata.processingCompletedAt = new Date().toISOString()
    }

    if (error) {
      metadata.error = error
    }

    await this.setMetadata(documentHash, metadata)
  }

  /**
   * Check if a PDF has been processed recently
   */
  async isProcessedRecently(
    documentHash: string,
    maxAgeMs: number = 86400000 // 24 hours
  ): Promise<boolean> {
    const metadata = await this.getMetadata(documentHash)
    if (!metadata || metadata.status !== 'completed') {
      return false
    }

    if (!metadata.processingCompletedAt) {
      return false
    }

    const completedAt = new Date(metadata.processingCompletedAt).getTime()
    const now = Date.now()
    return now - completedAt < maxAgeMs
  }

  /**
   * Get all cached PDFs with a specific status
   */
  async listByStatus(
    status: PdfMetadata['status'],
    limit: number = 100
  ): Promise<Array<{ key: string; metadata: PdfMetadata }>> {
    // Note: KV doesn't support querying by value, so this would need to be
    // tracked separately or use a different approach in production
    const list = await this.kv.list({ prefix: 'pdf:', limit })
    const results: Array<{ key: string; metadata: PdfMetadata }> = []

    for (const key of list.keys) {
      const metadata = (await this.kv.get(key.name, {
        type: 'json',
      })) as PdfMetadata
      if (metadata && metadata.status === status) {
        results.push({
          key: key.name.replace('pdf:', ''),
          metadata,
        })
      }
    }

    return results
  }

  /**
   * Clean up old cache entries
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 86400000
    const list = await this.kv.list({ prefix: 'pdf:' })
    let deleted = 0

    for (const key of list.keys) {
      const metadata = (await this.kv.get(key.name, {
        type: 'json',
      })) as PdfMetadata
      if (metadata) {
        const lastUpdated = new Date(metadata.lastUpdated).getTime()
        if (lastUpdated < cutoffTime) {
          await this.kv.delete(key.name)
          deleted++
        }
      }
    }

    return deleted
  }
}
