/**
 * Sheet Music Module Types
 *
 * This module handles sheet music library management, exercise generation,
 * difficulty assessment, and personalized recommendations.
 */

import { ModuleHealth } from '../core/types'

// ============== Enums ==============

export enum ExerciseType {
  SIGHT_READING = 'SIGHT_READING',
  TECHNICAL = 'TECHNICAL',
  RHYTHM = 'RHYTHM',
  HARMONY = 'HARMONY',
}

export enum KeySignature {
  C_MAJOR = 'C_MAJOR',
  G_MAJOR = 'G_MAJOR',
  D_MAJOR = 'D_MAJOR',
  A_MAJOR = 'A_MAJOR',
  E_MAJOR = 'E_MAJOR',
  B_MAJOR = 'B_MAJOR',
  F_SHARP_MAJOR = 'F_SHARP_MAJOR',
  C_SHARP_MAJOR = 'C_SHARP_MAJOR',
  F_MAJOR = 'F_MAJOR',
  B_FLAT_MAJOR = 'B_FLAT_MAJOR',
  E_FLAT_MAJOR = 'E_FLAT_MAJOR',
  A_FLAT_MAJOR = 'A_FLAT_MAJOR',
  D_FLAT_MAJOR = 'D_FLAT_MAJOR',
  G_FLAT_MAJOR = 'G_FLAT_MAJOR',
  C_FLAT_MAJOR = 'C_FLAT_MAJOR',
  // Minor keys
  A_MINOR = 'A_MINOR',
  E_MINOR = 'E_MINOR',
  B_MINOR = 'B_MINOR',
  F_SHARP_MINOR = 'F_SHARP_MINOR',
  C_SHARP_MINOR = 'C_SHARP_MINOR',
  G_SHARP_MINOR = 'G_SHARP_MINOR',
  D_SHARP_MINOR = 'D_SHARP_MINOR',
  A_SHARP_MINOR = 'A_SHARP_MINOR',
  D_MINOR = 'D_MINOR',
  G_MINOR = 'G_MINOR',
  C_MINOR = 'C_MINOR',
  F_MINOR = 'F_MINOR',
  B_FLAT_MINOR = 'B_FLAT_MINOR',
  E_FLAT_MINOR = 'E_FLAT_MINOR',
  A_FLAT_MINOR = 'A_FLAT_MINOR',
}

export enum TimeSignature {
  TWO_FOUR = '2/4',
  THREE_FOUR = '3/4',
  FOUR_FOUR = '4/4',
  THREE_EIGHT = '3/8',
  SIX_EIGHT = '6/8',
  NINE_EIGHT = '9/8',
  TWELVE_EIGHT = '12/8',
  FIVE_FOUR = '5/4',
  SEVEN_EIGHT = '7/8',
}

export enum Clef {
  TREBLE = 'treble',
  BASS = 'bass',
  ALTO = 'alto',
  TENOR = 'tenor',
  GRAND_STAFF = 'grand_staff',
}

export enum NoteDuration {
  WHOLE = 'w',
  HALF = 'h',
  QUARTER = 'q',
  EIGHTH = '8',
  SIXTEENTH = '16',
  THIRTY_SECOND = '32',
}

export enum RepertoireStatus {
  LEARNING = 'LEARNING',
  MEMORIZED = 'MEMORIZED',
  FORGOTTEN = 'FORGOTTEN',
  DROPPED = 'DROPPED',
  WISHLIST = 'WISHLIST',
}

export enum RecommendationType {
  SIMILAR = 'SIMILAR',
  NEXT_LEVEL = 'NEXT_LEVEL',
  REVIEW = 'REVIEW',
  TECHNICAL_PREP = 'TECHNICAL_PREP',
}

export enum TechnicalElement {
  SCALES = 'scales',
  ARPEGGIOS = 'arpeggios',
  THIRDS = 'thirds',
  SIXTHS = 'sixths',
  OCTAVES = 'octaves',
  CHORDS = 'chords',
  TRILLS = 'trills',
  TREMOLO = 'tremolo',
  ALBERTI_BASS = 'alberti_bass',
}

export enum RhythmicPattern {
  STRAIGHT = 'straight',
  DOTTED = 'dotted',
  SYNCOPATION = 'syncopation',
  TRIPLETS = 'triplets',
  SWING = 'swing',
  POLYRHYTHM = 'polyrhythm',
}

