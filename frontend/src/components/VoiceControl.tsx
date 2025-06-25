/**
 * Voice Control Component
 *
 * Provides UI controls for managing individual voices in multi-voice scores
 * as specified in Phase 5 of the Multi-Voice Implementation Plan.
 */

import React, { useState, useCallback } from 'react'
import { Score } from '../modules/sheetMusic/multiVoiceTypes'

/**
 * Props for VoiceControl component
 */
export interface VoiceControlProps {
  /** The multi-voice score */
  score: Score
  /** Callback when a voice is toggled on/off */
  onVoiceToggle?: (voiceId: string, enabled: boolean) => void
  /** Callback when a voice is highlighted */
  onVoiceHighlight?: (voiceId: string | null) => void
  /** Callback when voice volume changes */
  onVoiceVolumeChange?: (voiceId: string, volume: number) => void
  /** Callback when solo mode is toggled */
  onVoiceSolo?: (voiceId: string | null) => void
  /** Currently playing voice IDs */
  activeVoices?: Set<string>
  /** Currently highlighted voice ID */
  highlightedVoice?: string | null
  /** Voice-specific volumes (0-100) */
  voiceVolumes?: Map<string, number>
  /** Solo voice ID */
  soloVoice?: string | null
}

/**
 * Voice information extracted from score
 */
interface VoiceInfo {
  id: string
  name: string
  partName: string
  staffType: 'treble' | 'bass' | 'alto' | 'tenor'
  noteCount: number
  color: string
}

/**
 * Voice Control Component
 *
 * @example
 * ```tsx
 * <VoiceControl
 *   score={score}
 *   onVoiceToggle={(id, enabled) => audioManager.setVoiceMute(id, !enabled)}
 *   onVoiceHighlight={(id) => renderer.highlightVoice(id)}
 * />
 * ```
 */
