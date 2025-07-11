import { KeyInfo } from './types'

// Calculate position on circle for each key
const calculatePosition = (
  index: number,
  total: number = 12,
  radius: number = 200
): { angle: number; x: number; y: number } => {
  // Start from top (C at 12 o'clock position)
  const angle = (index * 360) / total - 90
  const angleRad = (angle * Math.PI) / 180
  const x = radius * Math.cos(angleRad)
  const y = radius * Math.sin(angleRad)
  return { angle: angle + 90, x, y } // Add 90 back for display angle
}

// Define the order of keys in the circle (clockwise from C)
const keyOrder = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#/Gb',
  'Db',
  'Ab',
  'Eb',
  'Bb',
  'F',
]
const minorKeyOrder = [
  'Am',
  'Em',
  'Bm',
  'F#m',
  'C#m',
  'G#m',
  'D#m/Ebm',
  'Bbm',
  'Fm',
  'Cm',
  'Gm',
  'Dm',
]

// Morandi-inspired colors for each key
const keyColors = {
  C: '#A8B5A0', // Sage Green
  G: '#D4A5A5', // Dusty Rose
  D: '#C7C2BD', // Warm Gray
  A: '#A8B5C1', // Soft Blue
  E: '#D4C5A0', // Muted Gold
  B: '#B5A8B5', // Lavender Gray
  'F#/Gb': '#C1B5A8', // Taupe
  Db: '#A5B5A5', // Mint Gray
  Ab: '#B5C1A8', // Pale Olive
  Eb: '#C7BDB5', // Blush Gray
  Bb: '#B5B5C1', // Periwinkle Gray
  F: '#C1A8A8', // Mauve Gray
}

