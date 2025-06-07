/**
 * Scale Practice (Major Keys)
 *
 * Practice major scales in different keys.
 * Features:
 * - Keys: C, G, D, A, E major (circle of fifths progression)
 * - Time: 4/4
 * - Tempo: Moderate (90 bpm)
 * - Pattern: Ascending and descending scales
 * - Each scale spans 2 measures (up and down)
 */

import type { SheetMusic } from '../../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../../modules/sheetMusic/types'

export const scalePracticeMajor: SheetMusic = {
  id: 'workout-scale-practice-major',
  title: 'Scale Practice (Major Keys)',
  composer: 'Mirubato Practice Generator',
  opus: undefined,
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'BEGINNER',
  difficultyLevel: 3,
  gradeLevel: 'Beginner',
  durationSeconds: 64, // ~1 minute at 90 bpm
  timeSignature: '4/4',
  keySignature: 'C major', // Starting key
  tempoMarking: 'Moderato',
  suggestedTempo: 90,
  stylePeriod: 'CONTEMPORARY',
  tags: ['workout', 'scales', 'technique', 'major-keys', 'daily-practice'],
  measures: [
    // C Major Scale - Ascending
    {
      number: 1,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['d/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['f/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
      timeSignature: TimeSignature.FOUR_FOUR,
      keySignature: KeySignature.C_MAJOR,
      clef: Clef.TREBLE,
      tempo: 90,
    },
    // C Major Scale - Descending
    {
      number: 2,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['f/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['d/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Rest measure
    {
      number: 3,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.WHOLE, time: 0, rest: true },
      ],
    },
    // G Major Scale - Ascending
    {
      number: 4,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['f#/5'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
      keySignature: KeySignature.G_MAJOR,
    },
    // G Major Scale - Descending
    {
      number: 5,
      notes: [
        { keys: ['f#/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Rest measure
    {
      number: 6,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.WHOLE, time: 0, rest: true },
      ],
    },
    // D Major Scale - Ascending
    {
      number: 7,
      notes: [
        { keys: ['d/4'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['f#/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['c#/5'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
      keySignature: KeySignature.D_MAJOR,
    },
    // D Major Scale - Descending
    {
      number: 8,
      notes: [
        { keys: ['c#/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['f#/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['e/4'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['d/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Final chord
    {
      number: 9,
      notes: [
        { keys: ['d/4', 'f#/4', 'a/4'], duration: NoteDuration.WHOLE, time: 0 },
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
      'Practice each scale slowly and evenly. Focus on finger position and smooth transitions between notes.',
  },
}
