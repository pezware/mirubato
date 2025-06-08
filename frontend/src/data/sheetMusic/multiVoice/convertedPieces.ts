/**
 * Multi-voice pieces converted from real MusicXML files
 * These are complete, accurate transcriptions suitable for practice
 */

import { Score } from '../../../modules/sheetMusic/multiVoiceTypes'

// Import real multi-voice scores from MusicXML conversions
import {
  bachMinuetMultiVoice,
  mozartSonataK545MultiVoice,
  chopinPreludeOp28No4MultiVoice,
  furEliseEasyMultiVoice,
  satieGymnopedie1MultiVoice,
  greensleevesPianoMultiVoice,
} from './realScores'

// For backward compatibility with old components that expect SheetMusic format,
// we'll need to implement a proper converter or update those components to use Score format

// Export the real multi-voice Score versions for new components
export const bachMinuetMultiVoiceScore: Score = bachMinuetMultiVoice
export const mozartSonataMultiVoiceScore: Score = mozartSonataK545MultiVoice
export const chopinPreludeMultiVoiceScore: Score =
  chopinPreludeOp28No4MultiVoice
export const furEliseMultiVoiceScore: Score = furEliseEasyMultiVoice
export const satieGymnopedie1Score: Score = satieGymnopedie1MultiVoice
export const greensleevesMultiVoiceScore: Score = greensleevesPianoMultiVoice

// Export as array for easy access
export const convertedMultiVoicePieces: Score[] = [
  bachMinuetMultiVoiceScore,
  mozartSonataMultiVoiceScore,
  chopinPreludeMultiVoiceScore,
  furEliseMultiVoiceScore,
  satieGymnopedie1Score,
  greensleevesMultiVoiceScore,
]

// Helper to get a piece by ID
export function getMultiVoicePieceById(id: string): Score | undefined {
  return convertedMultiVoicePieces.find(
    piece =>
      piece.title.toLowerCase().includes(id.toLowerCase()) ||
      piece.metadata.originalFilename?.includes(id)
  )
}

// Helper to get all piano pieces
export function getPianoMultiVoicePieces(): Score[] {
  return convertedMultiVoicePieces.filter(piece =>
    piece.parts.some(
      part =>
        part.instrument.toLowerCase() === 'piano' ||
        part.instrument.toLowerCase() === 'keyboard'
    )
  )
}

// Helper to get pieces by difficulty
export function getMultiVoicePiecesByDifficulty(
  minLevel: number,
  maxLevel: number
): Score[] {
  return convertedMultiVoicePieces.filter(piece => {
    const difficulty = piece.metadata.difficulty || 5
    return difficulty >= minLevel && difficulty <= maxLevel
  })
}

// For backward compatibility, export placeholders with proper names
// These will be used by components that expect SheetMusic format
export const bachMinuetInGMultiVoice = bachMinuetMultiVoice as any
export { mozartSonataK545MultiVoice }
export { chopinPreludeOp28No4MultiVoice }
