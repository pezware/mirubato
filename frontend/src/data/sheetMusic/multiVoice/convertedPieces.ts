/**
 * Multi-voice pieces converted for demonstration
 * These use enhanced SheetMusic pieces with multi-voice conversion capability
 */

import { Score } from '../../../modules/sheetMusic/multiVoiceTypes'
import {
  SheetMusic,
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../../modules/sheetMusic/types'
import { convertSingleVoiceToMultiVoice } from '../../../utils/singleToMultiVoiceConverter'

// Create enhanced versions of our curated pieces with more comprehensive data
const bachMinuetEnhanced: SheetMusic = {
  id: 'bach-minuet-in-g-major-bwv-anh-114',
  title: 'Minuet in G Major',
  composer: 'Johann Sebastian Bach',
  opus: 'BWV Anh. 114',
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 4,
  gradeLevel: 'RCM 4',
  durationSeconds: 90,
  timeSignature: '3/4',
  keySignature: 'G major',
  tempoMarking: 'Moderato',
  suggestedTempo: 120,
  stylePeriod: 'BAROQUE',
  tags: ['curated', 'educational', 'bach', 'minuet', 'baroque', 'enhanced'],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
      timeSignature: TimeSignature.THREE_FOUR,
      keySignature: KeySignature.G_MAJOR,
      clef: Clef.TREBLE,
      tempo: 120,
    },
    {
      number: 2,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    // Add more measures as needed
  ],
  metadata: {
    source: 'Enhanced Curated Collection',
    license: 'Public Domain',
    year: 1725,
    musicalForm: 'minuet',
    technicalFocus: [TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Enhanced for Multi-Voice Practice',
  },
}

const mozartSonataEnhanced: SheetMusic = {
  id: 'mozart-sonata-k545-1st-mvt',
  title: 'Piano Sonata No. 16',
  composer: 'Wolfgang Amadeus Mozart',
  opus: 'K. 545',
  movement: '1st Movement (Allegro)',
  instrument: 'PIANO',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 5,
  gradeLevel: 'RCM 5',
  durationSeconds: 180,
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Allegro',
  suggestedTempo: 120,
  stylePeriod: 'CLASSICAL',
  tags: ['curated', 'educational', 'mozart', 'sonata', 'classical', 'enhanced'],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/6'], duration: NoteDuration.QUARTER, time: 3 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 120,
    },
    {
      number: 2,
      notes: [
        { keys: ['b/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['a/5'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['f/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Add more measures as needed
  ],
  metadata: {
    source: 'Enhanced Curated Collection',
    license: 'Public Domain',
    year: 1788,
    musicalForm: 'sonata',
    technicalFocus: [TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Enhanced for Multi-Voice Practice',
  },
}

const chopinPreludeEnhanced: SheetMusic = {
  id: 'chopin-prelude-op28-no4',
  title: 'Prelude Op. 28 No. 4',
  composer: 'Frédéric Chopin',
  opus: 'Op. 28, No. 4',
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'ADVANCED',
  difficultyLevel: 7,
  gradeLevel: 'RCM 7',
  durationSeconds: 120,
  timeSignature: '4/4',
  keySignature: 'E minor',
  tempoMarking: 'Largo',
  suggestedTempo: 50,
  stylePeriod: 'ROMANTIC',
  tags: ['curated', 'educational', 'chopin', 'prelude', 'romantic', 'enhanced'],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['f#/4'], duration: NoteDuration.HALF, time: 2 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.E_MINOR,
      clef: Clef.TREBLE,
      tempo: 50,
    },
    {
      number: 2,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['f#/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Add more measures as needed
  ],
  metadata: {
    source: 'Enhanced Curated Collection',
    license: 'Public Domain',
    year: 1839,
    musicalForm: 'prelude',
    technicalFocus: [TechnicalElement.CHORDS, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Enhanced for Multi-Voice Practice',
  },
}

// Export the enhanced SheetMusic pieces
export const bachMinuetInGMultiVoice: SheetMusic = bachMinuetEnhanced
export const mozartSonataK545MultiVoice: SheetMusic = mozartSonataEnhanced
export const chopinPreludeOp28No4MultiVoice: SheetMusic = chopinPreludeEnhanced

// Also export multi-voice Score versions for the new multi-voice components
export const bachMinuetMultiVoiceScore: Score = convertSingleVoiceToMultiVoice(
  bachMinuetInGMultiVoice
)
export const mozartSonataMultiVoiceScore: Score =
  convertSingleVoiceToMultiVoice(mozartSonataK545MultiVoice)
export const chopinPreludeMultiVoiceScore: Score =
  convertSingleVoiceToMultiVoice(chopinPreludeOp28No4MultiVoice)

// Export as array for easy access
export const convertedMultiVoicePieces: Score[] = [
  bachMinuetMultiVoiceScore,
  mozartSonataMultiVoiceScore,
  chopinPreludeMultiVoiceScore,
]

// Helper to get a piece by ID
export function getMultiVoicePieceById(id: string): Score | undefined {
  return convertedMultiVoicePieces.find(
    piece =>
      piece.title.toLowerCase().includes(id.toLowerCase()) ||
      piece.metadata.originalFilename?.includes(id)
  )
}
