import { Hono } from 'hono'
import type { Env, Variables } from '../../types/env'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { CacheService } from '../../services/storage/cache-service'
import { SeedProcessor } from '../../services/seed-processor'
import { TokenBudgetManager } from '../../services/token-budget-manager'
import { createApiResponse, ValidationError } from '../../utils/errors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { DictionaryEntry, TermType } from '../../types/dictionary'
import {
  SEED_TERMS,
  getSeedTermsByPriority,
  seedTermsToQueueEntries,
} from '../../data/seed-terms'

export const adminHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

// Note: Auth middleware with admin role check is already applied in dictionary.ts
// No need to apply it again here

// Admin entry update schema
const entryUpdateSchema = z.object({
  definition: z
    .object({
      concise: z.string().min(10).optional(),
      detailed: z.string().min(50).optional(),
      etymology: z.string().optional(),
      pronunciation: z
        .object({
          ipa: z.string().optional(),
          audio_url: z.string().url().optional(),
        })
        .optional(),
      usage_example: z.string().optional(),
    })
    .optional(),
  references: z
    .object({
      wikipedia: z
        .object({
          url: z.string().url().optional(),
          extract: z.string().optional(),
          last_verified: z.string().datetime().optional(),
        })
        .optional(),
      books: z
        .array(
          z.object({
            title: z.string(),
            author: z.string(),
            isbn: z.string().optional(),
            amazon_url: z.string().url().optional(),
            affiliate_url: z.string().url().optional(),
            relevance_score: z.number().min(0).max(1),
          })
        )
        .optional(),
      media: z.any().optional(),
      shopping: z.any().optional(),
    })
    .optional(),
  metadata: z
    .object({
      related_terms: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      difficulty_level: z
        .enum(['beginner', 'intermediate', 'advanced', 'professional'])
        .optional(),
      instruments: z.array(z.string()).optional(),
    })
    .optional(),
  quality_score: z
    .object({
      overall: z.number().min(0).max(100).optional(),
      human_verified: z.boolean().optional(),
    })
    .optional(),
})

/**
 * Add or update dictionary entry
 * PUT /api/v1/admin/terms/:term
 */
