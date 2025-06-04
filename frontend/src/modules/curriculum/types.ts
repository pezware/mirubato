/**
 * Curriculum Module Types
 * Manages structured learning paths and repertoire for musicians
 */

import {
  Instrument,
  SkillLevel,
  MusicGenre,
  FocusArea,
  UserScopedEntity,
} from '../core/sharedTypes'

// Re-export shared types
export { SkillLevel, FocusArea, MusicGenre } from '../core/sharedTypes'

export interface CurriculumConfig {
  instrument: Instrument
  skillLevel: SkillLevel
  weeklyPracticeTarget: number // minutes
  preferredGenres?: MusicGenre[]
  focusAreas?: FocusArea[]
  autoProgress?: boolean
}

export interface LearningPath extends UserScopedEntity {
  name: string
  description: string
  instrument: Instrument
  skillLevel: SkillLevel
  phases: Phase[]
  currentPhaseId: string
  progress: number
  createdAt: number
  updatedAt: number
  completedAt?: number
  metadata?: {
    estimatedDuration: number // days
    prerequisiteSkills?: string[]
    learningOutcomes?: string[]
  }
}

export interface Phase {
  id: string
  pathId: string
  name: string
  description: string
  order: number
  modules: CurriculumModule[]
  requirements: PhaseRequirement[]
  status: 'locked' | 'active' | 'completed'
  startedAt?: number
  completedAt?: number
}

export interface CurriculumModule {
  id: string
  phaseId: string
  name: string
  type: ModuleType
  content: ModuleContent
  order: number
  status: 'locked' | 'active' | 'in_progress' | 'completed'
  progress: number
  estimatedTime: number // minutes
  actualTime?: number
  startedAt?: number
  completedAt?: number
}

export type ModuleType =
  | 'piece'
  | 'exercise'
  | 'scale'
  | 'arpeggio'
  | 'chord-progression'
  | 'sight-reading'
  | 'ear-training'
  | 'theory'
  | 'technique'
  | 'finger-independence'
  | 'pattern'
  | 'etude'

export interface ModuleContent {
  pieceId?: string
  exerciseIds?: string[]
  instructions?: string
  resources?: Resource[]
  assessmentCriteria?: AssessmentCriteria[]
}

export interface Resource {
  id: string
  type: 'video' | 'audio' | 'pdf' | 'link' | 'sheet-music'
  title: string
  url?: string
  metadata?: Record<string, any>
}

export interface AssessmentCriteria {
  id: string
  type: 'tempo' | 'accuracy' | 'expression' | 'technique' | 'memory'
  targetValue: number
  weight: number
  description?: string
}

export interface PhaseRequirement {
  id: string
  type:
    | 'modules_completed'
    | 'practice_time'
    | 'assessment_score'
    | 'pieces_memorized'
  value: number
  current: number
  description: string
}

export interface RepertoirePiece {
  id: string
  title: string
  composer: string
  instrument: Instrument
  difficulty: number // 1-10
  genre: MusicGenre
  duration?: number // seconds
  tags: string[]
  sheetMusicId?: string
  audioUrl?: string
  metadata?: {
    opus?: string
    key?: string
    timeSignature?: string
    tempo?: number
    year?: number
    movements?: string[]
    [key: string]: any
  }
}

export interface ProgressUpdate {
  pathId: string
  phaseId?: string
  moduleId?: string
  progress: number
  timeSpent: number
  assessment?: AssessmentResult
}

export interface AssessmentResult {
  moduleId: string
  timestamp: number
  criteria: Array<{
    criteriaId: string
    score: number
    feedback?: string
  }>
  overallScore: number
  passed: boolean
  notes?: string
}

export interface CurriculumRecommendation {
  id: string
  userId: string
  type: 'path' | 'piece' | 'exercise' | 'resource'
  itemId: string
  reason: string
  score: number // 0-1 relevance score
  createdAt: number
  metadata?: Record<string, any>
}

export interface CurriculumFilters {
  instrument?: Instrument
  skillLevel?: SkillLevel
  genre?: MusicGenre[]
  focusArea?: FocusArea[]
  difficulty?: { min: number; max: number }
  duration?: { min: number; max: number }
  tags?: string[]
}

export interface CurriculumStats {
  userId: string
  totalPaths: number
  completedPaths: number
  activePaths: number
  totalModules: number
  completedModules: number
  totalPracticeTime: number
  averageModuleTime: number
  preferredGenres: Array<{ genre: MusicGenre; count: number }>
  skillProgress: Array<{ skill: FocusArea; level: number }>
  streakDays: number
  lastPracticeDate: number
}

// Enhanced Practice Feature Types

export interface PracticeSession {
  id: string
  userId: string
  pieceId: string
  config: PracticeConfig
  startTime: number
  endTime?: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  repetitions: PracticeRepetition[]
  overallProgress: PracticeProgress
  metadata?: Record<string, any>
}

