import { Hono } from 'hono'
import type { Env } from '../../types/env'
import type { DictionaryEntry } from '../../types/dictionary'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { DictionaryGenerator } from '../../services/ai/dictionary-generator'
import { CacheService } from '../../services/storage/cache-service'
import { createApiResponse, ValidationError } from '@mirubato/workers-utils'
import { auth } from '../../middleware/auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

interface EnhancementJob {
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  cancelled_at?: string
  terms_total: number
  terms_completed: number
  terms_enhanced: number
  terms_failed: number
  improvements: Array<{
    term: string
    before_score: number
    after_score: number
    improvements: string[]
  }>
  error?: string
}

export const enhanceHandler = new Hono<{ Bindings: Env }>()

// Apply auth middleware to all routes
enhanceHandler.use('*', auth())

// Enhancement request schemas
const singleEnhanceSchema = z.object({
  mode: z.literal('single'),
  term: z.string().min(1),
  force: z.boolean().optional(),
})

const batchEnhanceSchema = z.object({
  mode: z.literal('batch'),
  criteria: z.object({
    min_age_days: z.number().min(1).optional(),
    max_quality_score: z.number().min(0).max(100).optional(),
    limit: z.number().min(1).max(100).optional(),
    types: z.array(z.string()).optional(),
  }),
})

const enhanceRequestSchema = z.discriminatedUnion('mode', [
  singleEnhanceSchema,
  batchEnhanceSchema,
])

/**
 * Trigger quality enhancement
 * POST /api/v1/enhance
 */
enhanceHandler.post('/', zValidator('json', enhanceRequestSchema), async c => {
  const request = c.req.valid('json')
  const db = new DictionaryDatabase(c.env.DB)
  const generator = new DictionaryGenerator(c.env)
  const cache = new CacheService(c.env.CACHE, c.env)

  if (request.mode === 'single') {
    // Single term enhancement
    const entry = await db.findByTerm(request.term.toLowerCase())

    if (!entry) {
      throw new ValidationError(`Term not found: ${request.term}`)
    }

    // Check if enhancement is needed
    if (!request.force && entry.quality_score.overall >= 90) {
      return c.json(
        createApiResponse({
          message: 'Term already has high quality score',
          entry,
          enhanced: false,
        })
      )
    }

    // Enhance the entry
    const enhancedEntry = await generator.enhanceEntry(entry)

    if (!enhancedEntry) {
      throw new ValidationError('Enhancement failed')
    }

    // Update database
    await db.update(enhancedEntry)

    // Invalidate cache
    await cache.invalidateTerm(entry.normalized_term)

    return c.json(
      createApiResponse({
        message: 'Term enhanced successfully',
        entry: enhancedEntry,
        enhanced: true,
        improvement: {
          score_before: entry.quality_score.overall,
          score_after:
            enhancedEntry?.quality_score.overall || entry.quality_score.overall,
          version_before: entry.version,
          version_after: enhancedEntry?.version || entry.version,
        },
      })
    )
  } else {
    // Batch enhancement
    const { criteria } = request

    // Create job ID for tracking
    const jobId = `enhance_${Date.now()}_${crypto.randomUUID()}`

    // Get candidates for enhancement
    const candidates = await db.getEnhancementCandidates(criteria.limit || 50)

    // Filter by additional criteria
    let filtered = candidates

    if (criteria.max_quality_score !== undefined) {
      filtered = filtered.filter(
        e => e.quality_score.overall <= criteria.max_quality_score!
      )
    }

    if (criteria.min_age_days !== undefined) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - criteria.min_age_days)
      filtered = filtered.filter(e => new Date(e.updated_at) < cutoffDate)
    }

    if (criteria.types && criteria.types.length > 0) {
      filtered = filtered.filter(e => criteria.types!.includes(e.type))
    }

    // Queue enhancement job (in production, this would use a queue)
    // For now, we'll process synchronously but return immediately
    c.executionCtx.waitUntil(
      processEnhancementBatch(filtered, generator, db, cache, jobId, c.env)
    )

    return c.json(
      createApiResponse({
        job_id: jobId,
        status: 'queued',
        estimated_completion: new Date(
          Date.now() + filtered.length * 2000
        ).toISOString(), // ~2s per term
        terms_queued: filtered.length,
        terms: filtered.map(e => ({
          term: e.term,
          current_score: e.quality_score.overall,
        })),
      })
    )
  }
})

