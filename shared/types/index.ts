/**
 * Shared types for localStorage and non-GraphQL concerns
 *
 * IMPORTANT: This file only contains types that are NOT in the GraphQL schema.
 *
 * For GraphQL types, use the generated types instead:
 * - Frontend: import from 'frontend/src/generated/graphql'
 * - Backend: import from 'backend/src/types/generated/graphql'
 *
 * This file contains:
 * - LocalStorage-specific types (LocalUser, LocalPracticeSession, LocalUserData)
 * - UI preferences not stored in backend (parts of UserPreferences)
 * - Legacy compatibility types
 *
 * The enums below are kept for backward compatibility but should be imported
 * from generated GraphQL types in new code.
 */

// Re-export generated enums for backward compatibility
// These will be imported from generated GraphQL types in frontend
export enum Instrument {
  PIANO = 'PIANO',
  GUITAR = 'GUITAR',
}

export enum SessionType {
  FREE_PRACTICE = 'FREE_PRACTICE',
  GUIDED_PRACTICE = 'GUIDED_PRACTICE',
  ASSESSMENT = 'ASSESSMENT',
}

export enum ActivityType {
  SIGHT_READING = 'SIGHT_READING',
  SCALES = 'SCALES',
  REPERTOIRE = 'REPERTOIRE',
  ETUDES = 'ETUDES',
  TECHNIQUE = 'TECHNIQUE',
  OTHER = 'OTHER',
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  AUTO = 'AUTO',
}

export enum NotationSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

// LocalStorage-specific types (not in GraphQL)
export interface UserPreferences {
  theme: Theme
  notationSize: NotationSize
  practiceReminders: boolean
  dailyGoalMinutes: number
  customSettings?: Record<string, any>
  // Legacy nested structure - for backward compatibility only
  notificationSettings?: {
    practiceReminders: boolean
    emailUpdates: boolean
  }
  practiceSettings?: {
    defaultSessionDuration: number // in minutes
    defaultTempo: number
    metronomeSoundEnabled: boolean
  }
}

export interface UserStats {
  totalPracticeTime: number // in seconds
  consecutiveDays: number
  piecesCompleted: number
  accuracyAverage: number
  // Legacy field for backward compatibility
  lastPracticeDate?: string | null // ISO date string
  averageAccuracy?: number // Deprecated, use accuracyAverage
}

// LocalStorage-specific practice log (different from GraphQL PracticeLog)
export interface PracticeLog {
  id: string
  sessionId: string
  activityType: ActivityType
  durationSeconds: number
  tempoPracticed?: number | null
  targetTempo?: number | null
  focusAreas?: string[] | null // JSON array in DB
  selfRating?: number | null // 1-10
  notes?: string | null
  createdAt: string // ISO date string
}

// Local storage specific types
// Note: These used to extend GraphQL types but now are standalone for localStorage
export interface LocalUser {
  id: string
  email: string
  displayName?: string | null
  primaryInstrument: Instrument
  hasCloudStorage: boolean
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  isAnonymous: boolean
  lastSyncedAt?: string | null // ISO date string, only for authenticated users
}

export interface LocalPracticeSession {
  id: string
  userId: string
  instrument: Instrument
  sheetMusicId?: string | null
  sessionType: SessionType
  startedAt: string // ISO date string
  completedAt?: string | null // ISO date string
  pausedDuration: number // in seconds
  accuracyPercentage?: number | null
  notesAttempted: number
  notesCorrect: number
  isSynced: boolean
  sheetMusicTitle?: string // For display when offline
}

// Local storage compound type that combines user data with preferences and stats
export interface LocalUserData extends LocalUser {
  preferences: UserPreferences
  stats: UserStats
}

