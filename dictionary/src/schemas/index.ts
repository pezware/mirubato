/**
 * Centralized validation schemas for the dictionary service
 */

import { z } from 'zod'

/**
 * Common schemas used across multiple endpoints
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().min(0).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc'),
  }),

  // Term types
  termType: z.enum([
    'instrument',
    'genre',
    'technique',
    'composer',
    'theory',
    'general',
  ]),

  // Difficulty levels
  difficultyLevel: z.enum([
    'beginner',
    'intermediate',
    'advanced',
    'professional',
  ]),

  // Quality score
  qualityScore: z.object({
    overall: z.number().min(0).max(100),
    accuracy: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    references: z.number().min(0).max(100),
  }),

  // Date range
  dateRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
}

/**
 * Term-related schemas
 */
export const termSchemas = {
  // Single term query
  termQuery: z.object({
    term: z.string().min(1).max(200),
    enhance: z.coerce.boolean().optional(),
    include_related: z.coerce.boolean().optional(),
  }),

  // Term creation/update
  termData: z.object({
    term: z.string().min(1).max(200),
    type: commonSchemas.termType,
    definition: z.object({
      concise: z.string().min(10).max(500),
      detailed: z.string().min(50).max(5000),
      etymology: z.string().max(1000).optional(),
      pronunciation: z
        .object({
          ipa: z.string().max(100),
          audio_url: z.string().url().optional(),
        })
        .optional(),
    }),
    metadata: z
      .object({
        difficulty_level: commonSchemas.difficultyLevel.optional(),
        instruments: z.array(z.string()).optional(),
        related_terms: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
      })
      .optional(),
  }),

  // Term feedback
  termFeedback: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    suggestions: z.array(z.string().max(200)).max(10).optional(),
    report_issue: z
      .object({
        type: z.enum([
          'inaccurate',
          'incomplete',
          'unclear',
          'offensive',
          'other',
        ]),
        details: z.string().max(500),
      })
      .optional(),
  }),
}

/**
 * Search-related schemas
 */
export const searchSchemas = {
  // Text search
  textSearch: z.object({
    q: z.string().min(1).max(200),
    type: commonSchemas.termType.optional(),
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
        difficulty_level: commonSchemas.difficultyLevel.optional(),
        has_audio: z.boolean().optional(),
        has_references: z.boolean().optional(),
      })
      .optional(),
  }),

  // Semantic search
  semanticSearch: z.object({
    query: z.string().min(1).max(500),
    limit: z.coerce.number().int().positive().max(50).default(10),
    similarity_threshold: z.number().min(0).max(1).default(0.7),
    filters: z
      .object({
        type: commonSchemas.termType.optional(),
        min_quality: z.number().min(0).max(100).optional(),
      })
      .optional(),
  }),
}

/**
 * Batch operation schemas
 */
export const batchSchemas = {
  // Batch query
  batchQuery: z.object({
    terms: z.array(z.string().min(1).max(200)).min(1).max(50),
    type: commonSchemas.termType.optional(),
    generate_missing: z.boolean().default(false),
    include_related: z.boolean().default(false),
  }),

  // Batch update
  batchUpdate: z.object({
    updates: z
      .array(
        z.object({
          id: z.string(),
          quality_score: commonSchemas.qualityScore.partial().optional(),
          metadata: z.record(z.any()).optional(),
          verified: z.boolean().optional(),
        })
      )
      .min(1)
      .max(100),
  }),

  // Batch import
  batchImport: z.object({
    entries: z
      .array(
        z.object({
          term: z.string().min(1).max(200),
          type: commonSchemas.termType,
          definition: z.object({
            concise: z.string(),
            detailed: z.string(),
          }),
        })
      )
      .min(1)
      .max(1000),
    skip_existing: z.boolean().default(true),
    validate_quality: z.boolean().default(true),
  }),
}

/**
 * Enhancement schemas
 */
export const enhanceSchemas = {
  // Enhancement request
  enhanceRequest: z.object({
    mode: z.enum(['batch', 'single']),
    term_id: z.string().optional(),
    criteria: z
      .object({
        min_age_days: z.number().int().positive().optional(),
        max_quality_score: z.number().min(0).max(100).optional(),
        limit: z.number().int().positive().max(1000).default(100),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
      })
      .optional(),
  }),

  // Enhancement result
  enhanceResult: z.object({
    term_id: z.string(),
    success: z.boolean(),
    improvements: z.array(z.string()).optional(),
    new_quality_score: commonSchemas.qualityScore.optional(),
    error: z.string().optional(),
  }),
}

/**
 * Export schemas
 */
export const exportSchemas = {
  // Export request
  exportRequest: z.object({
    format: z.enum(['json', 'csv', 'sqlite']).default('json'),
    min_quality: z.coerce.number().min(0).max(100).optional(),
    types: z.array(commonSchemas.termType).optional(),
    include_metadata: z.boolean().default(true),
    date_range: commonSchemas.dateRange.optional(),
  }),
}

/**
 * Analytics schemas
 */
export const analyticsSchemas = {
  // Analytics query
  analyticsQuery: z.object({
    metric: z.enum([
      'popular_terms',
      'recent_additions',
      'low_quality_terms',
      'search_trends',
      'quality_distribution',
      'type_distribution',
    ]),
    date_range: commonSchemas.dateRange.optional(),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
}

/**
 * Admin schemas
 */
export const adminSchemas = {
  // Term management
  termManagement: z.object({
    action: z.enum(['create', 'update', 'delete', 'verify']),
    data: termSchemas.termData.optional(),
    reason: z.string().max(500).optional(),
  }),

  // Bulk operations
  bulkOperation: z.object({
    operation: z.enum(['import', 'export', 'update_quality', 'regenerate']),
    filter: z
      .object({
        type: commonSchemas.termType.optional(),
        quality_range: z
          .object({
            min: z.number().min(0).max(100),
            max: z.number().min(0).max(100),
          })
          .optional(),
        date_range: commonSchemas.dateRange.optional(),
      })
      .optional(),
    options: z.record(z.any()).optional(),
  }),
}
