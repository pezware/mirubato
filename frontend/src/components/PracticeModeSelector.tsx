/**
 * Practice Mode Selector Component
 *
 * Provides UI for selecting different practice modes for multi-voice scores
 * as specified in Phase 5 of the Multi-Voice Implementation Plan.
 */

import React, { useState } from 'react'

/**
 * Available practice modes
 */
export enum PracticeMode {
  /** Practice all voices together */
  FULL_SCORE = 'full_score',
  /** Practice a single voice */
  SINGLE_VOICE = 'single_voice',
  /** Practice hands separately (piano) */
  HANDS_SEPARATE = 'hands_separate',
  /** Practice with one voice highlighted */
  VOICE_HIGHLIGHT = 'voice_highlight',
  /** Practice with backing tracks */
  ACCOMPANIMENT = 'accompaniment',
  /** Slow practice mode */
  SLOW_PRACTICE = 'slow_practice',
  /** Section looping */
  LOOP_SECTION = 'loop_section',
}

/**
 * Practice mode configuration
 */
export interface PracticeModeConfig {
  mode: PracticeMode
  /** Selected voice for single voice mode */
  selectedVoice?: string
  /** Selected hand for hands separate mode */
  selectedHand?: 'left' | 'right'
  /** Highlighted voice for highlight mode */
  highlightedVoice?: string
  /** Voices to use as accompaniment */
  accompanimentVoices?: string[]
  /** Tempo percentage for slow practice (25-100) */
  tempoPercentage?: number
  /** Loop section start measure */
  loopStart?: number
  /** Loop section end measure */
  loopEnd?: number
}

/**
 * Props for PracticeModeSelector
 */
export interface PracticeModeSelectorProps {
  /** Current practice mode configuration */
  config: PracticeModeConfig
  /** Callback when configuration changes */
  onChange: (config: PracticeModeConfig) => void
  /** Available voice options */
  voices?: Array<{ id: string; name: string }>
  /** Whether the score is for piano (enables hands separate mode) */
  isPiano?: boolean
  /** Total number of measures */
  measureCount?: number
  /** Current tempo */
  currentTempo?: number
}

/**
 * Practice Mode Selector Component
 *
 * @example
 * ```tsx
 * <PracticeModeSelector
 *   config={practiceConfig}
 *   onChange={(config) => handlePracticeModeChange(config)}
 *   voices={scoreVoices}
 *   isPiano={true}
 * />
 * ```
 */