adminHandler.put(
  '/terms/:term',
  zValidator('json', entryUpdateSchema),
  async c => {
    const term = c.req.param('term')
    const updates = c.req.valid('json')

    const db = new DictionaryDatabase(c.env.DB)
    const cache = new CacheService(c.env.CACHE, c.env)

    // Check if entry exists
    const entry = await db.findByTerm(term.toLowerCase())

    if (entry) {
      // Update existing entry
      const updatedEntry: DictionaryEntry = {
        ...entry,
        definition: {
          ...entry.definition,
          ...(updates.definition || {}),
          concise: updates.definition?.concise || entry.definition.concise,
          detailed: updates.definition?.detailed || entry.definition.detailed,
        } as DictionaryEntry['definition'],
        references: {
          ...entry.references,
          ...updates.references,
        } as DictionaryEntry['references'],
        metadata: {
          ...entry.metadata,
          ...updates.metadata,
          last_accessed: new Date().toISOString(),
          access_count: entry.metadata.access_count || 0,
        },
        quality_score: {
          ...entry.quality_score,
          ...updates.quality_score,
          last_ai_check: new Date().toISOString(),
          confidence_level: entry.quality_score.confidence_level || 'medium',
        },
        updated_at: new Date().toISOString(),
        version: entry.version + 1,
      }

      await db.update(updatedEntry)
      await cache.invalidateTerm(entry.normalized_term)

      return c.json(
        createApiResponse({
          message: 'Entry updated successfully',
          entry: updatedEntry,
          changes: {
            version: entry.version + 1,
            updated_fields: Object.keys(updates),
          },
        })
      )
    } else {
      // Create new entry
      const newEntry: DictionaryEntry = {
        id: `dict_${term.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        term,
        normalized_term: term.toLowerCase(),
        type: 'general', // Default type, can be updated
        lang: 'en', // Default language
        definition: {
          concise: updates.definition?.concise || '',
          detailed: updates.definition?.detailed || '',
          ...(updates.definition || {}),
        } as DictionaryEntry['definition'],
        references: (updates.references || {}) as DictionaryEntry['references'],
        metadata: {
          search_frequency: 0,
          last_accessed: new Date().toISOString(),
          access_count: 0,
          related_terms: [],
          categories: [],
          ...updates.metadata,
        },
        quality_score: {
          overall: 0,
          definition_clarity: 0,
          reference_completeness: 0,
          accuracy_verification: 0,
          last_ai_check: new Date().toISOString(),
          human_verified: true, // Admin-created entries are human verified
          confidence_level: 'high', // Admin entries have high confidence
          ...updates.quality_score,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      }

      await db.create(newEntry)

      return c.json(
        createApiResponse({
          message: 'Entry created successfully',
          entry: newEntry,
        }),
        201
      )
    }
  }
)

/**
 * Delete dictionary entry
 * DELETE /api/v1/admin/terms/:id
 */
adminHandler.delete('/terms/:id', async c => {
  const id = c.req.param('id')

  const db = new DictionaryDatabase(c.env.DB)
  const cache = new CacheService(c.env.CACHE, c.env)

  // Find entry by ID
  const entry = await db.findById(id)

  if (!entry) {
    throw new ValidationError('Entry not found')
  }

  // Delete from database
  await db.delete(id)

  // Invalidate cache
  await cache.invalidateTerm(entry.normalized_term)

  return c.json(
    createApiResponse({
      message: 'Entry deleted successfully',
      deleted: {
        id,
        term: entry.term,
      },
    })
  )
})

/**
 * Bulk operations
 * POST /api/v1/admin/bulk
 */
const bulkOperationSchema = z.object({
  operation: z.enum(['import', 'delete', 'update_type', 'verify']),
  data: z.any(), // Specific validation based on operation
})

adminHandler.post('/bulk', zValidator('json', bulkOperationSchema), async c => {
  const { operation, data } = c.req.valid('json')
  const db = new DictionaryDatabase(c.env.DB)
  const cache = new CacheService(c.env.CACHE, c.env)

  switch (operation) {
    case 'import': {
      // Validate import data
      const importSchema = z.array(
        z.object({
          term: z.string(),
          type: z.string(),
          definition: z.object({
            concise: z.string(),
            detailed: z.string(),
          }),
        })
      )

      const entries = importSchema.parse(data)
      let imported = 0
      let failed = 0

      for (const entryData of entries) {
        try {
          const entry: DictionaryEntry = {
            id: `dict_${entryData.term.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
            term: entryData.term,
            normalized_term: entryData.term.toLowerCase(),
            type: entryData.type as TermType,
            lang: 'en', // Default language for imports
            definition: entryData.definition,
            references: {},
            metadata: {
              search_frequency: 0,
              last_accessed: new Date().toISOString(),
              access_count: 0,
              related_terms: [],
              categories: [],
            },
            quality_score: {
              overall: 50, // Default score for imported entries
              definition_clarity: 50,
              reference_completeness: 0,
              accuracy_verification: 50,
              last_ai_check: new Date().toISOString(),
              human_verified: true,
              confidence_level: 'medium',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
          }

          await db.create(entry)
          imported++
        } catch (error) {
          console.error(`Failed to import ${entryData.term}:`, error)
          failed++
        }
      }

      return c.json(
        createApiResponse({
          operation: 'import',
          total: entries.length,
          imported,
          failed,
        })
      )
    }

    case 'delete': {
      // Delete multiple entries
      const deleteSchema = z.object({
        ids: z.array(z.string()),
        terms: z.array(z.string()).optional(),
      })

      const deleteData = deleteSchema.parse(data)
      let deleted = 0

      if (deleteData.ids) {
        for (const id of deleteData.ids) {
          const entry = await db.findById(id)
          if (entry) {
            await db.delete(id)
            await cache.invalidateTerm(entry.normalized_term)
            deleted++
          }
        }
      }

      if (deleteData.terms) {
        for (const term of deleteData.terms) {
          const entry = await db.findByTerm(term.toLowerCase())
          if (entry) {
            await db.delete(entry.id)
            await cache.invalidateTerm(entry.normalized_term)
            deleted++
          }
        }
      }

      return c.json(
        createApiResponse({
          operation: 'delete',
          deleted,
        })
      )
    }

    case 'update_type': {
      // Update type for multiple entries
      const updateTypeSchema = z.object({
        from_type: z.string(),
        to_type: z.string(),
      })

      const typeUpdate = updateTypeSchema.parse(data)
      const updated = await db.updateType(
        typeUpdate.from_type,
        typeUpdate.to_type
      )

      // Clear cache for affected entries
      // Note: invalidatePattern method doesn't exist in CacheService
      // Would need to implement it or clear individual entries

      return c.json(
        createApiResponse({
          operation: 'update_type',
          updated,
        })
      )
    }

    case 'verify': {
      // Mark entries as human verified
      const verifySchema = z.object({
        ids: z.array(z.string()),
      })

      const verifyData = verifySchema.parse(data)
      let verified = 0

      for (const id of verifyData.ids) {
        const entry = await db.findById(id)
        if (entry && !entry.quality_score.human_verified) {
          entry.quality_score.human_verified = true
          entry.quality_score.overall = Math.min(
            100,
            entry.quality_score.overall + 10
          )
          entry.updated_at = new Date().toISOString()
          entry.version++

          await db.update(entry)
          await cache.invalidateTerm(entry.normalized_term)
          verified++
        }
      }

      return c.json(
        createApiResponse({
          operation: 'verify',
          verified,
        })
      )
    }

    default:
      throw new ValidationError('Invalid operation')
  }
})

