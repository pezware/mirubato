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

export enum ScaleType {
  MAJOR = 'major',
  NATURAL_MINOR = 'natural_minor',
  HARMONIC_MINOR = 'harmonic_minor',
  MELODIC_MINOR = 'melodic_minor',
  PENTATONIC_MAJOR = 'pentatonic_major',
  PENTATONIC_MINOR = 'pentatonic_minor',
  BLUES = 'blues',
  CHROMATIC = 'chromatic',
  WHOLE_TONE = 'whole_tone',
  DIMINISHED = 'diminished',
  AUGMENTED = 'augmented',
}

export enum Interval {
  UNISON = 'P1',
  MINOR_SECOND = 'm2',
  MAJOR_SECOND = 'M2',
  MINOR_THIRD = 'm3',
  MAJOR_THIRD = 'M3',
  PERFECT_FOURTH = 'P4',
  TRITONE = 'TT',
  PERFECT_FIFTH = 'P5',
  MINOR_SIXTH = 'm6',
  MAJOR_SIXTH = 'M6',
  MINOR_SEVENTH = 'm7',
  MAJOR_SEVENTH = 'M7',
  OCTAVE = 'P8',
}

export enum ChordType {
  MAJOR = 'major',
  MINOR = 'minor',
  DIMINISHED = 'diminished',
  AUGMENTED = 'augmented',
  MAJOR_SEVENTH = 'maj7',
  MINOR_SEVENTH = 'min7',
  DOMINANT_SEVENTH = 'dom7',
  HALF_DIMINISHED = 'halfDim7',
  FULLY_DIMINISHED = 'dim7',
}

export enum Articulation {
  STACCATO = 'staccato',
  LEGATO = 'legato',
  ACCENT = 'accent',
  TENUTO = 'tenuto',
  MARCATO = 'marcato',
  SFORZANDO = 'sforzando',
}

export enum DynamicMarking {
  PPP = 'ppp',
  PP = 'pp',
  P = 'p',
  MP = 'mp',
  MF = 'mf',
  F = 'f',
  FF = 'ff',
  FFF = 'fff',
  CRESCENDO = 'crescendo',
  DIMINUENDO = 'diminuendo',
  SFORZANDO = 'sfz',
}

// ============== Core Types ==============

export interface NoteRange {
  lowest: string // e.g., 'C2'
  highest: string // e.g., 'C7'
}

/**
 * Represents a musical note with all its properties
 */
export interface Note {
  /** Note keys in VexFlow format (e.g., ['c/4'] for middle C) */
  keys: string[]
  /** Note duration value */
  duration: NoteDuration
  /** Start time in beats within the measure */
  time: number
  /** Accidental modifier (e.g., '#', 'b', 'n') */
  accidental?: string
  /** Number of dots extending the duration */
  dots?: number
  /** Stem direction */
  stem?: 'up' | 'down' | 'auto'
  /** Whether the note is part of a beam group */
  beam?: boolean
  /** Articulation marking for the note */
  articulation?: Articulation
  /** Dynamic marking for the note */
  dynamic?: DynamicMarking
  /** Fingering information (instrument-specific) */
  fingering?: string
  /** Whether this is a rest */
  rest?: boolean
  /** Tie to next note */
  tie?: 'start' | 'stop' | 'continue'
}

/**
 * Represents a single measure (bar) of music
 */
export interface Measure {
  /** Measure number starting from 1 */
  number: number
  /** Notes contained in this measure */
  notes: Note[]
  /** Time signature (if changed in this measure) */
  timeSignature?: TimeSignature
  /** Key signature (if changed in this measure) */
  keySignature?: KeySignature
  /** Clef (if changed in this measure) */
  clef?: Clef
  /** Tempo marking in BPM */
  tempo?: number
  /** Dynamic marking for the measure */
  dynamics?: DynamicMarking
  /** Rehearsal mark or section label */
  rehearsalMark?: string
  /** Bar line type at the end of measure */
  barLine?: 'single' | 'double' | 'end' | 'repeat-start' | 'repeat-end'
  /** Repeat count if this is a repeat ending */
  repeatCount?: number
}

// ============== Exercise Generation Types ==============

/**
 * Parameters for generating musical exercises
 */
