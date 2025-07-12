import React from 'react'
import { Volume2, VolumeX, Play, Square } from 'lucide-react'
import Button from '../ui/Button'
import { PlaybackMode } from './types'

interface CircleOfFifthsControlsProps {
  isAudioEnabled: boolean
  onAudioToggle: (enabled: boolean) => void
  volume: number
  onVolumeChange: (volume: number) => void
  playbackMode: PlaybackMode
  onPlaybackModeChange: (mode: PlaybackMode) => void
  tempo: number
  onTempoChange: (tempo: number) => void
  isPlaying: boolean
  onPlay: () => void
}

const CircleOfFifthsControls: React.FC<CircleOfFifthsControlsProps> = ({
  isAudioEnabled,
  onAudioToggle,
  volume,
  onVolumeChange,
  playbackMode,
  onPlaybackModeChange,
  tempo,
  onTempoChange,
  isPlaying,
  onPlay,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Audio Enable/Disable Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAudioToggle(!isAudioEnabled)}
            className="p-2"
            aria-label={isAudioEnabled ? 'Disable audio' : 'Enable audio'}
          >
            {isAudioEnabled ? (
              <Volume2 className="w-5 h-5 text-purple-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
          </Button>
          <span className="text-sm text-gray-600">
            Audio {isAudioEnabled ? 'On' : 'Off'}
          </span>
        </div>

        {/* Volume Control */}
        {isAudioEnabled && (
          <div className="flex items-center gap-3">
            <label htmlFor="volume" className="text-sm text-gray-600">
              Volume:
            </label>
            <input
              id="volume"
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={e => onVolumeChange(Number(e.target.value))}
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-sm text-gray-600 w-10">{volume}%</span>
          </div>
        )}

        {/* Play/Stop Button */}
        {isAudioEnabled && (
          <Button
            variant={isPlaying ? 'danger' : 'primary'}
            size="sm"
            onClick={onPlay}
            className="flex items-center gap-2"
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Play {playbackMode}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Playback Mode Selection */}
      {isAudioEnabled && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-600">Playback Mode:</span>
          <div className="flex gap-2">
            {(['chord', 'scale', 'arpeggio'] as PlaybackMode[]).map(mode => (
              <Button
                key={mode}
                variant={playbackMode === mode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onPlaybackModeChange(mode)}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tempo Control (for scales and arpeggios) */}
      {isAudioEnabled && playbackMode !== 'chord' && (
        <div className="flex items-center gap-3">
          <label htmlFor="tempo" className="text-sm text-gray-600">
            Tempo:
          </label>
          <input
            id="tempo"
            type="range"
            min="60"
            max="180"
            value={tempo}
            onChange={e => onTempoChange(Number(e.target.value))}
            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <span className="text-sm text-gray-600 w-16">{tempo} BPM</span>
        </div>
      )}
    </div>
  )
}

export default CircleOfFifthsControls
