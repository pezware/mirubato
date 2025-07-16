/**
 * Seed Processor Service for Dictionary Auto-Generation
 *
 * Implements quality-first approach for generating musical term definitions
 * with small batches and high quality standards.
 */

import type { Env } from '../types/env'
import type { DictionaryEntry, SeedQueueEntry } from '../types/dictionary'
import { DictionaryDatabase } from './storage/dictionary-database'
import { DictionaryGenerator } from './ai/dictionary-generator'
import { TokenBudgetManager } from './token-budget-manager'
import { CacheService } from './storage/cache-service'

export interface ProcessingResult {
  processed: number
  succeeded: number
  failed: number
  skipped: number
  quality_scores: number[]
  errors: string[]
  token_usage: number
}

export interface ManualReviewItem {
  id: string
  term: string
  generated_content: string
  quality_score: number
  reason: string
}

export class SeedProcessor {
  private readonly MIN_QUALITY_SCORE: number
  private readonly BATCH_SIZE: number
  private readonly PRIORITY_THRESHOLD: number

  private db: DictionaryDatabase
  private generator: DictionaryGenerator
  private budgetManager: TokenBudgetManager
  private cache: CacheService

  constructor(private readonly env: Env) {
    // Configure based on environment
    this.MIN_QUALITY_SCORE = parseFloat(
      env.QUALITY_MIN_THRESHOLD || (env.ENVIRONMENT === 'staging' ? '90' : '85')
    )
    this.BATCH_SIZE = parseInt(
      env.SEED_BATCH_SIZE || (env.ENVIRONMENT === 'staging' ? '2' : '5')
    )
    this.PRIORITY_THRESHOLD = parseInt(
      env.SEED_PRIORITY_THRESHOLD ||
        (env.ENVIRONMENT === 'staging' ? '10' : '8')
    )

    // Initialize services
    this.db = new DictionaryDatabase(env.DB)
    this.generator = new DictionaryGenerator(env)
    this.budgetManager = new TokenBudgetManager(env.DB, env)
    this.cache = new CacheService(env.CACHE, env)
  }

  /**
   * Main processing method called by scheduled handler
   */
  async processSeedQueue(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      quality_scores: [],
      errors: [],
      token_usage: 0,
    }

