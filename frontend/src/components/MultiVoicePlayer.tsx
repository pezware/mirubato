import React, { useState, useEffect, useCallback } from 'react'
import { Score } from '../modules/sheetMusic/multiVoiceTypes'
import { createMultiVoiceAudioManager } from '../utils/multiVoiceAudioManager'
import { MultiVoiceAudioManagerInterface } from '../utils/multiVoiceAudioManagerInterface'

interface MultiVoicePlayerProps {
  score: Score | null
  audioManager?: any
  onPlay?: () => Promise<void>
  onStop?: () => void
  onMeasureChange?: (measure: number) => void
  isPlaying?: boolean
  currentMeasure?: number
  className?: string
}

interface VoiceControlState {
  id: string
  name: string
  isMuted: boolean
  volume: number
}

/**
 * Multi-Voice Player Component
 * Provides playback controls and voice management for polyphonic scores
 */
export const MultiVoicePlayer: React.FC<MultiVoicePlayerProps> = ({
  score,
  audioManager: _externalAudioManager,
  onPlay: _onPlay,
  onStop: _onStop,
  onMeasureChange: _onMeasureChange,
  isPlaying: _externalIsPlaying,
  currentMeasure: _externalCurrentMeasure,
  className = '',
}) => {
  const [audioManager, setAudioManager] =
    useState<MultiVoiceAudioManagerInterface | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [voiceControls, setVoiceControls] = useState<VoiceControlState[]>([])
  const [soloedVoice, setSoloedVoice] = useState<string | null>(null)

  // Initialize audio manager
  useEffect(() => {
    const manager = createMultiVoiceAudioManager()
    setAudioManager(manager)

    manager
      .initialize()
      .then(() => {
        setIsLoading(false)
      })
      .catch(err => {
        setError('Failed to initialize audio')
        setIsLoading(false)
        console.error('Audio initialization error:', err)
      })

    return () => {
      manager.dispose()
    }
  }, [])

  // Extract voices from score
  useEffect(() => {
    if (!score) {
      setVoiceControls([])
      return
    }

    const voices: VoiceControlState[] = []
    score.measures.forEach(measure => {
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          if (!voices.find(v => v.id === voice.id)) {
            voices.push({
              id: voice.id,
              name: voice.name || voice.id,
              isMuted: audioManager?.isVoiceMuted(voice.id) || false,
              volume: audioManager?.getVoiceVolume(voice.id) || 1,
            })
          }
        })
      })
    })
    setVoiceControls(voices)
  }, [score, audioManager])

  // Update playing state
  useEffect(() => {
    if (!audioManager) return

    const checkPlayingState = () => {
      setIsPlaying(audioManager.isPlaying())
    }

    const interval = setInterval(checkPlayingState, 100)
    return () => clearInterval(interval)
  }, [audioManager])

  const handlePlay = useCallback(async () => {
    if (!audioManager || !score) return

    try {
      if (isPlaying) {
        audioManager.stopPlayback()
      } else {
        await audioManager.playScore(score, 1)
      }
      setIsPlaying(!isPlaying)
    } catch (err) {
      setError('Failed to play score')
      console.error('Playback error:', err)
    }
  }, [audioManager, score, isPlaying])

  const handleStop = useCallback(() => {
    if (!audioManager) return
    audioManager.stopPlayback()
    setIsPlaying(false)
  }, [audioManager])

  const handleMuteToggle = useCallback(
    (voiceId: string) => {
      if (!audioManager) return

      const voice = voiceControls.find(v => v.id === voiceId)
      if (!voice) return

      if (voice.isMuted) {
        audioManager.unmuteVoice(voiceId)
      } else {
        audioManager.muteVoice(voiceId)
      }

      setVoiceControls(prev =>
        prev.map(v => (v.id === voiceId ? { ...v, isMuted: !v.isMuted } : v))
      )
    },
    [audioManager, voiceControls]
  )

  const handleSoloToggle = useCallback(
    (voiceId: string) => {
      if (!audioManager) return

      if (soloedVoice === voiceId) {
        audioManager.clearSolo()
        setSoloedVoice(null)
      } else {
        audioManager.soloVoice(voiceId)
        setSoloedVoice(voiceId)
      }
    },
    [audioManager, soloedVoice]
  )

  const handleVolumeChange = useCallback(
    (voiceId: string, volume: number) => {
      if (!audioManager) return

      audioManager.setVoiceVolume(voiceId, volume)
      setVoiceControls(prev =>
        prev.map(v => (v.id === voiceId ? { ...v, volume } : v))
      )
    },
    [audioManager]
  )

  const handleSpeedChange = useCallback(
    (speed: number) => {
      if (!audioManager) return

      audioManager.setPlaybackSpeed(speed)
      setPlaybackSpeed(speed)
    },
    [audioManager]
  )

  const isDisabled = !score || isLoading || !!error

  return (
    <div
      className={`multi-voice-player ${className}`}
      role="region"
      aria-label="Multi-voice player"
    >
      {error && (
        <div
          role="alert"
          className="error-message text-red-600 p-2 mb-4 bg-red-100 rounded"
        >
          {error}
        </div>
      )}

      {/* Score Title */}
      {score && <h3 className="text-lg font-semibold mb-4">{score.title}</h3>}

      {/* Playback Controls */}
      <div
        role="group"
        aria-label="Playback controls"
        className="playback-controls mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handlePlay}
            disabled={isDisabled}
            className={`px-4 py-2 rounded ${
              isDisabled
                ? 'bg-gray-300'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={handleStop}
            disabled={isDisabled}
            className={`px-4 py-2 rounded ${
              isDisabled
                ? 'bg-gray-300'
                : 'bg-gray-500 hover:bg-gray-600 text-white'
            }`}
            aria-label="Stop"
          >
            Stop
          </button>
        </div>

        {/* Playback Speed */}
        <div className="speed-control">
          <label
            htmlFor="speed-slider"
            className="block text-sm font-medium mb-1"
          >
            Speed:{' '}
            <span className="font-mono">{playbackSpeed.toFixed(1)}x</span>
          </label>
          <input
            id="speed-slider"
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={playbackSpeed}
            onChange={e => handleSpeedChange(parseFloat(e.target.value))}
            disabled={isDisabled}
            className="w-full"
            aria-label="Playback speed"
          />
        </div>
      </div>

      {/* Voice Controls */}
      {voiceControls.length > 0 && (
        <div
          role="group"
          aria-label="Voice controls"
          className="voice-controls"
        >
          <h4 className="text-md font-semibold mb-3">Voices</h4>
          {voiceControls.map(voice => (
            <div
              key={voice.id}
              className="voice-control mb-4 p-3 border rounded"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{voice.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMuteToggle(voice.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      voice.isMuted
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    aria-label={voice.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {voice.isMuted ? 'Unmute' : 'Mute'}
                  </button>

                  <button
                    onClick={() => handleSoloToggle(voice.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      soloedVoice === voice.id
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    aria-label="Solo"
                  >
                    Solo
                  </button>
                </div>
              </div>

              <div className="volume-control">
                <label
                  htmlFor={`volume-${voice.id}`}
                  className="block text-sm text-gray-600 mb-1"
                >
                  Volume
                </label>
                <input
                  id={`volume-${voice.id}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={voice.volume}
                  onChange={e =>
                    handleVolumeChange(voice.id, parseFloat(e.target.value))
                  }
                  className="w-full"
                  aria-label="Volume"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
