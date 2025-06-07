/**
 * Daily Sight-Reading (Easy) - C Major
 *
 * A simple 8-measure sight-reading exercise in C major.
 * Features:
 * - Key: C Major (no sharps or flats)
 * - Time: 4/4
 * - Tempo: Moderate (100 bpm)
 * - Range: C4 to G5 (comfortable for most instruments)
 * - Rhythm: Quarter and half notes only
 * - Musical coherence: Based on C major scale and I-IV-V chord progression
 */

import type { SheetMusic } from '../../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../../modules/sheetMusic/types'

export const dailySightReadingEasy: SheetMusic = {
  id: 'workout-daily-sight-reading-easy',
  title: 'Daily Sight-Reading (Easy)',
  composer: 'Mirubato Practice Generator',
  opus: undefined,
  movement: undefined,
  instrument: 'PIANO', // Works for both piano and guitar
  difficulty: 'BEGINNER',
  difficultyLevel: 2,
  gradeLevel: 'Beginner',
  durationSeconds: 48, // ~30 seconds at 100 bpm
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Moderato',
  suggestedTempo: 100,
  stylePeriod: 'CONTEMPORARY',
  tags: ['workout', 'sight-reading', 'daily-practice', 'beginner', 'c-major'],
  measures: [
    // Measure 1: I chord (C major) - C E G pattern
    {
      number: 1,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 100,
    },
    // Measure 2: Scale ascending
    {
      number: 2,
      notes: [
        { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 3: IV chord (F major) - F A C pattern
    {
      number: 3,
      notes: [
        { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Measure 4: Scale descending
    {
      number: 4,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 5: V chord (G major) - G B D pattern
    {
      number: 5,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Measure 6: Melodic line
    {
      number: 6,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Measure 7: Return to I chord
    {
      number: 7,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 8: Final resolution
    {
      number: 8,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 0, dots: 1 },
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
  ],
  metadata: {
    source: 'Generated',
    license: 'CC BY 4.0',
    year: 2024,
    musicalForm: 'exercise',
    technicalFocus: [TechnicalElement.SCALES],
    arrangedBy: 'Mirubato Practice Generator',
    practiceNotes:
      'Focus on steady tempo and accurate note reading. Try to play through without stopping.',
  },
}
