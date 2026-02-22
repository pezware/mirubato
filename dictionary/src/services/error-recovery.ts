/**
 * Error Recovery Service for Dictionary Auto-Seeding
 *
 * Handles retry logic, dead letter queue, and failure analysis
 * for the seed processing system.
 */

import type { Env } from '../types/env'
import type { SeedQueueEntry } from '../types/dictionary'
import { DictionaryDatabase } from './storage/dictionary-database'
import { TokenBudgetManager } from './token-budget-manager'

export interface RetryPolicy {
  maxAttempts: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
}

export interface FailureAnalysis {
  error_type:
    | 'token_limit'
    | 'quality_failure'
    | 'api_error'
    | 'database_error'
    | 'unknown'
  is_retryable: boolean
  suggested_action: string
  estimated_recovery_time?: number // minutes
}

export interface RecoveryResult {
  recovered: number
  failed_permanently: number
  moved_to_dlq: number
  retry_scheduled: number
}

export class ErrorRecoveryService {
  private readonly DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxAttempts: 3,
    baseDelay: 5000, // 5 seconds
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
  }

  private db: DictionaryDatabase
  private budgetManager: TokenBudgetManager

  constructor(private readonly env: Env) {
    this.db = new DictionaryDatabase(env.DB)
    this.budgetManager = new TokenBudgetManager(env.DB, env)
  }

  /**
   * Analyze failed items and attempt recovery
   */
  async recoverFailedItems(limit: number = 50): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      recovered: 0,
      failed_permanently: 0,
      moved_to_dlq: 0,
      retry_scheduled: 0,
    }

    try {
      // Get failed items from seed queue
      const failedItems = await this.getFailedItems(limit)

      if (failedItems.length === 0) {
        console.warn('No failed items to recover')
        return result
      }

      console.warn(`Processing ${failedItems.length} failed items for recovery`)

      for (const item of failedItems) {
        const analysis = this.analyzeFailure(item)

        if (
          !analysis.is_retryable ||
          item.attempts >= this.DEFAULT_RETRY_POLICY.maxAttempts
        ) {
          // Move to dead letter queue
          await this.moveToDeadLetterQueue(item, analysis)
          result.moved_to_dlq++
          continue
        }

        // Check if we should retry now
        if (await this.shouldRetryNow(item, analysis)) {
          // Reset status to pending for retry
          await this.scheduleRetry(item)
          result.retry_scheduled++
        } else {
          // Schedule for later retry
          await this.scheduleDelayedRetry(item, analysis)
          result.retry_scheduled++
        }
      }

      // Clean up old DLQ items
      await this.cleanupDeadLetterQueue()

      console.warn(
        `Recovery complete: ${result.retry_scheduled} scheduled for retry, ${result.moved_to_dlq} moved to DLQ`
      )
    } catch (error) {
      console.error('Error in recovery process:', error)
    }

    return result
  }

  /**
   * Get failed items from seed queue
   */
  private async getFailedItems(limit: number): Promise<SeedQueueEntry[]> {
    const results = await this.env.DB.prepare(
      `SELECT * FROM seed_queue
       WHERE status = 'failed'
       AND (last_attempt_at IS NULL OR last_attempt_at < datetime('now', '-5 minutes'))
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`
    )
      .bind(limit)
      .all()

    return results.results.map(row => ({
      id: row.id as string,
      term: row.term as string,
      languages: JSON.parse(row.languages as string),
      priority: row.priority as number,
      status: row.status as 'failed',
      attempts: row.attempts as number,
      last_attempt_at: row.last_attempt_at as string | undefined,
      completed_at: row.completed_at as string | undefined,
      error_message: row.error_message as string | undefined,
      created_at: row.created_at as string,
    }))
  }

  /**
   * Analyze failure to determine recovery strategy
   */
  private analyzeFailure(item: SeedQueueEntry): FailureAnalysis {
    const errorMessage = item.error_message?.toLowerCase() || ''

    // Token limit errors
    if (errorMessage.includes('token') || errorMessage.includes('budget')) {
      return {
        error_type: 'token_limit',
        is_retryable: true,
        suggested_action: 'Wait for daily token budget reset',
        estimated_recovery_time: this.getMinutesUntilTokenReset(),
      }
    }

    // Quality failures
    if (errorMessage.includes('quality') || errorMessage.includes('score')) {
      return {
        error_type: 'quality_failure',
        is_retryable: item.attempts < 2, // Try once more with different model
        suggested_action: 'Retry with enhanced prompting or manual review',
      }
    }

    // API errors
    if (
      errorMessage.includes('api') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('rate limit')
    ) {
      return {
        error_type: 'api_error',
        is_retryable: true,
        suggested_action: 'Retry with exponential backoff',
        estimated_recovery_time: this.calculateBackoffDelay(item.attempts),
      }
    }

    // Database errors
    if (
      errorMessage.includes('database') ||
      errorMessage.includes('constraint') ||
      errorMessage.includes('sql')
    ) {
      return {
        error_type: 'database_error',
        is_retryable: false, // Usually indicates data issues
        suggested_action: 'Manual investigation required',
      }
    }

    // Unknown errors
    return {
      error_type: 'unknown',
      is_retryable: item.attempts < 2,
      suggested_action: 'Retry once more before manual review',
    }
  }

  /**
   * Check if we should retry the item now
   */
  private async shouldRetryNow(
    item: SeedQueueEntry,
    analysis: FailureAnalysis
  ): Promise<boolean> {
    // Check token budget for token-related failures
    if (analysis.error_type === 'token_limit') {
      return await this.budgetManager.canProcessTerms()
    }

    // Check backoff time for API errors
    if (analysis.error_type === 'api_error' && item.last_attempt_at) {
      const lastAttempt = new Date(item.last_attempt_at)
      const backoffDelay = this.calculateBackoffDelay(item.attempts)
      const nextRetryTime = new Date(
        lastAttempt.getTime() + backoffDelay * 60000
      )
      return new Date() >= nextRetryTime
    }

    // For other retryable errors, check if enough time has passed
    if (item.last_attempt_at) {
      const lastAttempt = new Date(item.last_attempt_at)
      const minDelay = 5 * 60000 // 5 minutes minimum
      return new Date().getTime() - lastAttempt.getTime() >= minDelay
    }

    return true
  }

  /**
   * Schedule item for immediate retry
   */
  private async scheduleRetry(item: SeedQueueEntry): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE seed_queue 
       SET status = 'pending',
           error_message = NULL
       WHERE id = ?`
    )
      .bind(item.id)
      .run()

    console.warn(
      `Scheduled ${item.term} for retry (attempt ${item.attempts + 1})`
    )
  }

  /**
   * Schedule item for delayed retry
   */
  private async scheduleDelayedRetry(
    item: SeedQueueEntry,
    analysis: FailureAnalysis
  ): Promise<void> {
    const retryTime = new Date()

    if (analysis.estimated_recovery_time) {
      retryTime.setMinutes(
        retryTime.getMinutes() + analysis.estimated_recovery_time
      )
    } else {
      // Default to exponential backoff
      const delay = this.calculateBackoffDelay(item.attempts)
      retryTime.setMinutes(retryTime.getMinutes() + delay)
    }

    await this.env.DB.prepare(
      `UPDATE seed_queue 
       SET retry_after = ?
       WHERE id = ?`
    )
      .bind(retryTime.toISOString(), item.id)
      .run()

    console.warn(
      `Scheduled ${item.term} for retry after ${retryTime.toISOString()}`
    )
  }

  /**
   * Move item to dead letter queue
   */
  private async moveToDeadLetterQueue(
    item: SeedQueueEntry,
    analysis: FailureAnalysis
  ): Promise<void> {
    const dlqId = `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await this.env.DB.prepare(
      `INSERT INTO dead_letter_queue (
        id, original_id, term, languages, priority,
        failure_reason, failure_analysis, attempts,
        original_created_at, moved_to_dlq_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        dlqId,
        item.id,
        item.term,
        JSON.stringify(item.languages),
        item.priority,
        item.error_message || 'Unknown error',
        JSON.stringify(analysis),
        item.attempts,
        item.created_at,
        new Date().toISOString()
      )
      .run()

    // Remove from seed queue
    await this.env.DB.prepare('DELETE FROM seed_queue WHERE id = ?')
      .bind(item.id)
      .run()

    console.warn(
      `Moved ${item.term} to dead letter queue after ${item.attempts} attempts`
    )
  }

  /**
   * Clean up old items from dead letter queue
   */
  private async cleanupDeadLetterQueue(): Promise<void> {
    // Keep DLQ items for 30 days for analysis
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30)

    const result = await this.env.DB.prepare(
      `DELETE FROM dead_letter_queue 
       WHERE moved_to_dlq_at < ?`
    )
      .bind(cutoffDate.toISOString())
      .run()

    if (result.meta.changes > 0) {
      console.warn(
        `Cleaned up ${result.meta.changes} old items from dead letter queue`
      )
    }
  }

  /**
   * Calculate backoff delay in minutes
   */
  private calculateBackoffDelay(attempts: number): number {
    const baseDelay = this.DEFAULT_RETRY_POLICY.baseDelay / 60000 // Convert to minutes
    const delay =
      baseDelay *
      Math.pow(this.DEFAULT_RETRY_POLICY.backoffMultiplier, attempts - 1)
    const maxDelay = this.DEFAULT_RETRY_POLICY.maxDelay / 60000
    return Math.min(delay, maxDelay)
  }

  /**
   * Get minutes until daily token reset
   */
  private getMinutesUntilTokenReset(): number {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Midnight UTC
    return Math.ceil((tomorrow.getTime() - now.getTime()) / 60000)
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(): Promise<{
    failed_items: number
    dlq_items: number
    recovery_rate: number
    common_failures: Array<{ error_type: string; count: number }>
  }> {
    // Get failed items count
    const failedResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM seed_queue WHERE status = 'failed'`
    ).first()

    // Get DLQ items count
    const dlqResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM dead_letter_queue`
    ).first()

    // Get recovery rate (items that succeeded after retry)
    const recoveryResult = await this.env.DB.prepare(
      `SELECT 
        COUNT(CASE WHEN status = 'completed' AND attempts > 1 THEN 1 END) as recovered,
        COUNT(CASE WHEN attempts > 1 THEN 1 END) as total_retried
       FROM seed_queue`
    ).first()

    const recovered = (recoveryResult?.recovered as number) || 0
    const totalRetried = (recoveryResult?.total_retried as number) || 0
    const recoveryRate = totalRetried > 0 ? (recovered / totalRetried) * 100 : 0

    // Get common failure types from DLQ
    const failureTypes = await this.env.DB.prepare(
      `SELECT 
        json_extract(failure_analysis, '$.error_type') as error_type,
        COUNT(*) as count
       FROM dead_letter_queue
       GROUP BY error_type
       ORDER BY count DESC
       LIMIT 5`
    ).all()

    return {
      failed_items: (failedResult?.count as number) || 0,
      dlq_items: (dlqResult?.count as number) || 0,
      recovery_rate: Math.round(recoveryRate),
      common_failures: failureTypes.results.map(row => ({
        error_type: row.error_type as string,
        count: row.count as number,
      })),
    }
  }

  /**
   * Manually retry specific items from DLQ
   */
  async retryFromDeadLetterQueue(dlqIds: string[]): Promise<{
    requeued: number
    errors: string[]
  }> {
    const result = {
      requeued: 0,
      errors: [] as string[],
    }

    for (const dlqId of dlqIds) {
      try {
        // Get item from DLQ
        const dlqItem = await this.env.DB.prepare(
          `SELECT * FROM dead_letter_queue WHERE id = ?`
        )
          .bind(dlqId)
          .first()

        if (!dlqItem) {
          result.errors.push(`DLQ item ${dlqId} not found`)
          continue
        }

        // Re-add to seed queue
        const newId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await this.env.DB.prepare(
          `INSERT INTO seed_queue (
            id, term, languages, priority, status, attempts, created_at
          ) VALUES (?, ?, ?, ?, 'pending', 0, ?)`
        )
          .bind(
            newId,
            dlqItem.term,
            dlqItem.languages,
            dlqItem.priority,
            new Date().toISOString()
          )
          .run()

        // Remove from DLQ
        await this.env.DB.prepare('DELETE FROM dead_letter_queue WHERE id = ?')
          .bind(dlqId)
          .run()

        result.requeued++
      } catch (error) {
        result.errors.push(`Failed to retry ${dlqId}: ${error}`)
      }
    }

    return result
  }
}