export const PracticeModeSelector: React.FC<PracticeModeSelectorProps> = ({
  config,
  onChange,
  voices = [],
  isPiano = false,
  measureCount = 0,
  currentTempo = 120,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleModeChange = (mode: PracticeMode) => {
    // Reset mode-specific settings when changing modes
    const newConfig: PracticeModeConfig = { mode }

    // Set default values for the new mode
    switch (mode) {
      case PracticeMode.SINGLE_VOICE:
        newConfig.selectedVoice = voices[0]?.id
        break
      case PracticeMode.HANDS_SEPARATE:
        newConfig.selectedHand = 'right'
        break
      case PracticeMode.VOICE_HIGHLIGHT:
        newConfig.highlightedVoice = voices[0]?.id
        break
      case PracticeMode.ACCOMPANIMENT:
        newConfig.accompanimentVoices = voices.slice(1).map(v => v.id)
        break
      case PracticeMode.SLOW_PRACTICE:
        newConfig.tempoPercentage = 75
        break
      case PracticeMode.LOOP_SECTION:
        newConfig.loopStart = 1
        newConfig.loopEnd = Math.min(4, measureCount)
        break
    }

    onChange(newConfig)
  }

  const updateConfig = (updates: Partial<PracticeModeConfig>) => {
    onChange({ ...config, ...updates })
  }

  const renderModeSpecificControls = () => {
    switch (config.mode) {
      case PracticeMode.SINGLE_VOICE:
        return (
          <div className="mode-controls">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Voice:
            </label>
            <select
              value={config.selectedVoice || ''}
              onChange={e => updateConfig({ selectedVoice: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              {voices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        )

      case PracticeMode.HANDS_SEPARATE:
        return (
          <div className="mode-controls">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Hand:
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hand"
                  value="left"
                  checked={config.selectedHand === 'left'}
                  onChange={() => updateConfig({ selectedHand: 'left' })}
                  className="mr-2"
                />
                Left Hand
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hand"
                  value="right"
                  checked={config.selectedHand === 'right'}
                  onChange={() => updateConfig({ selectedHand: 'right' })}
                  className="mr-2"
                />
                Right Hand
              </label>
            </div>
          </div>
        )

      case PracticeMode.VOICE_HIGHLIGHT:
        return (
          <div className="mode-controls">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voice to Highlight:
            </label>
            <select
              value={config.highlightedVoice || ''}
              onChange={e => updateConfig({ highlightedVoice: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              {voices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        )

      case PracticeMode.ACCOMPANIMENT:
        return (
          <div className="mode-controls">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Accompaniment Voices:
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {voices.map(voice => (
                <label key={voice.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      config.accompanimentVoices?.includes(voice.id) || false
                    }
                    onChange={e => {
                      const current = config.accompanimentVoices || []
                      if (e.target.checked) {
                        updateConfig({
                          accompanimentVoices: [...current, voice.id],
                        })
                      } else {
                        updateConfig({
                          accompanimentVoices: current.filter(
                            id => id !== voice.id
                          ),
                        })
                      }
                    }}
                    className="mr-2"
                  />
                  {voice.name}
                </label>
              ))}
            </div>
          </div>
        )

      case PracticeMode.SLOW_PRACTICE:
        return (
          <div className="mode-controls">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Practice Tempo:{' '}
              {Math.round(
                ((config.tempoPercentage || 100) * currentTempo) / 100
              )}{' '}
              BPM ({config.tempoPercentage || 100}% of original)
            </label>
            <input
              type="range"
              min="25"
              max="100"
              step="5"
              value={config.tempoPercentage || 100}
              onChange={e =>
                updateConfig({ tempoPercentage: Number(e.target.value) })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        )

      case PracticeMode.LOOP_SECTION:
        return (
          <div className="mode-controls">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Measure:
                </label>
                <input
                  type="number"
                  min="1"
                  max={measureCount}
                  value={config.loopStart || 1}
                  onChange={e =>
                    updateConfig({ loopStart: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Measure:
                </label>
                <input
                  type="number"
                  min={config.loopStart || 1}
                  max={measureCount}
                  value={config.loopEnd || measureCount}
                  onChange={e =>
                    updateConfig({ loopEnd: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const modeDescriptions: Record<PracticeMode, string> = {
    [PracticeMode.FULL_SCORE]: 'Practice all voices together',
    [PracticeMode.SINGLE_VOICE]: 'Isolate and practice one voice',
    [PracticeMode.HANDS_SEPARATE]: 'Practice each hand independently',
    [PracticeMode.VOICE_HIGHLIGHT]: 'Highlight one voice while playing all',
    [PracticeMode.ACCOMPANIMENT]: 'Play along with selected voices',
    [PracticeMode.SLOW_PRACTICE]: 'Practice at a reduced tempo',
    [PracticeMode.LOOP_SECTION]: 'Repeat a specific section',
  }

  return (
    <div className="practice-mode-selector">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Practice Mode</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Current Mode Display */}
      <div className="current-mode">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div>
            <div className="font-medium text-blue-900">
              {config.mode
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div className="text-sm text-blue-700">
              {modeDescriptions[config.mode]}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            Change
          </button>
        </div>

        {/* Mode-specific controls for current mode */}
        <div className="mt-3">{renderModeSpecificControls()}</div>
      </div>

      {/* Expanded Mode Selection */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid gap-2">
            {Object.values(PracticeMode).map(mode => {
              // Skip hands separate mode if not piano
              if (mode === PracticeMode.HANDS_SEPARATE && !isPiano) {
                return null
              }

              const isSelected = config.mode === mode

              return (
                <button
                  key={mode}
                  onClick={() => {
                    handleModeChange(mode)
                    setIsExpanded(false)
                  }}
                  className={`
                    text-left p-3 rounded-lg transition-colors
                    ${
                      isSelected
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }
                  `}
                >
                  <div className="font-medium">
                    {mode
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-sm text-gray-600">
                    {modeDescriptions[mode]}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============== Practice Mode Presets ==============

/**
 * Common practice mode presets
 */
export const practiceModePresets = {
  /** Beginner-friendly single voice practice */
  beginnerVoicePractice: {
    mode: PracticeMode.SINGLE_VOICE,
    tempoPercentage: 75,
  },

  /** Piano hands separate practice */
  pianoHandsSeparate: {
    mode: PracticeMode.HANDS_SEPARATE,
    selectedHand: 'right' as const,
  },

  /** Slow practice for difficult passages */
  slowPractice: {
    mode: PracticeMode.SLOW_PRACTICE,
    tempoPercentage: 50,
  },

  /** Loop practice for problem sections */
  problemSectionLoop: {
    mode: PracticeMode.LOOP_SECTION,
    loopStart: 1,
    loopEnd: 4,
  },

  /** Choir practice with one part highlighted */
  choirPartPractice: {
    mode: PracticeMode.VOICE_HIGHLIGHT,
    highlightedVoice: 'soprano',
  },
}

// ============== Styles ==============

const styles = `
.practice-mode-selector {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mode-controls {
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

/* Range slider styling */
.practice-mode-selector input[type="range"] {
  -webkit-appearance: none;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
}

.practice-mode-selector input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.practice-mode-selector input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* Number input styling */
.practice-mode-selector input[type="number"] {
  -moz-appearance: textfield;
}

.practice-mode-selector input[type="number"]::-webkit-outer-spin-button,
.practice-mode-selector input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}