// ============== Core Types ==============

export interface NoteRange {
  lowest: string // e.g., 'C2'
  highest: string // e.g., 'C7'
}

export interface Note {
  keys: string[] // e.g., ['c/4']
  duration: NoteDuration
  time: number // Start time in beats
  accidental?: string
  dots?: number
  stem?: 'up' | 'down' | 'auto'
  beam?: boolean
}

export interface Measure {
  number: number
  notes: Note[]
  timeSignature?: TimeSignature
  keySignature?: KeySignature
  clef?: Clef
  tempo?: number
  dynamics?: string // e.g., 'p', 'f', 'mf'
  rehearsalMark?: string
}

// ============== Exercise Generation Types ==============

export interface ExerciseParameters {
  keySignature: KeySignature
  timeSignature: TimeSignature
  clef: Clef
  range: NoteRange
  difficulty: number // 1-10
  measures: number
  tempo: number
  technicalElements?: TechnicalElement[]
  rhythmicPatterns?: RhythmicPattern[]
  dynamicRange?: string[] // ['pp', 'ff', 'crescendo']
}

export interface ExerciseMetadata {
  title: string
  description: string
  focusAreas: string[]
  estimatedDuration: number // seconds
  prerequisites?: string[]
  tags: string[]
}

export interface GeneratedExercise {
  id: string
  userId: string
  type: ExerciseType
  parameters: ExerciseParameters
  measures: Measure[]
  metadata: ExerciseMetadata
  createdAt: Date
  expiresAt?: Date
}

// ============== Sheet Music Types ==============

export interface SheetMusic {
  id: string
  title: string
  composer: string
  opus?: string
  movement?: string
  instrument: 'PIANO' | 'GUITAR'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  difficultyLevel: number // 1-10
  gradeLevel?: string // e.g., 'RCM 5'
  durationSeconds: number
  timeSignature: string
  keySignature: string
  tempoMarking?: string
  suggestedTempo: number
  stylePeriod: 'BAROQUE' | 'CLASSICAL' | 'ROMANTIC' | 'MODERN' | 'CONTEMPORARY'
  tags: string[]
  measures: Measure[]
  metadata?: SheetMusicMetadata
  thumbnail?: string
}

export interface SheetMusicMetadata {
  source?: string
  license?: string
  arrangedBy?: string
  year?: number
  musicalForm?: string // 'sonata', 'waltz', 'etude', etc.
  technicalFocus?: TechnicalElement[]
}

// ============== User Repertoire Types ==============

export interface UserRepertoire {
  id: string
  userId: string
  sheetMusicId: string
  status: RepertoireStatus
  dateStarted?: Date
  dateMemorized?: Date
  dateLastPlayed?: Date
  totalPracticeMinutes: number
  reviewSchedule?: SpacedRepetitionData
  personalNotes?: string
  difficultyRating?: number // 1-5 subjective rating
  performanceHistory: PerformanceEntry[]
}

export interface SpacedRepetitionData {
  nextReviewDate: Date
  interval: number // days
  easeFactor: number // SM-2 algorithm
  repetitions: number
  lapses: number
}

export interface PerformanceEntry {
  date: Date
  tempo: number
  accuracy: number
  quality: number // 1-5
  notes?: string
}

// ============== Search and Filter Types ==============

export interface MusicSearchCriteria {
  query?: string // full-text search
  instrument?: 'PIANO' | 'GUITAR'
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  minDifficultyLevel?: number
  maxDifficultyLevel?: number
  stylePeriod?: string
  composer?: string
  opus?: string
  yearComposed?: { min?: number; max?: number }
  technicalElements?: TechnicalElement[]
  musicalElements?: string[] // ['fugue', 'sonata-form', 'waltz']
  gradeLevel?: string // 'RCM 5', 'ABRSM 6'
  estimatedLearningTime?: { min?: number; max?: number }
  maxDuration?: number
  tags?: string[]
}

export interface SearchResults {
  pieces: SheetMusic[]
  totalCount: number
  facets: SearchFacets
}

export interface SearchFacets {
  composers: Array<{ name: string; count: number }>
  periods: Array<{ period: string; count: number }>
  difficulties: Array<{ level: string; count: number }>
  technicalElements: Array<{ element: string; count: number }>
}

