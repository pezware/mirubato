// Performance tracking module types and interfaces

export interface NoteEventData {
  userId?: string
  expectedNote?: string
  expected?: string
  expectedDuration?: number
  expectedVelocity?: number
  expectedFinger?: number
  expectedPosition?: string
  playedNote?: string
  played?: string
  playedDuration?: number
  playedVelocity?: number
  playedFinger?: number
  playedPosition?: string
  measure?: number
  beat?: number
  voiceIndex?: number
  expectedTime?: number
  actualTime?: number
  timestamp?: number
  tempo?: number
  timeSignature?: string
  isCorrect?: boolean
  correct?: boolean // alias for isCorrect
  key?: string
  intervalDifficulty?: number
  rhythmComplexity?: number
  technicalDemand?: number
  type?: 'correct' | 'wrong_note' | 'missed_note' | 'extra_note'
  handPosition?: string
  guitarPosition?: string
  timingDelta?: number
  rhythmScore?: number
}

export interface PerformanceData {
  id: string
  sessionId: string
  userId: string
  timestamp: number
  noteEvent: NoteEvent
  timing: TimingData
  accuracy: AccuracyData
  difficulty: DifficultyContext
}

export interface NoteEvent {
  expected: NoteInfo
  played?: NoteInfo
  type: 'correct' | 'wrong_note' | 'missed_note' | 'extra_note'
  measure: number
  beat: number
  voiceIndex?: number
}

export interface NoteInfo {
  pitch: string // e.g., "C4", "F#5"
  duration: number // in milliseconds
  velocity?: number // 0-127 MIDI velocity
  finger?: number // 1-5 for piano, or p,i,m,a for guitar
  position?: string // Guitar position (fret, string)
}

export interface TimingData {
  expectedTime: number
  actualTime: number
  delta: number // ms early (-) or late (+)
  tempo: number
  timeSignature: string
}

export interface AccuracyData {
  isCorrect: boolean
  pitchAccuracy: number // 0-1
  timingAccuracy: number // 0-1
  rhythmAccuracy: number // 0-1
  overallScore: number // 0-1
}

export interface DifficultyContext {
  key: string
  timeSignature: string
  tempo: number
  complexity: number // 1-10 scale
  handPosition?: string // Piano
  guitarPosition?: number // Guitar fret position
}

export interface PerformanceMetrics {
  totalNotes: number
  correctNotes: number
  wrongNotes: number
  missedNotes: number
  extraNotes: number
  accuracy: number // percentage
  averageTimingDelta: number
  timingVariability: number
  rhythmStability: number
}

export interface PerformanceAnalysis {
  sessionId: string
  userId: string
  startTime: number
  endTime: number
  overallMetrics: PerformanceMetrics
  progressOverTime: ProgressPoint[]
  problemAreas: ProblemArea[]
  improvements: Improvement[]
  recommendations: Recommendation[]
}

export interface ProgressPoint {
  timestamp: number
  accuracy: number
  tempo: number
  confidence: number
  measure: number
}

export interface ProblemArea {
  type: 'pitch' | 'timing' | 'rhythm' | 'fingering' | 'coordination'
  description: string
  severity: 'low' | 'medium' | 'high'
  frequency: number
  measures: number[]
  suggestions: string[]
}

export interface Improvement {
  area: string
  beforeValue: number
  afterValue: number
  improvementPercent: number
  description: string
}

export interface Recommendation {
  type: 'practice' | 'technique' | 'tempo' | 'focus'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  practiceExercises?: string[]
  estimatedTime?: number // minutes
}

export interface PerformanceConfig {
  timingToleranceMs: number
  pitchToleranceHz: number
  enableRealTimeAnalysis: boolean
  enableMLPredictions: boolean
  difficultyAdjustment: boolean
  feedbackDelay: number // ms
}

export interface RealTimeFeedback {
  type: 'correct' | 'incorrect' | 'timing' | 'pitch' | 'rhythm'
  message: string
  visualCue?: string
  audioCue?: string
  confidence: number
  timestamp: number
}

export interface LearningPattern {
  userId: string
  instrument: string
  skillLevel: number // 1-10
  learningSpeed: number
  strengths: string[]
  weaknesses: string[]
  preferredTempo: number
  practiceHistory: PracticeHistoryPoint[]
}

export interface PracticeHistoryPoint {
  date: number
  duration: number
  pieces: string[]
  averageAccuracy: number
  focusAreas: string[]
}