export const VoiceControl: React.FC<VoiceControlProps> = ({
  score,
  onVoiceToggle,
  onVoiceHighlight,
  onVoiceVolumeChange,
  onVoiceSolo,
  activeVoices = new Set(),
  highlightedVoice = null,
  voiceVolumes = new Map(),
  soloVoice = null,
}) => {
  const [expandedVoices, setExpandedVoices] = useState<Set<string>>(new Set())
  const [localVolumes, setLocalVolumes] =
    useState<Map<string, number>>(voiceVolumes)

  // Extract voice information from score
  const voices = extractVoiceInfo(score)

  const handleVoiceToggle = useCallback(
    (voiceId: string) => {
      const isEnabled = activeVoices.has(voiceId)
      onVoiceToggle?.(voiceId, !isEnabled)
    },
    [activeVoices, onVoiceToggle]
  )

  const handleVoiceHighlight = useCallback(
    (voiceId: string | null) => {
      onVoiceHighlight?.(voiceId)
    },
    [onVoiceHighlight]
  )

  const handleVolumeChange = useCallback(
    (voiceId: string, volume: number) => {
      setLocalVolumes(prev => new Map(prev).set(voiceId, volume))
      onVoiceVolumeChange?.(voiceId, volume)
    },
    [onVoiceVolumeChange]
  )

  const handleSolo = useCallback(
    (voiceId: string) => {
      if (soloVoice === voiceId) {
        onVoiceSolo?.(null)
      } else {
        onVoiceSolo?.(voiceId)
      }
    },
    [soloVoice, onVoiceSolo]
  )

  const toggleExpanded = useCallback((voiceId: string) => {
    setExpandedVoices(prev => {
      const next = new Set(prev)
      if (next.has(voiceId)) {
        next.delete(voiceId)
      } else {
        next.add(voiceId)
      }
      return next
    })
  }, [])

  return (
    <div className="voice-control">
      <h3 className="text-lg font-semibold mb-4">Voice Controls</h3>

      <div className="space-y-2">
        {voices.map(voice => {
          const isActive = activeVoices.has(voice.id)
          const isHighlighted = highlightedVoice === voice.id
          const isSolo = soloVoice === voice.id
          const isExpanded = expandedVoices.has(voice.id)
          const volume = localVolumes.get(voice.id) ?? 100
          const isMuted = soloVoice !== null && soloVoice !== voice.id

          return (
            <div
              key={voice.id}
              className={`
                voice-control-item border rounded-lg p-3 transition-all
                ${isHighlighted ? 'ring-2 ring-blue-500' : ''}
                ${isMuted ? 'opacity-50' : ''}
              `}
            >
              {/* Main voice controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Voice toggle */}
                  <button
                    onClick={() => handleVoiceToggle(voice.id)}
                    className={`
                      w-8 h-8 rounded flex items-center justify-center
                      ${
                        isActive
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }
                    `}
                    title={isActive ? 'Mute voice' : 'Unmute voice'}
                  >
                    {isActive ? '🔊' : '🔇'}
                  </button>

                  {/* Voice info */}
                  <div
                    className="cursor-pointer"
                    onClick={() => toggleExpanded(voice.id)}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: voice.color }}
                      />
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-sm text-gray-500">
                        ({voice.partName})
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {voice.noteCount} notes • {voice.staffType} clef
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-2">
                  {/* Solo button */}
                  <button
                    onClick={() => handleSolo(voice.id)}
                    className={`
                      px-3 py-1 rounded text-sm
                      ${
                        isSolo
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }
                    `}
                    title="Solo this voice"
                  >
                    Solo
                  </button>

                  {/* Highlight button */}
                  <button
                    onClick={() =>
                      handleVoiceHighlight(isHighlighted ? null : voice.id)
                    }
                    onMouseEnter={() =>
                      !isHighlighted && handleVoiceHighlight(voice.id)
                    }
                    onMouseLeave={() =>
                      !isHighlighted && handleVoiceHighlight(null)
                    }
                    className={`
                      px-3 py-1 rounded text-sm
                      ${
                        isHighlighted
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }
                    `}
                    title="Highlight this voice in the score"
                  >
                    👁️
                  </button>

                  {/* Expand/collapse */}
                  <button
                    onClick={() => toggleExpanded(voice.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expanded controls */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t">
                  {/* Volume slider */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 w-16">Volume:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={e =>
                        handleVolumeChange(voice.id, Number(e.target.value))
                      }
                      className="flex-1"
                      disabled={isMuted}
                    />
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {volume}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Global controls */}
      <div className="mt-4 pt-4 border-t flex justify-between">
        <button
          onClick={() => {
            voices.forEach(v => onVoiceToggle?.(v.id, true))
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Enable All
        </button>
        <button
          onClick={() => {
            voices.forEach(v => onVoiceToggle?.(v.id, false))
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Mute All
        </button>
        <button
          onClick={() => onVoiceSolo?.(null)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          disabled={soloVoice === null}
        >
          Clear Solo
        </button>
      </div>
    </div>
  )
}

// ============== Helper Functions ==============

/**
 * Extract voice information from a score
 */
function extractVoiceInfo(score: Score): VoiceInfo[] {
  const voices: VoiceInfo[] = []
  const voiceColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ]
  let colorIndex = 0

  for (const part of score.parts) {
    score.measures.forEach(measure => {
      measure.staves.forEach(staff => {
        staff.voices.forEach(voice => {
          // Check if we already have this voice
          if (voices.some(v => v.id === voice.id)) {
            return
          }

          // Count notes in this voice across all measures
          let noteCount = 0
          score.measures.forEach(m => {
            m.staves.forEach(s => {
              s.voices.forEach(v => {
                if (v.id === voice.id) {
                  noteCount += v.notes.filter(n => !n.rest).length
                }
              })
            })
          })

          voices.push({
            id: voice.id,
            name: voice.name || voice.id,
            partName: part.name,
            staffType: getStaffType(staff.clef),
            noteCount,
            color: voiceColors[colorIndex % voiceColors.length],
          })

          colorIndex++
        })
      })
    })
  }

  return voices
}

/**
 * Get staff type from clef
 */
function getStaffType(
  clef: string | undefined
): 'treble' | 'bass' | 'alto' | 'tenor' {
  const clefMap: Record<string, 'treble' | 'bass' | 'alto' | 'tenor'> = {
    TREBLE: 'treble',
    BASS: 'bass',
    ALTO: 'alto',
    TENOR: 'tenor',
    treble: 'treble',
    bass: 'bass',
    alto: 'alto',
    tenor: 'tenor',
  }

  return clef ? clefMap[clef] || 'treble' : 'treble'
}

// ============== Styles ==============

const styles = `
.voice-control {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.voice-control-item {
  background: #f9fafb;
  transition: all 0.2s ease;
}

.voice-control-item:hover {
  background: #f3f4f6;
}

/* Volume slider styling */
input[type="range"] {
  -webkit-appearance: none;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="range"]:disabled::-webkit-slider-thumb {
  background: #9ca3af;
  cursor: not-allowed;
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}
