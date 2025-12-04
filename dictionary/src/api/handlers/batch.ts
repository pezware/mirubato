/**
 * Batch Handler - Batch operations for dictionary queries
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Env } from '../../types/env'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { CacheService } from '../../services/storage/cache-service'
import { DictionaryGenerator } from '../../services/ai/dictionary-generator'
import { auth, getUserInfo } from '../../middleware/auth'
import { rateLimit } from '../../middleware/rate-limit'
import { APIError } from '@mirubato/workers-utils'
import { DictionaryEntry } from '../../types/dictionary'
import { normalizeTerm } from '../../utils/validation'

export const batchHandler = new Hono<{ Bindings: Env }>()

// Batch query schema
const batchQuerySchema = z.object({
  terms: z.array(z.string().min(1).max(200)).min(1).max(50),
  lang: z
    .enum(['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'])
    .optional()
    .default('en'),
  type: z
    .enum(['instrument', 'genre', 'technique', 'composer', 'theory', 'general'])
    .optional(),
  generate_missing: z.boolean().default(false),
  include_related: z.boolean().default(false),
})

const batchUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string(),
        quality_score: z
          .object({
            accuracy: z.number().min(0).max(100).optional(),
            completeness: z.number().min(0).max(100).optional(),
            clarity: z.number().min(0).max(100).optional(),
            references: z.number().min(0).max(100).optional(),
          })
          .optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1)
    .max(100),
})

/**
 * Batch query multiple terms
 * POST /api/v1/batch/query
 */
batchHandler.post(
  '/query',
  auth({ optional: true }),
  rateLimit({ windowMs: 60000, max: 30 }), // Lower limit for batch operations
  zValidator('json', batchQuerySchema),
  async c => {
    const { terms, lang, type, generate_missing, include_related } =
      c.req.valid('json')
    const userInfo = getUserInfo(c)

    const db = new DictionaryDatabase(c.env.DB)
    const cacheService = new CacheService(c.env.CACHE, c.env)

    try {
      // Normalize all terms
      const normalizedTerms = terms.map(normalizeTerm)
      const uniqueTerms = [...new Set(normalizedTerms)]

      // Check cache for all terms
      const cachedResults = new Map<string, DictionaryEntry>()
      const uncachedTerms: string[] = []

      await Promise.all(
        uniqueTerms.map(async term => {
          const cached = await cacheService.getCachedTerm(term)
          if (cached) {
            cachedResults.set(term, cached)
          } else {
            uncachedTerms.push(term)
          }
        })
      )

      // Fetch uncached terms from database
      let dbResults = new Map<string, DictionaryEntry>()
      if (uncachedTerms.length > 0) {
        dbResults = await db.findByTerms(uncachedTerms, lang)

        // Cache the found entries
        await cacheService.cacheBatch(uncachedTerms, dbResults)
      }

      // Combine results
      const allResults = new Map([...cachedResults, ...dbResults])

      // Generate missing terms if requested
      if (generate_missing) {
        const missingTerms = uniqueTerms.filter(term => !allResults.has(term))

        if (missingTerms.length > 0) {
          const generator = new DictionaryGenerator(c.env)

          // Generate in parallel with limit
          const generationPromises = missingTerms
            .slice(0, 5)
            .map(async term => {
              const entry = await generator.generateEntry({
                term,
                type: type || 'general',
                context: {
                  requested_by: userInfo.userId || 'anonymous',
                  generation_reason: 'batch_request',
                },
              })

              if (entry) {
                // Save to database
                await db.create(entry)
                allResults.set(entry.normalized_term, entry)
              }
            })

          await Promise.all(generationPromises)
        }
      }

      // Prepare response
      interface BatchQueryResult {
        found: boolean
        entry?: DictionaryEntry
        normalized_term?: string
        message?: string
        related_terms?: unknown[]
      }

      const response: Record<string, BatchQueryResult> = {}

      for (const originalTerm of terms) {
        const normalized = normalizeTerm(originalTerm)
        const entry = allResults.get(normalized)

        if (entry) {
          response[originalTerm] = {
            found: true,
            entry,
            related_terms: include_related
              ? await db.getRelatedTerms(entry.id).then(r => r.slice(0, 3))
              : undefined,
          }
        } else {
          response[originalTerm] = {
            found: false,
            normalized_term: normalized,
            message: 'Term not found',
          }
        }
      }

      return c.json({
        success: true,
        data: {
          results: response,
          summary: {
            total_requested: terms.length,
            found: Object.values(response).filter(r => r.found).length,
            not_found: Object.values(response).filter(r => !r.found).length,
            generated: generate_missing
              ? Object.values(response).filter(
                  r =>
                    r.found && r.entry?.metadata?.created_by === 'ai_generation'
                ).length
              : 0,
          },
        },
      })
    } catch (error) {
      console.error('Batch query error:', error)
      throw new APIError('Batch query failed', 500, { error })
    }
  }
)

/**
 * Batch refresh entries
 * POST /api/v1/batch/refresh
 */
