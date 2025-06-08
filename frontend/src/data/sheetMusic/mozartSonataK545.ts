/**
 * Mozart - Piano Sonata No. 16 in C Major, K. 545
 * Wolfgang Amadeus Mozart
 *
 * Simplified version with melody line only (first 16 measures).
 * Also known as "Sonata facile" or "Sonata semplice".
 */

import type { SheetMusic } from '../../modules/sheetMusic/types'
import {
  NoteDuration,
  TimeSignature,
  KeySignature,
  Clef,
  TechnicalElement,
} from '../../modules/sheetMusic/types'

export const mozartSonataK545: SheetMusic = {
  id: 'mozart-sonata-k545',
  title: 'Piano Sonata No. 16 in C Major',
  composer: 'Wolfgang Amadeus Mozart',
  opus: 'K. 545',
  movement: '1st Movement: Allegro',
  instrument: 'PIANO',
  difficulty: 'INTERMEDIATE',
  difficultyLevel: 4,
  gradeLevel: 'RCM 4',
  durationSeconds: 60,
  timeSignature: '4/4',
  keySignature: 'C major',
  tempoMarking: 'Allegro',
  suggestedTempo: 120,
  stylePeriod: 'CLASSICAL',
  tags: [
    'curated',
    'educational',
    'classical',
    'sonata',
    'mozart',
    'beginner-friendly',
  ],
  measures: [
    // Opening theme (measures 1-4)
    {
      number: 1,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['g/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/6'], duration: NoteDuration.QUARTER, time: 3 },
      ],
      keySignature: KeySignature.C_MAJOR,
      timeSignature: TimeSignature.FOUR_FOUR,
      clef: Clef.TREBLE,
      tempo: 120,
    },
    {
      number: 2,
      notes: [
        { keys: ['e/6'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['c/6'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['e/6'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['c/6'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    {
      number: 3,
      notes: [
        { keys: ['f/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['a/5'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['c/6'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['f/6'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['a/6'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['f/6'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['a/6'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['f/6'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
    },
    {
      number: 4,
      notes: [
        { keys: ['e/6'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['c/6'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['e/6'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['c/6'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/5'], duration: NoteDuration.HALF, time: 2 },
      ],
    },
    // Scalar passage (measures 5-8)
    {
      number: 5,
      notes: [
        { keys: ['g/5'], duration: NoteDuration.SIXTEENTH, time: 0 },
        { keys: ['f/5'], duration: NoteDuration.SIXTEENTH, time: 0.25 },
        { keys: ['e/5'], duration: NoteDuration.SIXTEENTH, time: 0.5 },
        { keys: ['d/5'], duration: NoteDuration.SIXTEENTH, time: 0.75 },
        { keys: ['c/5'], duration: NoteDuration.SIXTEENTH, time: 1 },
        { keys: ['b/4'], duration: NoteDuration.SIXTEENTH, time: 1.25 },
        { keys: ['a/4'], duration: NoteDuration.SIXTEENTH, time: 1.5 },
        { keys: ['g/4'], duration: NoteDuration.SIXTEENTH, time: 1.75 },
        { keys: ['f/4'], duration: NoteDuration.SIXTEENTH, time: 2 },
        { keys: ['e/4'], duration: NoteDuration.SIXTEENTH, time: 2.25 },
        { keys: ['d/4'], duration: NoteDuration.SIXTEENTH, time: 2.5 },
        { keys: ['c/4'], duration: NoteDuration.SIXTEENTH, time: 2.75 },
        { keys: ['b/3'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 6,
      notes: [
        { keys: ['c/4'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 1, rest: true },
        { keys: ['g/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 7,
      notes: [
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 8,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2, rest: true },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Transition (measures 9-12)
    {
      number: 9,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['f/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['a/5'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
    },
    {
      number: 10,
      notes: [
        { keys: ['g/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 11,
      notes: [
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 0.5 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1 },
        { keys: ['d/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['e/5'], duration: NoteDuration.EIGHTH, time: 2 },
        { keys: ['f/5'], duration: NoteDuration.EIGHTH, time: 2.5 },
        { keys: ['g/5'], duration: NoteDuration.EIGHTH, time: 3 },
        { keys: ['a/5'], duration: NoteDuration.EIGHTH, time: 3.5 },
      ],
    },
    {
      number: 12,
      notes: [
        { keys: ['g/5'], duration: NoteDuration.HALF, time: 0 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 2, rest: true },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    // Second theme preparation (measures 13-16)
    {
      number: 13,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0, dots: 1 },
        { keys: ['b/4'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['b/4'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 14,
      notes: [
        { keys: ['d/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['a/5'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['f/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 15,
      notes: [
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 0, dots: 1 },
        { keys: ['c/5'], duration: NoteDuration.EIGHTH, time: 1.5 },
        { keys: ['g/4'], duration: NoteDuration.QUARTER, time: 2 },
        { keys: ['c/5'], duration: NoteDuration.QUARTER, time: 3 },
      ],
    },
    {
      number: 16,
      notes: [
        { keys: ['e/5'], duration: NoteDuration.QUARTER, time: 0 },
        { keys: ['g/5'], duration: NoteDuration.QUARTER, time: 1 },
        { keys: ['c/6'], duration: NoteDuration.HALF, time: 2 },
      ],
      barLine: 'double',
    },
  ],
  metadata: {
    source: 'Simplified from K. 545',
    license: 'Public Domain',
    year: 1788,
    musicalForm: 'sonata',
    technicalFocus: [TechnicalElement.SCALES, TechnicalElement.ARPEGGIOS],
    arrangedBy: 'Mirubato',
  },
}
