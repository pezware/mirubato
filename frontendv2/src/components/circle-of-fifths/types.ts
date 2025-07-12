export type PlaybackMode = 'chord' | 'scale' | 'arpeggio'

export interface KeyInfo {
  id: string
  name: string
  relativeMinor: string // For major keys: their relative minor; For minor keys: their relative major
  keySignature: number
  sharpsOrFlats: 'sharps' | 'flats' | 'natural'
  fifthClockwise: string
  fifthCounterClockwise: string
  primaryChords: string[]
  secondaryChords: string[]
  scale: string[]
  modes: {
    ionian: string[]
    dorian: string[]
    phrygian: string[]
    lydian: string[]
    mixolydian: string[]
    aeolian: string[]
    locrian: string[]
  }
  commonProgressions: Array<{
    name: string
    chords: string[]
  }>
  enharmonic: string | null
  color: string
  position: {
    angle: number
    x: number
    y: number
  }
  theoryNotes: {
    keyCharacteristics: string
    famousWorks: string[]
    relatedKeys: string[]
  }
}

export interface CirclePosition {
  angle: number
  x: number
  y: number
}

export interface AudioSettings {
  isEnabled: boolean
  volume: number
  playbackMode: PlaybackMode
  tempo: number
}
