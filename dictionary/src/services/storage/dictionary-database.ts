/**
 * Dictionary Database Service
 */

import { D1Database } from '@cloudflare/workers-types'
import {
  DictionaryEntry,
  SearchQuery,
  SearchResult,
  QualityCheckpoint,
  SearchAnalytics,
  UserFeedback,
  TermType,
  MultiLanguageTermResponse,
  SeedQueueEntry,
} from '../../types/dictionary'
import { NotFoundError } from '../../utils/errors'
import { normalizeTerm } from '../../utils/validation'

export class DictionaryDatabase {
  constructor(private db: D1Database) {}

  /**
   * Find dictionary entry by term and language
   */
  async findByTerm(
    term: string,
    lang: string = 'en',
    options?: { searchAllLanguages?: boolean }
  ): Promise<DictionaryEntry | null> {
    const normalizedTerm = normalizeTerm(term)

    let query = `
      SELECT * FROM dictionary_entries 
      WHERE normalized_term = ? 
      AND overall_score >= ?
    `

    const params: any[] = [normalizedTerm, 60]

    if (!options?.searchAllLanguages) {
      query += ` AND lang = ?`
      params.push(lang)
    }

    query += ` ORDER BY 
      CASE WHEN lang = ? THEN 0 ELSE 1 END,
      overall_score DESC,
      version DESC
      LIMIT 1
    `
    params.push(lang)

    const result = await this.db
      .prepare(query)
      .bind(...params)
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
      .prepare(
        `
        INSERT INTO dictionary_entries (
          id, term, normalized_term, lang, source_lang, lang_confidence,
          type, definition, refs, metadata, quality_score, overall_score,
          created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        entry.id,
        entry.term,
        entry.normalized_term,
        entry.lang || 'en',
        entry.source_lang || null,
        entry.lang_confidence || 1.0,
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
      .prepare(
        `
        UPDATE dictionary_entries 
        SET term = ?, normalized_term = ?, lang = ?, source_lang = ?, 
            lang_confidence = ?, type = ?, definition = ?, 
            refs = ?, metadata = ?, quality_score = ?, 
            overall_score = ?, updated_at = ?, version = version + 1
        WHERE id = ?
      `
      )
      .bind(
        entry.term,
        entry.normalized_term,
        entry.lang || 'en',
        entry.source_lang || null,
        entry.lang_confidence || 1.0,
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
   * Search dictionary entries with language support
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const normalizedQuery = normalizeTerm(query.q)
    const limit = query.limit || 20
    const offset = query.offset || 0
    const uiLang = query.lang || 'en'

    // Build WHERE conditions
    const conditions: string[] = [
      '(normalized_term LIKE ? OR term LIKE ? OR json_extract(metadata, "$.synonyms") LIKE ?)',
    ]
    const params: any[] = [
      `%${normalizedQuery}%`,
      `%${query.q}%`,
      `%${normalizedQuery}%`,
    ]

    // Language filtering
    if (!query.searchAllLanguages && !query.filters?.languages?.length) {
      conditions.push('lang = ?')
      params.push(uiLang)
    } else if (query.filters?.languages?.length) {
      const langPlaceholders = query.filters.languages.map(() => '?').join(',')
      conditions.push(`lang IN (${langPlaceholders})`)
      params.push(...query.filters.languages)
    }

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

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countResult = await this.db
      .prepare(
        `SELECT COUNT(*) as total FROM dictionary_entries ${whereClause}`
      )
      .bind(...params)
      .first()

    const total = Number(countResult?.total) || 0

    // Get results with sorting
    let orderBy = 'ORDER BY '

    // Always prioritize language match first when doing cross-language search
    if (query.searchAllLanguages) {
      orderBy += `CASE WHEN lang = ? THEN 0 ELSE 1 END, `
      params.push(uiLang)
    }

    switch (query.sort_by) {
      case 'alphabetical':
        orderBy += 'term ASC'
        break
      case 'quality':
        orderBy += 'overall_score DESC, term ASC'
        break
      case 'popularity':
        orderBy +=
          'json_extract(metadata, "$.search_frequency") DESC, overall_score DESC'
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
        params.push(
          normalizedQuery,
          `${normalizedQuery}%`,
          `%${normalizedQuery}%`
        )
        break
    }

    const results = await this.db
      .prepare(
        `
        SELECT * FROM dictionary_entries 
        ${whereClause}
        ${orderBy}
        LIMIT ? OFFSET ?
      `
      )
      .bind(...params, limit, offset)
      .all()

    // Get suggested languages if cross-language search
    let suggestedLanguages: string[] | undefined
    if (query.searchAllLanguages && results.results.length > 0) {
      const langResult = await this.db
        .prepare(
          `
          SELECT DISTINCT lang FROM dictionary_entries 
          WHERE normalized_term = ?
          AND lang != ?
          ORDER BY overall_score DESC
          LIMIT 5
        `
        )
        .bind(normalizedQuery, uiLang)
        .all()

      suggestedLanguages = langResult.results.map(r => r.lang as string)
    }

    return {
      entries: results.results.map(r => this.deserializeEntry(r)),
      total,
      query,
      suggestedLanguages,
      // TODO: Add language detection logic here
      detectedTermLanguage: undefined,
    }
  }

  /**
   * Get multiple entries by terms (for batch queries)
   */
  async findByTerms(
    terms: string[],
    lang: string = 'en'
  ): Promise<Map<string, DictionaryEntry>> {
    if (terms.length === 0) return new Map()

    const normalizedTerms = terms.map(normalizeTerm)
    const placeholders = normalizedTerms.map(() => '?').join(',')

    const results = await this.db
      .prepare(
        `
        SELECT * FROM dictionary_entries 
        WHERE normalized_term IN (${placeholders})
        AND lang = ?
        AND overall_score >= 60
        ORDER BY overall_score DESC
      `
      )
      .bind(...normalizedTerms, lang)
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
      .prepare(
        `
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
      `
      )
      .bind(maxQualityScore, cutoffDate.toISOString(), limit)
      .all()

    return results.results.map(r => this.deserializeEntry(r))
  }

  /**
   * Log search analytics
   */
  async logSearch(analytics: SearchAnalytics): Promise<void> {
    await this.db
      .prepare(
        `
        INSERT INTO search_analytics (
          id, term, normalized_term, found, entry_id,
          response_time_ms, searched_at, user_session_id, 
          user_id, search_source, search_lang, result_lang
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
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
        analytics.search_source,
        analytics.search_lang || 'en',
        analytics.result_lang || null
      )
      .run()
  }

  /**
   * Save user feedback
   */
  async saveFeedback(feedback: UserFeedback): Promise<void> {
    await this.db
      .prepare(
        `
        INSERT INTO user_feedback (
          id, entry_id, user_id, rating, helpful,
          feedback_text, feedback_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
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
      .prepare(
        `
        INSERT INTO quality_checkpoints (
          id, entry_id, check_type, score_before, score_after,
          improvements, model_used, checked_at, checked_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        checkpoint.id,
        checkpoint.entry_id,
        checkpoint.check_type,
        checkpoint.score_before,
        checkpoint.score_after,
        checkpoint.improvements
          ? JSON.stringify(checkpoint.improvements)
          : null,
        checkpoint.model_used,
        checkpoint.checked_at,
        checkpoint.checked_by || null
      )
      .run()
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 20): Promise<
    Array<{
      term: string
      search_count: number
      found_count: number
      last_searched: string
    }>
  > {
    const results = await this.db
      .prepare(
        `
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
      `
      )
      .bind(limit)
      .all()

    return results.results.map(r => ({
      term: r.term as string,
      search_count: Number(r.search_count),
      found_count: Number(r.found_count),
      last_searched: r.last_searched as string,
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
      .prepare(
        `
        SELECT 
          (SELECT COUNT(*) FROM dictionary_entries) as total_terms,
          (SELECT AVG(overall_score) FROM dictionary_entries) as avg_quality_score,
          (SELECT COUNT(*) FROM search_analytics) as total_searches,
          (SELECT COUNT(*) FROM user_feedback) as total_feedback
      `
      )
      .first()

    return {
      total_terms: Number(result?.total_terms) || 0,
      avg_quality_score: Number(result?.avg_quality_score) || 0,
      total_searches: Number(result?.total_searches) || 0,
      total_feedback: Number(result?.total_feedback) || 0,
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
      .prepare(
        `
        INSERT INTO enhancement_queue (
          id, entry_id, priority, reason, status, created_at
        ) VALUES (?, ?, ?, ?, 'pending', ?)
      `
      )
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
  async getRelatedTerms(entryId: string): Promise<
    Array<{
      entry: DictionaryEntry
      relationship_type: string
      confidence_score: number
    }>
  > {
    const results = await this.db
      .prepare(
        `
        SELECT 
          de.*,
          rt.relationship_type,
          rt.confidence_score
        FROM related_terms rt
        JOIN dictionary_entries de ON rt.related_entry_id = de.id
        WHERE rt.entry_id = ?
        ORDER BY rt.confidence_score DESC
      `
      )
      .bind(entryId)
      .all()

    return results.results.map(r => ({
      entry: this.deserializeEntry(r),
      relationship_type: r.relationship_type as string,
      confidence_score: Number(r.confidence_score),
    }))
  }

  /**
   * Update search frequency
   */
  async updateSearchFrequency(entryId: string): Promise<void> {
    await this.db
      .prepare(
        `
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
      `
      )
      .bind(new Date().toISOString(), entryId)
      .run()
  }

  /**
   * Get term in multiple languages for comparison
   */
  async getTermInLanguages(
    term: string,
    languages: string[]
  ): Promise<MultiLanguageTermResponse> {
    const normalizedTerm = normalizeTerm(term)
    const placeholders = languages.map(() => '?').join(',')

    const results = await this.db
      .prepare(
        `
        SELECT * FROM dictionary_entries
        WHERE normalized_term = ?
        AND lang IN (${placeholders})
        ORDER BY overall_score DESC
      `
      )
      .bind(normalizedTerm, ...languages)
      .all()

    const languageMap: Partial<Record<string, DictionaryEntry>> = {}

    for (const row of results.results) {
      const entry = this.deserializeEntry(row)
      if (
        !languageMap[entry.lang] ||
        entry.quality_score.overall >
          (languageMap[entry.lang]?.quality_score.overall || 0)
      ) {
        languageMap[entry.lang] = entry
      }
    }

    return {
      term,
      normalized_term: normalizedTerm,
      languages: languageMap,
    }
  }

  /**
   * Deserialize database row to DictionaryEntry
   */
  private deserializeEntry(row: Record<string, unknown>): DictionaryEntry {
    return {
      id: row.id as string,
      term: row.term as string,
      normalized_term: row.normalized_term as string,
      lang: (row.lang as string) || 'en',
      source_lang: (row.source_lang as string) || undefined,
      lang_confidence: (row.lang_confidence as number) || 1.0,
      type: row.type as TermType,
      definition: JSON.parse(row.definition as string),
      references: JSON.parse(row.refs as string),
      metadata: JSON.parse(row.metadata as string),
      quality_score: JSON.parse(row.quality_score as string),
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      version: row.version as number,
    }
  }

  /**
   * Get all dictionary entries with embeddings for semantic search
   */
  async getEntriesWithEmbeddings(): Promise<
    Array<{ entry: DictionaryEntry; embedding: number[] }>
  > {
    const results = await this.db
      .prepare(
        `
        SELECT de.*, e.embedding
        FROM dictionary_entries de
        JOIN embeddings e ON de.id = e.entry_id
        WHERE e.embedding IS NOT NULL
      `
      )
      .all()

    return results.results.map(row => ({
      entry: this.deserializeEntry(row),
      embedding: JSON.parse(row.embedding as string) as number[],
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
      .prepare(
        `
        UPDATE dictionary_entries 
        SET type = ?, updated_at = datetime('now')
        WHERE type = ?
      `
      )
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
      .prepare(
        `
        SELECT 
          SUM(CASE WHEN json_extract(quality_score, '$.overall') >= 90 THEN 1 ELSE 0 END) as excellent,
          SUM(CASE WHEN json_extract(quality_score, '$.overall') >= 70 AND json_extract(quality_score, '$.overall') < 90 THEN 1 ELSE 0 END) as good,
          SUM(CASE WHEN json_extract(quality_score, '$.overall') >= 50 AND json_extract(quality_score, '$.overall') < 70 THEN 1 ELSE 0 END) as fair,
          SUM(CASE WHEN json_extract(quality_score, '$.overall') < 50 THEN 1 ELSE 0 END) as poor
        FROM dictionary_entries
      `
      )
      .first()

    return {
      excellent: Number(result?.excellent) || 0,
      good: Number(result?.good) || 0,
      fair: Number(result?.fair) || 0,
      poor: Number(result?.poor) || 0,
    }
  }

  /**
   * Get type distribution
   */
  async getTypeDistribution(): Promise<Record<string, number>> {
    const results = await this.db
      .prepare(
        `
        SELECT type, COUNT(*) as count
        FROM dictionary_entries
        GROUP BY type
      `
      )
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
      .prepare(
        `
        SELECT * FROM dictionary_entries
        ORDER BY created_at DESC
        LIMIT ?
      `
      )
      .bind(limit)
      .all()

    return results.results.map(row => this.deserializeEntry(row))
  }

  /**
   * Get low quality terms
   */
  async getLowQualityTerms(limit: number = 10): Promise<DictionaryEntry[]> {
    const results = await this.db
      .prepare(
        `
        SELECT * FROM dictionary_entries
        WHERE json_extract(quality_score, '$.overall') < 50
        ORDER BY json_extract(quality_score, '$.overall') ASC
        LIMIT ?
      `
      )
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
      .prepare(
        `
        SELECT 
          COUNT(*) as total_searches,
          COUNT(DISTINCT normalized_term) as unique_terms,
          AVG(CASE WHEN results_count > 0 THEN 1 ELSE 0 END) as success_rate
        FROM search_analytics
      `
      )
      .first()

    return {
      total_searches: Number(result?.total_searches) || 0,
      unique_terms: Number(result?.unique_terms) || 0,
      success_rate: Number(result?.success_rate) || 0,
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
      earliest_date:
        options.startDate?.toISOString() || new Date().toISOString(),
      latest_date: options.endDate?.toISOString() || new Date().toISOString(),
      total_searches: stats.total_searches,
      unique_terms: stats.unique_terms,
      success_rate: stats.success_rate,
      top_searches: popular.map(p => ({ term: p.term, count: p.search_count })),
      searches_by_period: [],
    }
  }

  /**
   * Get AI usage statistics
   */
  async getAIUsageStats(
    options: {
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{
    total_requests: number
    by_provider: Record<string, number>
    by_model: Record<string, number>
    avg_response_time: number
    error_rate: number
    cost_estimate: number
  }> {
    const { startDate, endDate } = options

    // Build where clause for date filtering
    const whereConditions: string[] = []
    const params: any[] = []

    if (startDate) {
      whereConditions.push('created_at >= ?')
      params.push(startDate.toISOString())
    }

    if (endDate) {
      whereConditions.push('created_at <= ?')
      params.push(endDate.toISOString())
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get total requests and error rate
    const statsResult = await this.db
      .prepare(
        `
        SELECT 
          COUNT(*) as total_requests,
          AVG(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_rate,
          AVG(response_time_ms) as avg_response_time
        FROM ai_generation_logs
        ${whereClause}
      `
      )
      .bind(...params)
      .first()

    // Get by provider stats
    const providerResults = await this.db
      .prepare(
        `
        SELECT 
          provider,
          COUNT(*) as count
        FROM ai_generation_logs
        ${whereClause}
        GROUP BY provider
      `
      )
      .bind(...params)
      .all()

    const byProvider: Record<string, number> = {}
    providerResults.results.forEach(row => {
      byProvider[row.provider as string] = Number(row.count)
    })

    // Get by model stats
    const modelResults = await this.db
      .prepare(
        `
        SELECT 
          model,
          COUNT(*) as count
        FROM ai_generation_logs
        ${whereClause}
        GROUP BY model
      `
      )
      .bind(...params)
      .all()

    const byModel: Record<string, number> = {}
    modelResults.results.forEach(row => {
      byModel[row.model as string] = Number(row.count)
    })

    // Calculate cost estimate based on token usage
    const costResult = await this.db
      .prepare(
        `
        SELECT 
          SUM(tokens_used * 0.000002) as cost_estimate
        FROM ai_generation_logs
        ${whereClause}
      `
      )
      .bind(...params)
      .first()

    return {
      total_requests: Number(statsResult?.total_requests) || 0,
      by_provider: byProvider,
      by_model: byModel,
      avg_response_time: Number(statsResult?.avg_response_time) || 0,
      error_rate: Number(statsResult?.error_rate) || 0,
      cost_estimate: Number(costResult?.cost_estimate) || 0,
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
    const { startDate, endDate, period = 'day' } = options

    // Build where clause for date filtering
    const whereConditions: string[] = []
    const params: any[] = []

    if (startDate) {
      whereConditions.push('created_at >= ?')
      params.push(startDate.toISOString())
    }

    if (endDate) {
      whereConditions.push('created_at <= ?')
      params.push(endDate.toISOString())
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Determine date format based on period
    let dateFormat = ''
    switch (period) {
      case 'hour':
        dateFormat = "strftime('%Y-%m-%d %H:00', created_at)"
        break
      case 'day':
        dateFormat = 'date(created_at)'
        break
      case 'week':
        dateFormat = "strftime('%Y-W%W', created_at)"
        break
      case 'month':
        dateFormat = "strftime('%Y-%m', created_at)"
        break
      default:
        dateFormat = 'date(created_at)'
    }

    // Get trends over time
    const trendsResult = await this.db
      .prepare(
        `
        SELECT 
          ${dateFormat} as date_period,
          AVG(json_extract(quality_score, '$.overall')) as avg_score,
          COUNT(*) as entry_count
        FROM dictionary_entries
        ${whereClause}
        GROUP BY date_period
        ORDER BY date_period
      `
      )
      .bind(...params)
      .all()

    const trends = trendsResult.results.map(row => ({
      date: row.date_period as string,
      avg_score: Number(row.avg_score) || 0,
    }))

    // Calculate improvements and degradations
    const changesResult = await this.db
      .prepare(
        `
        SELECT 
          SUM(CASE WHEN new_score > old_score THEN 1 ELSE 0 END) as improvements,
          SUM(CASE WHEN new_score < old_score THEN 1 ELSE 0 END) as degradations,
          AVG(new_score - old_score) as avg_change
        FROM quality_checkpoints
        ${whereClause}
      `
      )
      .bind(...params)
      .first()

    return {
      trends,
      improvements: Number(changesResult?.improvements) || 0,
      degradations: Number(changesResult?.degradations) || 0,
      avg_change: Number(changesResult?.avg_change) || 0,
    }
  }

  /**
   * Get content gaps analysis
   */
  async getContentGaps(limit: number = 100): Promise<
    Array<{
      category: string
      missing_count: number
      suggestions: string[]
    }>
  > {
    // Analyze entries with missing fields
    const gapsResult = await this.db
      .prepare(
        `
        SELECT 
          CASE 
            WHEN json_extract(definition, '$.references') IS NULL OR json_length(json_extract(definition, '$.references')) = 0 THEN 'missing_references'
            WHEN json_extract(definition, '$.pronunciation') IS NULL THEN 'missing_pronunciation'
            WHEN json_extract(definition, '$.etymology') IS NULL THEN 'missing_etymology'
            WHEN json_extract(definition, '$.examples') IS NULL OR json_length(json_extract(definition, '$.examples')) = 0 THEN 'missing_examples'
            WHEN json_extract(quality_score, '$.overall') < 50 THEN 'low_quality'
            ELSE 'complete'
          END as gap_category,
          type,
          COUNT(*) as count
        FROM dictionary_entries
        WHERE gap_category != 'complete'
        GROUP BY gap_category, type
        LIMIT ?
      `
      )
      .bind(limit)
      .all()

    // Group by category and generate suggestions
    const gapsMap = new Map<string, { types: Set<string>; count: number }>()

    gapsResult.results.forEach(row => {
      const category = row.gap_category as string
      if (!gapsMap.has(category)) {
        gapsMap.set(category, { types: new Set(), count: 0 })
      }
      const gap = gapsMap.get(category)!
      gap.types.add(row.type as string)
      gap.count += Number(row.count)
    })

    // Convert to array with suggestions
    return Array.from(gapsMap.entries()).map(([category, data]) => ({
      category,
      missing_count: data.count,
      suggestions: generateGapSuggestions(category, Array.from(data.types)),
    }))
  }

  /**
   * Add terms to seed queue for background generation
   */
  async addToSeedQueue(
    terms: Array<{
      term: string
      languages: string[]
      priority?: number
    }>
  ): Promise<void> {
    for (const item of terms) {
      await this.db
        .prepare(
          `
          INSERT OR IGNORE INTO seed_queue (
            id, term, languages, priority, status, attempts, created_at
          ) VALUES (?, ?, ?, ?, 'pending', 0, ?)
        `
        )
        .bind(
          crypto.randomUUID(),
          item.term,
          JSON.stringify(item.languages),
          item.priority || 5,
          new Date().toISOString()
        )
        .run()
    }
  }

  /**
   * Get next seed queue items to process
   */
  async getNextSeedQueueItems(limit: number = 10): Promise<SeedQueueEntry[]> {
    const results = await this.db
      .prepare(
        `
        SELECT * FROM seed_queue
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT ?
      `
      )
      .bind(limit)
      .all()

    return results.results.map(row => ({
      id: row.id as string,
      term: row.term as string,
      languages: JSON.parse(row.languages as string),
      priority: row.priority as number,
      status: row.status as any,
      attempts: row.attempts as number,
      last_attempt_at: row.last_attempt_at as string | undefined,
      completed_at: row.completed_at as string | undefined,
      error_message: row.error_message as string | undefined,
      created_at: row.created_at as string,
    }))
  }

  /**
   * Update seed queue item status
   */
  async updateSeedQueueStatus(
    id: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const now = new Date().toISOString()

    if (status === 'processing') {
      await this.db
        .prepare(
          `
          UPDATE seed_queue
          SET status = ?, last_attempt_at = ?, attempts = attempts + 1
          WHERE id = ?
        `
        )
        .bind(status, now, id)
        .run()
    } else if (status === 'completed') {
      await this.db
        .prepare(
          `
          UPDATE seed_queue
          SET status = ?, completed_at = ?
          WHERE id = ?
        `
        )
        .bind(status, now, id)
        .run()
    } else if (status === 'failed') {
      await this.db
        .prepare(
          `
          UPDATE seed_queue
          SET status = ?, error_message = ?, last_attempt_at = ?
          WHERE id = ?
        `
        )
        .bind(status, error || 'Unknown error', now, id)
        .run()
    }
  }

  /**
   * Get seed queue statistics
   */
  async getSeedQueueStats(): Promise<{
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
  }> {
    const result = await this.db
      .prepare(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM seed_queue
      `
      )
      .first()

    return {
      total: Number(result?.total) || 0,
      pending: Number(result?.pending) || 0,
      processing: Number(result?.processing) || 0,
      completed: Number(result?.completed) || 0,
      failed: Number(result?.failed) || 0,
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(_period?: string): Promise<{
    avg_response_time: number
    p95_response_time: number
    p99_response_time: number
    cache_hit_rate: number
    error_rate: number
    requests_per_second: number
  }> {
    // Get response time percentiles from search analytics
    const responseTimeResult = await this.db
      .prepare(
        `
        SELECT 
          AVG(response_time_ms) as avg_response_time,
          MIN(response_time_ms) as min_response_time,
          MAX(response_time_ms) as max_response_time,
          COUNT(*) as total_requests
        FROM search_analytics
        WHERE created_at >= datetime('now', '-1 hour')
      `
      )
      .first()

    // Calculate percentiles (simplified - in production use proper percentile calculation)
    const avgTime = Number(responseTimeResult?.avg_response_time) || 50
    const maxTime = Number(responseTimeResult?.max_response_time) || 200

    // Get cache hit rate
    const cacheResult = await this.db
      .prepare(
        `
        SELECT 
          AVG(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hit_rate
        FROM search_analytics
        WHERE created_at >= datetime('now', '-1 hour')
      `
      )
      .first()

    // Get error rate from AI generation logs
    const errorResult = await this.db
      .prepare(
        `
        SELECT 
          AVG(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_rate
        FROM ai_generation_logs
        WHERE created_at >= datetime('now', '-1 hour')
      `
      )
      .first()

    // Calculate requests per second
    const totalRequests = Number(responseTimeResult?.total_requests) || 0
    const requestsPerSecond = totalRequests / 3600 // requests in last hour / seconds

    return {
      avg_response_time: avgTime,
      p95_response_time: avgTime + (maxTime - avgTime) * 0.5, // Simplified p95
      p99_response_time: avgTime + (maxTime - avgTime) * 0.8, // Simplified p99
      cache_hit_rate: Number(cacheResult?.cache_hit_rate) || 0,
      error_rate: Number(errorResult?.error_rate) || 0,
      requests_per_second: Math.round(requestsPerSecond * 100) / 100,
    }
  }
}

/**
 * Generate suggestions for content gaps
 */
function generateGapSuggestions(category: string, types: string[]): string[] {
  const suggestions: string[] = []

  switch (category) {
    case 'missing_references':
      suggestions.push('Add references from music theory textbooks')
      suggestions.push('Include links to reputable online resources')
      suggestions.push('Reference standard music dictionaries')
      break
    case 'missing_pronunciation':
      suggestions.push('Add IPA pronunciation guides')
      suggestions.push('Include audio pronunciation samples')
      suggestions.push('Add phonetic spellings')
      break
    case 'missing_etymology':
      suggestions.push('Research word origins from music history')
      suggestions.push('Include language of origin')
      suggestions.push('Add historical context')
      break
    case 'missing_examples':
      suggestions.push('Add musical score examples')
      suggestions.push('Include usage in different contexts')
      suggestions.push('Provide instrument-specific examples')
      break
    case 'low_quality':
      suggestions.push('Enhance definitions with more detail')
      suggestions.push('Add missing metadata fields')
      suggestions.push('Review and improve content accuracy')
      break
  }

  // Add type-specific suggestions
  if (types.includes('THEORY')) {
    suggestions.push('Focus on theoretical concepts and terminology')
  }
  if (types.includes('PERFORMANCE')) {
    suggestions.push('Include performance practice examples')
  }
  if (types.includes('INSTRUMENT')) {
    suggestions.push('Add instrument-specific techniques and terms')
  }

  return suggestions
}