// ============== Recommendation Types ==============

export interface MusicRecommendation {
  id: string
  userId: string
  sheetMusicId: string
  type: RecommendationType
  score: number // 0-1
  reasoning: RecommendationReasoning
  createdAt: Date
  actedOn: boolean
}

export interface RecommendationReasoning {
  factors: Array<{
    factor: string
    weight: number
    explanation: string
  }>
  similarPieces?: string[]
  userProgress?: string
}

// ============== Difficulty Assessment Types ==============

export interface DifficultyAssessment {
  overallScore: number // 1-10
  technicalFactors: {
    handSpan: number
    fingerIndependence: number
    rhythmicComplexity: number
    harmonicDensity: number
    tempoRequirements: number
    dynamicRange: number
    articulationComplexity: number
  }
  estimatedLearningTime: number // hours
  prerequisites: string[] // piece IDs
  recommendedPracticeApproach: string
  technicalChallenges: string[]
  musicalChallenges: string[]
}

// ============== Module Types ==============

export interface SheetMusicModuleConfig {
  maxExercisesPerUser: number
  exerciseExpirationDays: number
  recommendationRefreshInterval: number
  enableIMSLPIntegration: boolean
  cacheExpirationMinutes: number
}

export interface SheetMusicModuleState {
  exercises: Map<string, GeneratedExercise>
  searchCache: Map<string, SearchResults>
  recommendations: Map<string, MusicRecommendation[]>
  userRepertoire: Map<string, UserRepertoire[]>
}

export interface SheetMusicModuleInterface {
  // Exercise generation
  generateExercise(params: ExerciseParameters): Promise<GeneratedExercise>
  saveExercise(exercise: GeneratedExercise): Promise<void>
  loadExercise(id: string): Promise<GeneratedExercise | null>
  listUserExercises(userId: string): Promise<GeneratedExercise[]>

  // Music search and library
  searchMusic(criteria: MusicSearchCriteria): Promise<SearchResults>
  getSheetMusic(id: string): Promise<SheetMusic | null>

  // Difficulty assessment
  assessDifficulty(
    sheetMusicId: string,
    userId: string
  ): Promise<DifficultyAssessment>

  // Recommendations
  getRecommendations(userId: string): Promise<MusicRecommendation[]>
  refreshRecommendations(userId: string): Promise<void>

  // User repertoire management
  getUserRepertoire(userId: string): Promise<UserRepertoire[]>
  updateRepertoireStatus(
    userId: string,
    sheetMusicId: string,
    status: RepertoireStatus
  ): Promise<void>
  recordPracticeSession(
    userId: string,
    sheetMusicId: string,
    entry: PerformanceEntry
  ): Promise<void>

  // Import/Export
  importMusicXML(file: File): Promise<SheetMusic>
  exportMusicXML(sheetMusicId: string): Promise<Blob>

  // Module lifecycle
  getHealth(): ModuleHealth
}

// ============== Event Types ==============

export interface ExerciseGeneratedEvent {
  exercise: GeneratedExercise
  timestamp: Date
}

export interface RepertoireStatusChangedEvent {
  userId: string
  sheetMusicId: string
  oldStatus: RepertoireStatus
  newStatus: RepertoireStatus
  timestamp: Date
}

export interface PracticeSessionRecordedEvent {
  userId: string
  sheetMusicId: string
  entry: PerformanceEntry
  timestamp: Date
}

// ============== Constants ==============

export const EXERCISE_TYPES = Object.values(ExerciseType)
export const KEY_SIGNATURES = Object.values(KeySignature)
export const TIME_SIGNATURES = Object.values(TimeSignature)
export const CLEFS = Object.values(Clef)
export const NOTE_DURATIONS = Object.values(NoteDuration)
export const REPERTOIRE_STATUSES = Object.values(RepertoireStatus)
export const RECOMMENDATION_TYPES = Object.values(RecommendationType)
export const TECHNICAL_ELEMENTS = Object.values(TechnicalElement)
export const RHYTHMIC_PATTERNS = Object.values(RhythmicPattern)

// ============== Helper Types ==============

export type PartialExerciseParameters = Partial<ExerciseParameters>
export type PartialSearchCriteria = Partial<MusicSearchCriteria>