/**
 * Initialize seed queue with common terms
 * POST /api/v1/admin/seed/initialize
 */
adminHandler.post(
  '/seed/initialize',
  zValidator(
    'json',
    z.object({
      priority_threshold: z.number().min(1).max(10).default(8),
      clear_existing: z.boolean().default(false),
    })
  ),
  async c => {
    const { priority_threshold, clear_existing } = c.req.valid('json')
    const db = new DictionaryDatabase(c.env.DB)

    try {
      // Clear existing queue if requested
      if (clear_existing) {
        await db.clearSeedQueueByStatus('pending')
      }

      // Get terms by priority threshold
      const termsToSeed = SEED_TERMS.filter(
        term => term.priority >= priority_threshold
      )
      const queueEntries = seedTermsToQueueEntries(termsToSeed)

      // Add to seed queue
      await db.addToSeedQueue(queueEntries)

      // Get stats
      const stats = await db.getSeedQueueStats()

      return c.json(
        createApiResponse({
          added: queueEntries.length,
          total_terms: termsToSeed.length,
          languages_per_term: termsToSeed[0]?.languages.length || 0,
          queue_stats: stats,
        })
      )
    } catch (error) {
      console.error('Seed initialization error:', error)
      throw new ValidationError('Failed to initialize seed queue')
    }
  }
)

/**
 * Process seed queue items
 * POST /api/v1/admin/seed/process
 */
