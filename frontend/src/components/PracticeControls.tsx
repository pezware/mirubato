import React from 'react'
import * as Tone from 'tone'
import { MusicPlayer, CircularControl } from './'
import type { PlayableNote } from './MusicPlayer'
import type { PracticeMode } from './PracticeHeader'

interface PracticeControlsProps {
  mode: PracticeMode
  volume: number
  onVolumeChange: (value: number) => void
  showGhostControls: boolean
  playableNotes: Array<{ note: string; time: number }>
  totalMeasures: number
  currentPlayingMeasure?: number
  onMeasureChange: (measure: number | undefined) => void
  isMobile: boolean
  isTablet: boolean
}

export const PracticeControls: React.FC<PracticeControlsProps> = ({
  mode,
  volume,
  onVolumeChange,
  showGhostControls,
  playableNotes,
  totalMeasures,
  currentPlayingMeasure: _currentPlayingMeasure,
  onMeasureChange,
  isMobile,
  isTablet,
}) => {
  const handleVolumeChange = (value: number) => {
    onVolumeChange(value)
    // Convert 0-100 to -60 to 0 dB
    const db = (value / 100) * 60 - 60
    Tone.Master.volume.value = db
  }

  const notes: PlayableNote[] = playableNotes.map(n => ({
    note: n.note,
    time: n.time,
    originalTime: n.time,
  }))

  return (
    <div className="bg-white/70 backdrop-blur rounded-xl shadow-sm border border-mirubato-wood-100 p-4">
      {/* Desktop Layout */}
      {!isMobile && !isTablet && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-6">
            {/* Transport and Tempo */}
            <div className="flex items-center gap-4">
              <MusicPlayer
                notes={notes}
                initialTempo={40}
                totalMeasures={totalMeasures}
                showMeasureProgress={false}
                showStopButton={true}
                showTempoControl={true}
                onMeasureChange={onMeasureChange}
                onPlayStateChange={(playing, paused) => {
                  if (!playing && !paused) onMeasureChange(undefined)
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
              notes={notes}
              initialTempo={40}
              totalMeasures={totalMeasures}
              showMeasureProgress={false}
              showStopButton={false}
              showTempoControl={true}
              compact={true}
              onMeasureChange={onMeasureChange}
              onPlayStateChange={(playing, paused) => {
                if (!playing && !paused) onMeasureChange(undefined)
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
              notes={notes}
              initialTempo={40}
              totalMeasures={totalMeasures}
              showMeasureProgress={false}
              showStopButton={false}
              showTempoControl={true}
              compact={true}
              onMeasureChange={onMeasureChange}
              onPlayStateChange={(playing, paused) => {
                if (!playing && !paused) onMeasureChange(undefined)
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
  )
}
