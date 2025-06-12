/**
 * Backend type exports from shared types
 * This file re-exports types from the shared package to ensure consistency
 */

// Re-export everything from shared types
export * from '../../../shared/types'

// Import specific types we need to extend
import type {
  User as SharedUser,
  UserPreferences as SharedUserPreferences,
  UserStats as SharedUserStats,
  PracticeSession as SharedPracticeSession,
  Instrument,
} from '../../../shared/types'

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

// Type compatibility helpers for GraphQL
// The GraphQL schema expects User to have embedded preferences and stats
// while our shared types keep them separate. We create a compatibility type.

// User type that matches GraphQL schema expectations
export interface BackendUser extends SharedUser {
  preferences: SharedUserPreferences
  stats: SharedUserStats
}

// Practice session compatibility
export interface BackendPracticeSession
  extends Omit<
    SharedPracticeSession,
    'accuracy' | 'sheetMusicId' | 'completedAt'
  > {
  accuracy?: number
  sheetMusicId?: string
  completedAt?: string
}
