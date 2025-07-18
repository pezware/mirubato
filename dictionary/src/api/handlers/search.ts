/**
 * Search Handler - Dictionary search endpoints
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Env } from '../../types/env'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { CacheService } from '../../services/storage/cache-service'
import { CloudflareAIService } from '../../services/ai/cloudflare-ai-service'
import { auth, getUserInfo } from '../../middleware/auth'
import { cache, edgeCache } from '../../middleware/cache'
import { rateLimit } from '../../middleware/rate-limit'
import { APIError } from '../../utils/errors'
import {
  SearchQuery,
  DictionaryEntry,
  SearchAnalytics,
  SearchFilters,
} from '../../types/dictionary'

export const searchHandler = new Hono<{ Bindings: Env }>()

// Search query schema
const searchQuerySchema = z.object({
  q: z.string().min(0).max(200).default(''), // Allow empty string for category browsing
  lang: z
    .string()
    .optional()
    .transform(val => {
      // Handle browser locale formats (e.g., en-US -> en)
      if (val && val.includes('-')) {
        const [lang] = val.split('-')
        // Map to supported languages
        if (['en', 'es', 'fr', 'de', 'zh'].includes(lang)) {
          // Special case for Chinese
          if (lang === 'zh') {
            return val.toLowerCase() as 'zh-CN' | 'zh-TW'
          }
          return lang as 'en' | 'es' | 'fr' | 'de'
        }
      }
      // Check if it's already a supported language
      if (val && ['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW'].includes(val)) {
        return val as 'en' | 'es' | 'fr' | 'de' | 'zh-CN' | 'zh-TW'
      }
      return 'en' // Default to English
    }),
  searchAllLanguages: z.coerce.boolean().optional().default(false),
  preferredLangs: z
    .array(z.enum(['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW']))
    .optional(),
  includeTranslations: z.coerce.boolean().optional().default(false),
  type: z
    .union([
      z.enum([
        'tempo',
        'dynamics',
        'articulation',
        'form',
        'genre',
        'instrument',
        'technique',
        'theory',
        'composer',
        'period',
        'notation',
        'general',
      ]),
      z.string(), // Allow comma-separated list
    ])
    .optional()
    .transform(val => {
      // If it's a comma-separated string, take the first value
      if (val && typeof val === 'string' && val.includes(',')) {
        return val.split(',')[0] as any
      }
      return val
    }),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort_by: z
    .enum(['relevance', 'alphabetical', 'quality', 'popularity'])
    .default('relevance'),
  filters: z
    .object({
      min_quality: z.coerce.number().min(0).max(100).optional(),
      max_quality: z.coerce.number().min(0).max(100).optional(),
      instruments: z.array(z.string()).optional(),
      difficulty_level: z
        .enum(['beginner', 'intermediate', 'advanced'])
        .optional(),
      has_audio: z.boolean().optional(),
      has_references: z.boolean().optional(),
      languages: z
        .array(z.enum(['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW']))
        .optional(),
    })
    .optional(),
})

/**
 * Search dictionary entries
 * GET /api/v1/search
 */