export interface ExerciseParameters {
  /** Key signature for the exercise */
  keySignature: KeySignature
  /** Time signature for the exercise */
  timeSignature: TimeSignature
  /** Clef for the exercise */
  clef: Clef
  /** Note range constraints */
  range: NoteRange
  /** Difficulty level from 1-10 */
  difficulty: number
  /** Number of measures to generate */
  measures: number
  /** Tempo in BPM */
  tempo: number
  /** Technical elements to include */
  technicalElements?: TechnicalElement[]
  /** Rhythmic patterns to use */
  rhythmicPatterns?: RhythmicPattern[]
  /** Dynamic markings to include */
  dynamicRange?: DynamicMarking[]
  /** Scale types to use for melodic generation */
  scaleTypes?: ScaleType[]
  /** Interval patterns to practice */
  intervalPatterns?: Interval[]
  /** Whether to include fingerings */
  includeFingerings?: boolean
  /** Instrument-specific parameters */
  instrumentParams?: InstrumentParameters
}

/**
 * Instrument-specific exercise parameters
 */
export interface InstrumentParameters {
  /** Instrument type */
  instrument: 'piano' | 'guitar' | 'violin' | 'flute' | 'trumpet'
  /** Piano-specific parameters */
  piano?: {
    /** Hand to use (left, right, both) */
    hand: 'left' | 'right' | 'both'
    /** Finger patterns to practice */
    fingerPatterns?: string[]
    /** Whether to include pedal markings */
    includePedal?: boolean
  }
  /** Guitar-specific parameters */
  guitar?: {
    /** Position on the fretboard */
    position?: number
    /** String set to use */
    strings?: number[]
    /** Whether to include tablature */
    includeTab?: boolean
  }
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

// ============== Specific Exercise Types ==============

/**
 * Parameters specific to scale exercises
 */
export interface ScaleExerciseParameters extends ExerciseParameters {
  /** Scale type to practice */
  scaleType: ScaleType
  /** Pattern for scale (ascending, descending, both) */
  pattern: 'ascending' | 'descending' | 'both' | 'contrary'
  /** Number of octaves */
  octaves: 1 | 2 | 3 | 4
  /** Note grouping for rhythmic patterns */
  grouping?: 3 | 4 | 6 | 8
  /** Starting note */
  startingNote: string
}

/**
 * Parameters specific to arpeggio exercises
 */
export interface ArpeggioExerciseParameters extends ExerciseParameters {
  /** Chord type for arpeggio */
  chordType: ChordType
  /** Inversion (root, first, second, third) */
  inversion: 'root' | 'first' | 'second' | 'third'
  /** Pattern (broken, block, alberti bass) */
  pattern: 'broken' | 'block' | 'alberti' | 'mixed'
  /** Direction */
  direction: 'ascending' | 'descending' | 'both'
}

/**
 * Parameters for interval exercises
 */
export interface IntervalExerciseParameters extends ExerciseParameters {
  /** Intervals to practice */
  intervals: Interval[]
  /** Melodic or harmonic intervals */
  type: 'melodic' | 'harmonic' | 'both'
  /** Direction of intervals */
  direction: 'ascending' | 'descending' | 'mixed'
}

/**
 * Parameters for rhythm exercises
 */
export interface RhythmExerciseParameters extends ExerciseParameters {
  /** Rhythmic patterns to include */
  patterns: RhythmicPattern[]
  /** Include rests */
  includeRests: boolean
  /** Complexity level (1-5) */
  complexity: 1 | 2 | 3 | 4 | 5
  /** Include ties and dots */
  includeTiesAndDots: boolean
}

/**
 * Parameters for sight-reading exercises
 */
export interface SightReadingExerciseParameters extends ExerciseParameters {
  /** Include accidentals */
  includeAccidentals: boolean
  /** Melodic motion type */
  melodicMotion: 'stepwise' | 'leaps' | 'mixed'
  /** Include dynamics */
  includeDynamics: boolean
  /** Include articulations */
  includeArticulations: boolean
  /** Phrase length in measures */
  phraseLength: 2 | 4 | 8 | 16
}

// ============== Helper Types ==============

export type PartialExerciseParameters = Partial<ExerciseParameters>
export type PartialSearchCriteria = Partial<MusicSearchCriteria>

/**
 * Type guard to check if parameters are for scale exercises
 */
export function isScaleExerciseParameters(
  params: ExerciseParameters
): params is ScaleExerciseParameters {
  return 'scaleType' in params && 'pattern' in params
}

/**
 * Type guard to check if parameters are for arpeggio exercises
 */
export function isArpeggioExerciseParameters(
  params: ExerciseParameters
): params is ArpeggioExerciseParameters {
  return 'chordType' in params && 'inversion' in params
}

// ============== Validation Functions ==============

/**
 * Validates note range
 */
export function isValidNoteRange(range: NoteRange): boolean {
  const noteRegex = /^[A-G][#b]?[0-9]$/
  return noteRegex.test(range.lowest) && noteRegex.test(range.highest)
}

/**
 * Validates exercise parameters
 */
export function validateExerciseParameters(
  params: ExerciseParameters
): string[] {
  const errors: string[] = []

  if (!isValidNoteRange(params.range)) {
    errors.push('Invalid note range format')
  }

  if (params.difficulty < 1 || params.difficulty > 10) {
    errors.push('Difficulty must be between 1 and 10')
  }

  if (params.measures < 1 || params.measures > 100) {
    errors.push('Measures must be between 1 and 100')
  }

  if (params.tempo < 20 || params.tempo > 300) {
    errors.push('Tempo must be between 20 and 300 BPM')
  }

  return errors
}

// ============== Constants ==============

/**
 * Common chord progressions for exercise generation
 */
export const COMMON_PROGRESSIONS = {
  'I-IV-V-I': ['I', 'IV', 'V', 'I'],
  'I-V-vi-IV': ['I', 'V', 'vi', 'IV'],
  'I-vi-IV-V': ['I', 'vi', 'IV', 'V'],
  'ii-V-I': ['ii', 'V', 'I'],
  'I-vi-ii-V': ['I', 'vi', 'ii', 'V'],
  Blues: ['I', 'I', 'I', 'I', 'IV', 'IV', 'I', 'I', 'V', 'IV', 'I', 'V'],
}

/**
 * Common time signatures grouped by meter
 */
export const TIME_SIGNATURE_GROUPS = {
  simple: [
    TimeSignature.TWO_FOUR,
    TimeSignature.THREE_FOUR,
    TimeSignature.FOUR_FOUR,
  ],
  compound: [
    TimeSignature.SIX_EIGHT,
    TimeSignature.NINE_EIGHT,
    TimeSignature.TWELVE_EIGHT,
  ],
  complex: [TimeSignature.FIVE_FOUR, TimeSignature.SEVEN_EIGHT],
}

/**
 * Note duration values in quarter note units
 */
export const NOTE_VALUES = {
  [NoteDuration.WHOLE]: 4,
  [NoteDuration.HALF]: 2,
  [NoteDuration.QUARTER]: 1,
  [NoteDuration.EIGHTH]: 0.5,
  [NoteDuration.SIXTEENTH]: 0.25,
  [NoteDuration.THIRTY_SECOND]: 0.125,
}

/**
 * Difficulty presets for common skill levels
 */
export const DIFFICULTY_PRESETS = {
  beginner: {
    noteRange: { lowest: 'C4', highest: 'C5' },
    rhythmPatterns: [
      NoteDuration.WHOLE,
      NoteDuration.HALF,
      NoteDuration.QUARTER,
    ],
    timeSignatures: [TimeSignature.FOUR_FOUR],
    tempo: 60,
  },
  intermediate: {
    noteRange: { lowest: 'G3', highest: 'G5' },
    rhythmPatterns: [
      NoteDuration.HALF,
      NoteDuration.QUARTER,
      NoteDuration.EIGHTH,
    ],
    timeSignatures: [TimeSignature.FOUR_FOUR, TimeSignature.THREE_FOUR],
    tempo: 90,
  },
  advanced: {
    noteRange: { lowest: 'C3', highest: 'C6' },
    rhythmPatterns: [
      NoteDuration.QUARTER,
      NoteDuration.EIGHTH,
      NoteDuration.SIXTEENTH,
    ],
    timeSignatures: [
      TimeSignature.FOUR_FOUR,
      TimeSignature.THREE_FOUR,
      TimeSignature.SIX_EIGHT,
    ],
    tempo: 120,
  },
}

// ============== Music Theory Helpers ==============

/**
 * Maps scale degrees to semitone intervals from root
 */
export const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  [ScaleType.MAJOR]: [0, 2, 4, 5, 7, 9, 11],
  [ScaleType.NATURAL_MINOR]: [0, 2, 3, 5, 7, 8, 10],
  [ScaleType.HARMONIC_MINOR]: [0, 2, 3, 5, 7, 8, 11],
  [ScaleType.MELODIC_MINOR]: [0, 2, 3, 5, 7, 9, 11],
  [ScaleType.PENTATONIC_MAJOR]: [0, 2, 4, 7, 9],
  [ScaleType.PENTATONIC_MINOR]: [0, 3, 5, 7, 10],
  [ScaleType.BLUES]: [0, 3, 5, 6, 7, 10],
  [ScaleType.CHROMATIC]: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  [ScaleType.WHOLE_TONE]: [0, 2, 4, 6, 8, 10],
  [ScaleType.DIMINISHED]: [0, 2, 3, 5, 6, 8, 9, 11],
  [ScaleType.AUGMENTED]: [0, 3, 4, 7, 8, 11],
}

/**
 * Maps chord types to their interval structure
 */
export const CHORD_INTERVALS: Record<ChordType, number[]> = {
  [ChordType.MAJOR]: [0, 4, 7],
  [ChordType.MINOR]: [0, 3, 7],
  [ChordType.DIMINISHED]: [0, 3, 6],
  [ChordType.AUGMENTED]: [0, 4, 8],
  [ChordType.MAJOR_SEVENTH]: [0, 4, 7, 11],
  [ChordType.MINOR_SEVENTH]: [0, 3, 7, 10],
  [ChordType.DOMINANT_SEVENTH]: [0, 4, 7, 10],
  [ChordType.HALF_DIMINISHED]: [0, 3, 6, 10],
  [ChordType.FULLY_DIMINISHED]: [0, 3, 6, 9],
}

/**
 * Converts a note name to MIDI note number
 */
export function noteToMidi(note: string): number {
  const noteRegex = /^([A-G])([#b]?)([0-9])$/
  const match = note.match(noteRegex)
  if (!match) throw new Error(`Invalid note format: ${note}`)

  const [, noteName, accidental, octave] = match
  const noteMap: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  }

  let midi = noteMap[noteName] + parseInt(octave) * 12 + 12
  if (accidental === '#') midi += 1
  if (accidental === 'b') midi -= 1

  return midi
}

/**
 * Converts MIDI note number to note name
 */
export function midiToNote(midi: number): string {
  const noteNames = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ]
  const octave = Math.floor((midi - 12) / 12)
  const noteIndex = (midi - 12) % 12
  return `${noteNames[noteIndex]}${octave}`
}

/**
 * Transposes a note by a given interval (in semitones)
 */
export function transposeNote(note: string, semitones: number): string {
  const midi = noteToMidi(note)
  return midiToNote(midi + semitones)
}

/**
 * Gets all notes in a scale starting from a given root
 */
export function getScaleNotes(root: string, scaleType: ScaleType): string[] {
  // If root doesn't have an octave, we just return note names without octaves
  const hasOctave = /[0-9]$/.test(root)

  if (!hasOctave) {
    const intervals = SCALE_INTERVALS[scaleType]
    const noteNames = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ]
    const rootIndex = noteNames.findIndex(
      n => n === root || n === root.replace('b', '#')
    )

    if (rootIndex === -1) {
      // Handle flats
      const flatMap: Record<string, string> = {
        Db: 'C#',
        Eb: 'D#',
        Gb: 'F#',
        Ab: 'G#',
        Bb: 'A#',
      }
      const sharpRoot = flatMap[root] || root
      const newRootIndex = noteNames.indexOf(sharpRoot)
      if (newRootIndex === -1) throw new Error(`Invalid root note: ${root}`)

      return intervals.map(interval => {
        const noteIndex = (newRootIndex + interval) % 12
        return noteNames[noteIndex]
      })
    }

    return intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12
      return noteNames[noteIndex]
    })
  }

  // Original behavior for notes with octaves
  const rootMidi = noteToMidi(root)
  const intervals = SCALE_INTERVALS[scaleType]
  return intervals.map(interval => midiToNote(rootMidi + interval))
}

