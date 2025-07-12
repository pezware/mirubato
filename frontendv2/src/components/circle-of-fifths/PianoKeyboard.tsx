import React from 'react'
import { KeyInfo } from './types'

interface PianoKeyboardProps {
  selectedKey: string
  keyData: KeyInfo
  isPlaying: boolean
}

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  selectedKey,
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

  // Get the appropriate note name based on the scale (prefer flats for minor keys)
  const getBlackKeyLabel = (index: number) => {
    const sharpNote = blackKeyNotes[index]
    const isMinorKey = selectedKey.includes('m')

    // For minor keys, prefer flat names when they're in the scale
    if (isMinorKey) {
      const enharmonicMap: Record<string, string> = {
        'C#': 'Db',
        'D#': 'Eb',
        'F#': 'Gb',
        'G#': 'Ab',
        'A#': 'Bb',
      }

      const flatEquivalent = enharmonicMap[sharpNote]
      if (flatEquivalent && keyData.scale.includes(flatEquivalent)) {
        return flatEquivalent
      }
    }

    // Check if the scale uses the sharp or flat version
    if (keyData.scale.includes(sharpNote)) {
      return sharpNote
    }

    // Check for flat equivalent in scale
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

  return (
    <div className="w-full">
      <div className="relative bg-gray-100 rounded-lg p-2 md:p-4 overflow-x-auto">
        <div className="relative h-32 md:h-36 min-w-[450px] md:min-w-[600px]">
          {/* White Keys */}
          <div className="absolute bottom-0 left-0 flex gap-0.5">
            {whiteKeys.map((note, index) => {
              const isInScale = isNoteInScale(note)
              const isChordNote = chordNotes.has(note)
              const isRootNote = rootNoteWithEnharmonic.has(note)
              const isActive = isPlaying && isRootNote

              return (
                <div
                  key={`white-${index}`}
                  className={`
                    relative w-8 md:w-10 h-32 md:h-36 bg-white rounded-b
                    transition-all duration-200 shadow-sm
                    ${isActive ? 'shadow-inner' : ''}
                    hover:bg-gray-50
                  `}
                  style={{
                    border: '1px solid #E5E7EB',
                    borderBottom: isRootNote
                      ? '4px solid #DC2626'
                      : isChordNote
                        ? '4px solid #F87171'
                        : isInScale
                          ? '4px solid #FB923C'
                          : '1px solid #E5E7EB',
                    borderRight: isRootNote
                      ? '3px solid #DC2626'
                      : isChordNote
                        ? '3px solid #F87171'
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
              const isInScale =
                isNoteInScale(note) || isNoteInScale(displayNote)
              const isChordNote =
                chordNotes.has(note) || chordNotes.has(displayNote)
              const isRootNote =
                rootNoteWithEnharmonic.has(note) ||
                rootNoteWithEnharmonic.has(displayNote)
              const isActive = isPlaying && isRootNote

              return (
                <div
                  key={`black-mobile-${index}`}
                  className={`
                    absolute w-5 h-16 bg-gray-900 rounded-b shadow-md
                    transition-all duration-200 z-10
                    ${isActive ? 'shadow-inner' : ''}
                    hover:bg-gray-800
                  `}
                  style={{
                    left: `${position * 32.5 + 14.5}px`,
                    top: '0px',
                    border: '1px solid #374151',
                    borderBottom: isRootNote
                      ? '3px solid #DC2626'
                      : isChordNote
                        ? '3px solid #F87171'
                        : isInScale
                          ? '3px solid #FB923C'
                          : '1px solid #374151',
                    borderRight: isRootNote
                      ? '2px solid #DC2626'
                      : isChordNote
                        ? '2px solid #F87171'
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
              const isInScale =
                isNoteInScale(note) || isNoteInScale(displayNote)
              const isChordNote =
                chordNotes.has(note) || chordNotes.has(displayNote)
              const isRootNote =
                rootNoteWithEnharmonic.has(note) ||
                rootNoteWithEnharmonic.has(displayNote)
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
                      : isChordNote
                        ? '3px solid #F87171'
                        : isInScale
                          ? '3px solid #FB923C'
                          : '1px solid #374151',
                    borderRight: isRootNote
                      ? '2px solid #DC2626'
                      : isChordNote
                        ? '2px solid #F87171'
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
          <div className="w-4 h-4 bg-white rounded border-b-4 border-r-2 border-red-400 border-t border-l border-gray-300"></div>
          <span className="text-gray-600">Chord Notes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white rounded border-b-4 border-r-2 border-orange-500 border-t border-l border-gray-300"></div>
          <span className="text-gray-600">Scale Notes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white rounded border border-gray-300"></div>
          <span className="text-gray-600">Other Notes</span>
        </div>
      </div>
    </div>
  )
}

export default PianoKeyboard
