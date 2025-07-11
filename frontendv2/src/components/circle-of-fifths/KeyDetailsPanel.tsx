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
    <div className="bg-gray-50 rounded-lg shadow-sm p-4 space-y-4">
      {/* Key Header */}
      <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-purple-300">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Music className="w-6 h-6 text-morandi-purple-400" />
          {keyData.name}
        </h2>
        <p className="text-sm text-gray-600 mt-1">{getKeySignatureDisplay()}</p>
      </div>

      {/* Key Relationships */}
      <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-sage-300">
        <h3 className="font-semibold text-gray-700 mb-3">Key Relationships</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Relative Minor:</span>
            <span className="px-3 py-1 bg-morandi-sage-100 text-morandi-sage-500 rounded-md text-sm font-medium">
              {keyData.relativeMinor}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Dominant (V):</span>
            <span className="px-3 py-1 bg-morandi-sage-100 text-morandi-sage-500 rounded-md text-sm font-medium">
              {keyData.fifthClockwise}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subdominant (IV):</span>
            <span className="px-3 py-1 bg-morandi-sage-100 text-morandi-sage-500 rounded-md text-sm font-medium">
              {keyData.fifthCounterClockwise}
            </span>
          </div>
          {keyData.enharmonic && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Enharmonic:</span>
              <span className="px-3 py-1 bg-morandi-sage-100 text-morandi-sage-500 rounded-md text-sm font-medium">
                {keyData.enharmonic}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scale */}
      <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-rose-300">
        <h3 className="font-semibold text-gray-700 mb-3">Scale Notes</h3>
        <div className="flex flex-wrap gap-2">
          {keyData.scale.map((note, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-morandi-sage-100 text-morandi-sage-500 rounded-md text-sm font-medium"
            >
              {note}
            </span>
          ))}
        </div>
      </div>

      {/* Primary Chords */}
      <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-peach-300">
        <h3 className="font-semibold text-gray-700 mb-3">
          Primary Chords (I, IV, V)
        </h3>
        <div className="flex gap-2">
          {keyData.primaryChords.map((chord, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-morandi-sage-100 text-morandi-sage-500 rounded-md text-sm font-medium"
            >
              {chord}
            </span>
          ))}
        </div>
      </div>

      {/* Common Progressions */}
      <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-sky-300">
        <h3 className="font-semibold text-gray-700 mb-3">
          Common Progressions
        </h3>
        <div className="space-y-2">
          {keyData.commonProgressions.map((progression, index) => (
            <div key={index} className="text-sm">
              <span className="font-medium text-gray-700">
                {progression.name}:
              </span>
              <div className="flex gap-2 items-center mt-1 flex-wrap">
                {progression.chords.map((chord, chordIndex) => (
                  <React.Fragment key={chordIndex}>
                    <span className="px-3 py-1 bg-morandi-sage-100 text-morandi-sage-500 rounded-md text-sm font-medium">
                      {chord}
                    </span>
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
      <div className="bg-white rounded-lg p-4 border-l-4 border-morandi-sand-300">
        <h3 className="font-semibold text-gray-700 mb-3">Characteristics</h3>
        <p className="text-sm text-gray-600 italic">
          {keyData.theoryNotes.keyCharacteristics}
        </p>
        {keyData.theoryNotes.famousWorks.length > 0 && (
          <div className="mt-3">
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
        )}
      </div>
    </div>
  )
}

export default KeyDetailsPanel
