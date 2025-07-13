/**
 * Dictionary Database Service
 */

import { Env } from '../../types/env'
import { 
  DictionaryEntry, 
  SearchQuery, 
  SearchFilters,
  QualityCheckpoint,
  SearchAnalytics,
  UserFeedback,
  TermType
} from '../../types/dictionary'
import { NotFoundError, ValidationError } from '../../utils/errors'
import { normalizeTerm } from '../../utils/validation'

export class DictionaryDatabase {
  constructor(private db: D1Database) {}

  /**
   * Find dictionary entry by term
   */
  async findByTerm(term: string): Promise<DictionaryEntry | null> {
    const normalizedTerm = normalizeTerm(term)
    
    const result = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries 
        WHERE normalized_term = ? 
        AND overall_score >= ?
        ORDER BY version DESC
        LIMIT 1
      `)
      .bind(normalizedTerm, 60)
      .first()

    if (!result) return null

    return this.deserializeEntry(result)
  }

  /**
   * Find entry by ID
   */
  async findById(id: string): Promise<DictionaryEntry | null> {
    const result = await this.db
      .prepare('SELECT * FROM dictionary_entries WHERE id = ?')
      .bind(id)
      .first()

    if (!result) return null

    return this.deserializeEntry(result)
  }

  /**
   * Create new dictionary entry
   */
  async create(entry: DictionaryEntry): Promise<void> {
    const now = new Date().toISOString()
    
    await this.db
      .prepare(`
        INSERT INTO dictionary_entries (
          id, term, normalized_term, type, definition, 
          references, metadata, quality_score, overall_score,
          created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entry.id,
        entry.term,
        entry.normalized_term,
        entry.type,
        JSON.stringify(entry.definition),
        JSON.stringify(entry.references),
        JSON.stringify(entry.metadata),
        JSON.stringify(entry.quality_score),
        entry.quality_score.overall,
        entry.created_at || now,
        entry.updated_at || now,
        entry.version || 1
      )
      .run()
  }

  /**
   * Update existing dictionary entry
   */
  async update(entry: DictionaryEntry): Promise<void> {
    const existing = await this.findById(entry.id)
    if (!existing) {
      throw new NotFoundError(`Dictionary entry ${entry.id} not found`)
    }

    await this.db
      .prepare(`
        UPDATE dictionary_entries 
        SET term = ?, normalized_term = ?, type = ?, definition = ?, 
            references = ?, metadata = ?, quality_score = ?, 
            overall_score = ?, updated_at = ?, version = version + 1
        WHERE id = ?
      `)
      .bind(
        entry.term,
        entry.normalized_term,
        entry.type,
        JSON.stringify(entry.definition),
        JSON.stringify(entry.references),
        JSON.stringify(entry.metadata),
        JSON.stringify(entry.quality_score),
        entry.quality_score.overall,
        new Date().toISOString(),
        entry.id
      )
      .run()
  }

