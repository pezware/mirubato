/**
 * Curriculum Module Types
 * Manages structured learning paths and repertoire for musicians
 */

export interface CurriculumConfig {
  instrument: 'piano' | 'guitar'
  skillLevel: SkillLevel
  weeklyPracticeTarget: number // minutes
  preferredGenres?: MusicGenre[]
  focusAreas?: FocusArea[]
  autoProgress?: boolean
}

export type SkillLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'professional'

export type MusicGenre =
  | 'classical'
  | 'jazz'
  | 'pop'
  | 'rock'
  | 'folk'
  | 'blues'
  | 'latin'
  | 'contemporary'

export type FocusArea =
  | 'sight-reading'
  | 'technique'
  | 'repertoire'
  | 'theory'
  | 'improvisation'
  | 'performance'

export interface LearningPath {
  id: string
  userId: string
  name: string
  description: string
  instrument: 'piano' | 'guitar'
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
  | 'chord-progression'
  | 'sight-reading'
  | 'ear-training'
  | 'theory'
  | 'technique'

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
  instrument: 'piano' | 'guitar'
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
  instrument?: 'piano' | 'guitar'
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
