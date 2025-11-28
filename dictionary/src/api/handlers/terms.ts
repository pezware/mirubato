/**
 * Terms Handler - Main dictionary query endpoints
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Env } from '../../types/env'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { CacheService } from '../../services/storage/cache-service'
import { DictionaryGenerator } from '../../services/ai/dictionary-generator'
import { auth, getUserInfo } from '../../middleware/auth'
import { cache, invalidateCache, edgeCache } from '../../middleware/cache'
import { rateLimit } from '../../middleware/rate-limit'
import { normalizeTerm } from '../../utils/validation'
import { APIError } from '../../utils/errors'
import {
  DictionaryEntry,
  TermType,
  SearchAnalytics,
  UserFeedback,
  SupportedLanguage,
} from '../../types/dictionary'

export const termsHandler = new Hono<{ Bindings: Env }>()

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  helpful: z.boolean().optional(),
  feedback_text: z.string().max(1000).optional(),
  feedback_type: z
    .enum(['accuracy', 'clarity', 'completeness', 'other'])
    .optional(),
})

/**
 * Get dictionary entry by term
 * GET /api/v1/terms/:term
 */
termsHandler.get(
  '/:term',
  auth({ optional: true }),
  rateLimit({
    windowMs: 60000,
    max: 120,
    skip: c => !!c.get('userId'), // Higher limit for authenticated users
  }),
  cache({
    ttl: 300,
    varyBy: ['Accept-Language'],
  }),
  edgeCache({
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 600,
  }),
  async c => {
    const startTime = Date.now()
    const term = c.req.param('term')
    const { type, enhance, generate_if_missing, lang, searchAllLanguages } =
      c.req.query()

    const db = new DictionaryDatabase(c.env.DB)
    const cacheService = new CacheService(c.env.CACHE, c.env)
    const userInfo = getUserInfo(c)

    // Get language from query or Accept-Language header
    const requestLang =
      lang ||
      c.req.header('Accept-Language')?.split(',')[0]?.split('-')[0] ||
      'en'

    try {
      // Normalize the term
      const normalizedTerm = normalizeTerm(term)

      // Try cache first
      let entry = await cacheService.getCachedTerm(normalizedTerm, requestLang)

      // Try database if not in cache
      if (!entry) {
        entry = await db.findByTerm(normalizedTerm, requestLang, {
          searchAllLanguages: searchAllLanguages === 'true',
        })

        if (entry) {
          // Cache the found entry
          await cacheService.cacheTerm(normalizedTerm, entry, entry.lang)
        }
      }

      // Generate if missing and requested
      let wasGenerated = false
      if (!entry && generate_if_missing === 'true') {
        const generator = new DictionaryGenerator(c.env)

        entry = await generator.generateEntry({
          term,
          type: (type as TermType) || 'general',
          lang: requestLang, // Pass the requested language to AI generator
          context: {
            requested_by: userInfo.userId || 'anonymous',
            generation_reason: 'user_request',
          },
        })

        if (entry) {
          // Save to database
          await db.create(entry)

          // Cache the new entry
          await cacheService.cacheTerm(normalizedTerm, entry, entry.lang)

          wasGenerated = true
        }
      }

      // Log search analytics
      const analytics: SearchAnalytics = {
        id: crypto.randomUUID(),
        term,
        normalized_term: normalizedTerm,
        found: !!entry,
        entry_id: entry?.id,
        response_time_ms: Date.now() - startTime,
        searched_at: new Date().toISOString(),
        user_id: userInfo.userId,
        search_source: 'api',
        search_lang: requestLang as SupportedLanguage,
        result_lang: entry?.lang,
      }

      // Log asynchronously to not block response
      c.executionCtx.waitUntil(db.logSearch(analytics))

      if (entry) {
        // Update search frequency
        c.executionCtx.waitUntil(db.updateSearchFrequency(entry.id))

        // Enhance if requested and quality is low
        if (enhance === 'true' && entry.quality_score.overall < 80) {
          c.executionCtx.waitUntil(enhanceEntryInBackground(c.env, entry))
        }

        // Get related terms
        const relatedTerms = await db.getRelatedTerms(entry.id)

        // Set generated header if this was generated
        if (wasGenerated) {
          c.header('X-Generated', 'true')
        }

        return c.json({
          success: true,
          data: {
            entry,
            related_terms: relatedTerms ? relatedTerms.slice(0, 5) : [], // Top 5 related
            cache_hit: false,
          },
        })
      }

      // Not found
      return c.json(
        {
          success: false,
          error: 'Term not found',
          data: {
            term,
            normalized_term: normalizedTerm,
            suggestions: await getSuggestions(c.env, normalizedTerm),
          },
        },
        404
      )
    } catch (error) {
      console.error('Terms handler error:', error)
      throw new APIError('Failed to retrieve term', 500, { error })
    }
  }
)