// Data validation schemas using a simple validator
export const Validators = {
  isValidInstrument: (value: any): value is Instrument => {
    return Object.values(Instrument).includes(value)
  },

  isValidSessionType: (value: any): value is SessionType => {
    return Object.values(SessionType).includes(value)
  },

  isValidActivityType: (value: any): value is ActivityType => {
    return Object.values(ActivityType).includes(value)
  },

  isValidTheme: (value: any): value is Theme => {
    return Object.values(Theme).includes(value)
  },

  isValidSelfRating: (value: any): boolean => {
    return typeof value === 'number' && value >= 1 && value <= 10
  },

  isValidEmail: (email: string): boolean => {
    // Simple email validation to avoid ReDoS vulnerability
    // Check basic structure: something@something.something
    if (typeof email !== 'string' || email.length > 254) return false
    const parts = email.split('@')
    if (parts.length !== 2) return false
    const [local, domain] = parts
    if (!local || !domain) return false
    if (local.length > 64) return false
    // Check domain has at least one dot
    const domainParts = domain.split('.')
    if (domainParts.length < 2) return false
    // Check each part is non-empty
    return domainParts.every(part => part.length > 0)
  },

  isValidISODate: (date: string): boolean => {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime()) && d.toISOString() === date
  },
}

// Version control for schema migrations
export const SCHEMA_VERSION = 1

// Helper functions for data conversion
export const DataConverters = {
  // Convert local storage format to database format
  // Note: Returns an object without LocalStorage-specific fields
  localSessionToDbSession: (local: LocalPracticeSession) => {
    const { isSynced, sheetMusicTitle, ...dbSession } = local
    return dbSession
  },

  // Convert database format to local storage format
  dbSessionToLocalSession: (
    db: Omit<LocalPracticeSession, 'isSynced' | 'sheetMusicTitle'>,
    isSynced = true,
    sheetMusicTitle?: string
  ): LocalPracticeSession => {
    return {
      ...db,
      isSynced,
      ...(sheetMusicTitle && { sheetMusicTitle }),
    }
  },

  // Ensure date is in ISO format
  toISOString: (date: Date | string): string => {
    if (typeof date === 'string') {
      return new Date(date).toISOString()
    }
    return date.toISOString()
  },

  // Parse JSON fields from database
  parseJsonField: <T>(field: string | null | undefined, defaultValue: T): T => {
    if (!field) return defaultValue
    try {
      return JSON.parse(field) as T
    } catch {
      return defaultValue
    }
  },

  // Stringify JSON fields for database
  stringifyJsonField: <T>(field: T): string => {
    return JSON.stringify(field)
  },
}

// Logbook types
export enum LogbookEntryType {
  PRACTICE = 'PRACTICE',
  PERFORMANCE = 'PERFORMANCE',
  LESSON = 'LESSON',
  REHEARSAL = 'REHEARSAL',
}

export enum Mood {
  FRUSTRATED = 'FRUSTRATED',
  NEUTRAL = 'NEUTRAL',
  SATISFIED = 'SATISFIED',
  EXCITED = 'EXCITED',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export interface PieceReference {
  id?: string
  title: string
  composer?: string
  section?: string
  source?: 'library' | 'custom'
}

export interface LogbookEntry {
  id: string
  userId: string
  timestamp: string // ISO date string
  duration: number // in seconds
  type: LogbookEntryType
  instrument: Instrument // Multi-instrument support
  pieces: PieceReference[]
  techniques: string[]
  goalIds: string[]
  notes: string
  mood?: Mood
  tags: string[]
  sessionId?: string
  metadata?: {
    source: 'manual' | 'automatic'
    accuracy?: number
    notesPlayed?: number
    mistakeCount?: number
  }
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

export interface GoalMilestone {
  id: string
  title: string
  completed: boolean
  completedAt?: string | null // ISO date string
}

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  targetDate: string // ISO date string
  progress: number // 0-100
  milestones: GoalMilestone[]
  status: GoalStatus
  linkedEntryIds: string[]
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  completedAt?: string | null // ISO date string
}

// Local storage specific types for logbook
export interface LocalLogbookEntry extends LogbookEntry {
  isSynced: boolean
}

export interface LocalGoal extends Goal {
  isSynced: boolean
}

// Re-export validation utilities
export { DataValidator, DataMigrator } from './validation'