/**
 * Get enhancement job status
 * GET /api/v1/enhance/:jobId
 */
enhanceHandler.get('/:jobId', async c => {
  const jobId = c.req.param('jobId')

  // Check job status in KV
  const jobData = (await c.env.CACHE.get(
    `job:${jobId}`,
    'json'
  )) as EnhancementJob | null

  if (!jobData) {
    return c.json(
      createApiResponse({
        error: 'Job not found',
      }),
      404
    )
  }

  return c.json(
    createApiResponse({
      job_id: jobId,
      status: jobData.status,
      started_at: jobData.started_at,
      completed_at: jobData.completed_at,
      terms_total: jobData.terms_total,
      terms_completed: jobData.terms_completed,
      terms_failed: jobData.terms_failed,
      improvements: jobData.improvements || [],
    })
  )
})

/**
 * Process enhancement batch
 */
async function processEnhancementBatch(
  entries: DictionaryEntry[],
  generator: DictionaryGenerator,
  db: DictionaryDatabase,
  cache: CacheService,
  jobId: string,
  env: Env
): Promise<void> {
  const jobData: EnhancementJob = {
    job_id: jobId,
    status: 'running',
    started_at: new Date().toISOString(),
    terms_total: entries.length,
    terms_completed: 0,
    terms_enhanced: 0,
    terms_failed: 0,
    improvements: [],
  }

  // Store initial job status
  await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), {
    expirationTtl: 86400, // 24 hours
  })

  // Process each entry
  for (const entry of entries) {
    try {
      const scoreBefore = entry.quality_score.overall
      const enhancedEntry = await generator.enhanceEntry(entry)

      if (!enhancedEntry) {
        throw new Error('Enhancement failed for ' + entry.term)
      }

      const scoreAfter = enhancedEntry.quality_score.overall

      // Update database
      await db.update(enhancedEntry)

      // Invalidate cache
      await cache.invalidateTerm(entry.normalized_term)

      jobData.terms_completed++
      jobData.terms_enhanced++
      jobData.improvements.push({
        term: entry.term,
        before_score: scoreBefore,
        after_score: scoreAfter,
        improvements: [
          scoreAfter - scoreBefore > 20
            ? 'Major improvements'
            : 'Minor improvements',
          enhancedEntry.definition.etymology && !entry.definition.etymology
            ? 'Added etymology'
            : null,
          enhancedEntry.definition.pronunciation &&
          !entry.definition.pronunciation
            ? 'Added pronunciation'
            : null,
          Object.keys(enhancedEntry.references).length >
          Object.keys(entry.references).length
            ? 'Added references'
            : null,
        ].filter(Boolean) as string[],
      })

      // Update job status periodically
      if (jobData.terms_completed % 5 === 0) {
        await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), {
          expirationTtl: 86400,
        })
      }
    } catch (error) {
      console.error(`Failed to enhance ${entry.term}:`, error)
      jobData.terms_failed++
    }
  }

  // Final job update
  jobData.status = 'completed'
  jobData.completed_at = new Date().toISOString()

  await env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), {
    expirationTtl: 86400, // Keep for 24 hours
  })
}

/**
 * Cancel enhancement job
 * DELETE /api/v1/enhance/:jobId
 */
enhanceHandler.delete('/:jobId', async c => {
  const jobId = c.req.param('jobId')

  // Check if job exists
  const jobData = (await c.env.CACHE.get(
    `job:${jobId}`,
    'json'
  )) as EnhancementJob | null

  if (!jobData) {
    return c.json(
      createApiResponse({
        error: 'Job not found',
      }),
      404
    )
  }

  if (jobData.status === 'completed') {
    return c.json(
      createApiResponse({
        error: 'Cannot cancel completed job',
      }),
      400
    )
  }

  // Update job status
  jobData.status = 'cancelled'
  jobData.cancelled_at = new Date().toISOString()

  await c.env.CACHE.put(`job:${jobId}`, JSON.stringify(jobData), {
    expirationTtl: 86400,
  })

  return c.json(
    createApiResponse({
      message: 'Job cancelled successfully',
      job_id: jobId,
    })
  )
})
