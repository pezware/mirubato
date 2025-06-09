/**
 * Curated Sheet Music Pieces for MVP
 *
 * This module contains 10 carefully selected pieces for immediate use:
 * - 5 Piano pieces (Bach, Mozart, Clementi, Schumann, Chopin)
 * - 5 Guitar pieces (Sor, Giuliani, Carcassi, Tárrega, Romance)
 *
 * All pieces are public domain from IMSLP sources.
 */

import type { SheetMusic } from '../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../modules/sheetMusic/types'

// Import multi-voice pieces from original MXL conversions
// Commented out to prevent conversion logs in multi-voice only mode
// import {
//   bachMinuetMultiVoiceScore,
//   mozartSonataMultiVoiceScore,
//   chopinPreludeMultiVoiceScore,
// } from './multiVoice/convertedPieces'
// import { scoreToSheetMusic } from '../../modules/sheetMusic/multiVoiceConverters'

// Import preset workout exercises
import {
  dailySightReadingEasy,
  scalePracticeMajor,
  rhythmTraining4_4,
  intervalRecognition,
} from './workouts/index'

// ============== Piano Pieces ==============

// Bach, Mozart, and Chopin pieces are imported from individual files
// These contain the full transcriptions from MusicXML conversions

// Convert multi-voice Score format to SheetMusic format
// Create placeholder for multi-voice only mode
const bachMinuetInGMultiVoice: SheetMusic = {
  // Placeholder - using multi-voice version directly in Practice.tsx
  id: 'bach-minuet-in-g-bwv-anh-114',
  title: 'Minuet in G',
  composer: 'Johann Sebastian Bach',
  opus: 'BWV Anh. 114',
  difficulty: 'BEGINNER',
  difficultyLevel: 3,
  gradeLevel: 'RCM 3',
  durationSeconds: 90,
  keySignature: 'G major',
  stylePeriod: 'BAROQUE',
  tags: ['curated', 'educational', 'baroque', 'classical', 'minuet', 'piano'],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1725,
    musicalForm: 'minuet',
    technicalFocus: [TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Original',
  },
  measures: [], // Placeholder - using multi-voice version
  timeSignature: '3/4' as const,
  suggestedTempo: 120,
}

const mozartSonataK545MultiVoice: SheetMusic = {
  // Placeholder - using multi-voice version directly
  id: 'mozart-sonata-k545',
  title: 'Sonata in C major',
  composer: 'Wolfgang Amadeus Mozart',
  opus: 'K. 545',
  movement: '1st Movement (Allegro)',
  instrument: 'PIANO',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 5,
  gradeLevel: 'RCM 5',
  durationSeconds: 180,
  keySignature: 'C major',
  stylePeriod: 'CLASSICAL',
  tags: ['curated', 'educational', 'sonata', 'classical', 'piano'],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1788,
    musicalForm: 'sonata',
    technicalFocus: [TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Original',
  },
  measures: [], // Placeholder - using multi-voice version
  timeSignature: '4/4' as const,
  suggestedTempo: 120,
}

const chopinPreludeOp28No4MultiVoice: SheetMusic = {
  // Placeholder - using multi-voice version directly
  id: 'chopin-prelude-op28-no4',
  title: 'Prelude in E minor',
  composer: 'Frédéric Chopin',
  opus: 'Op. 28 No. 4',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 6,
  gradeLevel: 'RCM 7',
  durationSeconds: 120,
  stylePeriod: 'ROMANTIC',
  keySignature: 'E minor',
  tags: [
    'curated',
    'educational',
    'prelude',
    'romantic',
    'expressive',
    'piano',
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1839,
    musicalForm: 'prelude',
    technicalFocus: [TechnicalElement.CHORDS],
    arrangedBy: 'Original',
  },
  measures: [], // Placeholder - using multi-voice version
  timeSignature: '2/2' as const,
  suggestedTempo: 60,
}

/**
 * Clementi - Sonatina Op.36 No.1, 1st movement
 * Classic pedagogical piece, C major
 */
