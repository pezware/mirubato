/**
 * Validation schemas for sync events
 * Ensures data integrity before broadcasting or persisting
 */

import { z } from 'zod'

// Enum types matching the backend schema
const LogbookEntryType = z.enum([
  'practice',
  'performance',
  'lesson',
  'masterclass',
  'rehearsal',
  'other',
])

const InstrumentType = z.enum([
  'piano',
  'violin',
  'guitar',
  'voice',
  'flute',
  'clarinet',
  'saxophone',
  'trumpet',
  'cello',
  'drums',
  'other',
])

const MoodType = z.enum(['frustrated', 'neutral', 'satisfied', 'proud'])

// Piece schema for nested objects
const PieceSchema = z.object({
  title: z.string(),
  composer: z.string().nullable().optional(),
  measures: z.string().nullable().optional(),
  tempo: z.number().nullable().optional(),
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

// Logbook Entry schema for validation
export const LogbookEntrySchema = z.object({
  id: z.string(),
  user_id: z.string().optional(), // Optional since we add it server-side
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
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: TimestampSchema.optional(),
  createdAt: z.string().datetime().optional(), // Support frontend's createdAt
  updated_at: TimestampSchema.optional(),
  updatedAt: z.string().datetime().optional(), // Support frontend's updatedAt
  sync_version: z.number().int().default(1).optional(),
  checksum: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(), // Support frontend's deletedAt
  device_id: z.string().nullable().optional(),
  // Frontend-specific fields
  scoreId: z.string().optional(),
  scoreTitle: z.string().optional(),
  scoreComposer: z.string().optional(),
  autoTracked: z.boolean().optional(),
})

// Repertoire Item schema
export const RepertoireItemSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  score_id: z.string().nullable().optional(),
  title: z.string(),
  composer: z.string().nullable().optional(),
  status: z.enum([
    'planned',
    'learning',
    'working',
    'polished',
    'performance_ready',
    'archived',
  ]),
  started_at: z.string().datetime().nullable().optional(),
  last_practiced_at: z.string().datetime().nullable().optional(),
  target_tempo: z.number().nullable().optional(),
  current_tempo: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

// Sync Event validation schemas
export const SyncEventSchema = z.discriminatedUnion('type', [
  // Entry events
  z.object({
    type: z.literal('ENTRY_CREATED'),
    entry: LogbookEntrySchema,
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  z.object({
    type: z.literal('ENTRY_UPDATED'),
    entry: LogbookEntrySchema,
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  z.object({
    type: z.literal('ENTRY_DELETED'),
    entryId: z.string(),
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  // Piece events
  z.object({
    type: z.literal('PIECE_ADDED'),
    piece: RepertoireItemSchema,
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  z.object({
    type: z.literal('PIECE_UPDATED'),
    piece: RepertoireItemSchema,
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  z.object({
    type: z.literal('PIECE_REMOVED'),
    scoreId: z.string(),
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
    piece: RepertoireItemSchema.optional(), // Make piece optional for removal
  }),
  z.object({
    type: z.literal('PIECE_DISSOCIATED'),
    scoreId: z.string(),
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
    piece: RepertoireItemSchema.optional(), // Make piece optional for dissociation
  }),
  // Bulk sync events
  z.object({
    type: z.literal('BULK_SYNC'),
    entries: z.array(LogbookEntrySchema),
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  z.object({
    type: z.literal('REPERTOIRE_BULK_SYNC'),
    pieces: z.array(RepertoireItemSchema),
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  // Control events
  z.object({
    type: z.literal('SYNC_REQUEST'),
    lastSyncTime: z.string().datetime().optional(),
    timestamp: z.string().datetime(),
    userId: z.string().optional(),
  }),
  z.object({
    type: z.literal('PING'),
    timestamp: z.string().datetime(),
  }),
])

// Response event types (sent from server to client)
export const ResponseEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('WELCOME'),
    message: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal('PONG'),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal('SYNC_RESPONSE'),
    message: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal('ERROR'),
    error: z.string(),
    timestamp: z.string().datetime(),
  }),
])

// Helper function to sanitize and validate entry data
export function sanitizeEntry(
  entry: unknown
): z.infer<typeof LogbookEntrySchema> | null {
  try {
    // Parse and validate
    const validated = LogbookEntrySchema.parse(entry)

    // Transform field names if needed
    if (validated.goalIds && !validated.goal_ids) {
      validated.goal_ids = validated.goalIds
      delete validated.goalIds
    }

    // Normalize enum fields to lowercase
    if (validated.instrument) {
      validated.instrument = validated.instrument.toLowerCase() as z.infer<
        typeof InstrumentType
      >
    }
    if (validated.type) {
      validated.type = validated.type.toLowerCase() as z.infer<
        typeof LogbookEntryType
      >
    }
    if (validated.mood) {
      validated.mood = validated.mood.toLowerCase() as z.infer<typeof MoodType>
    }

    return validated
  } catch (error) {
    console.error('Entry validation failed:', error)
    return null
  }
}

// Helper function to sanitize and validate repertoire item data
export function sanitizeRepertoireItem(
  item: unknown
): z.infer<typeof RepertoireItemSchema> | null {
  try {
    // Parse and validate
    const validated = RepertoireItemSchema.parse(item)

    // Normalize status to lowercase
    if (validated.status) {
      validated.status = validated.status.toLowerCase() as z.infer<
        typeof RepertoireItemSchema
      >['status']
    }

    // Handle field name transformations if needed
    // (scoreId ↔ score_id is handled in the sync handlers)

    return validated
  } catch (error) {
    console.error('Repertoire item validation failed:', error)
    return null
  }
}

// Helper function to validate sync events
export function validateSyncEvent(
  event: unknown
): z.infer<typeof SyncEventSchema> | null {
  try {
    return SyncEventSchema.parse(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Sync event validation failed:', error.issues)
    } else {
      console.error('Sync event validation failed:', error)
    }
    return null
  }
}
