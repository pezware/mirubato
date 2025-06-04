import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAudioManager } from '../contexts/AudioContext'
import {
  moonlightSonata3rdMovement,
  getPlayableNotes,
} from '../data/sheetMusic'
import {
  MusicPlayer,
  CircularControl,
  UserStatusIndicator,
  SaveProgressPrompt,
} from '../components'
import { SheetMusicDisplay } from '../components/SheetMusicDisplay'
import * as Tone from 'tone'

type PracticeMode = 'practice' | 'sight-read' | 'debug'

const Practice: React.FC = () => {
  const audioManager = useAudioManager()
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)

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

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle volume changes
  const handleVolumeChange = (value: number) => {
    setVolume(value)
    // Convert 0-100 to -60 to 0 dB
    const db = (value / 100) * 60 - 60
    Tone.Master.volume.value = db
  }

  const isMobile = viewportWidth < 640
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024

  return (
    <div className="min-h-screen bg-gradient-to-b from-mirubato-wood-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur shadow-sm border-b border-mirubato-wood-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isMobile && (
                <button className="text-mirubato-wood-600 hover:text-mirubato-wood-800">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              )}
              <h1 className="text-xl sm:text-2xl font-lexend font-light text-mirubato-wood-800">
                mirubato
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* User Status */}
              <UserStatusIndicator />

              {/* Mode Selector - Hidden on mobile */}
              {!isMobile && (
                <div className="flex bg-mirubato-wood-50 rounded-lg p-1">
                  {(['practice', 'sight-read', 'debug'] as PracticeMode[]).map(
                    m => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-3 py-1 rounded-md text-sm transition-all ${
                          mode === m
                            ? 'bg-white text-mirubato-wood-800 shadow-sm'
                            : 'text-mirubato-wood-500 hover:text-mirubato-wood-700'
                        }`}
                      >
                        {m === 'sight-read'
                          ? 'Sight Read'
                          : m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    )
                  )}
                </div>
              )}

              <Link
                to="/"
                className="text-mirubato-wood-600 hover:text-mirubato-wood-800 transition-colors text-sm"
              >
                {isMobile ? '×' : '← Back'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Piece Info - Compact on mobile */}
        <div className="bg-white/70 backdrop-blur rounded-lg shadow-sm border border-mirubato-wood-100 p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span className="font-medium text-mirubato-wood-800">
                {currentPiece.title}
              </span>
              <span className="text-mirubato-wood-500 ml-2">
                {currentPiece.composer}
              </span>
            </div>
            <div className="text-mirubato-wood-500">
              {currentPiece.measures[0]?.keySignature} •{' '}
              {currentPiece.measures[0]?.tempo?.marking}
            </div>
          </div>
        </div>

        {/* Notation Display */}
        <div className="relative mb-4 w-full">
          <SheetMusicDisplay
            sheetMusic={currentPiece}
            className="shadow-sm border border-mirubato-wood-100 rounded-xl"
            currentPlayingMeasure={currentPlayingMeasure}
          />
        </div>

        {/* Controls Section */}
        <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-mirubato-wood-100 p-4">
          {/* Desktop Layout */}
          {!isMobile && !isTablet && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-6">
                {/* Transport and Tempo */}
                <div className="flex items-center gap-4">
                  <MusicPlayer
                    notes={playableNotes.map(n => ({
                      note: n.note,
                      time: n.time,
                      originalTime: n.time,
                    }))}
                    initialTempo={40}
                    totalMeasures={currentPiece.measures.length}
                    showMeasureProgress={false}
                    showStopButton={true}
                    showTempoControl={true}
                    onMeasureChange={setCurrentPlayingMeasure}
                    onPlayStateChange={(playing, paused) => {
                      if (!playing && !paused)
                        setCurrentPlayingMeasure(undefined)
                    }}
                  />
                </div>

                {/* Volume Control */}
                <CircularControl
                  value={volume}
                  onChange={handleVolumeChange}
                  label="Vol"
                  size={70}
                  ghost={showGhostControls}
                />
              </div>

              {/* Ghost Controls for future features */}
              {mode === 'practice' && (
                <div
                  className="flex items-center justify-between pt-2"
                  style={{ opacity: showGhostControls ? 0.05 : 0 }}
                >
                  <button className="px-3 py-1 text-sm bg-mirubato-wood-100 rounded">
                    Loop A-B
                  </button>
                  <button className="px-3 py-1 text-sm bg-mirubato-wood-100 rounded">
                    Metronome
                  </button>
                  <button className="px-3 py-1 text-sm bg-mirubato-wood-100 rounded">
                    Note Hints
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tablet Layout */}
          {isTablet && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <MusicPlayer
                  notes={playableNotes.map(n => ({
                    note: n.note,
                    time: n.time,
                    originalTime: n.time,
                  }))}
                  initialTempo={40}
                  totalMeasures={currentPiece.measures.length}
                  showMeasureProgress={false}
                  showStopButton={false}
                  showTempoControl={true}
                  compact={true}
                  onMeasureChange={setCurrentPlayingMeasure}
                  onPlayStateChange={(playing, paused) => {
                    if (!playing && !paused) setCurrentPlayingMeasure(undefined)
                  }}
                />

                <CircularControl
                  value={volume}
                  onChange={handleVolumeChange}
                  size={60}
                  ghost={showGhostControls}
                />
              </div>
            </div>
          )}

          {/* Mobile Layout */}
          {isMobile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <MusicPlayer
                  notes={playableNotes.map(n => ({
                    note: n.note,
                    time: n.time,
                    originalTime: n.time,
                  }))}
                  initialTempo={40}
                  totalMeasures={currentPiece.measures.length}
                  showMeasureProgress={false}
                  showStopButton={false}
                  showTempoControl={true}
                  compact={true}
                  onMeasureChange={setCurrentPlayingMeasure}
                  onPlayStateChange={(playing, paused) => {
                    if (!playing && !paused) setCurrentPlayingMeasure(undefined)
                  }}
                />

                <CircularControl
                  value={volume}
                  onChange={handleVolumeChange}
                  size={50}
                  ghost={showGhostControls}
                />
              </div>
            </div>
          )}
        </div>

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
