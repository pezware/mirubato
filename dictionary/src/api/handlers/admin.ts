import { Hono } from 'hono'
import type { Env, Variables } from '../../types/env'
import { DictionaryDatabase } from '../../services/storage/dictionary-database'
import { CacheService } from '../../services/storage/cache-service'
import {
  createApiResponse,
  ValidationError,
  AuthorizationError,
} from '../../utils/errors'
import { auth } from '../../middleware/auth'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { DictionaryEntry } from '../../types/dictionary'

export const adminHandler = new Hono<{ Bindings: Env; Variables: Variables }>()

// Apply auth middleware to all routes
adminHandler.use('*', auth())

// Check admin privileges
adminHandler.use('*', async (c, next) => {
  const userRoles = c.get('userRoles' as any) || []

  // Check if user has admin role
  const isAdmin = userRoles.includes('admin')

  if (!isAdmin) {
    throw new AuthorizationError('Admin access required')
  }

  await next()
})

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
        201 as any
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
            type: entryData.type as any,
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
