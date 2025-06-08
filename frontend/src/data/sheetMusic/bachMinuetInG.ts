/**
 * Bach - Minuet in G Major, BWV Anh. 114
 * Johann Sebastian Bach (attr.)
 *
 * Simplified version with melody line only.
 * Classic pedagogical piece, perfect for beginners.
 */

import type { SheetMusic } from '../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../modules/sheetMusic/types'

export const bachMinuetInG: SheetMusic = {
  id: 'bach-minuet-in-g-major-bwv-anh-114',
  title: 'Minuet in G Major',
  composer: 'Johann Sebastian Bach',
  opus: 'BWV Anh. 114',
  movement: undefined,
  instrument: 'PIANO',
  difficulty: 'BEGINNER',
  difficultyLevel: 2,
  gradeLevel: 'RCM 1',
  durationSeconds: 90,
  timeSignature: '3/4',
  keySignature: 'G major',
  tempoMarking: 'Moderato',
  suggestedTempo: 120,
  stylePeriod: 'BAROQUE',
  tags: [
    'curated',
    'educational',
    'classical',
    'beginner',
    'baroque',
    'minuet',
  ],
  measures: [
    // First phrase (measures 1-8)
    {
      number: 1,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
      keySignature: KeySignature.G_MAJOR,
      timeSignature: TimeSignature.THREE_FOUR,
      clef: Clef.TREBLE,
    },
    {
      number: 2,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 2 },
        {
          keys: ['f#/5'],
          duration: NoteDuration.EIGHTH,
          time: 2.5,
          accidental: '#',
        },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['g/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 5,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        {
          keys: ['f#/5'],
          duration: NoteDuration.EIGHTH,
          time: 2,
          accidental: '#',
        },
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
    },
    {
      number: 6,
      notes: [
        { keys: ['a/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        {
          keys: ['f#/5'],
          duration: NoteDuration.EIGHTH,
          time: 2,
          accidental: '#',
        },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
    },
    {
      number: 7,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
    },
    {
      number: 8,
      notes: [
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 2 },
      ],
      barLine: 'double',
    },
    // Second phrase (measures 9-16)
    {
      number: 9,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 1 },
        {
          keys: ['f#/5'],
          duration: NoteDuration.EIGHTH,
          time: 1.5,
          accidental: '#',
        },
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
    },
    {
      number: 10,
      notes: [
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 11,
      notes: [
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
    },
    {
      number: 12,
      notes: [
        { keys: ['a/4'], duration: NoteDuration.QUARTER, time: 0 },
        {
          keys: ['f#/4'],
          duration: NoteDuration.QUARTER,
          time: 1,
          accidental: '#',
        },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 13,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
      ],
    },
    {
      number: 14,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2 },
      ],
    },
    {
      number: 15,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['a/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/4'], duration: NoteDuration.EIGHTH, time: 2 },
        {
          keys: ['f#/4'],
          duration: NoteDuration.EIGHTH,
          time: 2.5,
          accidental: '#',
        },
      ],
    },
    {
      number: 16,
      notes: [{ keys: ['g/4'], duration: NoteDuration.HALF, time: 0, dots: 1 }],
      barLine: 'end',
    },
  ],
  metadata: {
    source: 'Simplified from BWV Anh. 114',
    license: 'Public Domain',
    year: 1725,
    musicalForm: 'minuet',
    technicalFocus: [TechnicalElement.SCALES],
    arrangedBy: 'Mirubato',
  },
}