/**
 * Gets all notes in a chord starting from a given root
 */
export function getChordNotes(
  root: string,
  chordType: string | ChordType
): string[] {
  // Map string chord types to ChordType enum
  const chordTypeMap: Record<string, ChordType> = {
    major: ChordType.MAJOR,
    minor: ChordType.MINOR,
    diminished: ChordType.DIMINISHED,
    augmented: ChordType.AUGMENTED,
    dominant7: ChordType.DOMINANT_SEVENTH,
    maj7: ChordType.MAJOR_SEVENTH,
    min7: ChordType.MINOR_SEVENTH,
    halfDim7: ChordType.HALF_DIMINISHED,
    dim7: ChordType.FULLY_DIMINISHED,
  }

  const mappedChordType =
    typeof chordType === 'string'
      ? chordTypeMap[chordType] || ChordType.MAJOR
      : chordType

  const intervals = CHORD_INTERVALS[mappedChordType]

  // If root doesn't have an octave, return note names without octaves
  const hasOctave = /[0-9]$/.test(root)

  if (!hasOctave) {
    const noteNames = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ]
    const rootIndex = noteNames.findIndex(
      n => n === root || n === root.replace('b', '#')
    )

    if (rootIndex === -1) {
      // Handle flats
      const flatMap: Record<string, string> = {
        Db: 'C#',
        Eb: 'D#',
        Gb: 'F#',
        Ab: 'G#',
        Bb: 'A#',
      }
      const sharpRoot = flatMap[root] || root
      const newRootIndex = noteNames.indexOf(sharpRoot)
      if (newRootIndex === -1) throw new Error(`Invalid root note: ${root}`)

      return intervals.map(interval => {
        const noteIndex = (newRootIndex + interval) % 12
        return noteNames[noteIndex]
      })
    }

    return intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12
      return noteNames[noteIndex]
    })
  }

  // Original behavior for notes with octaves
  const rootMidi = noteToMidi(root)
  return intervals.map(interval => midiToNote(rootMidi + interval))
}