const keysData: Record<string, KeyInfo> = {
  C: {
    id: 'C',
    name: 'C Major',
    relativeMinor: 'A minor',
    keySignature: 0,
    sharpsOrFlats: 'natural',
    fifthClockwise: 'G',
    fifthCounterClockwise: 'F',
    primaryChords: ['C', 'F', 'G'],
    secondaryChords: ['Dm', 'Em', 'Am', 'Bdim'],
    scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    modes: {
      ionian: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      dorian: ['D', 'E', 'F', 'G', 'A', 'B', 'C'],
      phrygian: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
      lydian: ['F', 'G', 'A', 'B', 'C', 'D', 'E'],
      mixolydian: ['G', 'A', 'B', 'C', 'D', 'E', 'F'],
      aeolian: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      locrian: ['B', 'C', 'D', 'E', 'F', 'G', 'A'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['C', 'G', 'Am', 'F'] },
      { name: 'ii-V-I', chords: ['Dm', 'G', 'C'] },
      { name: 'I-vi-IV-V', chords: ['C', 'Am', 'F', 'G'] },
    ],
    enharmonic: null,
    color: keyColors['C'],
    position: calculatePosition(0),
    theoryNotes: {
      keyCharacteristics: 'Often described as pure, simple, and innocent',
      famousWorks: ['Prelude in C Major - Bach', 'Symphony No. 41 - Mozart'],
      relatedKeys: ['G', 'F', 'Am', 'Em', 'Dm'],
    },
  },
  G: {
    id: 'G',
    name: 'G Major',
    relativeMinor: 'E minor',
    keySignature: 1,
    sharpsOrFlats: 'sharps',
    fifthClockwise: 'D',
    fifthCounterClockwise: 'C',
    primaryChords: ['G', 'C', 'D'],
    secondaryChords: ['Am', 'Bm', 'Em', 'F#dim'],
    scale: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    modes: {
      ionian: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      dorian: ['A', 'B', 'C', 'D', 'E', 'F#', 'G'],
      phrygian: ['B', 'C', 'D', 'E', 'F#', 'G', 'A'],
      lydian: ['C', 'D', 'E', 'F#', 'G', 'A', 'B'],
      mixolydian: ['D', 'E', 'F#', 'G', 'A', 'B', 'C'],
      aeolian: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
      locrian: ['F#', 'G', 'A', 'B', 'C', 'D', 'E'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['G', 'D', 'Em', 'C'] },
      { name: 'ii-V-I', chords: ['Am', 'D', 'G'] },
      { name: 'I-vi-IV-V', chords: ['G', 'Em', 'C', 'D'] },
    ],
    enharmonic: null,
    color: keyColors['G'],
    position: calculatePosition(1),
    theoryNotes: {
      keyCharacteristics: 'Bright, cheerful, and pastoral',
      famousWorks: [
        'Air on the G String - Bach',
        'Eine kleine Nachtmusik - Mozart',
      ],
      relatedKeys: ['D', 'C', 'Em', 'Bm', 'Am'],
    },
  },
  // Continue with other keys...
  D: {
    id: 'D',
    name: 'D Major',
    relativeMinor: 'B minor',
    keySignature: 2,
    sharpsOrFlats: 'sharps',
    fifthClockwise: 'A',
    fifthCounterClockwise: 'G',
    primaryChords: ['D', 'G', 'A'],
    secondaryChords: ['Em', 'F#m', 'Bm', 'C#dim'],
    scale: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
    modes: {
      ionian: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
      dorian: ['E', 'F#', 'G', 'A', 'B', 'C#', 'D'],
      phrygian: ['F#', 'G', 'A', 'B', 'C#', 'D', 'E'],
      lydian: ['G', 'A', 'B', 'C#', 'D', 'E', 'F#'],
      mixolydian: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G'],
      aeolian: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
      locrian: ['C#', 'D', 'E', 'F#', 'G', 'A', 'B'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['D', 'A', 'Bm', 'G'] },
      { name: 'ii-V-I', chords: ['Em', 'A', 'D'] },
      { name: 'I-vi-IV-V', chords: ['D', 'Bm', 'G', 'A'] },
    ],
    enharmonic: null,
    color: keyColors['D'],
    position: calculatePosition(2),
    theoryNotes: {
      keyCharacteristics: 'Triumphant, victorious, and majestic',
      famousWorks: [
        'Hallelujah Chorus - Handel',
        'Violin Concerto - Beethoven',
      ],
      relatedKeys: ['A', 'G', 'Bm', 'F#m', 'Em'],
    },
  },
  A: {
    id: 'A',
    name: 'A Major',
    relativeMinor: 'F# minor',
    keySignature: 3,
    sharpsOrFlats: 'sharps',
    fifthClockwise: 'E',
    fifthCounterClockwise: 'D',
    primaryChords: ['A', 'D', 'E'],
    secondaryChords: ['Bm', 'C#m', 'F#m', 'G#dim'],
    scale: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    modes: {
      ionian: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
      dorian: ['B', 'C#', 'D', 'E', 'F#', 'G#', 'A'],
      phrygian: ['C#', 'D', 'E', 'F#', 'G#', 'A', 'B'],
      lydian: ['D', 'E', 'F#', 'G#', 'A', 'B', 'C#'],
      mixolydian: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D'],
      aeolian: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
      locrian: ['G#', 'A', 'B', 'C#', 'D', 'E', 'F#'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['A', 'E', 'F#m', 'D'] },
      { name: 'ii-V-I', chords: ['Bm', 'E', 'A'] },
      { name: 'I-vi-IV-V', chords: ['A', 'F#m', 'D', 'E'] },
    ],
    enharmonic: null,
    color: keyColors['A'],
    position: calculatePosition(3),
    theoryNotes: {
      keyCharacteristics: 'Joyful, passionate, and confident',
      famousWorks: [
        'Piano Sonata No. 11 - Mozart',
        'Symphony No. 7 - Beethoven',
      ],
      relatedKeys: ['E', 'D', 'F#m', 'C#m', 'Bm'],
    },
  },
  E: {
    id: 'E',
    name: 'E Major',
    relativeMinor: 'C# minor',
    keySignature: 4,
    sharpsOrFlats: 'sharps',
    fifthClockwise: 'B',
    fifthCounterClockwise: 'A',
    primaryChords: ['E', 'A', 'B'],
    secondaryChords: ['F#m', 'G#m', 'C#m', 'D#dim'],
    scale: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    modes: {
      ionian: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
      dorian: ['F#', 'G#', 'A', 'B', 'C#', 'D#', 'E'],
      phrygian: ['G#', 'A', 'B', 'C#', 'D#', 'E', 'F#'],
      lydian: ['A', 'B', 'C#', 'D#', 'E', 'F#', 'G#'],
      mixolydian: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A'],
      aeolian: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
      locrian: ['D#', 'E', 'F#', 'G#', 'A', 'B', 'C#'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['E', 'B', 'C#m', 'A'] },
      { name: 'ii-V-I', chords: ['F#m', 'B', 'E'] },
      { name: 'I-vi-IV-V', chords: ['E', 'C#m', 'A', 'B'] },
    ],
    enharmonic: null,
    color: keyColors['E'],
    position: calculatePosition(4),
    theoryNotes: {
      keyCharacteristics: 'Brilliant, energetic, and powerful',
      famousWorks: [
        'Spring from The Four Seasons - Vivaldi',
        'Symphony No. 9 - Dvorak',
      ],
      relatedKeys: ['B', 'A', 'C#m', 'G#m', 'F#m'],
    },
  },
  B: {
    id: 'B',
    name: 'B Major',
    relativeMinor: 'G# minor',
    keySignature: 5,
    sharpsOrFlats: 'sharps',
    fifthClockwise: 'F#',
    fifthCounterClockwise: 'E',
    primaryChords: ['B', 'E', 'F#'],
    secondaryChords: ['C#m', 'D#m', 'G#m', 'A#dim'],
    scale: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
    modes: {
      ionian: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
      dorian: ['C#', 'D#', 'E', 'F#', 'G#', 'A#', 'B'],
      phrygian: ['D#', 'E', 'F#', 'G#', 'A#', 'B', 'C#'],
      lydian: ['E', 'F#', 'G#', 'A#', 'B', 'C#', 'D#'],
      mixolydian: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E'],
      aeolian: ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
      locrian: ['A#', 'B', 'C#', 'D#', 'E', 'F#', 'G#'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['B', 'F#', 'G#m', 'E'] },
      { name: 'ii-V-I', chords: ['C#m', 'F#', 'B'] },
      { name: 'I-vi-IV-V', chords: ['B', 'G#m', 'E', 'F#'] },
    ],
    enharmonic: 'Cb',
    color: keyColors['B'],
    position: calculatePosition(5),
    theoryNotes: {
      keyCharacteristics: 'Harsh, strong, and wild',
      famousWorks: ['Mass in B minor - Bach', 'Piano Trio - Brahms'],
      relatedKeys: ['F#', 'E', 'G#m', 'D#m', 'C#m'],
    },
  },
  'F#': {
    id: 'F#',
    name: 'F# Major',
    relativeMinor: 'D# minor',
    keySignature: 6,
    sharpsOrFlats: 'sharps',
    fifthClockwise: 'C#',
    fifthCounterClockwise: 'B',
    primaryChords: ['F#', 'B', 'C#'],
    secondaryChords: ['G#m', 'A#m', 'D#m', 'E#dim'],
    scale: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
    modes: {
      ionian: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
      dorian: ['G#', 'A#', 'B', 'C#', 'D#', 'E#', 'F#'],
      phrygian: ['A#', 'B', 'C#', 'D#', 'E#', 'F#', 'G#'],
      lydian: ['B', 'C#', 'D#', 'E#', 'F#', 'G#', 'A#'],
      mixolydian: ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B'],
      aeolian: ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'],
      locrian: ['E#', 'F#', 'G#', 'A#', 'B', 'C#', 'D#'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['F#', 'C#', 'D#m', 'B'] },
      { name: 'ii-V-I', chords: ['G#m', 'C#', 'F#'] },
      { name: 'I-vi-IV-V', chords: ['F#', 'D#m', 'B', 'C#'] },
    ],
    enharmonic: 'Gb',
    color: keyColors['F#/Gb'],
    position: calculatePosition(6),
    theoryNotes: {
      keyCharacteristics: 'Triumph over difficulty, relief',
      famousWorks: ['Barcarolle - Chopin', 'Piano Sonata No. 24 - Beethoven'],
      relatedKeys: ['C#', 'B', 'D#m', 'A#m', 'G#m'],
    },
  },
  Gb: {
    id: 'Gb',
    name: 'Gb Major',
    relativeMinor: 'Eb minor',
    keySignature: 6,
    sharpsOrFlats: 'flats',
    fifthClockwise: 'Db',
    fifthCounterClockwise: 'Cb',
    primaryChords: ['Gb', 'Cb', 'Db'],
    secondaryChords: ['Abm', 'Bbm', 'Ebm', 'Fdim'],
    scale: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
    modes: {
      ionian: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
      dorian: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F', 'Gb'],
      phrygian: ['Bb', 'Cb', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
      lydian: ['Cb', 'Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb'],
      mixolydian: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb'],
      aeolian: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],
      locrian: ['F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['Gb', 'Db', 'Ebm', 'Cb'] },
      { name: 'ii-V-I', chords: ['Abm', 'Db', 'Gb'] },
      { name: 'I-vi-IV-V', chords: ['Gb', 'Ebm', 'Cb', 'Db'] },
    ],
    enharmonic: 'F#',
    color: keyColors['F#/Gb'],
    position: calculatePosition(6),
    theoryNotes: {
      keyCharacteristics: 'Gentle, soft, and peaceful',
      famousWorks: ['Impromptu in Gb - Chopin', 'Waltz in Gb - Chopin'],
      relatedKeys: ['Db', 'Cb', 'Ebm', 'Bbm', 'Abm'],
    },
  },
  Db: {
    id: 'Db',
    name: 'Db Major',
    relativeMinor: 'Bb minor',
    keySignature: 5,
    sharpsOrFlats: 'flats',
    fifthClockwise: 'Ab',
    fifthCounterClockwise: 'Gb',
    primaryChords: ['Db', 'Gb', 'Ab'],
    secondaryChords: ['Ebm', 'Fm', 'Bbm', 'Cdim'],
    scale: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
    modes: {
      ionian: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
      dorian: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'C', 'Db'],
      phrygian: ['F', 'Gb', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
      lydian: ['Gb', 'Ab', 'Bb', 'C', 'Db', 'Eb', 'F'],
      mixolydian: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'Gb'],
      aeolian: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
      locrian: ['C', 'Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['Db', 'Ab', 'Bbm', 'Gb'] },
      { name: 'ii-V-I', chords: ['Ebm', 'Ab', 'Db'] },
      { name: 'I-vi-IV-V', chords: ['Db', 'Bbm', 'Gb', 'Ab'] },
    ],
    enharmonic: 'C#',
    color: keyColors['Db'],
    position: calculatePosition(7),
    theoryNotes: {
      keyCharacteristics: 'Grief, depressive, and emotional',
      famousWorks: ['Clair de Lune - Debussy', 'Raindrop Prelude - Chopin'],
      relatedKeys: ['Ab', 'Gb', 'Bbm', 'Fm', 'Ebm'],
    },
  },
  Ab: {
    id: 'Ab',
    name: 'Ab Major',
    relativeMinor: 'F minor',
    keySignature: 4,
    sharpsOrFlats: 'flats',
    fifthClockwise: 'Eb',
    fifthCounterClockwise: 'Db',
    primaryChords: ['Ab', 'Db', 'Eb'],
    secondaryChords: ['Bbm', 'Cm', 'Fm', 'Gdim'],
    scale: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
    modes: {
      ionian: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
      dorian: ['Bb', 'C', 'Db', 'Eb', 'F', 'G', 'Ab'],
      phrygian: ['C', 'Db', 'Eb', 'F', 'G', 'Ab', 'Bb'],
      lydian: ['Db', 'Eb', 'F', 'G', 'Ab', 'Bb', 'C'],
      mixolydian: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'Db'],
      aeolian: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
      locrian: ['G', 'Ab', 'Bb', 'C', 'Db', 'Eb', 'F'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['Ab', 'Eb', 'Fm', 'Db'] },
      { name: 'ii-V-I', chords: ['Bbm', 'Eb', 'Ab'] },
      { name: 'I-vi-IV-V', chords: ['Ab', 'Fm', 'Db', 'Eb'] },
    ],
    enharmonic: 'G#',
    color: keyColors['Ab'],
    position: calculatePosition(8),
    theoryNotes: {
      keyCharacteristics: 'Grave, death, judgment, eternity',
      famousWorks: [
        'Sonata Pathétique - Beethoven',
        'Polonaise in Ab - Chopin',
      ],
      relatedKeys: ['Eb', 'Db', 'Fm', 'Cm', 'Bbm'],
    },
  },
  Eb: {
    id: 'Eb',
    name: 'Eb Major',
    relativeMinor: 'C minor',
    keySignature: 3,
    sharpsOrFlats: 'flats',
    fifthClockwise: 'Bb',
    fifthCounterClockwise: 'Ab',
    primaryChords: ['Eb', 'Ab', 'Bb'],
    secondaryChords: ['Fm', 'Gm', 'Cm', 'Ddim'],
    scale: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
    modes: {
      ionian: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
      dorian: ['F', 'G', 'Ab', 'Bb', 'C', 'D', 'Eb'],
      phrygian: ['G', 'Ab', 'Bb', 'C', 'D', 'Eb', 'F'],
      lydian: ['Ab', 'Bb', 'C', 'D', 'Eb', 'F', 'G'],
      mixolydian: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'Ab'],
      aeolian: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
      locrian: ['D', 'Eb', 'F', 'G', 'Ab', 'Bb', 'C'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['Eb', 'Bb', 'Cm', 'Ab'] },
      { name: 'ii-V-I', chords: ['Fm', 'Bb', 'Eb'] },
      { name: 'I-vi-IV-V', chords: ['Eb', 'Cm', 'Ab', 'Bb'] },
    ],
    enharmonic: 'D#',
    color: keyColors['Eb'],
    position: calculatePosition(9),
    theoryNotes: {
      keyCharacteristics: 'Heroic, majestic, and devotional',
      famousWorks: [
        'Symphony No. 3 "Eroica" - Beethoven',
        'Piano Concerto No. 5 - Beethoven',
      ],
      relatedKeys: ['Bb', 'Ab', 'Cm', 'Gm', 'Fm'],
    },
  },
  Bb: {
    id: 'Bb',
    name: 'Bb Major',
    relativeMinor: 'G minor',
    keySignature: 2,
    sharpsOrFlats: 'flats',
    fifthClockwise: 'F',
    fifthCounterClockwise: 'Eb',
    primaryChords: ['Bb', 'Eb', 'F'],
    secondaryChords: ['Cm', 'Dm', 'Gm', 'Adim'],
    scale: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
    modes: {
      ionian: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
      dorian: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
      phrygian: ['D', 'Eb', 'F', 'G', 'A', 'Bb', 'C'],
      lydian: ['Eb', 'F', 'G', 'A', 'Bb', 'C', 'D'],
      mixolydian: ['F', 'G', 'A', 'Bb', 'C', 'D', 'Eb'],
      aeolian: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
      locrian: ['A', 'Bb', 'C', 'D', 'Eb', 'F', 'G'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['Bb', 'F', 'Gm', 'Eb'] },
      { name: 'ii-V-I', chords: ['Cm', 'F', 'Bb'] },
      { name: 'I-vi-IV-V', chords: ['Bb', 'Gm', 'Eb', 'F'] },
    ],
    enharmonic: 'A#',
    color: keyColors['Bb'],
    position: calculatePosition(10),
    theoryNotes: {
      keyCharacteristics: 'Joyful, magnificent, and cheerful',
      famousWorks: [
        'Symphony No. 4 - Beethoven',
        'Piano Concerto No. 2 - Brahms',
      ],
      relatedKeys: ['F', 'Eb', 'Gm', 'Dm', 'Cm'],
    },
  },
  F: {
    id: 'F',
    name: 'F Major',
    relativeMinor: 'D minor',
    keySignature: 1,
    sharpsOrFlats: 'flats',
    fifthClockwise: 'C',
    fifthCounterClockwise: 'Bb',
    primaryChords: ['F', 'Bb', 'C'],
    secondaryChords: ['Gm', 'Am', 'Dm', 'Edim'],
    scale: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
    modes: {
      ionian: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
      dorian: ['G', 'A', 'Bb', 'C', 'D', 'E', 'F'],
      phrygian: ['A', 'Bb', 'C', 'D', 'E', 'F', 'G'],
      lydian: ['Bb', 'C', 'D', 'E', 'F', 'G', 'A'],
      mixolydian: ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'],
      aeolian: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
      locrian: ['E', 'F', 'G', 'A', 'Bb', 'C', 'D'],
    },
    commonProgressions: [
      { name: 'I-V-vi-IV', chords: ['F', 'C', 'Dm', 'Bb'] },
      { name: 'ii-V-I', chords: ['Gm', 'C', 'F'] },
      { name: 'I-vi-IV-V', chords: ['F', 'Dm', 'Bb', 'C'] },
    ],
    enharmonic: 'E#',
    color: keyColors['F'],
    position: calculatePosition(11),
    theoryNotes: {
      keyCharacteristics: 'Calm, pastoral, and complacent',
      famousWorks: [
        'Pastoral Symphony - Beethoven',
        'Brandenburg Concerto No. 1 - Bach',
      ],
      relatedKeys: ['C', 'Bb', 'Dm', 'Am', 'Gm'],
    },
  },
}

export const getKeyData = (keyId: string): KeyInfo => {
  // Handle enharmonic equivalents
  if (keyId === 'F#/Gb' || keyId === 'F#' || keyId === 'Gb') {
    return keysData['F#'] // Return F# as default for enharmonic
  }

  return keysData[keyId] || keysData['C'] // Default to C if key not found
}

export const getAllKeys = (): KeyInfo[] => {
  return keyOrder.map(key => getKeyData(key))
}

export const getKeyOrder = (): string[] => {
  return keyOrder
}

export const getMinorKeyOrder = (): string[] => {
  return minorKeyOrder
}