    try {
      // Check if seeding is enabled
      if (this.env.SEED_ENABLED !== 'true') {
        console.log('Seed processing is disabled')
        return result
      }

      // Check token budget
      if (!(await this.budgetManager.canProcessTerms())) {
        console.log('Daily token budget exhausted')
        result.errors.push('Daily token budget exhausted')
        return result
      }

      // Get safe batch size based on remaining budget
      const safeBatchSize = await this.budgetManager.getSafeBatchSize(
        this.BATCH_SIZE
      )
      if (safeBatchSize === 0) {
        console.log('Insufficient token budget for processing')
        result.errors.push('Insufficient token budget')
        return result
      }

      // Get high-priority terms from queue
      const queueItems = await this.getNextHighPriorityTerms(safeBatchSize)
      if (queueItems.length === 0) {
        console.log('No pending high-priority terms in queue')
        return result
      }

      console.log(
        `Processing ${queueItems.length} terms with priority >= ${this.PRIORITY_THRESHOLD}`
      )

      // Process each term
      for (const item of queueItems) {
        try {
          // Update status to processing
          await this.db.updateSeedQueueStatus(item.id, 'processing')
          result.processed++

          // Generate entry for each language
          const processedLanguages: string[] = []
          const languageScores: number[] = []
          let totalTokensUsed = 0

          for (const lang of item.languages) {
            try {
              // Check if entry already exists
              const existing = await this.db.findByTerm(item.term, lang)
              if (
                existing &&
                existing.quality_score.overall >= this.MIN_QUALITY_SCORE
              ) {
                console.log(
                  `Term "${item.term}" in ${lang} already exists with sufficient quality`
                )
                processedLanguages.push(lang)
                continue
              }

              // Generate high-quality entry
              console.log(`Generating "${item.term}" in ${lang}...`)
              const startTokens = await this.budgetManager.getTokensUsedToday()

              const entry = await this.generateHighQualityEntry(item.term, lang)

              const endTokens = await this.budgetManager.getTokensUsedToday()
              const tokensUsed = endTokens - startTokens
              totalTokensUsed += tokensUsed

              if (!entry) {
                throw new Error('Failed to generate entry')
              }

              // Check quality score
              if (entry.quality_score.overall < this.MIN_QUALITY_SCORE) {
                // Send to manual review queue
                await this.addToManualReview({
                  id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  term: item.term,
                  generated_content: JSON.stringify(entry),
                  quality_score: entry.quality_score.overall,
                  reason: `Quality score ${entry.quality_score.overall} below threshold ${this.MIN_QUALITY_SCORE}`,
                })

                console.log(
                  `Term "${item.term}" in ${lang} sent to manual review (score: ${entry.quality_score.overall})`
                )
                languageScores.push(entry.quality_score.overall)
                continue
              }

              // Save high-quality entry
              try {
                if (existing) {
                  await this.db.update(entry)
                } else {
                  await this.db.create(entry)
                }

                // Invalidate cache for the term
                await this.cache.invalidateTerm(entry.normalized_term)

                processedLanguages.push(lang)
                languageScores.push(entry.quality_score.overall)

                console.log(
                  `Successfully generated "${item.term}" in ${lang} with quality score ${entry.quality_score.overall}`
                )
              } catch (saveError: unknown) {
                // Handle UNIQUE constraint violation gracefully
                if (
                  saveError instanceof Error &&
                  saveError.message?.includes('UNIQUE constraint failed')
                ) {
                  console.log(
                    `Entry for "${item.term}" in ${lang} already exists (created elsewhere), skipping`
                  )
                  // Still count as processed since the entry exists
                  processedLanguages.push(lang)
                  result.skipped++
                } else {
                  // Re-throw other errors
                  throw saveError
                }
              }
            } catch (langError) {
              console.error(
                `Error processing "${item.term}" in ${lang}:`,
                langError
              )
              result.errors.push(`${item.term} (${lang}): ${langError}`)
            }
          }

          // Record token usage
          if (totalTokensUsed > 0) {
            await this.budgetManager.recordUsage(
              `@cf/meta/llama-3.1-8b-instruct-seed`,
              totalTokensUsed,
              processedLanguages.length
            )
            result.token_usage += totalTokensUsed
          }

          // Update queue status
          if (processedLanguages.length === item.languages.length) {
            await this.db.updateSeedQueueStatus(item.id, 'completed')
            result.succeeded++
          } else if (processedLanguages.length > 0) {
            // Partial success - update queue item with remaining languages
            const remainingLanguages = item.languages.filter(
              lang => !processedLanguages.includes(lang)
            )
            await this.updateQueueLanguages(item.id, remainingLanguages)
            result.succeeded++ // Count as success since some languages were processed
          } else {
            // Complete failure
            await this.db.updateSeedQueueStatus(
              item.id,
              'failed',
              'Failed to generate for any language'
            )
            result.failed++
          }

          // Add quality scores to result
          result.quality_scores.push(...languageScores)

          // Check if we're approaching token limit
          const usagePercentage = await this.budgetManager.getUsagePercentage()
          if (usagePercentage >= 90) {
            console.log(
              `Token usage at ${usagePercentage}%, stopping processing`
            )
            break
          }
        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error)
          await this.db.updateSeedQueueStatus(
            item.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          )
          result.failed++
          result.errors.push(`${item.term}: ${error}`)
        }
      }

      // Log summary
      const avgQuality =
        result.quality_scores.length > 0
          ? Math.round(
              result.quality_scores.reduce((a, b) => a + b, 0) /
                result.quality_scores.length
            )
          : 0

