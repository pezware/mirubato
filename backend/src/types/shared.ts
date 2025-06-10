// Re-export shared types from the shared package for consistency
// Import first, then re-export to avoid conflicts
import {
  Instrument as SharedInstrument,
  SessionType as SharedSessionType,
  ActivityType as SharedActivityType,
  LogbookEntryType as SharedLogbookEntryType,
  Mood as SharedMood,
  GoalStatus as SharedGoalStatus,
  Theme as SharedTheme,
  NotationSize as SharedNotationSize,
  User as SharedUser,
  UserPreferences as SharedUserPreferences,
  UserStats as SharedUserStats,
  PracticeSession as SharedPracticeSession,
  PracticeLog as SharedPracticeLog,
  LogbookEntry as SharedLogbookEntry,
  PieceReference as SharedPieceReference,
  Goal as SharedGoal,
  GoalMilestone as SharedGoalMilestone,
  Validators as SharedValidators,
  DataConverters as SharedDataConverters,
} from '@mirubato/shared'

// Re-export enums
export const Instrument = SharedInstrument
export const SessionType = SharedSessionType
export const ActivityType = SharedActivityType
export const LogbookEntryType = SharedLogbookEntryType
export const Mood = SharedMood
export const GoalStatus = SharedGoalStatus
export const Theme = SharedTheme
export const NotationSize = SharedNotationSize

// Re-export types
export type UserPreferences = SharedUserPreferences
export type UserStats = SharedUserStats

// Backend-specific User type that includes preferences and stats
export interface User extends SharedUser {
  preferences: UserPreferences
  stats: UserStats
}
export type PracticeSession = SharedPracticeSession
export type PracticeLog = SharedPracticeLog
export type LogbookEntry = SharedLogbookEntry
export type PieceReference = SharedPieceReference
export type Goal = SharedGoal
export type GoalMilestone = SharedGoalMilestone

// Re-export utilities
export const Validators = SharedValidators
export const DataConverters = SharedDataConverters

// Legacy types - keep for backward compatibility but mark as deprecated
/** @deprecated Use Instrument enum from @mirubato/shared instead */
export type LegacyInstrument = 'PIANO' | 'GUITAR'
/** @deprecated Use Theme enum from @mirubato/shared instead */
export type LegacyTheme = 'LIGHT' | 'DARK' | 'AUTO'
/** @deprecated Use NotationSize enum from @mirubato/shared instead */
export type LegacyNotationSize = 'SMALL' | 'MEDIUM' | 'LARGE'

// Backend-specific types that are not shared
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type StylePeriod =
  | 'BAROQUE'
  | 'CLASSICAL'
  | 'ROMANTIC'
  | 'MODERN'
  | 'CONTEMPORARY'

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
  instrument: SharedInstrument
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
