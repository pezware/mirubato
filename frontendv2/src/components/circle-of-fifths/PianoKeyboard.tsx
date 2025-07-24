import React from 'react'
import { KeyInfo } from './types'

interface PianoKeyboardProps {
  selectedKey: string
  keyData: KeyInfo
  isPlaying: boolean
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  selectedKey: _selectedKey,
  keyData,
  isPlaying,
}) => {
  // Define the piano keys layout (2 octaves for display)
  const whiteKeys = [
    'C',
    'D',
    'E',
    'F',
    'G',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'A',
    'B',
  ]

  // Black key positions - between C-D, D-E, F-G, G-A, A-B (no black key between E-F or B-C)
  // Position values are relative to white key index (0.5 means between key 0 and 1)
  const blackKeyPositions = [
    0.5, // C#/Db between C and D
    1.5, // D#/Eb between D and E
    3.5, // F#/Gb between F and G
    4.5, // G#/Ab between G and A
    5.5, // A#/Bb between A and B
    7.5, // C#/Db between C and D (second octave)
    8.5, // D#/Eb between D and E
    10.5, // F#/Gb between F and G
    11.5, // G#/Ab between G and A
    12.5, // A#/Bb between A and B
  ]

  const blackKeyNotes = [
    'C#',
    'D#',
    'F#',
    'G#',
    'A#',
    'C#',
    'D#',
    'F#',
    'G#',
    'A#',
  ]

  // Get scale notes with enharmonic equivalents
  const getScaleNotesWithEnharmonics = () => {
    const scaleNotes = new Set(keyData.scale)
    const enharmonicMap: Record<string, string> = {
      'C#': 'Db',
      Db: 'C#',
      'D#': 'Eb',
      Eb: 'D#',
      'F#': 'Gb',
      Gb: 'F#',
      'G#': 'Ab',
      Ab: 'G#',
      'A#': 'Bb',
      Bb: 'A#',
      'E#': 'F',
      Cb: 'B',
      'B#': 'C',
      Fb: 'E',
    }

    // Add enharmonic equivalents
    keyData.scale.forEach(note => {
      if (enharmonicMap[note]) {
        scaleNotes.add(enharmonicMap[note])
      }
    })

    return scaleNotes
  }

  // Get the appropriate note name based on the scale
  const getBlackKeyLabel = (index: number) => {
    const sharpNote = blackKeyNotes[index]

    // For keys that use flats (F, Bb, Eb, Ab, Db, Gb and their relative minors),
    // always display flat names
    if (keyData.sharpsOrFlats === 'flats') {
      const sharpToFlatMap: Record<string, string> = {
        'C#': 'Db',
        'D#': 'Eb',
        'F#': 'Gb',
        'G#': 'Ab',
        'A#': 'Bb',
      }
      return sharpToFlatMap[sharpNote] || sharpNote
    }

    // For sharp keys, check if the scale contains the sharp or its enharmonic
    if (keyData.scale.includes(sharpNote)) {
      return sharpNote
    }

    // Check for flat equivalent in scale (for edge cases)
    const flatMap: Record<string, string> = {
      'C#': 'Db',
      'D#': 'Eb',
      'F#': 'Gb',
      'G#': 'Ab',
      'A#': 'Bb',
    }

    const flatNote = flatMap[sharpNote]
    if (flatNote && keyData.scale.includes(flatNote)) {
      return flatNote
    }

    return sharpNote
  }

  const scaleNotes = getScaleNotesWithEnharmonics()

  // Check if a note is in the current scale
  const isNoteInScale = (note: string) => {
    return scaleNotes.has(note)
  }

  // Get chord notes for highlighting
  const getChordNotes = () => {
    // Get primary chords (I, IV, V) - these are the tonic, subdominant, and dominant
    const chordNotes = new Set<string>()

    // Add all notes from primary chords
    keyData.primaryChords.forEach(chord => {
      // Extract the root note of each chord (remove 'm', 'dim', etc.)
      const rootNote = chord.replace(/m|dim|maj|7|9|11|13|sus|add/g, '').trim()
      chordNotes.add(rootNote)
    })

    return chordNotes
  }

  // Separate root note for special highlighting
  const rootNote = keyData.id
  const rootNoteWithEnharmonic = new Set([rootNote])
  if (keyData.enharmonic) {
    rootNoteWithEnharmonic.add(keyData.enharmonic)
  }

  const chordNotes = getChordNotes()

  // Extract the actual root note (without 'm' for minor keys)
  const actualRootNote = rootNote.includes('m')
    ? rootNote.replace(/m$/, '')
    : rootNote

  // Track octave highlighting state
  const octaveHighlighting = (() => {
    let foundFirstRoot = false
    let foundSecondRoot = false
    const highlights = new Map<string, boolean>()

    // Process keys in chromatic order (C, C#, D, D#, E, F, F#, G, G#, A, A#, B, C...)
    const keyOrder = [
      { type: 'white', index: 0, note: whiteKeys[0] }, // C
      {
        type: 'black',
        index: 0,
        note: blackKeyNotes[0],
        displayNote: getBlackKeyLabel(0),
      }, // C#/Db
      { type: 'white', index: 1, note: whiteKeys[1] }, // D
      {
        type: 'black',
        index: 1,
        note: blackKeyNotes[1],
        displayNote: getBlackKeyLabel(1),
      }, // D#/Eb
      { type: 'white', index: 2, note: whiteKeys[2] }, // E
      { type: 'white', index: 3, note: whiteKeys[3] }, // F
      {
        type: 'black',
        index: 2,
        note: blackKeyNotes[2],
        displayNote: getBlackKeyLabel(2),
      }, // F#/Gb
      { type: 'white', index: 4, note: whiteKeys[4] }, // G
      {
        type: 'black',
        index: 3,
        note: blackKeyNotes[3],
        displayNote: getBlackKeyLabel(3),
      }, // G#/Ab
      { type: 'white', index: 5, note: whiteKeys[5] }, // A
      {
        type: 'black',
        index: 4,
        note: blackKeyNotes[4],
        displayNote: getBlackKeyLabel(4),
      }, // A#/Bb
      { type: 'white', index: 6, note: whiteKeys[6] }, // B
      // Second octave
      { type: 'white', index: 7, note: whiteKeys[7] }, // C
      {
        type: 'black',
        index: 5,
        note: blackKeyNotes[5],
        displayNote: getBlackKeyLabel(5),
      }, // C#/Db
      { type: 'white', index: 8, note: whiteKeys[8] }, // D
      {
        type: 'black',
        index: 6,
        note: blackKeyNotes[6],
        displayNote: getBlackKeyLabel(6),
      }, // D#/Eb
      { type: 'white', index: 9, note: whiteKeys[9] }, // E
      { type: 'white', index: 10, note: whiteKeys[10] }, // F
      {
        type: 'black',
        index: 7,
        note: blackKeyNotes[7],
        displayNote: getBlackKeyLabel(7),
      }, // F#/Gb
      { type: 'white', index: 11, note: whiteKeys[11] }, // G
      {
        type: 'black',
        index: 8,
        note: blackKeyNotes[8],
        displayNote: getBlackKeyLabel(8),
      }, // G#/Ab
      { type: 'white', index: 12, note: whiteKeys[12] }, // A
      {
        type: 'black',
        index: 9,
        note: blackKeyNotes[9],
        displayNote: getBlackKeyLabel(9),
      }, // A#/Bb
      { type: 'white', index: 13, note: whiteKeys[13] }, // B
    ]

    keyOrder.forEach(key => {
      const isRoot =
        key.type === 'white'
          ? !!(
              key.note === actualRootNote ||
              (keyData.enharmonic && key.note === keyData.enharmonic)
            )
          : !!(
              key.note === actualRootNote ||
              key.displayNote === actualRootNote ||
              (keyData.enharmonic &&
                (key.note === keyData.enharmonic ||
                  key.displayNote === keyData.enharmonic))
            )

      if (isRoot && !foundFirstRoot) {
        foundFirstRoot = true
      } else if (isRoot && foundFirstRoot && !foundSecondRoot) {
        foundSecondRoot = true
      }

      // Highlight if we're between the first and second root (inclusive)
      const shouldHighlight = !!(foundFirstRoot && (!foundSecondRoot || isRoot))
      highlights.set(`${key.type}-${key.index}`, shouldHighlight)
    })

    return highlights
  })()

  // Simple helper functions
  const isNoteInOctaveRange = (noteIndex: number) => {
    return octaveHighlighting.get(`white-${noteIndex}`) || false
  }

  const isBlackKeyInOctaveRange = (blackKeyIndex: number) => {
    return octaveHighlighting.get(`black-${blackKeyIndex}`) || false
  }

  return (
    <div className="w-full">
      <div className="relative bg-gray-100 rounded-lg p-1 md:p-4 overflow-x-auto">
        <div className="relative h-24 md:h-36 min-w-[320px] md:min-w-[600px]">
          {/* White Keys */}
          <div className="absolute bottom-0 left-0 flex gap-0.25">
            {whiteKeys.map((note, index) => {
              // Check if this note is within the octave range starting from the root note
              const isInOctave = isNoteInOctaveRange(index)
              const isInScale = isInOctave && isNoteInScale(note)
              const isChordNote = isInOctave && chordNotes.has(note)
              const isRootNote = isInOctave && rootNoteWithEnharmonic.has(note)
              const isActive = isPlaying && isRootNote

              return (
                <div
                  key={`white-${index}`}
                  className={`
                    relative w-6 md:w-10 h-24 md:h-36 bg-white rounded-b
                    transition-all duration-200 shadow-sm
                    ${isActive ? 'shadow-inner' : ''}
                    hover:bg-gray-50
                  `}
                  style={{
                    border: '1px solid #E5E7EB',
                    borderBottom: isRootNote
                      ? '4px solid #DC2626'
                      : isInScale
                        ? '4px solid #FB923C'
                        : '1px solid #E5E7EB',
                    borderRight: isRootNote
                      ? '3px solid #DC2626'
                      : isInScale
                        ? '3px solid #FB923C'
                        : '1px solid #E5E7EB',
                    boxShadow: isActive
                      ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
                      : '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <span
                    className={`
                    absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs
                    ${isRootNote ? 'font-bold text-red-600' : isChordNote ? 'font-semibold text-red-400' : isInScale ? 'text-orange-500 font-medium' : 'text-gray-400'}
                  `}
                  >
                    {note}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Black Keys - Mobile */}
          <div className="absolute top-0 left-0 md:hidden">
            {blackKeyPositions.map((position, index) => {
              const note = blackKeyNotes[index]
              const displayNote = getBlackKeyLabel(index)
              // Check if this black key is within the octave range
              const isInOctave = isBlackKeyInOctaveRange(index)
              const isInScale =
                isInOctave &&
                (isNoteInScale(note) || isNoteInScale(displayNote))
              const isChordNote =
                isInOctave &&
                (chordNotes.has(note) || chordNotes.has(displayNote))
              const isRootNote =
                isInOctave &&
                (rootNoteWithEnharmonic.has(note) ||
                  rootNoteWithEnharmonic.has(displayNote))
              const isActive = isPlaying && isRootNote

              return (
                <div
                  key={`black-mobile-${index}`}
                  className={`
                    absolute w-3 h-12 bg-gray-900 rounded-b shadow-md
                    transition-all duration-200 z-10
                    ${isActive ? 'shadow-inner' : ''}
                    hover:bg-gray-800
                  `}
                  style={{
                    left: `${position * 24.25 + 10.5}px`,
                    top: '0px',
                    border: '1px solid #374151',
                    borderBottom: isRootNote
                      ? '3px solid #DC2626'
                      : isInScale
                        ? '3px solid #FB923C'
                        : '1px solid #374151',
                    borderRight: isRootNote
                      ? '2px solid #DC2626'
                      : isInScale
                        ? '2px solid #FB923C'
                        : '1px solid #374151',
                    boxShadow: isActive
                      ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                      : '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  <span
                    className={`
                    absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[10px]
                    ${isRootNote ? 'text-red-400 font-bold' : isChordNote ? 'text-red-300 font-semibold' : isInScale ? 'text-orange-400 font-medium' : 'text-gray-500'}
                  `}
                  >
                    {displayNote.length > 2
                      ? displayNote.substring(0, 2)
                      : displayNote}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Black Keys - Desktop */}
          <div className="absolute top-0 left-0 hidden md:block">
            {blackKeyPositions.map((position, index) => {
              const note = blackKeyNotes[index]
              const displayNote = getBlackKeyLabel(index)
              // Check if this black key is within the octave range
              const isInOctave = isBlackKeyInOctaveRange(index)
              const isInScale =
                isInOctave &&
                (isNoteInScale(note) || isNoteInScale(displayNote))
              const isChordNote =
                isInOctave &&
                (chordNotes.has(note) || chordNotes.has(displayNote))
              const isRootNote =
                isInOctave &&
                (rootNoteWithEnharmonic.has(note) ||
                  rootNoteWithEnharmonic.has(displayNote))
              const isActive = isPlaying && isRootNote

              return (
                <div
                  key={`black-desktop-${index}`}
                  className={`
                    absolute w-7 h-20 bg-gray-900 rounded-b shadow-md
                    transition-all duration-200 z-10
                    ${isActive ? 'shadow-inner' : ''}
                    hover:bg-gray-800
                  `}
                  style={{
                    left: `${position * 40.5 + 18.5}px`,
                    top: '0px',
                    border: '1px solid #374151',
                    borderBottom: isRootNote
                      ? '3px solid #DC2626'
                      : isInScale
                        ? '3px solid #FB923C'
                        : '1px solid #374151',
                    borderRight: isRootNote
                      ? '2px solid #DC2626'
                      : isInScale
                        ? '2px solid #FB923C'
                        : '1px solid #374151',
                    boxShadow: isActive
                      ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                      : '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  <span
                    className={`
                    absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[10px]
                    ${isRootNote ? 'text-red-400 font-bold' : isChordNote ? 'text-red-300 font-semibold' : isInScale ? 'text-orange-400 font-medium' : 'text-gray-500'}
                  `}
                  >
                    {displayNote.length > 2
                      ? displayNote.substring(0, 2)
                      : displayNote}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white rounded border-b-4 border-r-2 border-red-600 border-t border-l border-gray-300"></div>
          <span className="text-gray-600">Root Note</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white rounded border-b-4 border-r-2 border-orange-500 border-t border-l border-gray-300"></div>
          <span className="text-gray-600">Scale Notes</span>
        </div>
      </div>
    </div>
  )
}

export default PianoKeyboard