  /**
   * Search dictionary entries
   */
  async search(query: SearchQuery): Promise<{
    results: DictionaryEntry[]
    total: number
  }> {
    const normalizedQuery = normalizeTerm(query.q)
    const limit = query.limit || 20
    const offset = query.offset || 0

    // Build WHERE conditions
    const conditions: string[] = [
      '(normalized_term LIKE ? OR term LIKE ? OR json_extract(metadata, "$.synonyms") LIKE ?)'
    ]
    const params: any[] = [`%${normalizedQuery}%`, `%${query.q}%`, `%${normalizedQuery}%`]

    if (query.type) {
      conditions.push('type = ?')
      params.push(query.type)
    }

    if (query.filters?.min_quality !== undefined) {
      conditions.push('overall_score >= ?')
      params.push(query.filters.min_quality)
    }

    if (query.filters?.max_quality !== undefined) {
      conditions.push('overall_score <= ?')
      params.push(query.filters.max_quality)
    }

    if (query.filters?.instruments?.length) {
      conditions.push(`json_extract(metadata, '$.instruments') LIKE ?`)
      params.push(`%${query.filters.instruments[0]}%`) // Simple implementation
    }

    if (query.filters?.difficulty_level) {
      conditions.push(`json_extract(metadata, '$.difficulty_level') = ?`)
      params.push(query.filters.difficulty_level)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM dictionary_entries ${whereClause}`)
      .bind(...params)
      .first()

    const total = Number(countResult?.total) || 0

    // Get results with sorting
    let orderBy = 'ORDER BY '
    switch (query.sort_by) {
      case 'alphabetical':
        orderBy += 'term ASC'
        break
      case 'quality':
        orderBy += 'overall_score DESC, term ASC'
        break
      case 'popularity':
        orderBy += 'json_extract(metadata, "$.search_frequency") DESC, overall_score DESC'
        break
      case 'relevance':
      default:
        orderBy += `
          CASE 
            WHEN normalized_term = ? THEN 0
            WHEN normalized_term LIKE ? THEN 1
            WHEN normalized_term LIKE ? THEN 2
            ELSE 3
          END,
          overall_score DESC,
          json_extract(metadata, "$.search_frequency") DESC
        `
        params.push(normalizedQuery, `${normalizedQuery}%`, `%${normalizedQuery}%`)
        break
    }

    const results = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries 
        ${whereClause}
        ${orderBy}
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all()

    return {
      results: results.results.map(r => this.deserializeEntry(r)),
      total
    }
  }

  /**
   * Get multiple entries by terms (for batch queries)
   */
  async findByTerms(terms: string[]): Promise<Map<string, DictionaryEntry>> {
    if (terms.length === 0) return new Map()

    const normalizedTerms = terms.map(normalizeTerm)
    const placeholders = normalizedTerms.map(() => '?').join(',')

    const results = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries 
        WHERE normalized_term IN (${placeholders})
        AND overall_score >= 60
      `)
      .bind(...normalizedTerms)
      .all()

    const entriesMap = new Map<string, DictionaryEntry>()
    
    for (const result of results.results) {
      const entry = this.deserializeEntry(result)
      entriesMap.set(entry.normalized_term, entry)
    }

    return entriesMap
  }

  /**
   * Get entries needing enhancement
   */
  async getEnhancementCandidates(
    limit: number = 100,
    maxQualityScore: number = 80,
    minAgeDays: number = 30
  ): Promise<DictionaryEntry[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - minAgeDays)

    const results = await this.db
      .prepare(`
        SELECT de.* 
        FROM dictionary_entries de
        LEFT JOIN (
          SELECT entry_id, COUNT(*) as search_count
          FROM search_analytics
          WHERE searched_at > datetime('now', '-30 days')
          GROUP BY entry_id
        ) sa ON de.id = sa.entry_id
        WHERE de.overall_score < ?
        AND de.updated_at < ?
        ORDER BY 
          COALESCE(sa.search_count, 0) DESC,
          de.overall_score ASC
        LIMIT ?
      `)
      .bind(maxQualityScore, cutoffDate.toISOString(), limit)
      .all()