/**
 * Submit feedback for a term
 * POST /api/v1/terms/:id/feedback
 */
termsHandler.post(
  '/:id/feedback',
  auth({ optional: true }),
  rateLimit({ windowMs: 60000, max: 10 }), // Strict limit for feedback
  zValidator('json', feedbackSchema),
  invalidateCache(c => [`term:*`, `id:${c.req.param('id')}`]),
  async c => {
    const entryId = c.req.param('id')
    const feedbackData = c.req.valid('json')
    const userInfo = getUserInfo(c)

    const db = new DictionaryDatabase(c.env.DB)

    try {
      // Verify entry exists
      const entry = await db.findById(entryId)
      if (!entry) {
        return c.json(
          {
            success: false,
            error: 'Entry not found',
          },
          404
        )
      }

      // Save feedback
      const feedback: UserFeedback = {
        id: crypto.randomUUID(),
        entry_id: entryId,
        user_id: userInfo.userId,
        ...feedbackData,
        created_at: new Date().toISOString(),
      }

      await db.saveFeedback(feedback)

      // Queue for enhancement if low rating
      if (feedbackData.rating && feedbackData.rating <= 2) {
        c.executionCtx.waitUntil(
          db.queueForEnhancement(
            entryId,
            `Low rating feedback: ${feedbackData.rating}`,
            8 // High priority
          )
        )
      }

      return c.json({
        success: true,
        message: 'Thank you for your feedback',
        data: {
          feedback_id: feedback.id,
        },
      })
    } catch (error) {
      console.error('Feedback error:', error)
      throw new APIError('Failed to submit feedback', 500, { error })
    }
  }
)

/**
 * Get term by ID
 * GET /api/v1/terms/id/:id
 */
termsHandler.get(
  '/id/:id',
  auth({ optional: true }),
  cache({ ttl: 600 }),
  edgeCache({ maxAge: 300, sMaxAge: 3600 }),
  async c => {
    const id = c.req.param('id')
    const db = new DictionaryDatabase(c.env.DB)
    const cacheService = new CacheService(c.env.CACHE, c.env)

    try {
      // Try cache first
      let entry = await cacheService.getCachedById(id)

      if (!entry) {
        entry = await db.findById(id)

        if (entry) {
          // Cache by ID and term
          await cacheService.cacheTerm(entry.normalized_term, entry, entry.lang)
        }
      }

      if (!entry) {
        return c.json(
          {
            success: false,
            error: 'Entry not found',
          },
          404
        )
      }

      // Get related terms
      const relatedTerms = await db.getRelatedTerms(entry.id)

      return c.json({
        success: true,
        data: {
          entry,
          related_terms: relatedTerms.slice(0, 5),
        },
      })
    } catch (error) {
      console.error('Get by ID error:', error)
      throw new APIError('Failed to retrieve entry', 500, { error })
    }
  }
)

