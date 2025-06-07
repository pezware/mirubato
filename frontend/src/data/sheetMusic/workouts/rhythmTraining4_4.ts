/**
 * Rhythm Training (4/4 Time)
 *
 * Focus on rhythm patterns in 4/4 time.
 * Features:
 * - Key: C Major (simple key to focus on rhythm)
 * - Time: 4/4
 * - Tempo: Slow (80 bpm) for accuracy
 * - Various rhythm patterns: whole, half, quarter, eighth notes
 * - Includes rests and syncopation
 */

import type { SheetMusic } from '../../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../../modules/sheetMusic/types'

export const rhythmTraining4_4: SheetMusic = {
  id: 'workout-rhythm-training-4-4',
  title: 'Rhythm Training (4/4 Time)',
  composer: 'Mirubato Practice Generator',
  opus: undefined,
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'BEGINNER',
  difficultyLevel: 3,
  gradeLevel: 'Beginner',
  durationSeconds: 60, // ~1 minute at 80 bpm
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Andante',
  suggestedTempo: 80,
  stylePeriod: 'CONTEMPORARY',
  tags: ['workout', 'rhythm', 'timing', '4/4-time', 'daily-practice'],
  measures: [
    // Measure 1: Whole note
    {
      number: 1,
      notes: [{ keys: ['c/4'], duration: NoteDuration.WHOLE, time: 0 }],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 80,
    },
    // Measure 2: Half notes
    {
      number: 2,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 3: Quarter notes
    {
      number: 3,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['f/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Measure 4: Mixed rhythms
    {
      number: 4,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Measure 5: Eighth notes
    {
      number: 5,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['d/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['f/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['f/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['d/4'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
    },
    // Measure 6: Dotted rhythms
    {
      number: 6,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0, dots: 1 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 7: Rests
    {
      number: 7,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 1, rest: true },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 3, rest: true },
      ],
    },
    // Measure 8: Syncopated rhythm
    {
      number: 8,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 0, rest: true },
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 1, rest: true },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2.5, rest: true },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Measure 9: Mixed patterns
    {
      number: 9,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['e/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['d/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Measure 10: Final
    {
      number: 10,
      notes: [{ keys: ['c/4'], duration: NoteDuration.WHOLE, time: 0 }],
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