    return results.results.map(r => this.deserializeEntry(r))
  }

  /**
   * Log search analytics
   */
  async logSearch(analytics: SearchAnalytics): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO search_analytics (
          id, term, normalized_term, found, entry_id,
          response_time_ms, searched_at, user_session_id, 
          user_id, search_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        analytics.id,
        analytics.term,
        analytics.normalized_term,
        analytics.found ? 1 : 0,
        analytics.entry_id || null,
        analytics.response_time_ms,
        analytics.searched_at,
        analytics.user_session_id || null,
        analytics.user_id || null,
        analytics.search_source
      )
      .run()
  }

  /**
   * Save user feedback
   */
  async saveFeedback(feedback: UserFeedback): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO user_feedback (
          id, entry_id, user_id, rating, helpful,
          feedback_text, feedback_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        feedback.id,
        feedback.entry_id,
        feedback.user_id || null,
        feedback.rating || null,
        feedback.helpful !== undefined ? (feedback.helpful ? 1 : 0) : null,
        feedback.feedback_text || null,
        feedback.feedback_type || null,
        feedback.created_at
      )
      .run()
  }

  /**
   * Save quality checkpoint
   */
  async saveCheckpoint(checkpoint: QualityCheckpoint): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO quality_checkpoints (
          id, entry_id, check_type, score_before, score_after,
          improvements, model_used, checked_at, checked_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        checkpoint.id,
        checkpoint.entry_id,
        checkpoint.check_type,
        checkpoint.score_before,
        checkpoint.score_after,
        checkpoint.improvements ? JSON.stringify(checkpoint.improvements) : null,
        checkpoint.model_used,
        checkpoint.checked_at,
        checkpoint.checked_by || null
      )
      .run()
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 20): Promise<Array<{
    term: string
    search_count: number
    found_count: number
    last_searched: string
  }>> {
    const results = await this.db
      .prepare(`
        SELECT 
          normalized_term as term,
          COUNT(*) as search_count,
          SUM(CASE WHEN found THEN 1 ELSE 0 END) as found_count,
          MAX(searched_at) as last_searched
        FROM search_analytics
        WHERE searched_at > datetime('now', '-30 days')
        GROUP BY normalized_term
        ORDER BY search_count DESC
        LIMIT ?
      `)
      .bind(limit)
      .all()

    return results.results.map(r => ({
      term: r.term as string,
      search_count: Number(r.search_count),
      found_count: Number(r.found_count),
      last_searched: r.last_searched as string
    }))
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(): Promise<{
    total_terms: number
    avg_quality_score: number
    total_searches: number
    total_feedback: number
  }> {
    const result = await this.db
      .prepare(`
        SELECT 
          (SELECT COUNT(*) FROM dictionary_entries) as total_terms,
          (SELECT AVG(overall_score) FROM dictionary_entries) as avg_quality_score,
          (SELECT COUNT(*) FROM search_analytics) as total_searches,
          (SELECT COUNT(*) FROM user_feedback) as total_feedback
      `)
      .first()

    return {
      total_terms: Number(result?.total_terms) || 0,
      avg_quality_score: Number(result?.avg_quality_score) || 0,
      total_searches: Number(result?.total_searches) || 0,
      total_feedback: Number(result?.total_feedback) || 0
    }
  }

  /**
   * Add entry to enhancement queue
   */
  async queueForEnhancement(
    entryId: string,
    reason: string,
    priority: number = 5
  ): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO enhancement_queue (
          id, entry_id, priority, reason, status, created_at
        ) VALUES (?, ?, ?, ?, 'pending', ?)
      `)
      .bind(
        crypto.randomUUID(),
        entryId,
        priority,
        reason,
        new Date().toISOString()
      )
      .run()
  }

  /**
   * Get related terms for an entry
   */
  async getRelatedTerms(entryId: string): Promise<Array<{
    entry: DictionaryEntry
    relationship_type: string
    confidence_score: number
  }>> {
    const results = await this.db
      .prepare(`
        SELECT 
          de.*,
          rt.relationship_type,
          rt.confidence_score
        FROM related_terms rt
        JOIN dictionary_entries de ON rt.related_entry_id = de.id
        WHERE rt.entry_id = ?
        ORDER BY rt.confidence_score DESC
      `)
      .bind(entryId)
      .all()

    return results.results.map(r => ({
      entry: this.deserializeEntry(r),
      relationship_type: r.relationship_type as string,
      confidence_score: Number(r.confidence_score)
    }))
  }

  /**
   * Update search frequency
   */
  async updateSearchFrequency(entryId: string): Promise<void> {
    await this.db
      .prepare(`
        UPDATE dictionary_entries
        SET 
          metadata = json_set(
            metadata,
            '$.search_frequency',
            COALESCE(json_extract(metadata, '$.search_frequency'), 0) + 1,
            '$.last_accessed',
            ?
          )
        WHERE id = ?
      `)
      .bind(new Date().toISOString(), entryId)
      .run()
  }

  /**
   * Deserialize database row to DictionaryEntry
   */
  private deserializeEntry(row: Record<string, unknown>): DictionaryEntry {
    return {
      id: row.id as string,
      term: row.term as string,
      normalized_term: row.normalized_term as string,
      type: row.type as TermType,
      definition: JSON.parse(row.definition as string),
      references: JSON.parse(row.references as string),
      metadata: JSON.parse(row.metadata as string),
      quality_score: JSON.parse(row.quality_score as string),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      version: row.version as number
    }
  }

  /**
   * Get all dictionary entries with embeddings for semantic search
   */
  async getEntriesWithEmbeddings(): Promise<Array<{ entry: DictionaryEntry; embedding: number[] }>> {
    const results = await this.db
      .prepare(`
        SELECT de.*, e.embedding
        FROM dictionary_entries de
        JOIN embeddings e ON de.id = e.entry_id
        WHERE e.embedding IS NOT NULL
      `)
      .all()

    return results.results.map(row => ({
      entry: this.deserializeEntry(row),
      embedding: JSON.parse(row.embedding as string) as number[]
    }))
  }

  /**
   * Delete a dictionary entry by ID
   */
  async delete(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM dictionary_entries WHERE id = ?')
      .bind(id)
      .run()
  }

  /**
   * Update the type of multiple entries
   */
  async updateType(fromType: string, toType: string): Promise<number> {
    const result = await this.db
      .prepare(`
        UPDATE dictionary_entries 
        SET type = ?, updated_at = datetime('now')
        WHERE type = ?
      `)
      .bind(toType, fromType)
      .run()

    return result.meta.changes || 0
  }

  /**
   * Export entries with filtering options
   */
  async exportEntries(options: {
    minQuality?: number
    types?: string[]
    limit?: number
  }): Promise<DictionaryEntry[]> {
    let query = 'SELECT * FROM dictionary_entries WHERE 1=1'
    const params: any[] = []

    if (options.minQuality !== undefined) {
      query += ' AND json_extract(quality_score, "$.overall") >= ?'
      params.push(options.minQuality)
    }

    if (options.types && options.types.length > 0) {
      const placeholders = options.types.map(() => '?').join(', ')
      query += ` AND type IN (${placeholders})`
      params.push(...options.types)
    }

    query += ' ORDER BY json_extract(quality_score, "$.overall") DESC'

    if (options.limit) {
      query += ' LIMIT ?'
      params.push(options.limit)
    }

    const results = await this.db
      .prepare(query)
      .bind(...params)
      .all()

    return results.results.map(row => this.deserializeEntry(row))
  }

  /**
   * Get total count of entries
   */
  async getTotalCount(): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM dictionary_entries')
      .first()
    
    return Number(result?.count) || 0
  }

  /**
   * Get quality score distribution
   */
  async getQualityDistribution(): Promise<{
    excellent: number
    good: number
    fair: number
    poor: number
  }> {
    const result = await this.db
      .prepare(`
        SELECT 
          SUM(CASE WHEN json_extract(quality_score, '$.overall') >= 90 THEN 1 ELSE 0 END) as excellent,
          SUM(CASE WHEN json_extract(quality_score, '$.overall') >= 70 AND json_extract(quality_score, '$.overall') < 90 THEN 1 ELSE 0 END) as good,
          SUM(CASE WHEN json_extract(quality_score, '$.overall') >= 50 AND json_extract(quality_score, '$.overall') < 70 THEN 1 ELSE 0 END) as fair,
          SUM(CASE WHEN json_extract(quality_score, '$.overall') < 50 THEN 1 ELSE 0 END) as poor
        FROM dictionary_entries
      `)
      .first()

    return {
      excellent: Number(result?.excellent) || 0,
      good: Number(result?.good) || 0,
      fair: Number(result?.fair) || 0,
      poor: Number(result?.poor) || 0
    }
  }

  /**
   * Get type distribution
   */
  async getTypeDistribution(): Promise<Record<string, number>> {
    const results = await this.db
      .prepare(`
        SELECT type, COUNT(*) as count
        FROM dictionary_entries
        GROUP BY type
      `)
      .all()

    const distribution: Record<string, number> = {}
    results.results.forEach(row => {
      distribution[row.type as string] = Number(row.count)
    })

    return distribution
  }

  /**
   * Get recent additions
   */
  async getRecentAdditions(limit: number = 10): Promise<DictionaryEntry[]> {
    const results = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all()

    return results.results.map(row => this.deserializeEntry(row))
  }

  /**
   * Get low quality terms
   */
  async getLowQualityTerms(limit: number = 10): Promise<DictionaryEntry[]> {
    const results = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries
        WHERE json_extract(quality_score, '$.overall') < 50
        ORDER BY json_extract(quality_score, '$.overall') ASC
        LIMIT ?
      `)
      .bind(limit)
      .all()

    return results.results.map(row => this.deserializeEntry(row))
  }

  /**
   * Get search statistics
   */
  async getSearchStatistics(): Promise<{
    total_searches: number
    unique_terms: number
    success_rate: number
  }> {
    const result = await this.db
      .prepare(`
        SELECT 
          COUNT(*) as total_searches,
          COUNT(DISTINCT normalized_term) as unique_terms,
          AVG(CASE WHEN results_count > 0 THEN 1 ELSE 0 END) as success_rate
        FROM search_analytics
      `)
      .first()

    return {
      total_searches: Number(result?.total_searches) || 0,
      unique_terms: Number(result?.unique_terms) || 0,
      success_rate: Number(result?.success_rate) || 0
    }
  }

  /**
   * Get search analytics with time range filtering
   */
  async getSearchAnalytics(options: {
    startDate?: Date
    endDate?: Date
    period?: string
  }): Promise<{
    earliest_date: string
    latest_date: string
    total_searches: number
    unique_terms: number
    success_rate: number
    top_searches: Array<{ term: string; count: number }>
    searches_by_period: Array<{ period: string; count: number }>
  }> {
    const stats = await this.getSearchStatistics()
    const popular = await this.getPopularSearches(10)
    
    return {
      earliest_date: options.startDate?.toISOString() || new Date().toISOString(),
      latest_date: options.endDate?.toISOString() || new Date().toISOString(),
      total_searches: stats.total_searches,
      unique_terms: stats.unique_terms,
      success_rate: stats.success_rate,
      top_searches: popular.map(p => ({ term: p.term, count: p.search_count })),
      searches_by_period: []
    }
  }

  /**
   * Get AI usage statistics
   */
  async getAIUsageStats(options: {
    startDate?: Date
    endDate?: Date
  } = {}): Promise<{
    total_requests: number
    by_provider: Record<string, number>
    by_model: Record<string, number>
    avg_response_time: number
    error_rate: number
    cost_estimate: number
  }> {
    // This would normally query AI usage logs
    // For now, return placeholder data
    return {
      total_requests: 0,
      by_provider: {},
      by_model: {},
      avg_response_time: 0,
      error_rate: 0,
      cost_estimate: 0
    }
  }

  /**
   * Get quality trends over time
   */
  async getQualityTrends(options: {
    startDate?: Date
    endDate?: Date
    period?: string
  }): Promise<{
    trends: Array<{ date: string; avg_score: number }>
    improvements: number
    degradations: number
    avg_change: number
  }> {
    // This would analyze quality score changes over time
    // For now, return placeholder data
    return {
      trends: [],
      improvements: 0,
      degradations: 0,
      avg_change: 0
    }
  }

  /**
   * Get content gaps analysis
   */
  async getContentGaps(limit: number = 100): Promise<Array<{
    category: string
    missing_count: number
    suggestions: string[]
  }>> {
    // This would analyze missing content areas
    // For now, return empty array
    return []
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(period?: string): Promise<{
    avg_response_time: number
    p95_response_time: number
    p99_response_time: number
    cache_hit_rate: number
    error_rate: number
    requests_per_second: number
  }> {
    // This would query performance logs
    // For now, return placeholder data
    return {
      avg_response_time: 0,
      p95_response_time: 0,
      p99_response_time: 0,
      cache_hit_rate: 0,
      error_rate: 0,
      requests_per_second: 0
    }
  }
}