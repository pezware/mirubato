/**
 * Utility functions to convert between old and new SheetMusic types
 */

import type {
  SheetMusic as NewSheetMusic,
  Measure as NewMeasure,
} from '../modules/sheetMusic/types'

import {
  KeySignature,
  TimeSignature,
  Clef,
  NoteDuration,
} from '../modules/sheetMusic/types'

/**
 * Maps KeySignature enum to VexFlow key signature strings
 */
export const keySignatureToVexFlow: Record<KeySignature, string> = {
  [KeySignature.C_MAJOR]: 'C',
  [KeySignature.G_MAJOR]: 'G',
  [KeySignature.D_MAJOR]: 'D',
  [KeySignature.A_MAJOR]: 'A',
  [KeySignature.E_MAJOR]: 'E',
  [KeySignature.B_MAJOR]: 'B',
  [KeySignature.F_SHARP_MAJOR]: 'F#',
  [KeySignature.C_SHARP_MAJOR]: 'C#',
  [KeySignature.F_MAJOR]: 'F',
  [KeySignature.B_FLAT_MAJOR]: 'Bb',
  [KeySignature.E_FLAT_MAJOR]: 'Eb',
  [KeySignature.A_FLAT_MAJOR]: 'Ab',
  [KeySignature.D_FLAT_MAJOR]: 'Db',
  [KeySignature.G_FLAT_MAJOR]: 'Gb',
  [KeySignature.C_FLAT_MAJOR]: 'Cb',
  [KeySignature.A_MINOR]: 'Am',
  [KeySignature.E_MINOR]: 'Em',
  [KeySignature.B_MINOR]: 'Bm',
  [KeySignature.F_SHARP_MINOR]: 'F#m',
  [KeySignature.C_SHARP_MINOR]: 'C#m',
  [KeySignature.G_SHARP_MINOR]: 'G#m',
  [KeySignature.D_SHARP_MINOR]: 'D#m',
  [KeySignature.A_SHARP_MINOR]: 'A#m',
  [KeySignature.D_MINOR]: 'Dm',
  [KeySignature.G_MINOR]: 'Gm',
  [KeySignature.C_MINOR]: 'Cm',
  [KeySignature.F_MINOR]: 'Fm',
  [KeySignature.B_FLAT_MINOR]: 'Bbm',
  [KeySignature.E_FLAT_MINOR]: 'Ebm',
  [KeySignature.A_FLAT_MINOR]: 'Abm',
}

/**
 * Maps old key signature strings to new KeySignature enum
 */
export const vexFlowToKeySignature: Record<string, KeySignature> = {
  C: KeySignature.C_MAJOR,
  G: KeySignature.G_MAJOR,
  D: KeySignature.D_MAJOR,
  A: KeySignature.A_MAJOR,
  E: KeySignature.E_MAJOR,
  B: KeySignature.B_MAJOR,
  'F#': KeySignature.F_SHARP_MAJOR,
  'C#': KeySignature.C_SHARP_MAJOR,
  F: KeySignature.F_MAJOR,
  Bb: KeySignature.B_FLAT_MAJOR,
  Eb: KeySignature.E_FLAT_MAJOR,
  Ab: KeySignature.A_FLAT_MAJOR,
  Db: KeySignature.D_FLAT_MAJOR,
  Gb: KeySignature.G_FLAT_MAJOR,
  Cb: KeySignature.C_FLAT_MAJOR,
  Am: KeySignature.A_MINOR,
  Em: KeySignature.E_MINOR,
  Bm: KeySignature.B_MINOR,
  'F#m': KeySignature.F_SHARP_MINOR,
  'C#m': KeySignature.C_SHARP_MINOR,
  'G#m': KeySignature.G_SHARP_MINOR,
  'D#m': KeySignature.D_SHARP_MINOR,
  'A#m': KeySignature.A_SHARP_MINOR,
  Dm: KeySignature.D_MINOR,
  Gm: KeySignature.G_MINOR,
  Cm: KeySignature.C_MINOR,
  Fm: KeySignature.F_MINOR,
  Bbm: KeySignature.B_FLAT_MINOR,
  Ebm: KeySignature.E_FLAT_MINOR,
  Abm: KeySignature.A_FLAT_MINOR,
}

/**
 * Maps old time signature strings to new TimeSignature enum
 */
export const stringToTimeSignature: Record<string, TimeSignature> = {
  '2/4': TimeSignature.TWO_FOUR,
  '3/4': TimeSignature.THREE_FOUR,
  '4/4': TimeSignature.FOUR_FOUR,
  '3/8': TimeSignature.THREE_EIGHT,
  '6/8': TimeSignature.SIX_EIGHT,
  '9/8': TimeSignature.NINE_EIGHT,
  '12/8': TimeSignature.TWELVE_EIGHT,
  '5/4': TimeSignature.FIVE_FOUR,
  '7/8': TimeSignature.SEVEN_EIGHT,
}

