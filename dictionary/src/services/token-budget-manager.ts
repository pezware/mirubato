/**
 * Token Budget Manager for Dictionary Auto-Seeding
 *
 * Manages daily token allocation to ensure 50% of free tier is reserved for user queries
 * while using the remaining 50% for automatic term generation.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { Env } from '../types/env'

export interface TokenUsageRecord {
  id: string
  date: string
  model: string
  tokens_used: number
  terms_processed: number
  created_at: string
}

export class TokenBudgetManager {
  private readonly DAILY_FREE_TIER = 10000 // Cloudflare AI free tier
  private readonly SEED_ALLOCATION_PERCENT = 0.5 // 50% for seeding
  private readonly SAFETY_BUFFER_PERCENT = 0.1 // 10% safety buffer

  private readonly DAILY_SEED_BUDGET: number
  private readonly DAILY_SEED_LIMIT: number

  constructor(
    private readonly db: D1Database,
    private readonly env: Env
  ) {
    // Calculate budgets based on environment
    if (env.ENVIRONMENT === 'staging') {
      // Staging has hard limit for testing
      this.DAILY_SEED_BUDGET = parseInt(env.SEED_DAILY_LIMIT || '10')
      this.DAILY_SEED_LIMIT = this.DAILY_SEED_BUDGET
    } else {
      // Production uses percentage of free tier
      this.DAILY_SEED_BUDGET = Math.floor(
        this.DAILY_FREE_TIER * this.SEED_ALLOCATION_PERCENT
      )
      this.DAILY_SEED_LIMIT = Math.floor(
        this.DAILY_SEED_BUDGET * (1 - this.SAFETY_BUFFER_PERCENT)
      )
    }
  }

  /**
   * Check if we can process more terms today
   */
  async canProcessTerms(): Promise<boolean> {
    const usedToday = await this.getTokensUsedToday()
    return usedToday < this.DAILY_SEED_LIMIT
  }

  /**
   * Get available tokens for today
   */
  async getAvailableTokens(): Promise<number> {
    const usedToday = await this.getTokensUsedToday()
    return Math.max(0, this.DAILY_SEED_LIMIT - usedToday)
  }

  /**
   * Get tokens used today for seeding
   */
  async getTokensUsedToday(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]

    try {
      const result = await this.db
        .prepare(
          `SELECT SUM(tokens_used) as total 
           FROM ai_token_usage 
           WHERE date = ? AND model LIKE '%seed%'`
        )
        .bind(today)
        .first()

      return (result?.total as number) || 0
    } catch (error) {
      console.error('Error getting token usage:', error)
      // If table doesn't exist yet, return 0
      return 0
    }
  }

  /**
   * Record token usage
   */
  async recordUsage(
    model: string,
    tokensUsed: number,
    termsProcessed: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const id = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      await this.db
        .prepare(
          `INSERT INTO ai_token_usage (
            id, date, model, tokens_used, terms_processed, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          today,
          model,
          tokensUsed,
          termsProcessed,
          new Date().toISOString()
        )
        .run()
    } catch (error) {
      console.error('Error recording token usage:', error)
      // Log but don't throw - we don't want to stop processing
    }
  }

  /**
   * Get usage statistics for monitoring
   */
  async getUsageStats(days: number = 7): Promise<{
    daily: Array<{
      date: string
      tokens_used: number
      terms_processed: number
      efficiency: number // tokens per term
    }>
    total_tokens: number
    total_terms: number
    average_efficiency: number
  }> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    try {
      const results = await this.db
        .prepare(
          `SELECT 
            date,
            SUM(tokens_used) as tokens_used,
            SUM(terms_processed) as terms_processed
          FROM ai_token_usage
          WHERE date >= ? AND model LIKE '%seed%'
          GROUP BY date
          ORDER BY date DESC`
        )
        .bind(startDate.toISOString().split('T')[0])
        .all()

      const daily = results.results.map(row => ({
        date: row.date as string,
        tokens_used: row.tokens_used as number,
        terms_processed: row.terms_processed as number,
        efficiency: row.terms_processed
          ? Math.round(
              (row.tokens_used as number) / (row.terms_processed as number)
            )
          : 0,
      }))

      const total_tokens = daily.reduce((sum, day) => sum + day.tokens_used, 0)
      const total_terms = daily.reduce(
        (sum, day) => sum + day.terms_processed,
        0
      )
      const average_efficiency =
        total_terms > 0 ? Math.round(total_tokens / total_terms) : 0

      return {
        daily,
        total_tokens,
        total_terms,
        average_efficiency,
      }
    } catch (error) {
      console.error('Error getting usage stats:', error)
      return {
        daily: [],
        total_tokens: 0,
        total_terms: 0,
        average_efficiency: 0,
      }
    }
  }

  /**
   * Check if we're approaching daily limit (for alerting)
   */
  async getUsagePercentage(): Promise<number> {
    const usedToday = await this.getTokensUsedToday()
    return Math.round((usedToday / this.DAILY_SEED_BUDGET) * 100)
  }

  /**
   * Estimate tokens for a batch of terms
   * Based on empirical data: ~840 tokens per term with Llama 3.1 8B
   */
  estimateTokensForBatch(batchSize: number): number {
    const TOKENS_PER_TERM = 840 // Empirical average
    return batchSize * TOKENS_PER_TERM
  }

  /**
   * Get safe batch size based on remaining budget
   */
  async getSafeBatchSize(desiredBatchSize: number): Promise<number> {
    const availableTokens = await this.getAvailableTokens()
    const estimatedTokens = this.estimateTokensForBatch(desiredBatchSize)

    if (estimatedTokens <= availableTokens) {
      return desiredBatchSize
    }

    // Calculate how many terms we can safely process
    const TOKENS_PER_TERM = 840
    const safeBatchSize = Math.floor(availableTokens / TOKENS_PER_TERM)

    return Math.max(0, safeBatchSize)
  }

  /**
   * Get configuration for monitoring
   */
  getConfiguration(): {
    daily_free_tier: number
    seed_allocation_percent: number
    daily_seed_budget: number
    daily_seed_limit: number
    safety_buffer: number
  } {
    return {
      daily_free_tier: this.DAILY_FREE_TIER,
      seed_allocation_percent: this.SEED_ALLOCATION_PERCENT,
      daily_seed_budget: this.DAILY_SEED_BUDGET,
      daily_seed_limit: this.DAILY_SEED_LIMIT,
      safety_buffer: this.DAILY_SEED_BUDGET - this.DAILY_SEED_LIMIT,
    }
  }
}
