/**
 * Multi-Voice Sheet Music Types
 *
 * This module defines the new multi-voice data structures that will
 * enable proper rendering of polyphonic music, grand staff notation,
 * and complex MusicXML scores.
 */

import {
  KeySignature,
  TimeSignature,
  Clef,
  NoteDuration,
  Articulation,
  DynamicMarking,
} from './types'

// ============== Core Voice Types ==============

/**
 * Represents a single voice within a staff
 * Voices can be soprano/alto/tenor/bass for SATB, or rightHand/leftHand for piano
 */
export interface Voice {
  /** Unique identifier for the voice (e.g., "soprano", "rightHand") */
  id: string
  /** Display name for the voice */
  name?: string
  /** Preferred stem direction for this voice */
  stemDirection?: 'up' | 'down' | 'auto'
  /** Notes in this voice */
  notes: MultiVoiceNote[]
}

/**
 * Enhanced note type with voice and staff assignment
 */
export interface MultiVoiceNote {
  /** Note pitch(es) in VexFlow format (e.g., ["c/4", "e/4", "g/4"] for C major chord) */
  keys: string[]
  /** Note duration */
  duration: NoteDuration
  /** Time position within the measure (in quarter note units) */
  time: number
  /** Voice ID this note belongs to */
  voiceId: string
  /** Staff ID for cross-staff notation */
  staffId?: string
  /** Accidental modifier */
  accidental?: string
  /** Number of dots extending the duration */
  dots?: number
  /** Stem direction override */
  stem?: 'up' | 'down' | 'auto'
  /** Whether the note is part of a beam group */
  beam?: boolean
  /** Articulation marking */
  articulation?: Articulation
  /** Dynamic marking */
  dynamic?: DynamicMarking
  /** Fingering information */
  fingering?: string
  /** Whether this is a rest */
  rest?: boolean
  /** Tie to next note */
  tie?: 'start' | 'stop' | 'continue'
  /** Other notes in the chord (for chord notation) */
  chord?: MultiVoiceNote[]
  /** Grace note information */
  grace?: GraceNote
  /** Ornaments on this note */
  ornaments?: Ornament[]
}

/**
 * Grace note properties
 */
export interface GraceNote {
  /** Whether this is an acciaccatura (slashed) or appoggiatura */
  slash: boolean
  /** Size relative to normal notes (typically 0.6-0.7) */
  size?: number
}

/**
 * Musical ornaments
 */
export interface Ornament {
  /** Type of ornament */
  type: 'trill' | 'mordent' | 'turn' | 'tremolo'
  /** Accidental on the ornament */
  accidental?: string
}

// ============== Staff and Part Types ==============

/**
 * Represents a musical staff (can contain multiple voices)
 */
export interface Staff {
  /** Unique identifier for the staff */
  id: string
  /** Clef for this staff */
  clef: Clef
  /** Voices on this staff */
  voices: Voice[]
  /** Display name (e.g., "Treble", "Bass") */
  name?: string
}

/**
 * Represents an instrument part (can have multiple staves)
 */
export interface Part {
  /** Unique identifier (e.g., "piano", "violin1") */
  id: string
  /** Display name */
  name: string
  /** Instrument type */
  instrument: string
  /** Staff IDs belonging to this part */
  staves: string[]
  /** MIDI program number for playback */
  midiProgram?: number
  /** Volume level (0-127) */
  volume?: number
  /** Pan position (-64 to 63) */
  pan?: number
}

// ============== Measure Types ==============

/**
 * Enhanced measure type supporting multiple staves and voices
 */
export interface MultiVoiceMeasure {
  /** Measure number starting from 1 */
  number: number
  /** Staves in this measure */
  staves: Staff[]
  /** Time signature (if changed in this measure) */
  timeSignature?: TimeSignature
  /** Key signature (if changed in this measure) */
  keySignature?: KeySignature
  /** Tempo marking in BPM */
  tempo?: number
  /** Dynamic marking for the measure */
  dynamics?: DynamicMarking
  /** Rehearsal mark or section label */
  rehearsalMark?: string
  /** Bar line type at the end of measure */
  barLine?: BarLineType
  /** Repeat count if this is a repeat ending */
  repeatCount?: number
  /** Volta (ending) information */
  volta?: VoltaInfo
}