/**
 * Gets the key signature sharps/flats for a given key
 */
export function getKeySignatureAlterations(key: KeySignature): {
  sharps: string[]
  flats: string[]
} {
  const keySignatures: Record<
    KeySignature,
    { sharps: string[]; flats: string[] }
  > = {
    [KeySignature.C_MAJOR]: { sharps: [], flats: [] },
    [KeySignature.G_MAJOR]: { sharps: ['F#'], flats: [] },
    [KeySignature.D_MAJOR]: { sharps: ['F#', 'C#'], flats: [] },
    [KeySignature.A_MAJOR]: { sharps: ['F#', 'C#', 'G#'], flats: [] },
    [KeySignature.E_MAJOR]: { sharps: ['F#', 'C#', 'G#', 'D#'], flats: [] },
    [KeySignature.B_MAJOR]: {
      sharps: ['F#', 'C#', 'G#', 'D#', 'A#'],
      flats: [],
    },
    [KeySignature.F_SHARP_MAJOR]: {
      sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
      flats: [],
    },
    [KeySignature.C_SHARP_MAJOR]: {
      sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
      flats: [],
    },
    [KeySignature.F_MAJOR]: { sharps: [], flats: ['Bb'] },
    [KeySignature.B_FLAT_MAJOR]: { sharps: [], flats: ['Bb', 'Eb'] },
    [KeySignature.E_FLAT_MAJOR]: { sharps: [], flats: ['Bb', 'Eb', 'Ab'] },
    [KeySignature.A_FLAT_MAJOR]: {
      sharps: [],
      flats: ['Bb', 'Eb', 'Ab', 'Db'],
    },
    [KeySignature.D_FLAT_MAJOR]: {
      sharps: [],
      flats: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
    },
    [KeySignature.G_FLAT_MAJOR]: {
      sharps: [],
      flats: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
    },
    [KeySignature.C_FLAT_MAJOR]: {
      sharps: [],
      flats: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'],
    },
    // Minor keys (relative to major)
    [KeySignature.A_MINOR]: { sharps: [], flats: [] },
    [KeySignature.E_MINOR]: { sharps: ['F#'], flats: [] },
    [KeySignature.B_MINOR]: { sharps: ['F#', 'C#'], flats: [] },
    [KeySignature.F_SHARP_MINOR]: { sharps: ['F#', 'C#', 'G#'], flats: [] },
    [KeySignature.C_SHARP_MINOR]: {
      sharps: ['F#', 'C#', 'G#', 'D#'],
      flats: [],
    },
    [KeySignature.G_SHARP_MINOR]: {
      sharps: ['F#', 'C#', 'G#', 'D#', 'A#'],
      flats: [],
    },
    [KeySignature.D_SHARP_MINOR]: {
      sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
      flats: [],
    },
    [KeySignature.A_SHARP_MINOR]: {
      sharps: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'],
      flats: [],
    },
    [KeySignature.D_MINOR]: { sharps: [], flats: ['Bb'] },
    [KeySignature.G_MINOR]: { sharps: [], flats: ['Bb', 'Eb'] },
    [KeySignature.C_MINOR]: { sharps: [], flats: ['Bb', 'Eb', 'Ab'] },
    [KeySignature.F_MINOR]: { sharps: [], flats: ['Bb', 'Eb', 'Ab', 'Db'] },
    [KeySignature.B_FLAT_MINOR]: {
      sharps: [],
      flats: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
    },
    [KeySignature.E_FLAT_MINOR]: {
      sharps: [],
      flats: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
    },
    [KeySignature.A_FLAT_MINOR]: {
      sharps: [],
      flats: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'],
    },
  }

  return keySignatures[key] || { sharps: [], flats: [] }
}
