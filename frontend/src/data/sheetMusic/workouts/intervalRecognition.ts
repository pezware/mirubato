/**
 * Interval Recognition
 *
 * Practice recognizing and playing common intervals.
 * Features:
 * - Key: C Major
 * - Time: 4/4
 * - Tempo: Slow (70 bpm) for careful listening
 * - Intervals: Major 3rd, Perfect 5th, Perfect 8th (Octave)
 * - Both ascending and descending intervals
 */

import type { SheetMusic } from '../../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../../modules/sheetMusic/types'

export const intervalRecognition: SheetMusic = {
  id: 'workout-interval-recognition',
  title: 'Interval Recognition',
  composer: 'Mirubato Practice Generator',
  opus: undefined,
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'BEGINNER',
  difficultyLevel: 3,
  gradeLevel: 'Beginner',
  durationSeconds: 68, // ~1 minute at 70 bpm
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Adagio',
  suggestedTempo: 70,
  stylePeriod: 'CONTEMPORARY',
  tags: ['workout', 'intervals', 'ear-training', 'theory', 'daily-practice'],
  measures: [
    // Measure 1: Major 3rd ascending (C-E)
    {
      number: 1,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 2 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 70,
    },
    // Measure 2: Major 3rd descending (E-C)
    {
      number: 2,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 3: Perfect 5th ascending (C-G)
    {
      number: 3,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 4: Perfect 5th descending (G-C)
    {
      number: 4,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 5: Perfect Octave ascending (C-C)
    {
      number: 5,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 6: Perfect Octave descending (C-C)
    {
      number: 6,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 7: Mixed intervals - M3 then P5
    {
      number: 7,
      notes: [
        { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Measure 8: Harmonic intervals (played together)
    {
      number: 8,
      notes: [
        { keys: ['c/4', 'e/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/4', 'g/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 9: More harmonic intervals
    {
      number: 9,
      notes: [
        { keys: ['c/4', 'c/5'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['e/4', 'g/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 10: Final resolution
    {
      number: 10,
      notes: [
        { keys: ['c/4', 'e/4', 'g/4'], duration: NoteDuration.WHOLE, time: 0 },
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
  },
}