/**
 * Bar line types
 */
export type BarLineType =
  | 'single'
  | 'double'
  | 'end'
  | 'repeat-start'
  | 'repeat-end'
  | 'repeat-both'

/**
 * Volta (repeat ending) information
 */
export interface VoltaInfo {
  /** Volta number (1, 2, etc.) */
  number: number
  /** Whether this starts a volta */
  start: boolean
  /** Whether this ends a volta */
  end: boolean
}

// ============== Score Type ==============

/**
 * Complete musical score with parts and measures
 */
export interface Score {
  /** Score title */
  title: string
  /** Composer name */
  composer: string
  /** Arranger name */
  arranger?: string
  /** Copyright information */
  copyright?: string
  /** Parts in the score */
  parts: Part[]
  /** Measures in the score */
  measures: MultiVoiceMeasure[]
  /** Additional metadata */
  metadata: ScoreMetadata
}

/**
 * Score metadata
 */
export interface ScoreMetadata {
  /** Creation date */
  createdAt: Date
  /** Last modified date */
  modifiedAt: Date
  /** Source (e.g., "MusicXML import", "Exercise generator") */
  source: string
  /** Original filename if imported */
  originalFilename?: string
  /** Encoding software */
  encodingSoftware?: string
  /** Additional tags */
  tags: string[]
  /** Performance notes */
  performanceNotes?: string
  /** Difficulty level (1-10) */
  difficulty?: number
  /** Estimated duration in seconds */
  duration?: number
}

// ============== Utility Types ==============

/**
 * Voice configuration for different instruments
 */
export interface VoiceConfiguration {
  /** Instrument type */
  instrument: string
  /** Standard voice setup */
  voices: Array<{
    id: string
    name: string
    defaultClef: Clef
    defaultStemDirection?: 'up' | 'down'
  }>
}

/**
 * Common voice configurations
 */
export const VOICE_CONFIGURATIONS: Record<string, VoiceConfiguration> = {
  piano: {
    instrument: 'piano',
    voices: [
      { id: 'rightHand', name: 'Right Hand', defaultClef: Clef.TREBLE },
      { id: 'leftHand', name: 'Left Hand', defaultClef: Clef.BASS },
    ],
  },
  satb: {
    instrument: 'choir',
    voices: [
      {
        id: 'soprano',
        name: 'Soprano',
        defaultClef: Clef.TREBLE,
        defaultStemDirection: 'up',
      },
      {
        id: 'alto',
        name: 'Alto',
        defaultClef: Clef.TREBLE,
        defaultStemDirection: 'down',
      },
      {
        id: 'tenor',
        name: 'Tenor',
        defaultClef: Clef.BASS,
        defaultStemDirection: 'up',
      },
      {
        id: 'bass',
        name: 'Bass',
        defaultClef: Clef.BASS,
        defaultStemDirection: 'down',
      },
    ],
  },
}

/**
 * Type guard to check if a measure is multi-voice
 */
export function isMultiVoiceMeasure(
  measure: unknown
): measure is MultiVoiceMeasure {
  return (
    measure !== null &&
    measure !== undefined &&
    typeof measure === 'object' &&
    'staves' in measure &&
    Array.isArray((measure as any).staves)
  )
}

/**
 * Type guard to check if data is a Score
 */
export function isScore(data: unknown): data is Score {
  return (
    data !== null &&
    data !== undefined &&
    typeof data === 'object' &&
    'parts' in data &&
    Array.isArray((data as any).parts) &&
    'measures' in data &&
    Array.isArray((data as any).measures) &&
    (data as any).measures.every(isMultiVoiceMeasure)
  )
}
