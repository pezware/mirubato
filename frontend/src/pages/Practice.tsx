import React, { useState, useEffect } from 'react'
import { useAudioManager } from '../contexts/AudioContext'
import {
  moonlightSonata3rdMovement,
  getPlayableNotes,
} from '../data/sheetMusic'
import {
  SaveProgressPrompt,
  PracticeHeader,
  PracticeControls,
  PracticeNotation,
} from '../components'
import type { PracticeMode } from '../components'
import { useViewport } from '../hooks/useViewport'

const Practice: React.FC = () => {
  const audioManager = useAudioManager()
  const { isMobile, isTablet } = useViewport()

  // Control states
  const [mode, setMode] = useState<PracticeMode>('practice')
  const [volume, setVolume] = useState(75) // 0-100
  const [showGhostControls, setShowGhostControls] = useState(true)
  const [currentPlayingMeasure, setCurrentPlayingMeasure] = useState<
    number | undefined
  >()

  // Get the current piece data
  const currentPiece = moonlightSonata3rdMovement
  const playableNotes = getPlayableNotes(currentPiece)

  // Set instrument to piano (but don't initialize audio yet)
  useEffect(() => {
    audioManager.setInstrument('piano')
  }, [audioManager])

  return (
    <div className="min-h-screen bg-gradient-to-b from-mirubato-wood-50 to-white">
      <PracticeHeader mode={mode} onModeChange={setMode} isMobile={isMobile} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <PracticeNotation
          sheetMusic={currentPiece}
          currentPlayingMeasure={currentPlayingMeasure}
        />

        <PracticeControls
          mode={mode}
          volume={volume}
          onVolumeChange={setVolume}
          showGhostControls={showGhostControls}
          playableNotes={playableNotes}
          totalMeasures={currentPiece.measures.length}
          currentPlayingMeasure={currentPlayingMeasure}
          onMeasureChange={setCurrentPlayingMeasure}
          isMobile={isMobile}
          isTablet={isTablet}
        />

        {/* Debug Mode Toggle */}
        {mode === 'debug' && (
          <div className="mt-4 p-4 bg-mirubato-wood-50 rounded-lg text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!showGhostControls}
                onChange={e => setShowGhostControls(!e.target.checked)}
                className="rounded"
              />
              Show all controls at full opacity
            </label>
          </div>
        )}
      </main>

      {/* Save Progress Prompt for Anonymous Users */}
      <SaveProgressPrompt triggerAfterSessions={3} triggerAfterMinutes={30} />
    </div>
  )
}

export default Practice
