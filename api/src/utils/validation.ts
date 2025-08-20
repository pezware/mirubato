import { z } from 'zod'
import {
  NotificationSettingsSchema,
  PartialLogbookEntrySchema,
  PartialGoalSchema,
} from '../schemas/entities'

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

  // Sync schemas with proper typing (using partial schemas for flexibility)
  syncEntity: z.object({
    id: z.string(),
    type: z.enum(['logbook_entry', 'goal', 'user_preferences']),
    data: z.unknown(), // Allow any data structure since sync_data is flexible
    checksum: z.string(),
    version: z.number().int().positive(),
  }),

  syncBatch: z.object({
    entities: z.array(
      z.object({
        id: z.string(),
        type: z.enum(['logbook_entry', 'goal', 'user_preferences']),
        data: z.unknown(), // Allow any data structure since sync_data is flexible
        checksum: z.string(),
        version: z.number().int().positive(),
      })
    ),
    syncToken: z.string().optional(),
  }),

  syncChanges: z.object({
    changes: z.object({
      entries: z.array(PartialLogbookEntrySchema).optional(),
      goals: z.array(PartialGoalSchema).optional(),
    }),
    lastSyncToken: z.string().optional(),
  }),

  // User schemas
  userPreferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    notificationSettings: NotificationSettingsSchema.optional(),
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
 * Validate sync entity data with proper schema validation
 */
export function validateSyncEntity(entity: unknown): boolean {
  try {
    schemas.syncEntity.parse(entity)
    return true
  } catch {
    return false
  }
}

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * Validate pagination parameters with proper typing
 */
export function validatePagination(params: unknown): {
  limit: number
  offset: number
} {
  const result = paginationSchema.safeParse(params)
  if (result.success) {
    return result.data
  }
  // Return defaults if parsing fails
  return { limit: 50, offset: 0 }
}
