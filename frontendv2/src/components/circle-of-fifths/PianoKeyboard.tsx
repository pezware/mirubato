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
  const blackKeyPositions = [
    0.5, 1.5, 3.5, 4.5, 5.5, 7.5, 8.5, 10.5, 11.5, 12.5,
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
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Piano Keyboard
      </h3>

      <div className="relative bg-gray-100 rounded-lg p-4 overflow-x-auto">
        <div className="relative h-32 min-w-[560px]">
          {/* White Keys */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {whiteKeys.map((note, index) => {
              const isInScale = isNoteInScale(note)
              const isChordNote = chordNotes.has(note)
              const isActive = isPlaying && isChordNote

              return (
                <div
                  key={`white-${index}`}
                  className={`
                    relative w-10 h-24 border border-gray-300 rounded-b-md
                    transition-all duration-200
                    ${isActive ? 'bg-purple-400' : isChordNote ? 'bg-purple-200' : isInScale ? 'bg-sage-100' : 'bg-white'}
                    ${!isActive && 'hover:bg-gray-50'}
                  `}
                >
                  <span
                    className={`
                    absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs
                    ${isChordNote ? 'font-bold text-purple-700' : isInScale ? 'text-sage-700' : 'text-gray-500'}
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
                    absolute w-7 h-16 rounded-b-md
                    transition-all duration-200
                    ${isActive ? 'bg-purple-600' : isChordNote ? 'bg-purple-400' : isInScale ? 'bg-sage-600' : 'bg-gray-800'}
                  `}
                  style={{ left: `${position * 40 + 16}px` }}
                >
                  <span
                    className={`
                    absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs
                    ${isChordNote || isInScale ? 'text-white font-medium' : 'text-gray-300'}
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
          <div className="w-4 h-4 bg-purple-200 rounded border border-gray-300"></div>
          <span className="text-gray-600">Root Note</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-sage-100 rounded border border-gray-300"></div>
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
