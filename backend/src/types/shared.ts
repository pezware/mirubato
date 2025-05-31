// Shared types between frontend and backend
// These types should match the GraphQL schema

export type Instrument = 'PIANO' | 'GUITAR'
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type Theme = 'LIGHT' | 'DARK' | 'AUTO'
export type NotationSize = 'SMALL' | 'MEDIUM' | 'LARGE'
export type StylePeriod =
  | 'BAROQUE'
  | 'CLASSICAL'
  | 'ROMANTIC'
  | 'MODERN'
  | 'CONTEMPORARY'
export type SessionType = 'FREE_PRACTICE' | 'GUIDED_PRACTICE' | 'ASSESSMENT'
export type ActivityType =
  | 'SIGHT_READING'
  | 'SCALES'
  | 'REPERTOIRE'
  | 'ETUDES'
  | 'TECHNIQUE'
  | 'OTHER'

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

export interface UserPreferences {
  theme: Theme
  notationSize: NotationSize
  practiceReminders: boolean
  dailyGoalMinutes: number
  customSettings?: Record<string, unknown>
}

export interface UserStats {
  totalPracticeTime: number
  consecutiveDays: number
  piecesCompleted: number
  accuracyAverage: number
}

export interface User {
  id: string
  email: string
  displayName?: string
  primaryInstrument: Instrument
  preferences: UserPreferences
  stats: UserStats
  createdAt: string
  updatedAt: string
}

export interface PracticeSession {
  id: string
  userId: string
  instrument: Instrument
  sheetMusicId?: string
  sessionType: SessionType
  startedAt: string
  completedAt?: string
  pausedDuration: number
  accuracy?: number
  notesAttempted: number
  notesCorrect: number
}

export interface PracticeLog {
  id: string
  sessionId: string
  activityType: ActivityType
  durationSeconds: number
  tempoPracticed?: number
  targetTempo?: number
  focusAreas: string[]
  selfRating?: number
  notes?: string
  createdAt: string
}