/**
 * Maps old clef strings to new Clef enum
 */
export const stringToClef: Record<string, Clef> = {
  treble: Clef.TREBLE,
  bass: Clef.BASS,
  alto: Clef.ALTO,
  tenor: Clef.TENOR,
  grand_staff: Clef.GRAND_STAFF,
}

/**
 * Maps old duration strings to new NoteDuration enum
 */
export const stringToNoteDuration: Record<string, NoteDuration> = {
  w: NoteDuration.WHOLE,
  h: NoteDuration.HALF,
  q: NoteDuration.QUARTER,
  '8': NoteDuration.EIGHTH,
  '16': NoteDuration.SIXTEENTH,
  '32': NoteDuration.THIRTY_SECOND,
}

/**
 * Maps old instrument strings to new format
 */
export const stringToInstrument = (instrument: string): 'PIANO' | 'GUITAR' => {
  return instrument.toUpperCase() as 'PIANO' | 'GUITAR'
}

/**
 * Maps old difficulty strings to new format
 */
export const stringToDifficulty = (
  difficulty: string
): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' => {
  return difficulty.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
}

/**
 * Converts a measure for VexFlow rendering
 */
export function convertMeasureForVexFlow(measure: NewMeasure): {
  number: number
  notes: Array<{ keys: string[]; duration: string; time: number }>
  timeSignature?: string
  keySignature?: string
  clef?: string
  tempo?: number
} {
  return {
    number: measure.number,
    notes: measure.notes.map(note => ({
      keys: note.keys,
      duration: note.duration, // NoteDuration enum values are already VexFlow compatible
      time: note.time,
    })),
    timeSignature: measure.timeSignature,
    keySignature: measure.keySignature
      ? keySignatureToVexFlow[measure.keySignature]
      : undefined,
    clef: measure.clef,
    tempo: measure.tempo,
  }
}

/**
 * Converts old SheetMusic format to new format
 */
export function convertOldSheetMusicToNew(old: {
  id: string
  title: string
  composer: string
  opus?: string
  movement?: string
  instrument: string
  difficulty: string
  measures: Array<{
    number: number
    notes: Array<{ keys: string[]; duration: string; time: number }>
    timeSignature?: string
    keySignature?: string
    clef?: string
    tempo?: {
      bpm: number
      marking?: string
      originalMarking?: string
      practiceTempos?: {
        slow: number
        medium: number
        target: number
        performance: number
      }
    }
  }>
  metadata?: {
    source?: string
    license?: string
    arrangedBy?: string
    year?: number
  }
}): NewSheetMusic {
  // Convert measures
  const measures: NewMeasure[] = old.measures.map(m => ({
    number: m.number,
    notes: m.notes.map(n => ({
      keys: n.keys,
      duration: stringToNoteDuration[n.duration] || NoteDuration.QUARTER,
      time: n.time,
    })),
    timeSignature: m.timeSignature
      ? stringToTimeSignature[m.timeSignature]
      : undefined,
    keySignature: m.keySignature
      ? vexFlowToKeySignature[m.keySignature]
      : undefined,
    clef: m.clef ? stringToClef[m.clef] : undefined,
    tempo: m.tempo?.bpm,
  }))

  // Calculate estimated duration (rough estimate based on tempo and measures)
  const tempo = old.measures[0]?.tempo?.bpm || 120
  const durationSeconds = Math.round((measures.length * 4 * 60) / tempo)

  // Create the new format
  return {
    id: old.id,
    title: old.title,
    composer: old.composer,
    opus: old.opus,
    movement: old.movement,
    instrument: stringToInstrument(old.instrument),
    difficulty: stringToDifficulty(old.difficulty),
    difficultyLevel:
      old.difficulty === 'beginner'
        ? 3
        : old.difficulty === 'intermediate'
          ? 6
          : 9,
    durationSeconds,
    timeSignature: old.measures[0]?.timeSignature || '4/4',
    keySignature: old.measures[0]?.keySignature || 'C',
    suggestedTempo: tempo,
    stylePeriod: 'CLASSICAL', // Default for now, could be determined from composer/year
    tags: [old.difficulty, old.instrument],
    measures,
    metadata: old.metadata
      ? {
          source: old.metadata.source,
          license: old.metadata.license,
          arrangedBy: old.metadata.arrangedBy,
          year: old.metadata.year,
        }
      : undefined,
  }
}
