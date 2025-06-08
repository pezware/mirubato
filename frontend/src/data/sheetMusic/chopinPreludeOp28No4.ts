/**
 * Chopin - Prelude Op. 28, No. 4 in E minor
 * Frédéric Chopin
 *
 * Simplified version with melody line only.
 * One of Chopin's most famous preludes, known for its melancholic character.
 */

import type { SheetMusic } from '../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../modules/sheetMusic/types'

export const chopinPreludeOp28No4: SheetMusic = {
  id: 'chopin-prelude-op28-no4',
  title: 'Prelude Op. 28, No. 4',
  composer: 'Frédéric Chopin',
  opus: 'Op. 28, No. 4',
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 5,
  gradeLevel: 'RCM 5',
  durationSeconds: 120,
  timeSignature: '2/2',
  keySignature: 'E minor',
  tempoMarking: 'Largo',
  suggestedTempo: 60,
  stylePeriod: 'ROMANTIC',
  tags: [
    'curated',
    'educational',
    'classical',
    'romantic',
    'prelude',
    'melancholic',
  ],
  measures: [
    // Opening phrase (measures 1-4)
    {
      number: 1,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 2 },
      ],
      keySignature: KeySignature.E_MINOR,
      timeSignature: TimeSignature.TWO_FOUR,
      clef: Clef.TREBLE,
      tempo: 60,
    },
    {
      number: 2,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.HALF, time: 0, dots: 1 },
        {
          keys: ['f#/4'],
          duration: NoteDuration.QUARTER,
          time: 3,
          accidental: '#',
        },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0, dots: 1 },
        {
          keys: ['f#/4'],
          duration: NoteDuration.QUARTER,
          time: 3,
          accidental: '#',
        },
      ],
    },
    // Development (measures 5-8)
    {
      number: 5,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 6,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    {
      number: 7,
      notes: [
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 8,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 0, dots: 1 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Climax section (measures 9-12)
    {
      number: 9,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 10,
      notes: [
        { keys: ['e/5'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    {
      number: 11,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 12,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0 },
        {
          keys: ['f#/4'],
          duration: NoteDuration.HALF,
          time: 2,
          accidental: '#',
        },
      ],
    },
    // Return and ending (measures 13-16)
    {
      number: 13,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['a/4'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    {
      number: 14,
      notes: [
        { keys: ['g/4'], duration: NoteDuration.HALF, time: 0, dots: 1 },
        {
          keys: ['f#/4'],
          duration: NoteDuration.QUARTER,
          time: 3,
          accidental: '#',
        },
      ],
    },
    {
      number: 15,
      notes: [
        { keys: ['e/4'], duration: NoteDuration.HALF, time: 0 },
        {
          keys: ['f#/4'],
          duration: NoteDuration.HALF,
          time: 2,
          accidental: '#',
        },
      ],
    },
    {
      number: 16,
      notes: [{ keys: ['e/4'], duration: NoteDuration.WHOLE, time: 0 }],
      barLine: 'end',
    },
  ],
  metadata: {
    source: 'Simplified from Op. 28, No. 4',
    license: 'Public Domain',
    year: 1839,
    musicalForm: 'prelude',
    technicalFocus: [TechnicalElement.CHORDS],
    arrangedBy: 'Mirubato',
  },
}