searchHandler.get(
  '/',
  auth({ optional: true }),
  rateLimit({ windowMs: 60000, max: 100 }),
  cache({
    ttl: 300,
    key: c => {
      const url = new URL(c.req.url)
      return `search:${url.search}`
    },
  }),
  edgeCache({ maxAge: 60, sMaxAge: 300 }),
  zValidator('query', searchQuerySchema),
  async c => {
    const startTime = Date.now()
    const query = c.req.valid('query')
    const userInfo = getUserInfo(c)

    const db = new DictionaryDatabase(c.env.DB)
    const cacheService = new CacheService(c.env.CACHE, c.env)

    try {
      // Use filters from the validated query or create empty object
      const filters: SearchFilters = query.filters || {}

      // Try cache first
      // Include all search parameters in the filters for cache key generation
      const cacheFilters = {
        ...filters,
        ...(query.type && { type: query.type }),
        lang: query.lang,
        searchAllLanguages: query.searchAllLanguages,
        includeTranslations: query.includeTranslations,
        sort_by: query.sort_by,
        limit: query.limit,
        offset: query.offset,
      }
      const cached = await cacheService.getCachedSearchResults(
        query.q,
        cacheFilters as Record<string, unknown>
      )

      if (cached) {
        c.header('X-Cache', 'HIT')
        return c.json({
          success: true,
          data: {
            results: cached.results,
            total: cached.total,
            query,
            cached: true,
            suggestedLanguages: undefined,
            detectedTermLanguage: undefined,
          },
        })
      }

      // Execute search with properly structured query
      const searchQuery: SearchQuery = {
        ...query,
        filters,
        type: query.type, // type is part of SearchQuery, not filters
      }
      const searchResult = await db.search(searchQuery)

      // Cache results
      await cacheService.cacheSearchResults(
        query.q,
        cacheFilters as Record<string, unknown>,
        searchResult.entries,
        searchResult.total
      )

      // Log search analytics
      const analytics: SearchAnalytics = {
        id: crypto.randomUUID(),
        term: query.q,
        normalized_term: query.q.toLowerCase().trim(),
        found: searchResult.total > 0,
        entry_id:
          searchResult.entries && searchResult.entries.length > 0
            ? searchResult.entries[0].id
            : undefined,
        response_time_ms: Date.now() - startTime,
        searched_at: new Date().toISOString(),
        user_id: userInfo.userId,
        search_source: 'api',
        search_lang: query.lang,
        result_lang:
          searchResult.entries && searchResult.entries.length > 0
            ? searchResult.entries[0].lang
            : undefined,
      }

      c.executionCtx.waitUntil(db.logSearch(analytics))

      return c.json({
        success: true,
        data: {
          results: searchResult.entries,
          total: searchResult.total,
          query,
          cached: false,
          suggestedLanguages: searchResult.suggestedLanguages,
          detectedTermLanguage: searchResult.detectedTermLanguage,
        },
      })
    } catch (error) {
      console.error('Search error:', error)
      throw new APIError('Search failed', 500, { error })
    }
  }
)

/**
 * Semantic search using embeddings
 * POST /api/v1/search/semantic
 */
searchHandler.post(
  '/semantic',
  auth({ optional: true }),
  rateLimit({ windowMs: 60000, max: 50 }), // Lower limit for AI-powered search
  zValidator(
    'json',
    z.object({
      query: z.string().min(3).max(500),
      limit: z.number().min(1).max(50).default(10),
      threshold: z.number().min(0).max(1).default(0.7),
    })
  ),
  async c => {
    const { query, limit, threshold } = c.req.valid('json')

    const db = new DictionaryDatabase(c.env.DB)
    const cacheService = new CacheService(c.env.CACHE, c.env)
    const aiService = new CloudflareAIService(c.env)

    try {
      // Check if embedding is cached
      let queryEmbedding = await cacheService.getCachedEmbedding(query)

      if (!queryEmbedding) {
        // Generate embedding for query
        queryEmbedding = await aiService.generateEmbedding(query)

        // Cache the embedding
        await cacheService.cacheEmbedding(query, queryEmbedding)
      }

      // Get all terms with embeddings from database
      const termsWithEmbeddings = await db.getEntriesWithEmbeddings()

      // Calculate similarities
      const results: Array<{ entry: DictionaryEntry; similarity: number }> = []

      for (const { entry, embedding } of termsWithEmbeddings) {
        const similarity = cosineSimilarity(queryEmbedding, embedding)

        if (similarity >= threshold) {
          results.push({
            entry,
            similarity,
          })
        }
      }

      // Sort by similarity and limit
      results.sort((a, b) => b.similarity - a.similarity)
      const topResults = results.slice(0, limit)

      return c.json({
        success: true,
        data: {
          query,
          results: topResults,
          total: topResults.length,
        },
      })
    } catch (error) {
      console.error('Semantic search error:', error)
      throw new APIError('Semantic search failed', 500, { error })
    }
  }
)

/**
 * Get search suggestions (autocomplete)
 * GET /api/v1/search/suggestions
 */
