/**
 * Staff Display Options Component
 *
 * Provides UI controls for customizing the display of staves in multi-voice scores
 * as specified in Phase 5 of the Multi-Voice Implementation Plan.
 */

import React, { useState, useCallback } from 'react'

/**
 * Staff display configuration options
 */
export interface StaffDisplayOptions {
  /** Show treble staff */
  showTrebleStaff: boolean
  /** Show bass staff */
  showBassStaff: boolean
  /** Show alto clef staff */
  showAltoStaff?: boolean
  /** Show tenor clef staff */
  showTenorStaff?: boolean
  /** Use voice colors */
  showVoiceColors: boolean
  /** Voice opacity settings (0-1) */
  voiceOpacity: Record<string, number>
  /** Show measure numbers */
  showMeasureNumbers: boolean
  /** Show note names */
  showNoteNames: boolean
  /** Staff spacing multiplier */
  staffSpacing: number
  /** Show tempo markings */
  showTempo: boolean
  /** Show dynamics */
  showDynamics: boolean
  /** Show fingerings */
  showFingerings: boolean
  /** Grand staff brace */
  showGrandStaffBrace: boolean
}

/**
 * Props for StaffDisplayOptions component
 */
export interface StaffDisplayOptionsProps {
  /** Current display options */
  options: StaffDisplayOptions
  /** Callback when options change */
  onChange: (options: StaffDisplayOptions) => void
  /** Available voice IDs for opacity control */
  voiceIds?: string[]
  /** Voice names for display */
  voiceNames?: Record<string, string>
  /** Whether to show advanced options */
  showAdvanced?: boolean
}

/**
 * Default display options
 */
export const defaultDisplayOptions: StaffDisplayOptions = {
  showTrebleStaff: true,
  showBassStaff: true,
  showAltoStaff: true,
  showTenorStaff: true,
  showVoiceColors: true,
  voiceOpacity: {},
  showMeasureNumbers: true,
  showNoteNames: false,
  staffSpacing: 1.0,
  showTempo: true,
  showDynamics: true,
  showFingerings: true,
  showGrandStaffBrace: true,
}

/**
 * Staff Display Options Component
 *
 * @example
 * ```tsx
 * <StaffDisplayOptions
 *   options={displayOptions}
 *   onChange={(opts) => renderer.updateDisplayOptions(opts)}
 *   voiceIds={['soprano', 'alto', 'tenor', 'bass']}
 * />
 * ```
 */
