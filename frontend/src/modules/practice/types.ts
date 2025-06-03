// Practice module types and interfaces

export interface PracticeSession {
  id: string
  userId: string
  startTime: number
  endTime?: number
  sheetMusicId: string
  sheetMusicTitle: string
  instrument: 'piano' | 'guitar'
  tempo: number
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  pausedTime?: number
  totalPausedDuration: number
  performance?: SessionPerformance
  metadata?: Record<string, any>
}

export interface SessionPerformance {
  notesPlayed: number
  correctNotes: number
  accuracy: number
  averageTiming: number // ms off from perfect timing
  mistakes: Mistake[]
  progress: number // 0-100 percentage of piece completed
}

export interface Mistake {
  timestamp: number
  noteExpected: string
  notePlayed?: string
  type: 'wrong_note' | 'missed_note' | 'extra_note' | 'timing'
  measure?: number
  beat?: number
}

export interface PracticeConfig {
  autoSaveInterval: number // ms
  maxSessionDuration: number // ms
  enableMetronome: boolean
  countInMeasures: number
  practiceMode: 'normal' | 'slow' | 'loop'
  loopStart?: number
  loopEnd?: number
}

export interface SessionTemplate {
  id: string
  name: string
  description?: string
  config: Partial<PracticeConfig>
  warmupRoutine?: string[]
  targetPieces?: string[]
  goals?: SessionGoal[]
}

export interface SessionGoal {
  type: 'accuracy' | 'tempo' | 'duration' | 'completion'
  target: number
  unit: string
}

export interface PracticeStats {
  totalSessions: number
  totalPracticeTime: number
  averageSessionLength: number
  averageAccuracy: number
  streakDays: number
  lastPracticeDate: number
  instrumentStats: Record<string, InstrumentStats>
}

export interface InstrumentStats {
  totalTime: number
  sessionCount: number
  averageAccuracy: number
  piecesPlayed: number
}
