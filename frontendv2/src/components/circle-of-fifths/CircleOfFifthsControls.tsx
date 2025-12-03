import React from 'react'
import { useTranslation } from 'react-i18next'
import { Volume2, VolumeX, Play, Square } from 'lucide-react'
import { Button } from '../ui'
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
  const { t } = useTranslation(['toolbox'])

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
            aria-label={
              isAudioEnabled
                ? t('toolbox:circleOfFifths.controls.disableAudio')
                : t('toolbox:circleOfFifths.controls.enableAudio')
            }
          >
            {isAudioEnabled ? (
              <Volume2 className="w-5 h-5 text-morandi-sage-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
          </Button>
          <span className="text-sm text-gray-600">
            {t('toolbox:circleOfFifths.controls.audio')}{' '}
            {isAudioEnabled
              ? t('toolbox:circleOfFifths.controls.on')
              : t('toolbox:circleOfFifths.controls.off')}
          </span>
        </div>

        {/* Volume Control */}
        {isAudioEnabled && (
          <div className="flex items-center gap-3">
            <label htmlFor="volume" className="text-sm text-gray-600">
              {t('toolbox:circleOfFifths.controls.volume')}:
            </label>
            <input
              id="volume"
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={e => onVolumeChange(Number(e.target.value))}
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-morandi-sage-500"
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
                {t('toolbox:circleOfFifths.controls.stop')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {t('toolbox:circleOfFifths.controls.play')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Playback Mode Selection */}
      {isAudioEnabled && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-600">
            {t('toolbox:circleOfFifths.controls.playbackMode')}:
          </span>
          <div className="flex gap-2">
            {(['chord', 'scale', 'arpeggio'] as PlaybackMode[]).map(mode => (
              <Button
                key={mode}
                variant={playbackMode === mode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onPlaybackModeChange(mode)}
              >
                {t(`toolbox:circleOfFifths.controls.modes.${mode}`)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tempo Control (for scales and arpeggios) */}
      {isAudioEnabled && playbackMode !== 'chord' && (
        <div className="flex items-center gap-3">
          <label htmlFor="tempo" className="text-sm text-gray-600">
            {t('toolbox:circleOfFifths.controls.tempo')}:
          </label>
          <input
            id="tempo"
            type="range"
            min="60"
            max="180"
            value={tempo}
            onChange={e => onTempoChange(Number(e.target.value))}
            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-morandi-sage-500"
          />
          <span className="text-sm text-gray-600 w-16">{tempo} BPM</span>
        </div>
      )}
    </div>
  )
}

export default CircleOfFifthsControls
