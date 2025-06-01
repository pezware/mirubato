// Shared types between frontend and backend to ensure data consistency

// Enums that match database constraints
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

// User related types
export interface User {
  id: string
  email: string
  displayName?: string | null
  primaryInstrument: Instrument
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

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

// Practice session types
export interface PracticeSession {
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
}

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

// Local storage specific types (extends base types)
export interface LocalUser extends User {
  isAnonymous: boolean
  lastSyncedAt?: string | null // ISO date string, only for authenticated users
}

export interface LocalPracticeSession extends PracticeSession {
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
  localSessionToDbSession: (local: LocalPracticeSession): PracticeSession => {
    const { isSynced, sheetMusicTitle, ...dbSession } = local
    return dbSession
  },

  // Convert database format to local storage format
  dbSessionToLocalSession: (
    db: PracticeSession,
    isSynced = true
  ): LocalPracticeSession => {
    return {
      ...db,
      isSynced,
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

// Re-export validation utilities
export { DataValidator, DataMigrator } from './validation'