      console.log(`Seed processing complete:
        - Processed: ${result.processed}
        - Succeeded: ${result.succeeded}
        - Failed: ${result.failed}
        - Skipped: ${result.skipped}
        - Average Quality: ${avgQuality}%
        - Tokens Used: ${result.token_usage}
      `)
    } catch (error) {
      console.error('Fatal error in seed processing:', error)
      result.errors.push(`Fatal: ${error}`)
    }

    return result
  }

  /**
   * Get next high-priority terms from queue
   */
  private async getNextHighPriorityTerms(
    limit: number
  ): Promise<SeedQueueEntry[]> {
    const results = await this.env.DB.prepare(
      `SELECT * FROM seed_queue
         WHERE status = 'pending' 
         AND priority >= ?
         ORDER BY priority DESC, created_at ASC
         LIMIT ?`
    )
      .bind(this.PRIORITY_THRESHOLD, limit)
      .all()

    return results.results.map(row => ({
      id: row.id as string,
      term: row.term as string,
      languages: JSON.parse(row.languages as string),
      priority: row.priority as number,
      status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
      attempts: row.attempts as number,
      last_attempt_at: row.last_attempt_at
        ? String(row.last_attempt_at)
        : undefined,
      completed_at: row.completed_at ? String(row.completed_at) : undefined,
      error_message: row.error_message ? String(row.error_message) : undefined,
      created_at: row.created_at as string,
    }))
  }

  /**
   * Generate high-quality dictionary entry
   */
  private async generateHighQualityEntry(
    term: string,
    lang: string
  ): Promise<DictionaryEntry | null> {
    try {
      // Generate with enhanced context for quality
      const entry = await this.generator.generateEntry({
        term,
        type: 'general', // Will be refined by AI
        lang: lang as any,
        context: {
          requested_by: 'seed_processor',
          generation_reason: 'auto_seed',
        },
      })

      return entry
    } catch (error) {
      console.error(`Failed to generate entry for "${term}" in ${lang}:`, error)
      return null
    }
  }

  /**
   * Add term to manual review queue
   */
  private async addToManualReview(item: ManualReviewItem): Promise<void> {
    try {
      await this.env.DB.prepare(
        `INSERT INTO manual_review_queue (
            id, term, generated_content, quality_score, reason, status, created_at
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
      )
        .bind(
          item.id,
          item.term,
          item.generated_content,
          item.quality_score,
          item.reason,
          new Date().toISOString()
        )
        .run()
    } catch (error) {
      console.error('Failed to add to manual review queue:', error)
    }
  }

  /**
   * Update queue item with remaining languages
   */
  private async updateQueueLanguages(
    id: string,
    remainingLanguages: string[]
  ): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE seed_queue 
         SET languages = ?, 
             status = 'pending',
             last_attempt_at = ?
         WHERE id = ?`
    )
      .bind(JSON.stringify(remainingLanguages), new Date().toISOString(), id)
      .run()
  }

  /**
   * Get processing statistics for monitoring
   */
  async getProcessingStats(days: number = 7): Promise<{
    terms_processed: number
    average_quality: number
    success_rate: number
    manual_review_count: number
    token_efficiency: number
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get queue statistics
    const queueStats = await this.env.DB.prepare(
      `SELECT 
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(*) as total
         FROM seed_queue
         WHERE last_attempt_at >= ?`
    )
      .bind(startDate.toISOString())
      .first()

    // Get quality scores - using 'dictionary' table which is the actual table name
    const qualityStats = await this.env.DB.prepare(
      `SELECT AVG(json_extract(ai_metadata, '$.quality_score.overall')) as avg_quality
         FROM dictionary
         WHERE created_at >= ?
         AND json_extract(ai_metadata, '$.generation_context.requested_by') = 'seed_processor'`
    )
      .bind(startDate.toISOString())
      .first()

    // Get manual review count
    const reviewStats = await this.env.DB.prepare(
      `SELECT COUNT(*) as review_count
         FROM manual_review_queue
         WHERE created_at >= ?`
    )
      .bind(startDate.toISOString())
      .first()

    // Get token usage stats
    const tokenStats = await this.budgetManager.getUsageStats(days)

    const completed = (queueStats?.completed as number) || 0
    const total = (queueStats?.total as number) || 0
    const successRate = total > 0 ? (completed / total) * 100 : 0

    return {
      terms_processed: completed,
      average_quality: Math.round((qualityStats?.avg_quality as number) || 0),
      success_rate: Math.round(successRate),
      manual_review_count: (reviewStats?.review_count as number) || 0,
      token_efficiency: tokenStats.average_efficiency,
    }
  }
}
