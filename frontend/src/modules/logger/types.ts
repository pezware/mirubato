/**
 * Types for the Practice Logger Module
 * Re-exports from shared types to ensure consistency
 */

import type {
  LogbookEntry,
  Goal,
  PieceReference,
  GoalMilestone,
  User,
  UserPreferences,
  UserStats,
  PracticeSession,
  PracticeLog,
} from '@mirubato/shared'

import {
  Instrument,
  LogbookEntryType,
  Mood,
  GoalStatus,
  SessionType,
  ActivityType,
  Theme,
  NotationSize,
  Validators,
  DataConverters,
} from '@mirubato/shared'

// Re-export everything
export type {
  LogbookEntry,
  Goal,
  PieceReference,
  GoalMilestone,
  User,
  UserPreferences,
  UserStats,
  PracticeSession,
  PracticeLog,
}

export {
  Instrument,
  LogbookEntryType,
  Mood,
  GoalStatus,
  SessionType,
  ActivityType,
  Theme,
  NotationSize,
  Validators,
  DataConverters,
}

export interface LogFilters {
  userId?: string
  startDate?: string // ISO date string for consistency with shared types
  endDate?: string // ISO date string for consistency with shared types
  type?: LogbookEntryType[]
  instrument?: Instrument[] // Filter by instrument(s)
  tags?: string[]
  mood?: Mood[]
  pieceIds?: string[]
  goalIds?: string[]
  limit?: number
  offset?: number
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json'
  filters: LogFilters
  includeGoals?: boolean
  includeSummary?: boolean
  groupBy?: 'date' | 'piece' | 'type'
}

export interface ExportResult {
  success: boolean
  filename?: string
  data?: Blob | string
  error?: string
}

export interface PracticeReport {
  userId: string
  startDate: string // ISO date string for consistency
  endDate: string // ISO date string for consistency
  totalDuration: number
  totalEntries: number
  averageDuration: number
  entriesByType: Record<LogbookEntryType, number>
  entriesByInstrument: Record<Instrument, number> // Track by instrument
  durationByInstrument: Record<Instrument, number> // Time per instrument
  topPieces: Array<{ piece: PieceReference; duration: number; count: number }>
  goalProgress: Array<{ goal: Goal; progress: number }>
  moodDistribution: Record<Mood, number>
  practiceStreak: number
  longestSession: LogbookEntry | null
}

export interface LoggerConfig {
  autoSaveInterval?: number
  maxEntriesPerPage?: number
  enableAutoTagging?: boolean
  defaultMood?: Mood
}

export interface LoggerEvents {
  'logger:entry:created': { entry: LogbookEntry }
  'logger:entry:updated': {
    entry: LogbookEntry
    changes: Partial<LogbookEntry>
  }
  'logger:entry:deleted': { entryId: string }
  'logger:goal:created': { goal: Goal }
  'logger:goal:updated': { goal: Goal; changes: Partial<Goal> }
  'logger:goal:completed': { goal: Goal }
  'logger:export:ready': { result: ExportResult }
  'logger:report:generated': { report: PracticeReport }
}

export interface PracticeSessionData {
  id: string
  userId: string
  duration: number
  instrument?: Instrument
  accuracy?: number
  pieces?: PieceReference[]
}

// All types now use shared definitions with ISO string timestamps
// This ensures consistency across frontend, backend, and database
