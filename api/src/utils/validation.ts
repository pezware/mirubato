import { z } from 'zod'
import {
  NotificationSettingsSchema,
  PartialLogbookEntrySchema,
  PartialGoalSchema,
  PartialPracticePlanSchema,
  PartialPlanOccurrenceSchema,
  PartialPlanTemplateSchema,
} from '../schemas/entities'

const RECURRENCE_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export type RecurrenceWeekday = (typeof RECURRENCE_WEEKDAYS)[number]
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

const ICS_UNTIL_REGEX = /^\d{8}T\d{6}Z$/i
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

export interface NormalizedRecurrence {
  frequency: RecurrenceFrequency
  interval: number
  weekdays?: RecurrenceWeekday[]
  count?: number
  until?: string | null
}

const normalizeUntilValue = (value?: string | null): string | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (DATE_ONLY_REGEX.test(trimmed)) {
    return trimmed
  }

  if (ICS_UNTIL_REGEX.test(trimmed)) {
    const year = trimmed.slice(0, 4)
    const month = trimmed.slice(4, 6)
    const day = trimmed.slice(6, 8)
    return `${year}-${month}-${day}`
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

const normalizeWeekdays = (
  weekdays?: RecurrenceWeekday[]
): RecurrenceWeekday[] => {
  if (!weekdays) {
    return []
  }

  const seen = new Set<RecurrenceWeekday>()
  const normalized: RecurrenceWeekday[] = []

  weekdays.forEach(day => {
    const upper = day.toUpperCase() as RecurrenceWeekday
    if (RECURRENCE_WEEKDAYS.includes(upper) && !seen.has(upper)) {
      seen.add(upper)
      normalized.push(upper)
    }
  })

  return normalized.sort((a, b) => {
    const order: Record<RecurrenceWeekday, number> = {
      SU: 0,
      MO: 1,
      TU: 2,
      WE: 3,
      TH: 4,
      FR: 5,
      SA: 6,
    }
    return order[a] - order[b]
  })
}

export const normalizeRecurrenceMetadata = (
  metadata?: unknown
): NormalizedRecurrence | null => {
  if (!metadata || typeof metadata !== 'object') {
    return null
  }

  const record = metadata as Record<string, unknown>

  const frequency =
    typeof record.frequency === 'string'
      ? record.frequency.toUpperCase()
      : undefined

  if (
    frequency !== 'DAILY' &&
    frequency !== 'WEEKLY' &&
    frequency !== 'MONTHLY'
  ) {
    return null
  }

  const intervalValue = Number(record.interval)
  const interval =
    Number.isFinite(intervalValue) && intervalValue > 0
      ? Math.round(intervalValue)
      : 1

  const weekdays = Array.isArray(record.weekdays)
    ? normalizeWeekdays(
        (record.weekdays as unknown[]).map(
          day => String(day).toUpperCase() as RecurrenceWeekday
        )
      )
    : undefined

  const countValue = Number(record.count)
  const count =
    Number.isFinite(countValue) && countValue > 0
      ? Math.round(countValue)
      : undefined

  const until = normalizeUntilValue(
    typeof record.until === 'string' ? record.until : undefined
  )

  return {
    frequency,
    interval,
    weekdays,
    count,
    until,
  }
}

export const parseRecurrenceRule = (
  rule?: string | null
): NormalizedRecurrence | null => {
  if (!rule || typeof rule !== 'string') {
    return null
  }

  const segments = rule
    .split(';')
    .map(segment => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  let frequency: RecurrenceFrequency | null = null
  let interval = 1
  let weekdays: RecurrenceWeekday[] | undefined
  let count: number | undefined
  let until: string | null | undefined

  segments.forEach(segment => {
    const [rawKey, rawValue] = segment.split('=')
    if (!rawKey || typeof rawValue === 'undefined') {
      return
    }

    const key = rawKey.trim().toUpperCase()
    const value = rawValue.trim()

    if (key === 'FREQ') {
      const upperValue = value.toUpperCase()
      if (
        upperValue === 'DAILY' ||
        upperValue === 'WEEKLY' ||
        upperValue === 'MONTHLY'
      ) {
        frequency = upperValue as RecurrenceFrequency
      }
    } else if (key === 'INTERVAL') {
      const parsedInterval = Number.parseInt(value, 10)
      if (!Number.isNaN(parsedInterval) && parsedInterval > 0) {
        interval = parsedInterval
      }
    } else if (key === 'BYDAY') {
      const parsedWeekdays = value
        .split(',')
        .map(part => part.trim().toUpperCase() as RecurrenceWeekday)
      const normalized = normalizeWeekdays(parsedWeekdays)
      if (normalized.length > 0) {
        weekdays = normalized
      }
    } else if (key === 'COUNT') {
      const parsedCount = Number.parseInt(value, 10)
      if (!Number.isNaN(parsedCount) && parsedCount > 0) {
        count = parsedCount
      }
    } else if (key === 'UNTIL') {
      until = normalizeUntilValue(value)
    }
  })

  if (!frequency) {
    return null
  }

  return {
    frequency,
    interval,
    weekdays,
    count,
    until: until ?? null,
  }
}

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
    type: z.enum([
      'logbook_entry',
      'goal',
      'practice_plan',
      'plan_occurrence',
      'plan_template',
      'user_preferences',
    ]),
    data: z.unknown(), // Allow any data structure since sync_data is flexible
    checksum: z.string(),
    version: z.number().int().positive(),
  }),

  syncBatch: z.object({
    entities: z.array(
      z.object({
        id: z.string(),
        type: z.enum([
          'logbook_entry',
          'goal',
          'practice_plan',
          'plan_occurrence',
          'plan_template',
          'user_preferences',
        ]),
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
      practicePlans: z.array(PartialPracticePlanSchema).optional(),
      planOccurrences: z.array(PartialPlanOccurrenceSchema).optional(),
      planTemplates: z.array(PartialPlanTemplateSchema).optional(),
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
