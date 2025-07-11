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

  const scaleNotes = getScaleNotesWithEnharmonics()

  // Check if a note is in the current scale
  const isNoteInScale = (note: string) => {
    return scaleNotes.has(note)
  }

  // Get chord notes for highlighting
  const getChordNotes = () => {
    // For now, just highlight the root note
    // In the future, we can expand this to show full chord tones
    const rootNote = keyData.id
    const chordNotes = new Set([rootNote])

    // Add enharmonic equivalent if exists
    if (keyData.enharmonic) {
      chordNotes.add(keyData.enharmonic)
    }

    return chordNotes
  }

  const chordNotes = getChordNotes()

  return (
    <div className="w-full">
      <div className="relative bg-gray-100 rounded-lg p-4 overflow-x-auto">
        <div className="relative h-36 min-w-[600px]">
          {/* White Keys */}
          <div className="absolute bottom-0 left-0 flex gap-0.5">
            {whiteKeys.map((note, index) => {
              const isInScale = isNoteInScale(note)
              const isChordNote = chordNotes.has(note)
              const isActive = isPlaying && isChordNote

              return (
                <div
                  key={`white-${index}`}
                  className={`
                    relative w-10 h-28 border border-gray-400 rounded-b
                    transition-all duration-200 shadow-sm
                    ${isActive ? 'bg-purple-400 shadow-inner' : isChordNote ? 'bg-purple-300' : isInScale ? 'bg-sage-200' : 'bg-white'}
                    ${!isActive && !isChordNote && 'hover:bg-gray-50'}
                  `}
                  style={{
                    boxShadow: isActive
                      ? 'inset 0 2px 4px rgba(0,0,0,0.2)'
                      : '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <span
                    className={`
                    absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs
                    ${isChordNote ? 'font-bold text-purple-700' : isInScale ? 'text-sage-700 font-medium' : 'text-gray-400'}
                  `}
                  >
                    {note}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Black Keys */}
          <div className="absolute top-0 left-0">
            {blackKeyPositions.map((position, index) => {
              const note = blackKeyNotes[index]
              const isInScale = isNoteInScale(note)
              const isChordNote = chordNotes.has(note)
              const isActive = isPlaying && isChordNote

              return (
                <div
                  key={`black-${index}`}
                  className={`
                    absolute w-6 h-16 rounded-b shadow-md
                    transition-all duration-200 z-10
                    ${isActive ? 'bg-purple-600 shadow-inner' : isChordNote ? 'bg-purple-500' : isInScale ? 'bg-sage-700' : 'bg-gray-900'}
                    ${!isActive && !isChordNote && !isInScale && 'hover:bg-gray-800'}
                  `}
                  style={{
                    left: `${position * 40.5 + 17}px`,
                    boxShadow: isActive
                      ? 'inset 0 2px 4px rgba(0,0,0,0.3)'
                      : '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  <span
                    className={`
                    absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[10px]
                    ${isChordNote || isInScale ? 'text-white font-medium' : 'text-gray-400'}
                  `}
                  >
                    {note.length > 2 ? note.substring(0, 2) : note}
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
          <div className="w-4 h-4 bg-purple-300 rounded border border-gray-300"></div>
          <span className="text-gray-600">Root Note</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-sage-200 rounded border border-gray-300"></div>
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
