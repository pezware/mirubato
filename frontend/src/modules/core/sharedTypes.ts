/**
 * Shared base types and enums used across all modules
 * This consolidates type definitions to eliminate duplication and improve maintainability
 */

import { Instrument } from '../../../../shared/types'

// Re-export shared enums from the main shared module
export { Instrument } from '../../../../shared/types'

// Base entity interface for all stored entities
export interface EntityBase {
  id: string
  createdAt: number
  updatedAt: number
}

// User-scoped entity for entities that belong to a specific user
export interface UserScopedEntity extends EntityBase {
  userId: string
}

// Session-scoped entity for entities that belong to a practice session
export interface SessionScopedEntity extends UserScopedEntity {
  sessionId: string
}

// Standardized accuracy representation (always 0-100 scale)
export interface AccuracyMetrics {
  percentage: number // 0-100
  notesCorrect: number
  notesTotal: number
}

// Consolidated skill level enum
export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  PROFESSIONAL = 'professional',
}

// Music genre categories
export enum MusicGenre {
  CLASSICAL = 'classical',
  JAZZ = 'jazz',
  POP = 'pop',
  ROCK = 'rock',
  FOLK = 'folk',
  BLUES = 'blues',
  LATIN = 'latin',
  CONTEMPORARY = 'contemporary',
}

// Practice focus areas
export enum FocusArea {
  SIGHT_READING = 'sight-reading',
  TECHNIQUE = 'technique',
  REPERTOIRE = 'repertoire',
  THEORY = 'theory',
  IMPROVISATION = 'improvisation',
  PERFORMANCE = 'performance',
}

// Musical notation types
export interface NoteInfo {
  pitch: string // e.g., "C4", "F#5"
  duration: number // in milliseconds
  velocity?: number // 0-127 MIDI velocity
  finger?: number | string // 1-5 for piano, or p,i,m,a for guitar
  position?: string // Guitar position (fret, string)
}

// Timing information
export interface TimingData {
  expectedTime: number
  actualTime: number
  delta: number // ms early (-) or late (+)
  tempo: number
  timeSignature: string
}

// Common mistake/error types
export enum MistakeType {
  WRONG_NOTE = 'wrong_note',
  MISSED_NOTE = 'missed_note',
  EXTRA_NOTE = 'extra_note',
  TIMING = 'timing',
}

// Base mistake interface
export interface MistakeBase {
  timestamp: number
  type: MistakeType
  measure?: number
  beat?: number
}

// Session status enum
export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

// Progress tracking
export interface ProgressPoint {
  timestamp: number
  value: number // 0-100 percentage
  metric: string // what is being measured
}

// Difficulty context for adaptive learning
export interface DifficultyContext {
  level: number // 1-10
  factors: DifficultyFactor[]
  adaptive: boolean
}

export enum DifficultyFactor {
  TEMPO = 'tempo',
  KEY_SIGNATURE = 'key_signature',
  TIME_SIGNATURE = 'time_signature',
  CHORD_COMPLEXITY = 'chord_complexity',
  RHYTHM_COMPLEXITY = 'rhythm_complexity',
  HAND_COORDINATION = 'hand_coordination',
}

// Performance confidence levels
export enum ConfidenceLevel {
  VERY_LOW = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  VERY_HIGH = 5,
}

// Time range for analytics
export interface TimeRange {
  start: number // timestamp
  end: number // timestamp
}

// Generic metric data point
export interface MetricDataPoint {
  timestamp: number
  value: number
  metadata?: Record<string, unknown>
}

// Health check status for modules
export enum HealthStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  RED = 'red',
  GRAY = 'gray',
}

// Validation helper functions
export const ValidationHelpers = {
  isValidAccuracy: (accuracy: number): boolean => {
    return typeof accuracy === 'number' && accuracy >= 0 && accuracy <= 100
  },

  isValidSkillLevel: (level: unknown): level is SkillLevel => {
    return Object.values(SkillLevel).includes(level as SkillLevel)
  },

  isValidInstrument: (instrument: unknown): instrument is Instrument => {
    return Object.values(Instrument).includes(instrument as Instrument)
  },

  isValidSessionStatus: (status: unknown): status is SessionStatus => {
    return Object.values(SessionStatus).includes(status as SessionStatus)
  },

  isValidTimestamp: (timestamp: number): boolean => {
    return (
      typeof timestamp === 'number' && timestamp > 0 && timestamp <= Date.now()
    )
  },
}