export interface PracticeConfig {
  type: 'full' | 'section' | 'measures' | 'phrase' | 'pattern'
  focus: 'accuracy' | 'tempo' | 'dynamics' | 'articulation' | 'memorization'
  measures?: { start: number; end: number }
  hands?: 'both' | 'left' | 'right' | 'alternating'
  tempo?: {
    start: number
    target: number
    increment: number
    rampType: 'linear' | 'exponential' | 'stepped'
  }
  repetitions?: {
    target: number
    qualityThreshold: number
    maxAttempts: number
  }
  metronome?: {
    enabled: boolean
    subdivision: 'quarter' | 'eighth' | 'sixteenth'
    accent: 'downbeat' | 'strong' | 'all'
  }
}

export interface PracticeRepetition {
  id: string
  sessionId: string
  attempt: number
  startTime: number
  endTime: number
  tempo: number
  accuracy: number
  quality: number // 0-1 calculated quality score
  notes?: string
  audioRecordingId?: string
}

export interface PracticeProgress {
  sessionId: string
  accuracy: number
  tempoAchieved: number
  repetitionsCompleted: number
  qualityScore: number
  timeSpent: number
  status: 'improving' | 'stable' | 'struggling'
  recommendations?: string[]
}

export interface TechnicalExercise {
  id: string
  name: string
  category:
    | 'scale'
    | 'arpeggio'
    | 'chord'
    | 'pattern'
    | 'etude'
    | 'finger-independence'
    | 'technique'
  instrument: Instrument
  level: number // 1-10
  key?: string
  pattern?: string
  handPosition?: 'parallel' | 'contrary' | 'alternating'
  fingering?: number[]
  variations?: TechnicalVariation[]
  generatedContent?: MusicContent
  estimatedDuration: number // minutes
  metadata?: {
    focus: string[]
    benefits: string[]
    prerequisites: string[]
  }
}

export interface TechnicalVariation {
  id: string
  name: string
  description: string
  rhythmPattern?: string
  dynamicPattern?: string
  articulationPattern?: string
  tempoMultiplier?: number
  difficulty: number
}

export interface MusicContent {
  notation?: string // VexFlow notation data
  midiData?: ArrayBuffer
  audioUrl?: string
  sheetMusicUrl?: string
  fingering?: number[][]
  measures: number
}

export interface DifficultyAssessment {
  pieceId: string
  overall: number // 1-10 scale
  factors: {
    technical: number // finger patterns, stretches, coordination
    rhythmic: number // rhythm complexity, polyrhythms
    harmonic: number // chord progressions, key changes
    musical: number // phrasing, dynamics, expression
    cognitive: number // reading complexity, memorization
  }
  prerequisites: string[]
  estimatedLearningTime: number // hours
  recommendedPreparation: string[]
  assessedAt: number
  assessor: 'algorithm' | 'teacher' | 'community'
}

export interface PerformanceReadiness {
  pieceId: string
  userId: string
  overallReadiness: number // 0-100%
  criteria: {
    technical: { score: number; notes: string[] }
    musical: { score: number; notes: string[] }
    memorization: { score: number; notes: string[] }
    stability: { score: number; notes: string[] }
    polish: { score: number; notes: string[] }
  }
  recommendedActions: string[]
  estimatedTimeToReadiness: number // hours
  assessedAt: number
  performanceDate?: number
}

export interface MaintenanceSchedule {
  pieceId: string
  userId: string
  lastPracticed: number
  practiceFrequency: number // sessions per week
  skill: 'maintaining' | 'declining' | 'forgotten'
  priority: 'high' | 'medium' | 'low'
  recommendedFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  nextPracticeDate: number
  maintenanceType: 'full-runthrough' | 'problem-spots' | 'memory-refresh'
  estimatedTime: number // minutes needed
}

export interface PieceAnalytics {
  pieceId: string
  userId: string
  totalPracticeTime: number
  sessionsCount: number
  averageAccuracy: number
  bestAccuracy: number
  tempoProgress: {
    initial: number
    current: number
    target: number
  }
  problemAreas: Array<{
    measures: { start: number; end: number }
    difficulty: string
    practiceTime: number
    improvementRate: number
  }>
  performanceHistory: Array<{
    date: number
    type: 'practice' | 'lesson' | 'performance'
    quality: number
    notes?: string
  }>
  updatedAt: number
}

export type TechnicalType =
  | 'major-scale'
  | 'minor-scale'
  | 'chromatic-scale'
  | 'major-arpeggio'
  | 'minor-arpeggio'
  | 'dominant-seventh'
  | 'diminished-seventh'
  | 'chord-progression'
  | 'hanon-exercise'
  | 'finger-independence'
  | 'alberti-bass'
  | 'tremolo'
  | 'trill'
  | 'octave-study'

export interface ExerciseGenerationParams {
  type: TechnicalType
  key?: string
  level: number
  handPosition?: 'parallel' | 'contrary' | 'alternating'
  octaves?: number
  tempo?: { min: number; max: number }
  articulation?: 'legato' | 'staccato' | 'mixed'
  dynamics?: 'uniform' | 'crescendo' | 'varied'
}