export const StaffDisplayOptions: React.FC<StaffDisplayOptionsProps> = ({
  options,
  onChange,
  voiceIds = [],
  voiceNames = {},
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showOpacityControls, setShowOpacityControls] = useState(false)

  const handleOptionChange = useCallback(
    (key: keyof StaffDisplayOptions, value: boolean | number | Record<string, number>) => {
      onChange({
        ...options,
        [key]: value,
      })
    },
    [options, onChange]
  )

  const handleVoiceOpacityChange = useCallback(
    (voiceId: string, opacity: number) => {
      onChange({
        ...options,
        voiceOpacity: {
          ...options.voiceOpacity,
          [voiceId]: opacity,
        },
      })
    },
    [options, onChange]
  )

  const resetToDefaults = useCallback(() => {
    onChange(defaultDisplayOptions)
  }, [onChange])

  return (
    <div className="staff-display-options">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Display Options</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Basic Options - Always Visible */}
      <div className="space-y-3">
        {/* Staff Visibility */}
        <div className="option-group">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Show Staves
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.showTrebleStaff}
                onChange={e =>
                  handleOptionChange('showTrebleStaff', e.target.checked)
                }
                className="rounded"
              />
              <span>Treble Clef</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.showBassStaff}
                onChange={e =>
                  handleOptionChange('showBassStaff', e.target.checked)
                }
                className="rounded"
              />
              <span>Bass Clef</span>
            </label>
            {options.showAltoStaff !== undefined && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.showAltoStaff}
                  onChange={e =>
                    handleOptionChange('showAltoStaff', e.target.checked)
                  }
                  className="rounded"
                />
                <span>Alto Clef</span>
              </label>
            )}
            {options.showTenorStaff !== undefined && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.showTenorStaff}
                  onChange={e =>
                    handleOptionChange('showTenorStaff', e.target.checked)
                  }
                  className="rounded"
                />
                <span>Tenor Clef</span>
              </label>
            )}
          </div>
        </div>

        {/* Visual Options */}
        <div className="option-group">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Visual</h4>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.showVoiceColors}
                onChange={e =>
                  handleOptionChange('showVoiceColors', e.target.checked)
                }
                className="rounded"
              />
              <span>Voice Colors</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={options.showMeasureNumbers}
                onChange={e =>
                  handleOptionChange('showMeasureNumbers', e.target.checked)
                }
                className="rounded"
              />
              <span>Measure Numbers</span>
            </label>
          </div>
        </div>
      </div>

      {/* Expanded Options */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {/* Practice Aids */}
          <div className="option-group">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Practice Aids
            </h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.showNoteNames}
                  onChange={e =>
                    handleOptionChange('showNoteNames', e.target.checked)
                  }
                  className="rounded"
                />
                <span>Note Names</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.showFingerings}
                  onChange={e =>
                    handleOptionChange('showFingerings', e.target.checked)
                  }
                  className="rounded"
                />
                <span>Fingerings</span>
              </label>
            </div>
          </div>

          {/* Musical Elements */}
          <div className="option-group">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Musical Elements
            </h4>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.showTempo}
                  onChange={e =>
                    handleOptionChange('showTempo', e.target.checked)
                  }
                  className="rounded"
                />
                <span>Tempo Markings</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.showDynamics}
                  onChange={e =>
                    handleOptionChange('showDynamics', e.target.checked)
                  }
                  className="rounded"
                />
                <span>Dynamics</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options.showGrandStaffBrace}
                  onChange={e =>
                    handleOptionChange('showGrandStaffBrace', e.target.checked)
                  }
                  className="rounded"
                />
                <span>Grand Staff Brace</span>
              </label>
            </div>
          </div>

          {/* Staff Spacing */}
          <div className="option-group">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Staff Spacing: {(options.staffSpacing * 100).toFixed(0)}%
            </h4>
            <input
              type="range"
              min="50"
              max="200"
              value={options.staffSpacing * 100}
              onChange={e =>
                handleOptionChange('staffSpacing', Number(e.target.value) / 100)
              }
              className="w-full"
            />
          </div>

          {/* Voice Opacity Controls */}
          {voiceIds.length > 0 && (
            <div className="option-group">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Voice Opacity
                </h4>
                <button
                  onClick={() => setShowOpacityControls(!showOpacityControls)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showOpacityControls ? 'Hide' : 'Show'}
                </button>
              </div>

              {showOpacityControls && (
                <div className="space-y-2">
                  {voiceIds.map(voiceId => {
                    const opacity = options.voiceOpacity[voiceId] ?? 1.0
                    const name = voiceNames[voiceId] || voiceId

                    return (
                      <div
                        key={voiceId}
                        className="flex items-center space-x-2"
                      >
                        <span className="text-sm text-gray-600 w-24">
                          {name}:
                        </span>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={opacity * 100}
                          onChange={e =>
                            handleVoiceOpacityChange(
                              voiceId,
                              Number(e.target.value) / 100
                            )
                          }
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-500 w-12 text-right">
                          {(opacity * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reset Button */}
          <div className="pt-4">
            <button
              onClick={resetToDefaults}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============== Preset Configurations ==============

/**
 * Preset display configurations for common use cases
 */
export const displayPresets = {
  /** Focus on treble staff only */
  trebleOnly: {
    ...defaultDisplayOptions,
    showBassStaff: false,
    showAltoStaff: false,
    showTenorStaff: false,
  },

  /** Focus on bass staff only */
  bassOnly: {
    ...defaultDisplayOptions,
    showTrebleStaff: false,
    showAltoStaff: false,
    showTenorStaff: false,
  },

  /** Piano grand staff */
  pianoGrandStaff: {
    ...defaultDisplayOptions,
    showAltoStaff: false,
    showTenorStaff: false,
    showGrandStaffBrace: true,
  },

  /** SATB choir layout */
  satbChoir: {
    ...defaultDisplayOptions,
    showVoiceColors: true,
    staffSpacing: 1.2,
  },

  /** Practice mode with aids */
  practiceMode: {
    ...defaultDisplayOptions,
    showNoteNames: true,
    showFingerings: true,
    showMeasureNumbers: true,
  },

  /** Performance mode - clean display */
  performanceMode: {
    ...defaultDisplayOptions,
    showNoteNames: false,
    showFingerings: false,
    showMeasureNumbers: false,
  },

  /** Analysis mode - all details */
  analysisMode: {
    ...defaultDisplayOptions,
    showNoteNames: true,
    showMeasureNumbers: true,
    showTempo: true,
    showDynamics: true,
    showFingerings: true,
    showVoiceColors: true,
  },
}

// ============== Styles ==============

const styles = `
.staff-display-options {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.option-group {
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
}

/* Custom checkbox styling */
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Range slider styling */
.staff-display-options input[type="range"] {
  -webkit-appearance: none;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
}

.staff-display-options input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.staff-display-options input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
`

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}
