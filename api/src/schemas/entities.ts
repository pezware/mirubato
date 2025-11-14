import { z } from 'zod'

/**
 * Shared entity schemas for API validation
 * These replace z.any() with proper type definitions
 */

// Enum schemas
export const LogbookEntryType = z.enum([
  'practice',
  'performance',
  'lesson',
  'rehearsal',
  'technique',
  'status_change',
])
export const MoodType = z.enum([
  'frustrated',
  'neutral',
  'satisfied',
  'excited',
])
// Allow any non-empty string for instruments (supports custom instruments like viola, flute, etc.)
export const InstrumentType = z
  .string()
  .min(1)
  .transform(s => s.toLowerCase())
export const GoalType = z.enum([
  'practice_time',
  'accuracy',
  'repertoire',
  'custom',
])
export const GoalStatus = z.enum(['active', 'completed', 'abandoned'])

// Piece schema for logbook entries
export const PieceSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  composer: z.string().optional(),
  duration: z.number().optional(),
})

// Helper to parse timestamp - accepts both Unix timestamp (number) and ISO string
const TimestampSchema = z.union([
  z.number().int(),
  z
    .string()
    .datetime()
    .transform(str => new Date(str).getTime()),
])

// Logbook Entry schema
export const LogbookEntrySchema = z.object({
  id: z.string(),
  user_id: z.string().optional(), // Make optional since frontend doesn't always send it
  timestamp: TimestampSchema,
  duration: z.number().int().min(0),
  type: LogbookEntryType,
  instrument: InstrumentType,
  pieces: z.array(PieceSchema).default([]),
  techniques: z.array(z.string()).default([]),
  // Support both goal_ids and goalIds
  goal_ids: z.array(z.string()).default([]).optional(),
  goalIds: z.array(z.string()).default([]).optional(),
  notes: z.string().nullable().optional(),
  mood: MoodType.nullable().optional(),
  tags: z.array(z.string()).default([]),
  session_id: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  created_at: TimestampSchema.optional(),
  createdAt: z.string().datetime().optional(),
  updated_at: TimestampSchema.optional(),
  updatedAt: z.string().datetime().optional(), // Support frontend's updatedAt
  sync_version: z.number().int().default(1).optional(),
  checksum: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(), // Support frontend's deletedAt
  device_id: z.string().nullable().optional(),
})

// Goal schema
export const GoalSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  type: GoalType,
  target_value: z.number().int().nullable().optional(),
  current_value: z.number().int().default(0),
  target_date: z.string().nullable().optional(), // ISO date string
  status: GoalStatus.default('active'),
  created_at: z.string(), // ISO datetime string
  updated_at: z.string(), // ISO datetime string
})

// Notification settings schema
export const NotificationSettingsSchema = z.object({
  practiceReminders: z.boolean().default(false),
  goalDeadlines: z.boolean().default(false),
  achievementNotifications: z.boolean().default(true),
  emailFrequency: z
    .enum(['never', 'daily', 'weekly', 'monthly'])
    .default('never'),
  pushNotifications: z.boolean().default(false),
})

// Partial schemas for sync operations (allows incomplete data)
export const PartialLogbookEntrySchema = LogbookEntrySchema.partial().required({
  id: true,
  // Only id is required for sync operations
})

export const PartialGoalSchema = GoalSchema.partial().required({
  id: true,
  // Only id is required for sync operations
})

// Practice planning schemas
export const PracticePlanVisibility = z.enum(['private', 'shared', 'template'])

export const PracticePlanStatus = z.enum([
  'draft',
  'active',
  'completed',
  'archived',
])

export const PracticePlanType = z.enum(['bootcamp', 'course', 'custom'])

export const PlanPieceRefSchema = z.object({
  scoreId: z.string().optional(),
  title: z.string().optional(),
  composer: z.string().nullable().optional(),
})

export const PlanSegmentSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  durationMinutes: z.number().int().min(1).optional(),
  pieceRefs: z.array(PlanPieceRefSchema).optional(),
  techniques: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  tempoTargets: z
    .record(z.union([z.number(), z.string(), z.null()]))
    .optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const PlanTargetsSchema = z
  .record(z.union([z.number(), z.string(), z.null(), z.array(z.number())]))
  .optional()

export const PlanCheckInSchema = z
  .object({
    recordedAt: z.string().optional(),
    responses: z.record(z.unknown()).optional(),
  })
  .optional()

export const PlanMetricsSchema = z
  .record(z.union([z.number(), z.string(), z.null(), z.array(z.unknown())]))
  .optional()

export const PracticePlanScheduleSchema = z.object({
  kind: z.enum(['single', 'recurring']),
  rule: z.string().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  timeOfDay: z.string().optional(),
  flexibility: z.enum(['fixed', 'same-day', 'anytime']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  target: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const PracticePlanSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  type: PracticePlanType.default('custom'),
  focusAreas: z.array(z.string()).default([]).optional(),
  techniques: z.array(z.string()).default([]).optional(),
  pieceRefs: z.array(PlanPieceRefSchema).default([]).optional(),
  schedule: PracticePlanScheduleSchema,
  visibility: PracticePlanVisibility.default('private'),
  status: PracticePlanStatus.default('draft'),
  ownerId: z.string().optional(),
  templateVersion: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
})

export const PlanOccurrenceStatus = z.enum([
  'scheduled',
  'completed',
  'skipped',
  'expired',
])

export const PlanOccurrenceSchema = z.object({
  id: z.string(),
  planId: z.string(),
  user_id: z.string().optional(),
  scheduledStart: z.string().optional().nullable(),
  scheduledEnd: z.string().optional().nullable(),
  flexWindow: z.union([z.string(), z.null()]).optional(),
  recurrenceKey: z.string().optional().nullable(),
  segments: z.array(PlanSegmentSchema).default([]),
  targets: PlanTargetsSchema,
  reflectionPrompts: z.array(z.string()).optional(),
  status: PlanOccurrenceStatus.default('scheduled'),
  logEntryId: z.string().nullable().optional(),
  checkIn: PlanCheckInSchema,
  notes: z.string().nullable().optional(),
  reminderState: z.record(z.unknown()).optional(),
  metrics: PlanMetricsSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
})

export const PartialPracticePlanSchema = PracticePlanSchema.partial().required({
  id: true,
})

export const PartialPlanOccurrenceSchema =
  PlanOccurrenceSchema.partial().required({
    id: true,
    planId: true,
  })

// Plan template schemas
export const TemplateVisibility = z.enum(['public', 'private'])

export const PlanTemplateSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  sourcePlanId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  type: PracticePlanType.default('custom'),
  focusAreas: z.array(z.string()).default([]).optional(),
  techniques: z.array(z.string()).default([]).optional(),
  pieceRefs: z.array(PlanPieceRefSchema).default([]).optional(),
  schedule: PracticePlanScheduleSchema,
  tags: z.array(z.string()).optional(),
  templateVersion: z.number().int().default(1),
  visibility: TemplateVisibility.default('private'),
  adoptionCount: z.number().int().default(0).optional(),
  metadata: z.record(z.unknown()).optional(),
  publishedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
})

export const PartialPlanTemplateSchema = PlanTemplateSchema.partial().required({
  id: true,
})

// Type exports for TypeScript
export type LogbookEntry = z.infer<typeof LogbookEntrySchema>
export type Goal = z.infer<typeof GoalSchema>
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>
export type Piece = z.infer<typeof PieceSchema>
export type PartialLogbookEntry = z.infer<typeof PartialLogbookEntrySchema>
export type PartialGoal = z.infer<typeof PartialGoalSchema>
export type PracticePlan = z.infer<typeof PracticePlanSchema>
export type PlanOccurrence = z.infer<typeof PlanOccurrenceSchema>
export type PlanTemplate = z.infer<typeof PlanTemplateSchema>