searchHandler.get(
  '/suggestions',
  rateLimit({ windowMs: 60000, max: 200 }), // Higher limit for autocomplete
  cache({ ttl: 600 }), // Cache for 10 minutes
  zValidator(
    'query',
    z.object({
      q: z.string().min(1).max(50),
      limit: z.coerce.number().min(1).max(20).default(10),
    })
  ),
  async c => {
    const { q, limit } = c.req.valid('query')
    const normalizedQuery = q.toLowerCase().trim()

    try {
      // Get suggestions from database
      const suggestions = await c.env.DB.prepare(
        `
        SELECT DISTINCT term, normalized_term, type, overall_score
        FROM dictionary_entries
        WHERE normalized_term LIKE ? OR term LIKE ?
        ORDER BY 
          CASE 
            WHEN normalized_term = ? THEN 0
            WHEN normalized_term LIKE ? THEN 1
            ELSE 2
          END,
          overall_score DESC,
          term ASC
        LIMIT ?
      `
      )
        .bind(
          `%${normalizedQuery}%`,
          `%${q}%`,
          normalizedQuery,
          `${normalizedQuery}%`,
          limit
        )
        .all()

      const results = suggestions.results.map(s => ({
        term: s.term as string,
        type: s.type as string,
        score: s.overall_score as number,
      }))

      return c.json({
        success: true,
        data: {
          query: q,
          suggestions: results,
        },
      })
    } catch (error) {
      console.error('Suggestions error:', error)
      throw new APIError('Failed to get suggestions', 500, { error })
    }
  }
)

/**
 * Get popular searches
 * GET /api/v1/search/popular
 */
searchHandler.get(
  '/popular',
  cache({ ttl: 3600 }), // Cache for 1 hour
  edgeCache({ maxAge: 300, sMaxAge: 3600 }),
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().min(1).max(50).default(20),
      days: z.coerce.number().min(1).max(90).default(30),
    })
  ),
  async c => {
    const { limit, days } = c.req.valid('query')
    const db = new DictionaryDatabase(c.env.DB)

    try {
      const popular = await db.getPopularSearches(limit)

      return c.json({
        success: true,
        data: {
          searches: popular,
          period_days: days,
          generated_at: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Popular searches error:', error)
      throw new APIError('Failed to get popular searches', 500, { error })
    }
  }
)

/**
 * Get related searches
 * GET /api/v1/search/related
 */
searchHandler.get(
  '/related',
  cache({ ttl: 1800 }), // Cache for 30 minutes
  zValidator(
    'query',
    z.object({
      term: z.string().min(1).max(200),
      limit: z.coerce.number().min(1).max(20).default(10),
    })
  ),
  async c => {
    const { term, limit } = c.req.valid('query')
    const db = new DictionaryDatabase(c.env.DB)

    try {
      // Find the main entry
      const entry = await db.findByTerm(term)

      if (!entry) {
        return c.json(
          {
            success: false,
            error: 'Term not found',
          },
          404
        )
      }

      // Get related terms
      const related = await db.getRelatedTerms(entry.id)

      // Also get terms that are frequently searched together
      const coSearched = await c.env.DB.prepare(
        `
        SELECT 
          sa2.normalized_term as term,
          COUNT(*) as co_occurrence_count
        FROM search_analytics sa1
        JOIN search_analytics sa2 
          ON sa1.user_session_id = sa2.user_session_id
          AND sa1.normalized_term != sa2.normalized_term
          AND ABS(julianday(sa2.searched_at) - julianday(sa1.searched_at)) < 0.01
        WHERE sa1.normalized_term = ?
          AND sa2.found = 1
        GROUP BY sa2.normalized_term
        ORDER BY co_occurrence_count DESC
        LIMIT ?
      `
      )
        .bind(entry.normalized_term, limit)
        .all()

      const relatedSearches = coSearched.results.map(r => ({
        term: r.term as string,
        co_occurrences: r.co_occurrence_count as number,
      }))

      return c.json({
        success: true,
        data: {
          term: entry.term,
          related_terms: related.slice(0, limit),
          related_searches: relatedSearches,
        },
      })
    } catch (error) {
      console.error('Related searches error:', error)
      throw new APIError('Failed to get related searches', 500, { error })
    }
  }
)

// Helper function for cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}