/**
 * Get a term in multiple languages
 * GET /api/v1/terms/:term/languages
 */
termsHandler.get(
  '/:term/languages',
  auth({ optional: true }),
  rateLimit({ windowMs: 60000, max: 100 }),
  cache({ ttl: 600 }),
  edgeCache({ maxAge: 300, sMaxAge: 600 }),
  async c => {
    const term = c.req.param('term')
    const { languages } = c.req.query()

    const db = new DictionaryDatabase(c.env.DB)
    const normalizedTerm = normalizeTerm(term)

    try {
      // Parse languages from query string (comma-separated)
      const requestedLangs = languages
        ? languages.split(',').map(l => l.trim())
        : ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'] // Default to all supported languages

      const result = await db.getTermInLanguages(normalizedTerm, requestedLangs)

      return c.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('Multi-language term error:', error)
      throw new APIError('Failed to get term in multiple languages', 500, {
        error,
      })
    }
  }
)

/**
 * Report an issue with a term
 * POST /api/v1/terms/:id/report
 */
termsHandler.post(
  '/:id/report',
  auth({ optional: true }),
  rateLimit({ windowMs: 3600000, max: 5 }), // 5 reports per hour
  zValidator(
    'json',
    z.object({
      issue_type: z.enum([
        'incorrect',
        'offensive',
        'spam',
        'copyright',
        'other',
      ]),
      description: z.string().min(10).max(500),
    })
  ),
  async c => {
    const entryId = c.req.param('id')
    const report = c.req.valid('json')
    const userInfo = getUserInfo(c)

    const db = new DictionaryDatabase(c.env.DB)

    try {
      // Verify entry exists
      const entry = await db.findById(entryId)
      if (!entry) {
        return c.json(
          {
            success: false,
            error: 'Entry not found',
          },
          404
        )
      }

      // Save report as special feedback
      const feedback: UserFeedback = {
        id: crypto.randomUUID(),
        entry_id: entryId,
        user_id: userInfo.userId,
        feedback_type: report.issue_type,
        feedback_text: report.description,
        created_at: new Date().toISOString(),
      }

      await db.saveFeedback(feedback)

      // Queue for review with high priority
      await db.queueForEnhancement(
        entryId,
        `Reported: ${report.issue_type} - ${report.description}`,
        10 // Highest priority
      )

      return c.json({
        success: true,
        message: 'Report submitted for review',
        data: {
          report_id: feedback.id,
        },
      })
    } catch (error) {
      console.error('Report error:', error)
      throw new APIError('Failed to submit report', 500, { error })
    }
  }
)

// Helper functions

async function enhanceEntryInBackground(
  env: Env,
  entry: DictionaryEntry
): Promise<void> {
  try {
    const generator = new DictionaryGenerator(env)
    const enhanced = await generator.enhanceEntry(entry, {
      focus_areas: ['references', 'related_terms', 'examples'],
    })

    if (
      enhanced &&
      enhanced.quality_score.overall > entry.quality_score.overall
    ) {
      const db = new DictionaryDatabase(env.DB)
      await db.update(enhanced)

      const cache = new CacheService(env.CACHE, env)
      await cache.cacheTerm(enhanced.normalized_term, enhanced, enhanced.lang)
    }
  } catch (error) {
    console.error('Background enhancement failed:', error)
  }
}

async function getSuggestions(env: Env, term: string): Promise<string[]> {
  try {
    // Simple prefix matching for now
    // const db = new DictionaryDatabase(env.DB)
    const results = await env.DB.prepare(
      `
      SELECT DISTINCT term 
      FROM dictionary_entries 
      WHERE normalized_term LIKE ? 
      ORDER BY overall_score DESC, term ASC
      LIMIT 5
    `
    )
      .bind(`${term}%`)
      .all()

    return results.results.map(r => r.term as string)
  } catch (error) {
    console.error('Suggestions error:', error)
    return []
  }
}
