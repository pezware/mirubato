/**
 * Backend type exports from shared types
 * This file re-exports non-GraphQL types from the shared package
 * GraphQL types should be imported from './generated/graphql'
 */

// Re-export non-GraphQL types from shared
export type {
  // LocalStorage-specific types
  LocalUser,
  LocalPracticeSession,
  LocalUserData,
  UserPreferences,
  UserStats,
  PracticeLog,
} from '../../../shared/types'

// Re-export enums and values separately
export {
  // Enums (temporarily, until fully migrated to GraphQL generated types)
  Instrument,
  SessionType,
  ActivityType,
  Theme,
  NotationSize,
  // Validators (not a type)
  Validators,
} from '../../../shared/types'

// Import generated GraphQL types
import type {
  User as GraphQLUser,
  PracticeSession as GraphQLPracticeSession,
} from './generated/graphql'

// Import shared types for compatibility
import type { Instrument } from '../../../shared/types'

// Backend-specific types that don't exist in shared
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type StylePeriod =
  | 'BAROQUE'
  | 'CLASSICAL'
  | 'ROMANTIC'
  | 'MODERN'
  | 'CONTEMPORARY'

// Sheet music types (not in shared yet)
export interface Note {
  keys: string[]
  duration: string
  time: number
}

export interface Tempo {
  bpm: number
  marking?: string
  originalMarking?: string
  practiceTempos?: {
    slow: number
    medium: number
    target: number
    performance: number
  }
}

export interface Measure {
  number: number
  notes: Note[]
  timeSignature?: string
  keySignature?: string
  clef?: string
  tempo?: Tempo
}

export interface SheetMusicMetadata {
  source?: string
  license?: string
  arrangedBy?: string
  year?: number
}

export interface SheetMusic {
  id: string
  title: string
  composer: string
  opus?: string
  movement?: string
  instrument: Instrument
  difficulty: Difficulty
  difficultyLevel: number
  gradeLevel?: string
  durationSeconds: number
  timeSignature: string
  keySignature: string
  tempoMarking?: string
  suggestedTempo: number
  stylePeriod: StylePeriod
  tags: string[]
  measures: Measure[]
  metadata?: SheetMusicMetadata
  thumbnail?: string
}

// Type compatibility helpers
// These map between our database/service types and GraphQL types

// User type that matches GraphQL schema expectations
export interface BackendUser extends Omit<GraphQLUser, '__typename'> {
  // GraphQL User already has all the fields we need
}

// Practice session compatibility
export interface BackendPracticeSession
  extends Omit<
    GraphQLPracticeSession,
    '__typename' | 'user' | 'sheetMusic' | 'logs'
  > {
  // For database queries, we use IDs instead of full objects
  userId: string
  sheetMusicId?: string | null
}
