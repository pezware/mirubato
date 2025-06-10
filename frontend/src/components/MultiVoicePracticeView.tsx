/**
 * Multi-Voice Practice View Component
 *
 * Integrated practice view that combines all Phase 5 UI components
 * for a complete multi-voice practice experience.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { MultiVoiceSheetMusicDisplay } from './MultiVoiceSheetMusicDisplay'
import { MultiVoicePlayer } from './MultiVoicePlayer'
import { VoiceControl } from './VoiceControl'
import { StaffDisplayOptions } from './StaffDisplayOptions'
import { defaultDisplayOptions } from './staffDisplayConfig'
import { PracticeModeSelector } from './PracticeModeSelector'
import { PracticeMode, PracticeModeConfig } from './practiceModeTypes'
import { Score } from '../modules/sheetMusic/multiVoiceTypes'
import { ExtendedMultiVoiceAudioManager } from '../utils/multiVoiceAudioManagerExtensions'

/**
 * Props for MultiVoicePracticeView
 */
export interface MultiVoicePracticeViewProps {
  /** The multi-voice score to practice */
  score: Score
  /** Optional audio manager instance */
  audioManager?: ExtendedMultiVoiceAudioManager
  /** Callback when practice session starts */
  onSessionStart?: () => void
  /** Callback when practice session ends */
  onSessionEnd?: () => void
  /** Whether to show performance tracking */
  enablePerformanceTracking?: boolean
  /** Initial display options */
  initialDisplayOptions?: StaffDisplayOptions
  /** Initial practice mode */
  initialPracticeMode?: PracticeModeConfig
}

/**
 * Integrated Multi-Voice Practice View
 *
 * @example
 * ```tsx
 * <MultiVoicePracticeView
 *   score={bachMinuetScore}
 *   onSessionStart={() => console.log('Practice started')}
 *   enablePerformanceTracking={true}
 * />
 * ```
 */
