import { z } from 'zod'
import {
  Instrument,
  Difficulty,
  StylePeriod,
  ScoreFormat,
  ScoreSource,
  Score,
  ScoreVersion,
  Collection,
} from './score'

// Validation schemas
export const InstrumentSchema = z.enum(['PIANO', 'GUITAR', 'BOTH'])
export const DifficultySchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
export const StylePeriodSchema = z.enum([
  'BAROQUE',
  'CLASSICAL',
  'ROMANTIC',
  'MODERN',
  'CONTEMPORARY',
])
export const ScoreFormatSchema = z.enum([
  'pdf',
  'musicxml',
  'vexflow',
  'image',
  'abc',
])
export const ScoreSourceSchema = z.enum([
  'imslp',
  'upload',
  'generated',
  'manual',
])

// API Request schemas
export const CreateScoreSchema = z.object({
  title: z.string().min(1).max(255),
  composer: z.string().min(1).max(255),
  opus: z.string().optional(),
  movement: z.string().optional(),
  instrument: InstrumentSchema,
  difficulty: DifficultySchema,
  difficultyLevel: z.number().int().min(1).max(10).optional(),
  gradeLevel: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  timeSignature: z.string().optional(),
  keySignature: z.string().optional(),
  tempoMarking: z.string().optional(),
  suggestedTempo: z.number().int().positive().optional(),
  stylePeriod: StylePeriodSchema.optional(),
  source: ScoreSourceSchema,
  imslpUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
})

export const UpdateScoreSchema = CreateScoreSchema.partial()

export const ScoreSearchSchema = z.object({
  query: z.string().optional(),
  instrument: InstrumentSchema.optional(),
  difficulty: DifficultySchema.optional(),
  minDifficultyLevel: z.number().int().min(1).max(10).optional(),
  maxDifficultyLevel: z.number().int().min(1).max(10).optional(),
  stylePeriod: StylePeriodSchema.optional(),
  composer: z.string().optional(),
  tags: z.array(z.string()).optional(),
  maxDuration: z.number().int().positive().optional(),
  gradeLevel: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z
    .enum(['title', 'composer', 'difficulty', 'createdAt', 'popularity'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export const RenderOptionsSchema = z.object({
  format: z.enum(['svg', 'png', 'pdf']).default('svg'),
  scale: z.number().min(0.1).max(5).default(1),
  pageNumber: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  theme: z.enum(['light', 'dark']).default('light'),
  showFingerings: z.boolean().default(false),
  showNoteNames: z.boolean().default(false),
})

export const ImportFromIMSLPSchema = z.object({
  url: z
    .string()
    .url()
    .refine(url => url.includes('imslp.org'), {
      message: 'URL must be from imslp.org',
    }),
  autoProcess: z.boolean().default(true),
})

export const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  instrument: InstrumentSchema.optional(),
  difficulty: DifficultySchema.optional(),
  scoreIds: z.array(z.string()),
  displayOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
})

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface UploadResponse {
  scoreId: string
  versionId: string
  r2Key: string
  processingStatus: 'pending' | 'processing' | 'completed'
}

export interface ImportResponse {
  scoreId: string
  status: 'imported' | 'processing' | 'failed'
  message?: string
}

// Type exports for API endpoints
export type CreateScoreInput = z.infer<typeof CreateScoreSchema>
export type UpdateScoreInput = z.infer<typeof UpdateScoreSchema>
export type ScoreSearchInput = z.infer<typeof ScoreSearchSchema>
export type RenderOptionsInput = z.infer<typeof RenderOptionsSchema>
export type ImportFromIMSLPInput = z.infer<typeof ImportFromIMSLPSchema>
export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>

// Error types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}