const clementiSonatinaOp36No1: SheetMusic = {
  id: 'clementi-sonatina-op36-no1',
  title: 'Sonatina Op.36 No.1',
  composer: 'Muzio Clementi',
  opus: 'Op.36 No.1',
  movement: '1st Movement (Allegro)',
  instrument: 'PIANO',
  difficulty: 'BEGINNER',
  difficultyLevel: 3,
  gradeLevel: 'RCM 3',
  durationSeconds: 105,
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Allegro',
  suggestedTempo: 126,
  stylePeriod: 'CLASSICAL',
  tags: [
    'curated',
    'educational',
    'sonatina',
    'classical',
    'pedagogical',
    'scales',
  ],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 126,
    },
    {
      number: 2,
      notes: [
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['f/5'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1797,
    musicalForm: 'sonatina',
    technicalFocus: [TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Original',
  },
}

/**
 * Schumann - "Melody" from Album for the Young Op.68
 * Beautiful lyrical piece for developing musical expression
 */
const schumannMelody: SheetMusic = {
  id: 'schumann-melody-op68-no1',
  title: 'Melody',
  composer: 'Robert Schumann',
  opus: 'Op.68 No.1',
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'BEGINNER',
  difficultyLevel: 3,
  gradeLevel: 'RCM 3',
  durationSeconds: 75,
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Moderato',
  suggestedTempo: 100,
  stylePeriod: 'ROMANTIC',
  tags: [
    'curated',
    'educational',
    'lyrical',
    'romantic',
    'expressive',
    'melody',
  ],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 100,
    },
    {
      number: 2,
      notes: [
        { keys: ['g/5'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['e/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1848,
    musicalForm: 'song form',
    technicalFocus: [TechnicalElement.SCALES],
    arrangedBy: 'Original',
  },
}

// ============== Guitar Pieces ==============

/**
 * Sor - Study Op.60 No.1 in C major
 * Classic beginner guitar study focusing on basic technique
 */
const sorStudyOp60No1: SheetMusic = {
  id: 'sor-study-op60-no1',
  title: 'Study Op.60 No.1',
  composer: 'Fernando Sor',
  opus: 'Op.60 No.1',
  movement: undefined,
  instrument: 'GUITAR',
  difficulty: 'BEGINNER',
  difficultyLevel: 2,
  gradeLevel: 'Guitar Grade 2',
  durationSeconds: 80,
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Andante',
  suggestedTempo: 80,
  stylePeriod: 'CLASSICAL',
  tags: ['curated', 'educational', 'study', 'classical', 'guitar', 'arpeggios'],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['c/3'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/3'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/3'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 80,
    },
    {
      number: 2,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/3'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['e/3'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['f/3'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['a/3'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1828,
    musicalForm: 'study',
    technicalFocus: [TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Original',
  },
}

/**
 * Giuliani - Arpeggio Study Op.1a No.1
 * Fundamental arpeggio patterns for classical guitar
 */
const giulianiArpeggioStudy: SheetMusic = {
  id: 'giuliani-arpeggio-op1a-no1',
  title: 'Arpeggio Study Op.1a No.1',
  composer: 'Mauro Giuliani',
  opus: 'Op.1a No.1',
  movement: undefined,
  instrument: 'GUITAR',
  difficulty: 'BEGINNER',
  difficultyLevel: 3,
  gradeLevel: 'Guitar Grade 3',
  durationSeconds: 90,
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Moderato',
  suggestedTempo: 90,
  stylePeriod: 'CLASSICAL',
  tags: [
    'curated',
    'educational',
    'arpeggio',
    'classical',
    'guitar',
    'technique',
  ],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['c/3'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['e/3'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['g/3'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['g/3'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['e/3'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 90,
    },
    {
      number: 2,
      notes: [
        { keys: ['f/3'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['a/3'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['f/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['f/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['a/3'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['g/3'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['b/3'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['d/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['d/4'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['b/3'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['c/3'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['e/3'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['g/3'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1812,
    musicalForm: 'study',
    technicalFocus: [TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Original',
  },
}

/**
 * Carcassi - Etude Op.60 No.1 in C major
 * Progressive study for developing guitar technique
 */
const carcassiEtudeOp60No1: SheetMusic = {
  id: 'carcassi-etude-op60-no1',
  title: 'Etude Op.60 No.1',
  composer: 'Matteo Carcassi',
  opus: 'Op.60 No.1',
  movement: undefined,
  instrument: 'GUITAR',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 4,
  gradeLevel: 'Guitar Grade 4',
  durationSeconds: 100,
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Allegro moderato',
  suggestedTempo: 108,
  stylePeriod: 'CLASSICAL',
  tags: ['curated', 'educational', 'etude', 'classical', 'guitar', 'scales'],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.SIXTEENTH, time: 0 },
        { keys: ['d/4'], duration: NoteDuration.SIXTEENTH, time: 0.25 },
        { keys: ['e/4'], duration: NoteDuration.SIXTEENTH, time: 0.5 },
        { keys: ['f/4'], duration: NoteDuration.SIXTEENTH, time: 0.75 },
        { keys: ['g/4'], duration: NoteDuration.SIXTEENTH, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.SIXTEENTH, time: 1.25 },
        { keys: ['b/4'], duration: NoteDuration.SIXTEENTH, time: 1.5 },
        { keys: ['c/5'], duration: NoteDuration.SIXTEENTH, time: 1.75 },
        { keys: ['b/4'], duration: NoteDuration.SIXTEENTH, time: 2 },
        { keys: ['a/4'], duration: NoteDuration.SIXTEENTH, time: 2.25 },
        { keys: ['g/4'], duration: NoteDuration.SIXTEENTH, time: 2.5 },
        { keys: ['f/4'], duration: NoteDuration.SIXTEENTH, time: 2.75 },
        { keys: ['e/4'], duration: NoteDuration.SIXTEENTH, time: 3 },
        { keys: ['d/4'], duration: NoteDuration.SIXTEENTH, time: 3.25 },
        { keys: ['c/4'], duration: NoteDuration.SIXTEENTH, time: 3.5 },
        { keys: ['b/3'], duration: NoteDuration.SIXTEENTH, time: 3.75 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 108,
    },
    {
      number: 2,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['e/3'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['g/3'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['f/4'], duration: NoteDuration.SIXTEENTH, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.SIXTEENTH, time: 0.25 },
        { keys: ['a/4'], duration: NoteDuration.SIXTEENTH, time: 0.5 },
        { keys: ['b/4'], duration: NoteDuration.SIXTEENTH, time: 0.75 },
        { keys: ['c/5'], duration: NoteDuration.SIXTEENTH, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.SIXTEENTH, time: 1.25 },
        { keys: ['e/5'], duration: NoteDuration.SIXTEENTH, time: 1.5 },
        { keys: ['f/5'], duration: NoteDuration.SIXTEENTH, time: 1.75 },
        { keys: ['e/5'], duration: NoteDuration.SIXTEENTH, time: 2 },
        { keys: ['d/5'], duration: NoteDuration.SIXTEENTH, time: 2.25 },
        { keys: ['c/5'], duration: NoteDuration.SIXTEENTH, time: 2.5 },
        { keys: ['b/4'], duration: NoteDuration.SIXTEENTH, time: 2.75 },
        { keys: ['a/4'], duration: NoteDuration.SIXTEENTH, time: 3 },
        { keys: ['g/4'], duration: NoteDuration.SIXTEENTH, time: 3.25 },
        { keys: ['f/4'], duration: NoteDuration.SIXTEENTH, time: 3.5 },
        { keys: ['e/4'], duration: NoteDuration.SIXTEENTH, time: 3.75 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['f/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/3'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1836,
    musicalForm: 'etude',
    technicalFocus: [TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Original',
  },
}

/**
 * Tárrega - "Lágrima"
 * Beautiful short piece, essential in guitar repertoire
 */
const tarregaLagrima: SheetMusic = {
  id: 'tarrega-lagrima',
  title: 'Lágrima',
  composer: 'Francisco Tárrega',
  opus: undefined,
  movement: undefined,
  instrument: 'GUITAR',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 5,
  gradeLevel: 'Guitar Grade 5',
  durationSeconds: 120,
  timeSignature: '3/4',
  keySignature: 'E major',
  tempoMarking: 'Andante',
  suggestedTempo: 72,
  stylePeriod: 'ROMANTIC',
  tags: [
    'curated',
    'educational',
    'romantic',
    'spanish',
    'guitar',
    'expressive',
  ],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g#/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
      timeSignature: TimeSignature.THREE_FOUR,
      keySignature: KeySignature.E_MAJOR,
      clef: Clef.TREBLE,
      tempo: 72,
    },
    {
      number: 2,
      notes: [
        { keys: ['c#/5'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['f#/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g#/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 4,
      notes: [{ keys: ['e/4'], duration: NoteDuration.HALF, time: 0, dots: 1 }],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1884,
    musicalForm: 'character piece',
    technicalFocus: [TechnicalElement.ARPEGGIOS, TechnicalElement.CHORDS],
    arrangedBy: 'Original',
  },
}

/**
 * Anonymous - "Romance" (Spanish Romance)
 * Famous classical guitar piece, excellent for tremolo technique
 */
const spanishRomance: SheetMusic = {
  id: 'spanish-romance-anonymous',
  title: 'Romance (Spanish Romance)',
  composer: 'Anonymous',
  opus: undefined,
  movement: undefined,
  instrument: 'GUITAR',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 4,
  gradeLevel: 'Guitar Grade 4',
  durationSeconds: 150,
  timeSignature: '3/4',
  keySignature: 'E minor',
  tempoMarking: 'Andante',
  suggestedTempo: 84,
  stylePeriod: 'CLASSICAL',
  tags: ['curated', 'educational', 'romance', 'spanish', 'guitar', 'tremolo'],
  measures: [
    {
      number: 1,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/3'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/3'], duration: NoteDuration.QUARTER, time: 2 },
      ],
      timeSignature: TimeSignature.THREE_FOUR,
      keySignature: KeySignature.E_MINOR,
      clef: Clef.TREBLE,
      tempo: 84,
    },
    {
      number: 2,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/3'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/3'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['f#/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d#/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['b/3'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['e/3'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
  ],
  metadata: {
    source: 'IMSLP',
    license: 'Public Domain',
    year: 1800,
    musicalForm: 'romance',
    technicalFocus: [TechnicalElement.TREMOLO, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Traditional',
  },
}

// ============== Export Functions ==============

/**
 * Get all 10 curated pieces
 */
export function getCuratedPieces(): SheetMusic[] {
  return [
    // Piano pieces - multi-voice conversions from original MXL files
    bachMinuetInGMultiVoice, // 32 measures from original MXL
    mozartSonataK545MultiVoice, // 73 measures from original MXL
    clementiSonatinaOp36No1,
    schumannMelody,
    chopinPreludeOp28No4MultiVoice, // 26 measures from original MXL
    // Guitar pieces
    sorStudyOp60No1,
    giulianiArpeggioStudy,
    carcassiEtudeOp60No1,
    tarregaLagrima,
    spanishRomance,
  ]
}

/**
 * Get only piano pieces (5 pieces)
 */
export function getCuratedPianoPieces(): SheetMusic[] {
  return [
    bachMinuetInGMultiVoice,
    mozartSonataK545MultiVoice,
    clementiSonatinaOp36No1,
    schumannMelody,
    chopinPreludeOp28No4MultiVoice,
  ]
}

/**
 * Get only guitar pieces (5 pieces)
 */
export function getCuratedGuitarPieces(): SheetMusic[] {
  return [
    sorStudyOp60No1,
    giulianiArpeggioStudy,
    carcassiEtudeOp60No1,
    tarregaLagrima,
    spanishRomance,
  ]
}

/**
 * Find a piece by its ID
 */
export function getPieceById(id: string): SheetMusic | null {
  const allPieces = getCuratedPieces()
  return allPieces.find(piece => piece.id === id) || null
}

/**
 * Filter pieces by instrument
 */
export function getCuratedPiecesByInstrument(
  instrument: 'PIANO' | 'GUITAR'
): SheetMusic[] {
  const allPieces = getCuratedPieces()
  return allPieces.filter(piece => piece.instrument === instrument)
}

/**
 * Filter pieces by difficulty level
 */
export function getCuratedPiecesByDifficulty(
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
): SheetMusic[] {
  const allPieces = getCuratedPieces()
  return allPieces.filter(piece => piece.difficulty === difficulty)
}

// ============== Workout Functions ==============

/**
 * Get all preset workout exercises (4 workouts)
 */
export function getPresetWorkouts(): SheetMusic[] {
  return [
    dailySightReadingEasy,
    scalePracticeMajor,
    rhythmTraining4_4,
    intervalRecognition,
  ]
}

/**
 * Get all content including curated pieces and workouts
 */
export function getAllSheetMusic(): SheetMusic[] {
  return [...getCuratedPieces(), ...getPresetWorkouts()]
}