export const MultiVoicePracticeView: React.FC<MultiVoicePracticeViewProps> = ({
  score,
  audioManager: providedAudioManager,
  onSessionStart,
  onSessionEnd,
  enablePerformanceTracking = false,
  initialDisplayOptions = defaultDisplayOptions,
  initialPracticeMode = { mode: PracticeMode.FULL_SCORE },
}) => {
  // State
  const [audioManager] = useState(
    () => providedAudioManager || new ExtendedMultiVoiceAudioManager()
  )
  const [displayOptions, setDisplayOptions] = useState(initialDisplayOptions)
  const [practiceMode, setPracticeMode] =
    useState<PracticeModeConfig>(initialPracticeMode)
  const [activeVoices, setActiveVoices] = useState<Set<string>>(new Set())
  const [highlightedVoice, setHighlightedVoice] = useState<string | null>(null)
  const [voiceVolumes, setVoiceVolumes] = useState<Map<string, number>>(
    new Map()
  )
  const [soloVoice, setSoloVoice] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentMeasure, setCurrentMeasure] = useState(1)
  const [showSidebar, setShowSidebar] = useState(true)

  // Extract voice information (memoized to prevent infinite loops)
  const voices = useMemo(() => extractVoices(score), [score])
  const isPiano = useMemo(
    () => score.parts.some(p => p.instrument.toLowerCase() === 'piano'),
    [score]
  )

  // Apply practice mode settings to audio and display
  const applyPracticeMode = useCallback(
    (config: PracticeModeConfig) => {
      switch (config.mode) {
        case PracticeMode.SINGLE_VOICE:
          if (config.selectedVoice) {
            // Mute all other voices
            voices.forEach(v => {
              if (v.id === config.selectedVoice) {
                audioManager.unmuteVoice(v.id)
              } else {
                audioManager.muteVoice(v.id)
              }
            })
          }
          break

        case PracticeMode.HANDS_SEPARATE:
          // Piano-specific: mute based on hand
          if (isPiano && config.selectedHand) {
            const handVoices = getHandVoices(score, config.selectedHand)
            voices.forEach(v => {
              if (handVoices.includes(v.id)) {
                audioManager.unmuteVoice(v.id)
              } else {
                audioManager.muteVoice(v.id)
              }
            })
          }
          break

        case PracticeMode.VOICE_HIGHLIGHT:
          if (config.highlightedVoice) {
            setHighlightedVoice(config.highlightedVoice)
            // Optionally reduce volume of other voices
            voices.forEach(v => {
              if (v.id === config.highlightedVoice) {
                audioManager.setVoiceVolume(v.id, 0) // Full volume
              } else {
                audioManager.setVoiceVolume(v.id, -12) // Reduced volume
              }
            })
          }
          break

        case PracticeMode.ACCOMPANIMENT:
          // Mute non-accompaniment voices
          voices.forEach(v => {
            const isAccompaniment = config.accompanimentVoices?.includes(v.id)
            if (isAccompaniment) {
              audioManager.unmuteVoice(v.id)
            } else {
              audioManager.muteVoice(v.id)
            }
          })
          break

        case PracticeMode.SLOW_PRACTICE:
          // Apply tempo adjustment
          if (config.tempoPercentage) {
            audioManager.setPlaybackSpeed(config.tempoPercentage / 100)
          }
          break

        case PracticeMode.LOOP_SECTION:
          // Set loop points
          if (
            config.loopStart !== undefined &&
            config.loopEnd !== undefined
          ) {
            audioManager.setLoopSection(config.loopStart, config.loopEnd)
          }
          break

        default:
          // Full score - unmute all voices
          voices.forEach(v => audioManager.unmuteVoice(v.id))
          audioManager.setPlaybackSpeed(1.0)
          audioManager.clearLoop()
      }
    },
    [audioManager, voices, setHighlightedVoice]
  )

  // Initialize active voices
  useEffect(() => {
    const allVoiceIds = new Set(voices.map(v => v.id))
    setActiveVoices(allVoiceIds)
  }, [voices])

  // Apply practice mode settings
  useEffect(() => {
    applyPracticeMode(practiceMode)
  }, [practiceMode, applyPracticeMode])

  // Voice control handlers
  const handleVoiceToggle = useCallback(
    (voiceId: string, enabled: boolean) => {
      setActiveVoices(prev => {
        const next = new Set(prev)
        if (enabled) {
          next.add(voiceId)
          audioManager.unmuteVoice(voiceId)
        } else {
          next.delete(voiceId)
          audioManager.muteVoice(voiceId)
        }
        return next
      })
    },
    [audioManager]
  )

  const handleVoiceHighlight = useCallback((voiceId: string | null) => {
    setHighlightedVoice(voiceId)
  }, [])

  const handleVoiceVolumeChange = useCallback(
    (voiceId: string, volume: number) => {
      setVoiceVolumes(prev => new Map(prev).set(voiceId, volume))
      audioManager.setVoiceVolume(voiceId, volume - 100) // Convert to dB
    },
    [audioManager]
  )

  const handleVoiceSolo = useCallback(
    (voiceId: string | null) => {
      setSoloVoice(voiceId)
      if (voiceId) {
        audioManager.soloVoice(voiceId)
      } else {
        // Unmute all voices
        voices.forEach(v => {
          if (activeVoices.has(v.id)) {
            audioManager.unmuteVoice(v.id)
          }
        })
      }
    },
    [audioManager, activeVoices, voices]
  )


  // Playback handlers
  const handlePlay = useCallback(async () => {
    if (!isPlaying) {
      onSessionStart?.()
      await audioManager.playScore(score)
      setIsPlaying(true)
    } else {
      audioManager.pauseScore()
      setIsPlaying(false)
    }
  }, [audioManager, score, isPlaying, onSessionStart])

  const handleStop = useCallback(() => {
    audioManager.stopScore()
    setIsPlaying(false)
    setCurrentMeasure(1)
    onSessionEnd?.()
  }, [audioManager, onSessionEnd])

  const handleMeasureChange = useCallback((measure: number) => {
    setCurrentMeasure(measure)
  }, [])

  return (
    <div className="multi-voice-practice-view">
      {/* Header */}
      <div className="practice-header">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{score.title}</h1>
            <p className="text-gray-600">{score.composer}</p>
          </div>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded hover:bg-gray-100"
            title={showSidebar ? 'Hide controls' : 'Show controls'}
          >
            {showSidebar ? '◀' : '▶'}
          </button>
        </div>
      </div>

      <div className="practice-content">
        {/* Main Content */}
        <div className="main-area">
          {/* Sheet Music Display */}
          <div className="sheet-music-container">
            <MultiVoiceSheetMusicDisplay
              score={score}
              width={showSidebar ? 750 : 1200}
              height={650}
              currentMeasure={currentMeasure}
              highlightedVoice={highlightedVoice}
              displayOptions={displayOptions}
              enablePerformanceTracking={enablePerformanceTracking}
              options={{
                measuresPerSystem: 3,
                staveSpacing: 120,
                systemSpacing: 140,
              }}
            />
          </div>

          {/* Player Controls */}
          <div className="player-container">
            <MultiVoicePlayer
              score={score}
              audioManager={audioManager}
              onPlay={handlePlay}
              onStop={handleStop}
              onMeasureChange={handleMeasureChange}
              isPlaying={isPlaying}
              currentMeasure={currentMeasure}
            />
          </div>
        </div>

        {/* Sidebar Controls */}
        {showSidebar && (
          <div className="sidebar">
            {/* Practice Mode Selector */}
            <div className="control-section">
              <PracticeModeSelector
                config={practiceMode}
                onChange={setPracticeMode}
                voices={voices}
                isPiano={isPiano}
                measureCount={score.measures.length}
                currentTempo={score.measures[0]?.tempo || 120}
              />
            </div>

            {/* Voice Controls */}
            <div className="control-section">
              <VoiceControl
                score={score}
                onVoiceToggle={handleVoiceToggle}
                onVoiceHighlight={handleVoiceHighlight}
                onVoiceVolumeChange={handleVoiceVolumeChange}
                onVoiceSolo={handleVoiceSolo}
                activeVoices={activeVoices}
                highlightedVoice={highlightedVoice}
                voiceVolumes={voiceVolumes}
                soloVoice={soloVoice}
              />
            </div>

            {/* Display Options */}
            <div className="control-section">
              <StaffDisplayOptions
                options={displayOptions}
                onChange={setDisplayOptions}
                voiceIds={voices.map(v => v.id)}
                voiceNames={Object.fromEntries(voices.map(v => [v.id, v.name]))}
                showAdvanced={true}
              />
            </div>

            {/* Performance Stats (if enabled) */}
            {enablePerformanceTracking && (
              <div className="control-section">
                <h3 className="text-lg font-semibold mb-4">Performance</h3>
                <div className="text-sm text-gray-600">
                  <p>
                    Measure: {currentMeasure}/{score.measures.length}
                  </p>
                  <p>
                    Active Voices: {activeVoices.size}/{voices.length}
                  </p>
                  {/* Additional performance metrics would go here */}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============== Helper Functions ==============

/**
 * Extract voice information from score
 */
function extractVoices(score: Score): Array<{ id: string; name: string }> {
  const voices: Array<{ id: string; name: string }> = []
  const seen = new Set<string>()

  score.measures.forEach(measure => {
    measure.staves.forEach(staff => {
      staff.voices.forEach(voice => {
        if (!seen.has(voice.id)) {
          seen.add(voice.id)
          voices.push({
            id: voice.id,
            name: voice.name || voice.id,
          })
        }
      })
    })
  })

  return voices
}

/**
 * Get voice IDs for a specific hand (piano)
 */
function getHandVoices(score: Score, hand: 'left' | 'right'): string[] {
  const voiceIds: string[] = []

  score.measures.forEach(measure => {
    measure.staves.forEach((staff, staffIndex) => {
      // Assume first staff is right hand, second is left hand for piano
      if (
        (hand === 'right' && staffIndex === 0) ||
        (hand === 'left' && staffIndex === 1)
      ) {
        staff.voices.forEach(voice => {
          if (!voiceIds.includes(voice.id)) {
            voiceIds.push(voice.id)
          }
        })
      }
    })
  })

  return voiceIds
}

// ============== Styles ==============

const styles = `
.multi-voice-practice-view {
  min-height: 100vh;
  background: #f5f5f5;
}

.practice-header {
  background: white;
  padding: 16px 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.practice-content {
  display: flex;
  gap: 16px;
  padding: 16px;
  max-width: 100vw;
  margin: 0 auto;
  overflow-x: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  width: 100%;
}

.sheet-music-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.player-container {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  max-height: 80vh;
  overflow-y: auto;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.control-section {
  /* Each control component has its own styling */
}

/* Responsive design */
@media (max-width: 1200px) {
  .practice-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .sidebar {
    width: 100%;
    max-height: none;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .control-section {
    flex: 1;
    min-width: 280px;
  }
}

@media (max-width: 768px) {
  .sheet-music-container {
    padding: 12px;
  }
  
  .sidebar {
    flex-direction: column;
  }
  
  .control-section {
    width: 100%;
  }
}
`

// Add styles to document (only once)
if (
  typeof document !== 'undefined' &&
  !document.getElementById('multi-voice-practice-view-styles')
) {
  const styleSheet = document.createElement('style')
  styleSheet.id = 'multi-voice-practice-view-styles'
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}