batchHandler.post(
  '/refresh',
  auth({ roles: ['admin', 'moderator'] }),
  rateLimit({ windowMs: 3600000, max: 5 }), // 5 per hour
  zValidator(
    'json',
    z.object({
      quality_threshold: z.number().min(0).max(100).default(60),
      limit: z.number().min(1).max(100).default(20),
      focus_areas: z
        .array(
          z.enum([
            'definition',
            'references',
            'related_terms',
            'examples',
            'etymology',
          ])
        )
        .optional(),
    })
  ),
  async c => {
    const { quality_threshold, limit, focus_areas } = c.req.valid('json')
    const db = new DictionaryDatabase(c.env.DB)
    const generator = new DictionaryGenerator(c.env)

    try {
      // Get candidates for enhancement
      const candidates = await db.getEnhancementCandidates(
        limit,
        quality_threshold
      )

      const results = {
        processed: 0,
        enhanced: 0,
        failed: 0,
        entries: [] as Array<{
          id: string
          term: string
          old_score: number
          new_score?: number
          status: 'enhanced' | 'unchanged' | 'failed'
        }>,
      }

      // Process each candidate
      for (const entry of candidates) {
        results.processed++

        try {
          const enhanced = await generator.enhanceEntry(entry, {
            focus_areas: focus_areas,
            target_quality: 80,
          })

          if (enhanced) {
            await db.update(enhanced)
            results.enhanced++

            results.entries.push({
              id: entry.id,
              term: entry.term,
              old_score: entry.quality_score.overall,
              new_score: enhanced.quality_score.overall,
              status: 'enhanced',
            })
          } else {
            results.entries.push({
              id: entry.id,
              term: entry.term,
              old_score: entry.quality_score.overall,
              status: 'unchanged',
            })
          }
        } catch {
          results.failed++
          results.entries.push({
            id: entry.id,
            term: entry.term,
            old_score: entry.quality_score.overall,
            status: 'failed',
          })
        }
      }

      return c.json({
        success: true,
        data: results,
      })
    } catch (error) {
      console.error('Batch refresh error:', error)
      throw new APIError('Batch refresh failed', 500, { error })
    }
  }
)

/**
 * Batch update metadata
 * PUT /api/v1/batch/update
 */
batchHandler.put(
  '/update',
  auth({ roles: ['admin', 'moderator'] }),
  rateLimit({ windowMs: 60000, max: 10 }),
  zValidator('json', batchUpdateSchema),
  async c => {
    const { updates } = c.req.valid('json')
    const db = new DictionaryDatabase(c.env.DB)

    try {
      const results = {
        updated: 0,
        failed: 0,
        entries: [] as Array<{
          id: string
          status: 'updated' | 'not_found' | 'failed'
          error?: string
        }>,
      }

      for (const update of updates) {
        try {
          const entry = await db.findById(update.id)

          if (!entry) {
            results.failed++
            results.entries.push({
              id: update.id,
              status: 'not_found',
            })
            continue
          }

          // Apply updates
          if (update.quality_score) {
            entry.quality_score = {
              ...entry.quality_score,
              ...update.quality_score,
              overall: Math.round(
                Object.values({
                  ...entry.quality_score,
                  ...update.quality_score,
                  overall: undefined,
                })
                  .filter(v => typeof v === 'number')
                  .reduce((a, b) => a + b, 0) / 4
              ),
            }
          }

          if (update.metadata) {
            entry.metadata = {
              ...entry.metadata,
              ...update.metadata,
              last_accessed: new Date().toISOString(),
            }
          }

          await db.update(entry)
          results.updated++

          results.entries.push({
            id: update.id,
            status: 'updated',
          })

          // Invalidate cache
          c.executionCtx.waitUntil(
            new CacheService(c.env.CACHE, c.env).invalidateTerm(
              entry.normalized_term
            )
          )
        } catch (error) {
          results.failed++
          results.entries.push({
            id: update.id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return c.json({
        success: true,
        data: results,
      })
    } catch (error) {
      console.error('Batch update error:', error)
      throw new APIError('Batch update failed', 500, { error })
    }
  }
)

/**
 * Get batch statistics
 * GET /api/v1/batch/stats
 */
batchHandler.get(
  '/stats',
  auth({ optional: true }),
  rateLimit({ windowMs: 60000, max: 60 }),
  async c => {
    const db = new DictionaryDatabase(c.env.DB)

    try {
      const [summary, popular, lowQuality] = await Promise.all([
        db.getAnalyticsSummary(),
        db.getPopularSearches(10),
        db.getEnhancementCandidates(10, 50),
      ])

      return c.json({
        success: true,
        data: {
          summary,
          popular_terms: popular,
          needs_enhancement: lowQuality.map(e => ({
            id: e.id,
            term: e.term,
            quality_score: e.quality_score.overall,
            last_updated: e.updated_at,
          })),
        },
      })
    } catch (error) {
      console.error('Batch stats error:', error)
      throw new APIError('Failed to get batch statistics', 500, { error })
    }
  }
)
