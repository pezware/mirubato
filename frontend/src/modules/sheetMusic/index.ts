/**
 * Sheet Music Module
 *
 * Provides comprehensive sheet music library management including:
 * - Algorithmic exercise generation
 * - Music search and filtering
 * - Difficulty assessment
 * - Personalized recommendations
 * - User repertoire tracking
 * - MusicXML import/export
 * - Multi-voice support for polyphonic music
 *
 * @module sheetMusic
 */

export { SheetMusicLibraryModule } from './SheetMusicLibraryModule'

// Export all types
export * from './types'

// Export multi-voice types
export * from './multiVoiceTypes'
export * from './multiVoiceValidation'
export * from './multiVoiceConverters'

// Re-export commonly used enums for convenience
export {
  ExerciseType,
  KeySignature,
  TimeSignature,
  Clef,
  NoteDuration,
  RepertoireStatus,
  RecommendationType,
  TechnicalElement,
  RhythmicPattern,
} from './types'
