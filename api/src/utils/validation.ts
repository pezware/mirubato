import { z } from 'zod'

/**
 * Common validation schemas
 */
export const schemas = {
  // Email validation
  email: z
    .string()
    .email('Invalid email address')
    .transform(email => email.toLowerCase().trim()),

  // Auth schemas
  requestMagicLink: z.object({
    email: z
      .string()
      .email('Invalid email address')
      .transform(email => email.toLowerCase().trim()),
  }),

  verifyMagicLink: z.object({
    token: z.string().min(1, 'Token is required'),
  }),

  googleAuth: z.object({
    credential: z.string().min(1, 'Google credential is required'),
  }),

  // Sync schemas
  syncEntity: z.object({
    id: z.string(),
    type: z.enum(['logbook_entry', 'goal']),
    data: z.any(),
    checksum: z.string(),
    version: z.number().int().positive(),
  }),

  syncBatch: z.object({
    entities: z.array(z.any()), // Will be validated individually
    syncToken: z.string().optional(),
  }),

  syncChanges: z.object({
    changes: z.object({
      entries: z.array(z.any()).optional(),
      goals: z.array(z.any()).optional(),
    }),
    lastSyncToken: z.string().optional(),
  }),

  // Sync V2 schemas
  syncV2: z.object({
    lastKnownServerVersion: z.number().min(0),
    changes: z.array(
      z.object({
        changeId: z.string().min(1),
        type: z.enum(['CREATED', 'UPDATED', 'DELETED']),
        entityType: z.enum(['logbook_entry', 'goal']),
        entityId: z.string().min(1),
        data: z.any().optional(),
      })
    ),
  }),

  // User schemas
  userPreferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    notificationSettings: z.record(z.any()).optional(),
    primaryInstrument: z.string().optional(),
  }),
}

/**
 * Validate request body against a schema
 */
export async function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      throw new Error(`${firstError.path.join('.')}: ${firstError.message}`)
    }
    throw error
  }
}

/**
 * Email validation helper
 */
export function isValidEmail(email: string): boolean {
  try {
    schemas.email.parse(email)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().toLowerCase()
}

/**
 * Validate sync entity data
 */
export function validateSyncEntity(entity: any): boolean {
  // Basic validation - can be extended based on entity type
  if (!entity.id || !entity.type || !entity.data) {
    return false
  }

  // Validate entity type
  if (!['logbook_entry', 'goal'].includes(entity.type)) {
    return false
  }

  // Validate checksum
  if (entity.checksum && typeof entity.checksum !== 'string') {
    return false
  }

  return true
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: any) {
  const limit = Math.min(Math.max(parseInt(params.limit) || 50, 1), 100)
  const offset = Math.max(parseInt(params.offset) || 0, 0)

  return { limit, offset }
}
