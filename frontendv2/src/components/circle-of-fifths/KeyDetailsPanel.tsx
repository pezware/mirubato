import React from 'react'
import { KeyInfo } from './types'
import { Music } from 'lucide-react'

interface KeyDetailsPanelProps {
  keyData: KeyInfo
}

const KeyDetailsPanel: React.FC<KeyDetailsPanelProps> = ({ keyData }) => {
  const getKeySignatureDisplay = () => {
    if (keyData.keySignature === 0) return 'No sharps or flats'
    const count = keyData.keySignature
    const type = keyData.sharpsOrFlats === 'sharps' ? 'sharp' : 'flat'
    return `${count} ${type}${count > 1 ? 's' : ''}`
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Key Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Music className="w-6 h-6 text-purple-600" />
          {keyData.name}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{getKeySignatureDisplay()}</p>
      </div>

      {/* Key Relationships */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Key Relationships</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Relative Minor:</span>
            <span className="font-medium">{keyData.relativeMinor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Dominant (V):</span>
            <span className="font-medium">{keyData.fifthClockwise}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Subdominant (IV):</span>
            <span className="font-medium">{keyData.fifthCounterClockwise}</span>
          </div>
          {keyData.enharmonic && (
            <div className="flex justify-between">
              <span className="text-gray-600">Enharmonic:</span>
              <span className="font-medium">{keyData.enharmonic}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Scale Notes</h3>
        <div className="flex flex-wrap gap-2">
          {keyData.scale.map((note, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md text-sm font-medium"
            >
              {note}
            </span>
          ))}
        </div>
      </div>

      {/* Primary Chords */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">
          Primary Chords (I, IV, V)
        </h3>
        <div className="flex gap-2">
          {keyData.primaryChords.map((chord, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-sage-100 text-sage-700 rounded-md text-sm font-medium"
            >
              {chord}
            </span>
          ))}
        </div>
      </div>

      {/* Common Progressions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Common Progressions</h3>
        <div className="space-y-2">
          {keyData.commonProgressions.map((progression, index) => (
            <div key={index} className="text-sm">
              <span className="font-medium text-gray-700">
                {progression.name}:
              </span>
              <div className="flex gap-1 mt-1">
                {progression.chords.map((chord, chordIndex) => (
                  <React.Fragment key={chordIndex}>
                    <span className="text-gray-600">{chord}</span>
                    {chordIndex < progression.chords.length - 1 && (
                      <span className="text-gray-400">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theory Notes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Characteristics</h3>
        <p className="text-sm text-gray-600 italic">
          {keyData.theoryNotes.keyCharacteristics}
        </p>
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-700 mb-1">
            Famous Works:
          </p>
          <ul className="text-xs text-gray-600 space-y-1">
            {keyData.theoryNotes.famousWorks.map((work, index) => (
              <li key={index} className="pl-2">
                • {work}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default KeyDetailsPanel
