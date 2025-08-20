import { z } from 'zod'

/**
 * Frontend validation schemas for forms
 * These match the API schemas but are tailored for client-side validation
 */

// Enum schemas matching API
export const LogbookEntryTypeSchema = z.enum([
  'practice',
  'performance',
  'lesson',
  'rehearsal',
  'technique',
  'status_change',
])

export const MoodSchema = z.enum([
  'frustrated',
  'neutral',
  'satisfied',
  'excited',
])

// Allow any non-empty string for instruments (supports custom instruments)
export const InstrumentSchema = z
  .string()
  .min(1, { message: 'Instrument is required' })
  .transform(s => s.toLowerCase())

// Piece validation schema
export const PieceSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title is required' })
    .max(255, { message: 'Title must be less than 255 characters' }),
  composer: z
    .string()
    .max(255, { message: 'Composer must be less than 255 characters' })
    .nullable()
    .optional(),
  scoreId: z.string().optional(),
})

// Manual entry form validation schema
export const ManualEntryFormSchema = z.object({
  timestamp: z.string().datetime({ message: 'Invalid date/time' }),
  duration: z
    .number()
    .int({ message: 'Duration must be a whole number' })
    .min(1, { message: 'Duration must be at least 1 minute' })
    .max(600, { message: 'Duration cannot exceed 10 hours' }),
  type: LogbookEntryTypeSchema,
  instrument: InstrumentSchema.optional(),
  pieces: z
    .array(PieceSchema)
    .min(0)
    .max(10, { message: 'Maximum 10 pieces per entry' })
    .refine(
      pieces =>
        pieces.filter(p => p.title.trim().length > 0).length > 0 ||
        pieces.length === 0,
      { message: 'At least one piece must have a title if pieces are added' }
    ),
  techniques: z
    .array(z.string().min(1).max(100))
    .max(20, { message: 'Maximum 20 techniques' }),
  notes: z
    .string()
    .max(5000, { message: 'Notes cannot exceed 5000 characters' })
    .nullable()
    .optional(),
  mood: MoodSchema.nullable().optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(10, { message: 'Maximum 10 tags' }),
  goalIds: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// Timer entry form validation (simpler than manual)
export const TimerEntryFormSchema = z.object({
  pieces: z.array(PieceSchema).min(0).max(10, 'Maximum 10 pieces per entry'),
  techniques: z
    .array(z.string().min(1).max(100))
    .max(20, { message: 'Maximum 20 techniques' }),
  notes: z
    .string()
    .max(5000, { message: 'Notes cannot exceed 5000 characters' })
    .nullable()
    .optional(),
  mood: MoodSchema.nullable().optional(),
})

// Settings/preferences validation
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  primaryInstrument: z.string().min(1).optional(),
  practiceReminders: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  language: z.enum(['en', 'es', 'fr', 'de', 'zh-CN', 'zh-TW']).optional(),
})

// Goal creation schema
export const GoalFormSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Title is required' })
    .max(255, { message: 'Title must be less than 255 characters' }),
  description: z
    .string()
    .max(1000, { message: 'Description must be less than 1000 characters' })
    .optional(),
  type: z.enum(['practice_time', 'accuracy', 'repertoire', 'custom']),
  targetValue: z
    .number()
    .int()
    .min(1, { message: 'Target must be at least 1' })
    .optional(),
  targetDate: z
    .string()
    .refine(val => !val || new Date(val) > new Date(), {
      message: 'Target date must be in the future',
    })
    .optional(),
})

// Type exports
export type ManualEntryFormData = z.infer<typeof ManualEntryFormSchema>
export type TimerEntryFormData = z.infer<typeof TimerEntryFormSchema>
export type UserPreferencesData = z.infer<typeof UserPreferencesSchema>
export type GoalFormData = z.infer<typeof GoalFormSchema>
export type Piece = z.infer<typeof PieceSchema>

/**
 * Validation helpers
 */

export function validateManualEntry(data: unknown): {
  success: boolean
  data?: ManualEntryFormData
  errors?: z.ZodError
} {
  const result = ManualEntryFormSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

export function validateTimerEntry(data: unknown): {
  success: boolean
  data?: TimerEntryFormData
  errors?: z.ZodError
} {
  const result = TimerEntryFormSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

export function getFieldError(
  errors: z.ZodError | undefined,
  field: string
): string | undefined {
  if (!errors) return undefined
  const fieldError = errors.issues.find(err => err.path.join('.') === field)
  return fieldError?.message
}

export function getAllErrors(errors: z.ZodError | undefined): string[] {
  if (!errors) return []
  return errors.issues.map(err => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })
}