adminHandler.post(
  '/seed/process',
  zValidator(
    'json',
    z.object({
      batch_size: z.number().min(1).max(50).optional(),
      dry_run: z.boolean().default(false),
    })
  ),
  async c => {
    const { batch_size, dry_run } = c.req.valid('json')
    const seedProcessor = new SeedProcessor(c.env)
    const budgetManager = new TokenBudgetManager(c.env.DB, c.env)
    const db = new DictionaryDatabase(c.env.DB)

    try {
      // Check if seeding is enabled
      if (c.env.SEED_ENABLED !== 'true') {
        return c.json(
          createApiResponse({
            success: false,
            message: 'Seed processing is disabled',
            enabled: false,
          })
        )
      }

      // For dry run, just show what would be processed
      if (dry_run) {
        const queueItems = await db.getNextSeedQueueItems(batch_size || 10)
        const tokenStatus = await budgetManager.getTokensUsedToday()
        const available = await budgetManager.getAvailableTokens()

        return c.json(
          createApiResponse({
            success: true,
            message: `Dry run: Would process ${queueItems.length} items`,
            dry_run: true,
            queue_items: queueItems.map(item => ({
              term: item.term,
              languages: item.languages,
              priority: item.priority,
            })),
            token_status: {
              used_today: tokenStatus,
              available: available,
              budget:
                c.env.ENVIRONMENT === 'staging'
                  ? parseInt(c.env.SEED_DAILY_LIMIT || '10')
                  : 5000, // 50% of 10k free tier
            },
          })
        )
      }

      // Check token budget before processing
      if (!(await budgetManager.canProcessTerms())) {
        const used = await budgetManager.getTokensUsedToday()
        const budget =
          c.env.ENVIRONMENT === 'staging'
            ? parseInt(c.env.SEED_DAILY_LIMIT || '10')
            : 5000

        return c.json(
          createApiResponse({
            success: false,
            message: 'Daily token budget exhausted',
            token_status: {
              used_today: used,
              available: 0,
              budget: budget,
            },
          })
        )
      }

      // Process using the SeedProcessor service
      const result = await seedProcessor.processSeedQueue()

      // Get updated token status
      const tokenStatus = await budgetManager.getTokensUsedToday()
      const available = await budgetManager.getAvailableTokens()

      return c.json(
        createApiResponse({
          success: result.processed > 0,
          message: `Processed ${result.processed} items`,
          results: {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            skipped: result.skipped,
            quality_scores: result.quality_scores,
            errors: result.errors,
            average_quality:
              result.quality_scores.length > 0
                ? result.quality_scores.reduce((a, b) => a + b, 0) /
                  result.quality_scores.length
                : 0,
          },
          token_status: {
            used_today: tokenStatus,
            available: available,
            budget:
              c.env.ENVIRONMENT === 'staging'
                ? parseInt(c.env.SEED_DAILY_LIMIT || '10')
                : 5000,
            usage_this_batch: result.token_usage,
          },
        })
      )
    } catch (error) {
      console.error('Error processing seed queue:', error)
      return c.json(
        createApiResponse({
          success: false,
          message: error instanceof Error ? error.message : 'Processing failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        500
      )
    }
  }
)

/**
 * Get seed queue status
 * GET /api/v1/admin/seed/status
 */
adminHandler.get('/seed/status', async c => {
  const db = new DictionaryDatabase(c.env.DB)

  try {
    const stats = await db.getSeedQueueStats()

    // Get recent items
    const recentItems = await db.getRecentSeedQueueItems(20)

    return c.json(
      createApiResponse({
        stats,
        recent_items: recentItems,
        seed_terms_available: SEED_TERMS.length,
        priority_distribution: Array.from(
          getSeedTermsByPriority().entries()
        ).map(([priority, terms]) => ({
          priority,
          count: terms.length,
        })),
      })
    )
  } catch (error) {
    console.error('Seed status error:', error)
    throw new ValidationError('Failed to get seed status')
  }
})

/**
 * Clear seed queue
 * DELETE /api/v1/admin/seed/clear
 */
adminHandler.delete(
  '/seed/clear',
  zValidator(
    'json',
    z.object({
      status: z
        .enum(['all', 'pending', 'failed', 'completed'])
        .default('failed'),
    })
  ),
  async c => {
    const { status } = c.req.valid('json')
    const db = new DictionaryDatabase(c.env.DB)

    try {
      const deleted = await db.clearSeedQueueByStatus(
        status === 'all' ? undefined : status
      )

      return c.json(
        createApiResponse({
          deleted,
          status_cleared: status,
        })
      )
    } catch (error) {
      console.error('Clear seed queue error:', error)
      throw new ValidationError('Failed to clear seed queue')
    }
  }
)

/**
 * Get auto-seeding system status
 * GET /api/v1/admin/seed/system-status
 */
adminHandler.get('/seed/system-status', async c => {
  const db = new DictionaryDatabase(c.env.DB)

  try {
    // Import services
    const { TokenBudgetManager } = await import(
      '../../services/token-budget-manager'
    )
    const { SeedProcessor } = await import('../../services/seed-processor')

    const budgetManager = new TokenBudgetManager(c.env.DB, c.env)
    const processor = new SeedProcessor(c.env)

    // Get current configuration
    const config = budgetManager.getConfiguration()

    // Get token usage
    const tokensUsed = await budgetManager.getTokensUsedToday()
    const availableTokens = await budgetManager.getAvailableTokens()
    const usagePercentage = await budgetManager.getUsagePercentage()

    // Get usage stats
    const usageStats = await budgetManager.getUsageStats(7)

    // Get processing stats
    const processingStats = await processor.getProcessingStats(7)

    // Get manual review queue count
    const reviewCount = await db.getManualReviewQueueCount('pending')

    return c.json(
      createApiResponse({
        enabled: c.env.SEED_ENABLED === 'true',
        environment: c.env.ENVIRONMENT,
        configuration: config,
        token_usage: {
          used_today: tokensUsed,
          available_today: availableTokens,
          usage_percentage: usagePercentage,
          daily_stats: usageStats.daily,
          weekly_total: usageStats.total_tokens,
          average_per_term: usageStats.average_efficiency,
        },
        processing: {
          terms_processed_week: processingStats.terms_processed,
          average_quality_score: processingStats.average_quality,
          success_rate: processingStats.success_rate,
          manual_review_pending: reviewCount,
          token_efficiency: processingStats.token_efficiency,
        },
        schedule: {
          production: '02:00, 08:00, 14:00, 20:00 UTC',
          staging: '12:00 UTC',
          cleanup: '00:00 UTC daily',
        },
      })
    )
  } catch (error) {
    console.error('System status error:', error)
    throw new ValidationError('Failed to get system status')
  }
})

/**
 * Get manual review queue
 * GET /api/v1/admin/seed/review-queue
 */
adminHandler.get('/seed/review-queue', async c => {
  const db = new DictionaryDatabase(c.env.DB)

  try {
    const query = c.req.query()
    const status = query.status || 'pending'
    const limit = parseInt(query.limit || '20')
    const offset = parseInt(query.offset || '0')

    const result = await db.getManualReviewQueue({ status, limit, offset })

    return c.json(
      createApiResponse({
        items: result.items,
        pagination: {
          total: result.total,
          limit,
          offset,
        },
      })
    )
  } catch (error) {
    console.error('Review queue error:', error)
    throw new ValidationError('Failed to get review queue')
  }
})

/**
 * Run error recovery for failed items
 * POST /api/v1/admin/seed/recover
 */
adminHandler.post(
  '/seed/recover',
  zValidator(
    'json',
    z.object({
      limit: z.number().min(1).max(100).default(50),
    })
  ),
  async c => {
    const { limit } = c.req.valid('json')

    try {
      const { ErrorRecoveryService } = await import(
        '../../services/error-recovery'
      )
      const recovery = new ErrorRecoveryService(c.env)

      const result = await recovery.recoverFailedItems(limit)

      return c.json(
        createApiResponse({
          success: true,
          message: 'Recovery process completed',
          result: {
            recovered: result.recovered,
            failed_permanently: result.failed_permanently,
            moved_to_dlq: result.moved_to_dlq,
            retry_scheduled: result.retry_scheduled,
          },
        })
      )
    } catch (error) {
      console.error('Recovery error:', error)
      throw new ValidationError('Failed to run recovery process')
    }
  }
)

/**
 * Get recovery statistics
 * GET /api/v1/admin/seed/recovery-stats
 */
adminHandler.get('/seed/recovery-stats', async c => {
  try {
    const { ErrorRecoveryService } = await import(
      '../../services/error-recovery'
    )
    const recovery = new ErrorRecoveryService(c.env)

    const stats = await recovery.getRecoveryStats()

    return c.json(
      createApiResponse({
        stats,
      })
    )
  } catch (error) {
    console.error('Recovery stats error:', error)
    throw new ValidationError('Failed to get recovery statistics')
  }
})

/**
 * Get dead letter queue items
 * GET /api/v1/admin/seed/dlq
 */
adminHandler.get('/seed/dlq', async c => {
  const query = c.req.query()
  const limit = parseInt(query.limit || '20')
  const offset = parseInt(query.offset || '0')

  try {
    const results = await c.env.DB.prepare(
      `SELECT * FROM dead_letter_queue
       ORDER BY moved_to_dlq_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all()

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM dead_letter_queue`
    ).first()

    return c.json(
      createApiResponse({
        items: results.results.map(row => ({
          id: row.id,
          term: row.term,
          languages: JSON.parse(row.languages as string),
          priority: row.priority,
          failure_reason: row.failure_reason,
          failure_analysis: JSON.parse(row.failure_analysis as string),
          attempts: row.attempts,
          moved_to_dlq_at: row.moved_to_dlq_at,
        })),
        pagination: {
          total: (countResult?.count as number) || 0,
          limit,
          offset,
        },
      })
    )
  } catch (error) {
    console.error('DLQ fetch error:', error)
    throw new ValidationError('Failed to get dead letter queue items')
  }
})

/**
 * Retry items from dead letter queue
 * POST /api/v1/admin/seed/dlq/retry
 */
adminHandler.post(
  '/seed/dlq/retry',
  zValidator(
    'json',
    z.object({
      dlq_ids: z.array(z.string()).min(1).max(50),
    })
  ),
  async c => {
    const { dlq_ids } = c.req.valid('json')

    try {
      const { ErrorRecoveryService } = await import(
        '../../services/error-recovery'
      )
      const recovery = new ErrorRecoveryService(c.env)

      const result = await recovery.retryFromDeadLetterQueue(dlq_ids)

      return c.json(
        createApiResponse({
          success: result.requeued > 0,
          message: `Requeued ${result.requeued} items from dead letter queue`,
          result: {
            requeued: result.requeued,
            errors: result.errors,
          },
        })
      )
    } catch (error) {
      console.error('DLQ retry error:', error)
      throw new ValidationError('Failed to retry items from dead letter queue')
    }
  }
)

/**
 * Approve/reject manual review item
 * PUT /api/v1/admin/seed/review/:id
 */
adminHandler.put(
  '/seed/review/:id',
  zValidator(
    'json',
    z.object({
      action: z.enum(['approve', 'reject']),
      notes: z.string().optional(),
      modifications: z.any().optional(), // Modified entry data
    })
  ),
  async c => {
    const id = c.req.param('id')
    const { action, notes, modifications } = c.req.valid('json')
    const userId = c.get('userId')
    const db = new DictionaryDatabase(c.env.DB)

    try {
      // Get the review item
      const item = await db.getManualReviewItem(id)

      if (!item) {
        throw new ValidationError('Review item not found')
      }

      if (action === 'approve') {
        // Parse the generated content
        let entry = item.generated_content

        // Apply modifications if provided
        if (modifications) {
          entry = { ...entry, ...modifications }
        }

        // Save to dictionary
        const existing = await db.findByTerm(entry.term, entry.lang)

        if (existing) {
          await db.update(entry)
        } else {
          await db.create(entry)
        }

        // Update review status
        await db.updateManualReviewStatus(
          id,
          'approved',
          notes || '',
          userId || 'admin'
        )

        return c.json(
          createApiResponse({
            action: 'approved',
            term: entry.term,
            message: 'Entry approved and saved to dictionary',
          })
        )
      } else {
        // Reject the item
        await db.updateManualReviewStatus(
          id,
          'rejected',
          notes || '',
          userId || 'admin'
        )

        return c.json(
          createApiResponse({
            action: 'rejected',
            term: item.term,
            message: 'Entry rejected',
          })
        )
      }
    } catch (error) {
      console.error('Review action error:', error)
      throw new ValidationError('Failed to process review action')
    }
  }
)
