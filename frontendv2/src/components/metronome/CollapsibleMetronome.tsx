import React, { useState, useEffect, useMemo } from 'react'
import * as Tone from 'tone'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Volume2,
  Save,
  CloudOff,
  Cloud,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getPatternMetronome } from '../../services/patternMetronomeService'
import metronomeData from '../../data/metronomePatterns.json'
import type { MetronomePattern } from '../../types/metronome'
import {
  useMetronomeSettings,
  useMetronomePresets,
} from '../../hooks/useMetronomeSettings'
import { useAuthStore } from '../../stores/authStore'
import { Button, Modal, Input } from '../ui'

interface CollapsibleMetronomeProps {
  position?: 'side' | 'corner'
  onTripleClick?: () => void
}

type PatternState = {
  accent: boolean[]
  click: boolean[]
  woodblock: boolean[]
  shaker: boolean[]
  triangle: boolean[]
}

const CollapsibleMetronome: React.FC<CollapsibleMetronomeProps> = ({
  position: propPosition,
  onTripleClick,
}) => {
  const { t } = useTranslation('ui')
  const { settings, updateSettings } = useMetronomeSettings()
  const {
    presets,
    isLoading: presetsLoading,
    savePreset,
    deletePreset,
    updatePreset,
    syncError,
  } = useMetronomePresets()
  const { isAuthenticated } = useAuthStore()

  // Use prop position if provided, otherwise use settings position
  const position = propPosition ?? settings.position
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  // Preset management state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')

  // Get current pattern data from JSON file
  const currentPatternData = useMemo(() => {
    const pattern = metronomeData.patterns.find(
      p => p.id === settings.selectedPattern
    )
    if (!pattern) {
      // Fallback to basic pattern if selected pattern not found
      return metronomeData.patterns.find(p => p.id === 'basic')!
    }
    return pattern
  }, [settings.selectedPattern])

  // Initialize patterns state from current pattern
  const [patterns, setPatterns] = useState<PatternState>(() => {
    const paddedPattern = {
      accent: [
        ...currentPatternData.pattern.accent,
        ...Array(16).fill(false),
      ].slice(0, 16),
      click: [
        ...currentPatternData.pattern.click,
        ...Array(16).fill(false),
      ].slice(0, 16),
      woodblock: [
        ...currentPatternData.pattern.woodblock,
        ...Array(16).fill(false),
      ].slice(0, 16),
      shaker: [
        ...currentPatternData.pattern.shaker,
        ...Array(16).fill(false),
      ].slice(0, 16),
      triangle: [
        ...currentPatternData.pattern.triangle,
        ...Array(16).fill(false),
      ].slice(0, 16),
    }
    return paddedPattern
  })

  const commonPatterns = metronomeData.patterns as MetronomePattern[]
  // Color mapping for Tailwind classes (must be explicit for production build)
  const colorMap: Record<string, string> = {
    'morandi-purple-400': 'bg-morandi-purple-400',
    'morandi-sky-400': 'bg-morandi-sky-400',
    'morandi-sage-400': 'bg-morandi-sage-400',
    'morandi-sand-400': 'bg-morandi-sand-400',
    'morandi-blush-400': 'bg-morandi-blush-400',
  }

  const soundLayers = Object.entries(metronomeData.soundLayers).map(
    ([id, layer]) => ({
      id,
      name: layer.name,
      color: colorMap[layer.color] || 'bg-morandi-stone-400',
    })
  )

  // Get metronome instance
  const metronome = getPatternMetronome()

  // Initialize metronome
  useEffect(() => {
    metronome.setTempo(settings.bpm)
    metronome.setVolume(settings.volume / 100)
    return () => {
      // Always stop metronome when component unmounts
      metronome.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle tempo changes
  useEffect(() => {
    metronome.setTempo(settings.bpm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.bpm])

  // Handle volume changes
  useEffect(() => {
    metronome.setVolume(settings.volume / 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.volume])

  // Handle pattern changes while playing
  useEffect(() => {
    if (isPlaying) {
      const trimmedPatterns = {
        accent: patterns.accent.slice(0, settings.beatsPerMeasure),
        click: patterns.click.slice(0, settings.beatsPerMeasure),
        woodblock: patterns.woodblock.slice(0, settings.beatsPerMeasure),
        shaker: patterns.shaker.slice(0, settings.beatsPerMeasure),
        triangle: patterns.triangle.slice(0, settings.beatsPerMeasure),
      }
      metronome.setPatterns(trimmedPatterns)

      // Re-register the visual callback to ensure beat highlighting works
      metronome.setVisualCallback({
        onBeat: beatNumber => {
          setCurrentBeat(beatNumber)
          setIsFlashing(true)
          window.setTimeout(() => setIsFlashing(false), 100)
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns, settings.beatsPerMeasure, isPlaying])

  // Reset indicator when stopped (visual updates come from metronome callback when playing)
  useEffect(() => {
    if (!isPlaying) {
      setCurrentBeat(0)
      setIsFlashing(false)
    }
  }, [isPlaying])

  const handleTripleClick = () => {
    if (clickCount === 2) {
      if (onTripleClick) {
        onTripleClick()
      } else {
        updateSettings({ isExpanded: !settings.isExpanded })
      }
      setClickCount(0)
    } else {
      setClickCount(clickCount + 1)
      setTimeout(() => setClickCount(0), 500)
    }
  }

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPlaying) {
      metronome.stop()
      setIsPlaying(false)
      setCurrentBeat(0)
      setIsFlashing(false)
    } else {
      try {
        // Ensure audio context starts on user gesture (mobile/iPad)
        if (Tone.context.state !== 'running') {
          await Tone.start()
        }
        // Only use the beats that are within the current beats per measure
        const trimmedPatterns = {
          accent: patterns.accent.slice(0, settings.beatsPerMeasure),
          click: patterns.click.slice(0, settings.beatsPerMeasure),
          woodblock: patterns.woodblock.slice(0, settings.beatsPerMeasure),
          shaker: patterns.shaker.slice(0, settings.beatsPerMeasure),
          triangle: patterns.triangle.slice(0, settings.beatsPerMeasure),
        }

        await metronome.start(
          {
            tempo: settings.bpm,
            volume: settings.volume / 100,
            beatValue: settings.beatValue,
            patterns: trimmedPatterns,
          },
          {
            onBeat: beatNumber => {
              setCurrentBeat(beatNumber)
              setIsFlashing(true)
              window.setTimeout(() => setIsFlashing(false), 100)
            },
          }
        )
        setIsPlaying(true)
      } catch (error) {
        console.error('Failed to start metronome:', error)
      }
    }
  }

  const toggleBeat = (layer: keyof PatternState, beat: number) => {
    setPatterns(prev => ({
      ...prev,
      [layer]: prev[layer].map((v: boolean, i: number) =>
        i === beat ? !v : v
      ),
    }))

    // Reset preset selection when manually modifying patterns
    setSelectedPresetId('')
  }

  const loadPattern = async (patternId: string) => {
    const pattern = commonPatterns.find(p => p.id === patternId)
    if (pattern) {
      // Store whether metronome was playing
      const wasPlaying = isPlaying

      // Stop metronome if playing to ensure clean state
      if (wasPlaying) {
        metronome.stop()
        setIsPlaying(false)
        setCurrentBeat(0)
        setIsFlashing(false)
      }

      updateSettings({
        selectedPattern: patternId,
        beatsPerMeasure: pattern.beats,
        beatValue: pattern.value,
      })
      const paddedPattern = {
        accent: [...pattern.pattern.accent, ...Array(16).fill(false)].slice(
          0,
          16
        ),
        click: [...pattern.pattern.click, ...Array(16).fill(false)].slice(
          0,
          16
        ),
        woodblock: [
          ...pattern.pattern.woodblock,
          ...Array(16).fill(false),
        ].slice(0, 16),
        shaker: [...pattern.pattern.shaker, ...Array(16).fill(false)].slice(
          0,
          16
        ),
        triangle: [...pattern.pattern.triangle, ...Array(16).fill(false)].slice(
          0,
          16
        ),
      }
      setPatterns(paddedPattern)

      // Reset preset selection when switching to built-in pattern
      setSelectedPresetId('')

      // Restart metronome if it was playing
      if (wasPlaying) {
        try {
          // Ensure audio context is running
          if (Tone.context.state !== 'running') {
            await Tone.start()
          }

          const trimmedPatterns = {
            accent: paddedPattern.accent.slice(0, pattern.beats),
            click: paddedPattern.click.slice(0, pattern.beats),
            woodblock: paddedPattern.woodblock.slice(0, pattern.beats),
            shaker: paddedPattern.shaker.slice(0, pattern.beats),
            triangle: paddedPattern.triangle.slice(0, pattern.beats),
          }

          await metronome.start(
            {
              tempo: settings.bpm,
              volume: settings.volume / 100,
              beatValue: pattern.value,
              patterns: trimmedPatterns,
            },
            {
              onBeat: beatNumber => {
                setCurrentBeat(beatNumber)
                setIsFlashing(true)
                window.setTimeout(() => setIsFlashing(false), 100)
              },
            }
          )
          setIsPlaying(true)
        } catch (error) {
          console.error(
            'Failed to restart metronome after pattern change:',
            error
          )
        }
      }
    }
  }

  // Generate suggested preset name
  const getSuggestedPresetName = () => {
    const patternName =
      metronomeData.patterns.find(p => p.id === settings.selectedPattern)
        ?.name || 'Custom'
    return `${patternName} ${settings.beatsPerMeasure}/${settings.beatValue} ${settings.bpm} BPM`
  }

  // Preset management functions
  const handleSavePreset = () => {
    if (!presetName.trim()) return

    // Check if current pattern differs from the built-in pattern
    const builtInPattern = metronomeData.patterns.find(
      p => p.id === settings.selectedPattern
    )
    let customPattern = undefined

    if (builtInPattern) {
      // Compare current pattern with built-in pattern to see if it's been modified
      const currentPatternSlice = {
        accent: patterns.accent.slice(0, settings.beatsPerMeasure),
        click: patterns.click.slice(0, settings.beatsPerMeasure),
        woodblock: patterns.woodblock.slice(0, settings.beatsPerMeasure),
        shaker: patterns.shaker.slice(0, settings.beatsPerMeasure),
        triangle: patterns.triangle.slice(0, settings.beatsPerMeasure),
      }

      // Pad built-in pattern to match current beats per measure
      const builtInPatternPadded = {
        accent: [
          ...builtInPattern.pattern.accent,
          ...Array(settings.beatsPerMeasure).fill(false),
        ].slice(0, settings.beatsPerMeasure),
        click: [
          ...builtInPattern.pattern.click,
          ...Array(settings.beatsPerMeasure).fill(false),
        ].slice(0, settings.beatsPerMeasure),
        woodblock: [
          ...builtInPattern.pattern.woodblock,
          ...Array(settings.beatsPerMeasure).fill(false),
        ].slice(0, settings.beatsPerMeasure),
        shaker: [
          ...builtInPattern.pattern.shaker,
          ...Array(settings.beatsPerMeasure).fill(false),
        ].slice(0, settings.beatsPerMeasure),
        triangle: [
          ...builtInPattern.pattern.triangle,
          ...Array(settings.beatsPerMeasure).fill(false),
        ].slice(0, settings.beatsPerMeasure),
      }

      // Check if patterns are different
      const isModified = Object.keys(currentPatternSlice).some(
        layer =>
          JSON.stringify(
            currentPatternSlice[layer as keyof typeof currentPatternSlice]
          ) !==
          JSON.stringify(
            builtInPatternPadded[layer as keyof typeof builtInPatternPadded]
          )
      )

      // Save custom pattern if it's been modified
      if (isModified) {
        customPattern = currentPatternSlice
      }
    } else {
      // If no built-in pattern found, always save as custom
      customPattern = {
        accent: patterns.accent.slice(0, settings.beatsPerMeasure),
        click: patterns.click.slice(0, settings.beatsPerMeasure),
        woodblock: patterns.woodblock.slice(0, settings.beatsPerMeasure),
        shaker: patterns.shaker.slice(0, settings.beatsPerMeasure),
        triangle: patterns.triangle.slice(0, settings.beatsPerMeasure),
      }
    }

    savePreset(presetName.trim(), settings, customPattern)
    setPresetName('')
    setShowSaveModal(false)
  }

  const handleOpenSaveModal = () => {
    setPresetName(getSuggestedPresetName())
    setShowSaveModal(true)
  }

  const loadPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId)
    if (!preset) return

    // Update all settings from preset
    updateSettings({
      bpm: preset.bpm,
      beatsPerMeasure: preset.beatsPerMeasure,
      beatValue: preset.beatValue,
      volume: preset.volume,
      selectedPattern: preset.selectedPattern,
    })

    // If preset has custom pattern, load it
    if (preset.customPattern) {
      const paddedPattern = {
        accent: [
          ...preset.customPattern.accent,
          ...Array(16).fill(false),
        ].slice(0, 16),
        click: [...preset.customPattern.click, ...Array(16).fill(false)].slice(
          0,
          16
        ),
        woodblock: [
          ...preset.customPattern.woodblock,
          ...Array(16).fill(false),
        ].slice(0, 16),
        shaker: [
          ...preset.customPattern.shaker,
          ...Array(16).fill(false),
        ].slice(0, 16),
        triangle: [
          ...preset.customPattern.triangle,
          ...Array(16).fill(false),
        ].slice(0, 16),
      }
      setPatterns(paddedPattern)
    } else {
      // Load built-in pattern but preserve preset's time signature
      const pattern = commonPatterns.find(p => p.id === preset.selectedPattern)
      if (pattern) {
        const paddedPattern = {
          accent: [...pattern.pattern.accent, ...Array(16).fill(false)].slice(
            0,
            16
          ),
          click: [...pattern.pattern.click, ...Array(16).fill(false)].slice(
            0,
            16
          ),
          woodblock: [
            ...pattern.pattern.woodblock,
            ...Array(16).fill(false),
          ].slice(0, 16),
          shaker: [...pattern.pattern.shaker, ...Array(16).fill(false)].slice(
            0,
            16
          ),
          triangle: [
            ...pattern.pattern.triangle,
            ...Array(16).fill(false),
          ].slice(0, 16),
        }
        setPatterns(paddedPattern)
      }
    }

    setSelectedPresetId(presetId)
  }

  const handleDeletePreset = (presetId: string) => {
    if (window.confirm(t('components.metronome.presets.deleteConfirm'))) {
      deletePreset(presetId)
      if (selectedPresetId === presetId) {
        setSelectedPresetId('')
      }
    }
  }

  return (
    <div
      className={`fixed z-50 ${
        position === 'side'
          ? 'right-8 top-1/2 -translate-y-1/2'
          : 'right-8 bottom-8'
      }`}
    >
      <div
        className={`rounded-lg shadow-lg transition-all duration-300 ${
          settings.isExpanded
            ? 'w-80 bg-morandi-stone-50/70 backdrop-blur-sm'
            : 'w-16'
        } ${
          position === 'corner' && !settings.isExpanded
            ? 'bg-morandi-stone-50/70 backdrop-blur-sm'
            : 'bg-morandi-stone-50/70 backdrop-blur-sm'
        } ${
          isFlashing && isPlaying ? 'ring-2 ring-morandi-purple-400/50' : ''
        }`}
        onClick={handleTripleClick}
      >
        {!settings.isExpanded ? (
          /* Collapsed State */
          <div className="p-2 space-y-2">
            <button
              onClick={handlePlayPause}
              className={`w-12 h-12 bg-morandi-purple-400 text-white rounded-full flex items-center justify-center hover:bg-morandi-purple-500 transition-all duration-300 ${
                isFlashing && isPlaying ? 'scale-110 bg-morandi-purple-500' : ''
              }`}
              title={t('components.metronome.playPause')}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <div
              className={`text-center transition-all duration-100 ${
                isFlashing && isPlaying ? 'scale-105' : ''
              }`}
            >
              <div className="text-xl font-bold text-morandi-stone-900">
                {settings.bpm}
              </div>
              <div className="text-xs text-morandi-stone-500">BPM</div>
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold text-morandi-stone-700">
                {settings.beatsPerMeasure}/{settings.beatValue}
              </div>
            </div>

            {/* Quick Save Button */}
            <button
              onClick={e => {
                e.stopPropagation()
                handleOpenSaveModal()
              }}
              className="w-12 h-12 bg-morandi-purple-50 hover:bg-morandi-purple-100 text-morandi-purple-600 rounded-full flex items-center justify-center transition-colors"
              title="Save current settings as preset"
            >
              <Save size={16} />
            </button>

            <button
              className="w-12 h-12 text-morandi-stone-400 flex items-center justify-center hover:text-morandi-stone-600"
              title={t('components.metronome.expand')}
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        ) : (
          /* Expanded State */
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-morandi-stone-900">
                Advanced Metronome
              </h3>
              <button
                onClick={e => {
                  e.stopPropagation()
                  updateSettings({ isExpanded: false })
                }}
                className="text-morandi-stone-400 hover:text-morandi-stone-600"
                title={t('components.metronome.collapse')}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* BPM Control */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() =>
                    updateSettings({ bpm: Math.max(40, settings.bpm - 5) })
                  }
                  className="w-8 h-8 bg-morandi-stone-100 rounded-full flex items-center justify-center hover:bg-morandi-stone-200"
                >
                  <Minus size={14} />
                </button>
                <div className="text-center">
                  <div className="text-2xl font-bold text-morandi-stone-900">
                    {settings.bpm}
                  </div>
                  <div className="text-xs text-morandi-stone-500">BPM</div>
                </div>
                <button
                  onClick={() =>
                    updateSettings({ bpm: Math.min(240, settings.bpm + 5) })
                  }
                  className="w-8 h-8 bg-morandi-stone-100 rounded-full flex items-center justify-center hover:bg-morandi-stone-200"
                >
                  <Plus size={14} />
                </button>
              </div>
              <input
                type="range"
                min="40"
                max="240"
                value={settings.bpm}
                onChange={e => updateSettings({ bpm: Number(e.target.value) })}
                className="w-full h-2 accent-morandi-purple-400"
              />
            </div>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className={`w-full py-2 mb-3 bg-morandi-purple-400 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-morandi-purple-500 transition-all ${
                isFlashing && isPlaying ? 'scale-105' : ''
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span className="text-sm font-medium">
                {isPlaying ? 'Pause' : 'Play'}
              </span>
            </button>

            {/* Presets */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-morandi-stone-600">
                  {t('components.metronome.presets.title')}
                </label>
                {isAuthenticated && (
                  <div className="flex items-center gap-1">
                    {presetsLoading ? (
                      <Loader2
                        size={12}
                        className="animate-spin text-morandi-stone-400"
                      />
                    ) : syncError ? (
                      <div title={syncError}>
                        <CloudOff size={12} className="text-red-400" />
                      </div>
                    ) : (
                      <div title="Synced to cloud">
                        <Cloud size={12} className="text-green-400" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Save Preset Button */}
              <button
                onClick={handleOpenSaveModal}
                className="w-full mb-2 px-3 py-2 bg-morandi-purple-100 hover:bg-morandi-purple-200 text-morandi-purple-700 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                title={t(
                  'components.metronome.presets.saveCurrentSettingsTooltip'
                )}
              >
                <Save size={16} />
                {t('components.metronome.presets.saveCurrentSettings')}
              </button>

              {presets.length > 0 && (
                <select
                  value={selectedPresetId}
                  onChange={e => {
                    if (e.target.value) {
                      loadPreset(e.target.value)
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-morandi-stone-200 rounded mb-2"
                >
                  <option value="">
                    {t('components.metronome.presets.selectPreset')}
                  </option>
                  {presets.map(preset => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}{' '}
                      {!preset.synced && !isAuthenticated
                        ? ` (${t('components.metronome.presets.local')})`
                        : ''}
                    </option>
                  ))}
                </select>
              )}

              {selectedPresetId && (
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const preset = presets.find(
                        p => p.id === selectedPresetId
                      )
                      if (preset) {
                        const newName = window.prompt(
                          t('components.metronome.presets.enterNewName'),
                          preset.name
                        )
                        if (newName && newName.trim()) {
                          updatePreset(selectedPresetId, {
                            name: newName.trim(),
                          })
                        }
                      }
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-morandi-stone-100 hover:bg-morandi-stone-200 rounded"
                  >
                    {t('components.metronome.presets.rename')}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          t('components.metronome.presets.updateConfirm', {
                            presetName: presets.find(
                              p => p.id === selectedPresetId
                            )?.name,
                          })
                        )
                      ) {
                        // Save current settings to the selected preset
                        const builtInPattern = metronomeData.patterns.find(
                          p => p.id === settings.selectedPattern
                        )
                        let customPattern = undefined

                        if (builtInPattern) {
                          const currentPatternSlice = {
                            accent: patterns.accent.slice(
                              0,
                              settings.beatsPerMeasure
                            ),
                            click: patterns.click.slice(
                              0,
                              settings.beatsPerMeasure
                            ),
                            woodblock: patterns.woodblock.slice(
                              0,
                              settings.beatsPerMeasure
                            ),
                            shaker: patterns.shaker.slice(
                              0,
                              settings.beatsPerMeasure
                            ),
                            triangle: patterns.triangle.slice(
                              0,
                              settings.beatsPerMeasure
                            ),
                          }

                          const builtInPatternPadded = {
                            accent: [
                              ...builtInPattern.pattern.accent,
                              ...Array(settings.beatsPerMeasure).fill(false),
                            ].slice(0, settings.beatsPerMeasure),
                            click: [
                              ...builtInPattern.pattern.click,
                              ...Array(settings.beatsPerMeasure).fill(false),
                            ].slice(0, settings.beatsPerMeasure),
                            woodblock: [
                              ...builtInPattern.pattern.woodblock,
                              ...Array(settings.beatsPerMeasure).fill(false),
                            ].slice(0, settings.beatsPerMeasure),
                            shaker: [
                              ...builtInPattern.pattern.shaker,
                              ...Array(settings.beatsPerMeasure).fill(false),
                            ].slice(0, settings.beatsPerMeasure),
                            triangle: [
                              ...builtInPattern.pattern.triangle,
                              ...Array(settings.beatsPerMeasure).fill(false),
                            ].slice(0, settings.beatsPerMeasure),
                          }

                          const isModified = Object.keys(
                            currentPatternSlice
                          ).some(
                            layer =>
                              JSON.stringify(
                                currentPatternSlice[
                                  layer as keyof typeof currentPatternSlice
                                ]
                              ) !==
                              JSON.stringify(
                                builtInPatternPadded[
                                  layer as keyof typeof builtInPatternPadded
                                ]
                              )
                          )

                          if (isModified) {
                            customPattern = currentPatternSlice
                          }
                        }

                        updatePreset(selectedPresetId, {
                          bpm: settings.bpm,
                          beatsPerMeasure: settings.beatsPerMeasure,
                          beatValue: settings.beatValue,
                          volume: settings.volume,
                          selectedPattern: settings.selectedPattern,
                          customPattern,
                          lastModified: new Date().toISOString(),
                        })
                      }
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-morandi-purple-100 hover:bg-morandi-purple-200 text-morandi-purple-700 rounded"
                  >
                    {t('components.metronome.presets.update')}
                  </button>
                  <button
                    onClick={() => handleDeletePreset(selectedPresetId)}
                    className="flex-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded"
                  >
                    {t('components.metronome.presets.delete')}
                  </button>
                </div>
              )}
            </div>

            {/* Pattern Selector */}
            <div className="mb-3">
              <label className="text-xs text-morandi-stone-600 mb-1 block">
                Pattern
              </label>
              <select
                value={settings.selectedPattern}
                onChange={e => loadPattern(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-morandi-stone-200 rounded"
              >
                {commonPatterns.map(pattern => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Signature */}
            <div className="mb-3">
              <label className="text-xs text-morandi-stone-600 mb-1 block">
                Time Signature
              </label>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={settings.beatsPerMeasure}
                  onChange={e =>
                    updateSettings({
                      beatsPerMeasure: Math.max(
                        1,
                        Math.min(36, Number(e.target.value))
                      ),
                    })
                  }
                  className="w-12 px-1 py-1 text-sm text-center border border-morandi-stone-200 rounded"
                />
                <span className="text-lg text-morandi-stone-400">/</span>
                <select
                  value={settings.beatValue}
                  onChange={e =>
                    updateSettings({ beatValue: Number(e.target.value) })
                  }
                  className="w-12 px-1 py-1 text-sm border border-morandi-stone-200 rounded"
                >
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                  <option value="16">16</option>
                </select>
              </div>
            </div>

            {/* Volume */}
            <div className="mb-4">
              <label className="text-xs text-morandi-stone-600 mb-1 block flex items-center gap-1">
                <Volume2 size={12} />
                Volume: {settings.volume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                onChange={e =>
                  updateSettings({ volume: Number(e.target.value) })
                }
                className="w-full h-2 accent-morandi-purple-400"
              />
            </div>

            {/* Beat Pattern Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-morandi-stone-700">
                Pattern Grid
              </h4>
              <div className="space-y-1">
                {soundLayers.map(layer => (
                  <div key={layer.id} className="flex items-center gap-1">
                    <div className="w-16 text-xs text-morandi-stone-600 truncate">
                      {layer.name}
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from(
                        { length: settings.beatsPerMeasure },
                        (_, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              toggleBeat(layer.id as keyof PatternState, i)
                            }
                            className={`w-6 h-6 rounded text-xs transition-all ${
                              patterns[layer.id as keyof PatternState][i]
                                ? layer.color + ' opacity-80'
                                : 'bg-morandi-stone-100 hover:bg-morandi-stone-200'
                            } ${
                              i === currentBeat && isPlaying
                                ? 'shadow-md shadow-morandi-purple-400/50 ring-1 ring-morandi-purple-400'
                                : ''
                            }`}
                          />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Preset Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false)
          setPresetName('')
        }}
        title={t('components.metronome.presets.savePresetTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
              {t('components.metronome.presets.presetName')}
            </label>
            <Input
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder={t(
                'components.metronome.presets.presetNamePlaceholder'
              )}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSavePreset()
                }
              }}
              autoFocus
            />
          </div>

          {/* Current Settings Preview */}
          <div className="bg-morandi-stone-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
              {t('components.metronome.presets.currentSettings')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-morandi-stone-500">
                  {t('components.metronome.presets.tempo')}:
                </span>
                <span className="ml-1 font-medium">{settings.bpm} BPM</span>
              </div>
              <div>
                <span className="text-morandi-stone-500">
                  {t('components.metronome.presets.time')}:
                </span>
                <span className="ml-1 font-medium">
                  {settings.beatsPerMeasure}/{settings.beatValue}
                </span>
              </div>
              <div>
                <span className="text-morandi-stone-500">
                  {t('components.metronome.presets.volume')}:
                </span>
                <span className="ml-1 font-medium">{settings.volume}%</span>
              </div>
              <div>
                <span className="text-morandi-stone-500">
                  {t('components.metronome.presets.pattern')}:
                </span>
                <span className="ml-1 font-medium">
                  {metronomeData.patterns.find(
                    p => p.id === settings.selectedPattern
                  )?.name || 'Custom'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-morandi-stone-500">
            {isAuthenticated ? (
              <span>✓ {t('components.metronome.presets.syncToCloud')}</span>
            ) : (
              <span>💡 {t('components.metronome.presets.signInToSync')}</span>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSaveModal(false)
                setPresetName('')
              }}
            >
              {t('components.metronome.presets.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
            >
              {t('components.metronome.presets.savePreset')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CollapsibleMetronome
