import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Play,
  Pause,
  Plus,
  Minus,
  Volume2,
  Music,
  ListChecks,
  Circle,
  Book,
  Save,
  CloudOff,
  Cloud,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as Tone from 'tone'
import metronomeData from '../data/metronomePatterns.json'
import type { MetronomePattern } from '../types/metronome'
import { getPatternMetronome } from '../services/patternMetronomeService'
import {
  useMetronomeSettings,
  useMetronomePresets,
} from '../hooks/useMetronomeSettings'
import { useModal } from '../hooks/useModal'
import { useAuthStore } from '../stores/authStore'
import AppLayout from '../components/layout/AppLayout'
import { Tabs, Button, Modal, Input } from '../components/ui'
import PracticeCounter from '../components/practice-counter'
import { CircleOfFifths } from '../components/circle-of-fifths'
import Dictionary from '../components/dictionary/Dictionary'
import TimerEntry from '../components/TimerEntry'
import ManualEntryForm from '../components/ManualEntryForm'
// Auto-logging removed for metronome per issue #469
// Practice Counter component imports its own auto-logging hooks

type PatternState = {
  accent: boolean[]
  click: boolean[]
  woodblock: boolean[]
  shaker: boolean[]
  triangle: boolean[]
}

const Toolbox: React.FC = () => {
  const { t } = useTranslation(['toolbox', 'common', 'ui'])
  const { lang, term } = useParams<{ lang?: string; term?: string }>()
  const { settings, updateSettings, saveCurrentPattern } =
    useMetronomeSettings()
  const {
    presets,
    isLoading: presetsLoading,
    savePreset,
    deletePreset,
    updatePreset,
    syncError,
  } = useMetronomePresets()
  const { isAuthenticated } = useAuthStore()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [tapTimes, setTapTimes] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState('metronome')
  const [showTimer, setShowTimer] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [timerDuration, setTimerDuration] = useState<number | undefined>()
  const [timerStartTime, setTimerStartTime] = useState<Date | undefined>()
  const [beatsInputValue, setBeatsInputValue] = useState<string>(
    settings.beatsPerMeasure.toString()
  )
  // Simple elapsed time tracking for metronome (without auto-logging)
  const [, setMetronomeElapsedTime] = useState(0)
  const [metronomeStartTime, setMetronomeStartTime] = useState<number | null>(
    null
  )

  // Preset management state
  const saveModal = useModal()
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

  // Initialize patterns state from saved pattern or current pattern
  const [patterns, setPatterns] = useState<PatternState>(() => {
    // Check if we have a saved custom pattern first
    if (settings.currentCustomPattern) {
      return {
        accent: [
          ...settings.currentCustomPattern.accent,
          ...Array(36).fill(false),
        ].slice(0, 36),
        click: [
          ...settings.currentCustomPattern.click,
          ...Array(36).fill(false),
        ].slice(0, 36),
        woodblock: [
          ...settings.currentCustomPattern.woodblock,
          ...Array(36).fill(false),
        ].slice(0, 36),
        shaker: [
          ...settings.currentCustomPattern.shaker,
          ...Array(36).fill(false),
        ].slice(0, 36),
        triangle: [
          ...settings.currentCustomPattern.triangle,
          ...Array(36).fill(false),
        ].slice(0, 36),
      }
    }

    // Otherwise use the current pattern data
    const paddedPattern = {
      accent: [
        ...currentPatternData.pattern.accent,
        ...Array(36).fill(false),
      ].slice(0, 36),
      click: [
        ...currentPatternData.pattern.click,
        ...Array(36).fill(false),
      ].slice(0, 36),
      woodblock: [
        ...currentPatternData.pattern.woodblock,
        ...Array(36).fill(false),
      ].slice(0, 36),
      shaker: [
        ...currentPatternData.pattern.shaker,
        ...Array(36).fill(false),
      ].slice(0, 36),
      triangle: [
        ...currentPatternData.pattern.triangle,
        ...Array(36).fill(false),
      ].slice(0, 36),
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

  // Auto-switch to dictionary tab when on dictionary SEO URLs
  useEffect(() => {
    if (lang && term) {
      // We're on a dictionary SEO URL, switch to dictionary tab
      setActiveTab('dictionary')
    }
  }, [lang, term])

  // Sync beats input value when settings change (e.g., from pattern loading)
  useEffect(() => {
    setBeatsInputValue(settings.beatsPerMeasure.toString())
  }, [settings.beatsPerMeasure])

  // Track elapsed time when metronome is playing
  useEffect(() => {
    if (isPlaying && metronomeStartTime) {
      const interval = setInterval(() => {
        setMetronomeElapsedTime(
          Math.floor((Date.now() - metronomeStartTime) / 1000)
        )
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isPlaying, metronomeStartTime])

  // Cleanup metronome on unmount
  useEffect(() => {
    // Don't set tempo/volume here - wait for user interaction
    // The settings will be applied when the user starts the metronome
    return () => {
      // Always stop metronome when leaving the page
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

  // Stop metronome when switching tabs
  useEffect(() => {
    if (activeTab !== 'metronome') {
      if (isPlaying) {
        metronome.stop()
        setIsPlaying(false)
        // Reset timer when stopping
        setMetronomeElapsedTime(0)
        setMetronomeStartTime(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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
  }, [patterns, settings.beatsPerMeasure])

  // Reset indicator when stopped (visual updates come from metronome callback when playing)
  useEffect(() => {
    if (!isPlaying) {
      setCurrentBeat(0)
      setIsFlashing(false)
    }
  }, [isPlaying])

  const handlePlayPause = async () => {
    if (isPlaying) {
      metronome.stop()
      setIsPlaying(false)
      // Reset timer when stopping
      setMetronomeElapsedTime(0)
      setMetronomeStartTime(null)
    } else {
      try {
        // Ensure Tone.js audio context is started (required for user gesture)
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
        // Start timer when metronome starts
        setMetronomeStartTime(Date.now())
      } catch (error) {
        console.error('Failed to start metronome:', error)
      }
    }
  }

  const handleTapTempo = async () => {
    // Ensure audio context is started for tap tempo sound (if any)
    if (Tone.context.state !== 'running') {
      await Tone.start()
    }

    const now = Date.now()
    const recentTaps = [...tapTimes, now].filter(t => now - t < 3000)

    if (recentTaps.length >= 2) {
      const intervals = []
      for (let i = 1; i < recentTaps.length; i++) {
        intervals.push(recentTaps[i] - recentTaps[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length
      const newBpm = Math.round(60000 / avgInterval)
      updateSettings({ bpm: Math.max(40, Math.min(240, newBpm)) })
    }

    setTapTimes(recentTaps)
  }

  const toggleBeat = (layer: keyof PatternState, beat: number) => {
    setPatterns(prev => {
      const newPatterns = {
        ...prev,
        [layer]: prev[layer].map((v: boolean, i: number) =>
          i === beat ? !v : v
        ),
      }
      // Save the updated pattern automatically
      saveCurrentPattern(newPatterns)
      return newPatterns
    })

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
        // Reset timer when stopping
        setMetronomeElapsedTime(0)
        setMetronomeStartTime(null)
      }

      updateSettings({
        selectedPattern: patternId,
        beatsPerMeasure: pattern.beats,
        beatValue: pattern.value,
        currentCustomPattern: undefined, // Clear custom pattern when loading preset
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
          // Restart timer when metronome starts
          setMetronomeStartTime(Date.now())
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
    saveModal.close()
  }

  const handleOpenSaveModal = () => {
    setPresetName(getSuggestedPresetName())
    saveModal.open()
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
          ...Array(36).fill(false),
        ].slice(0, 36),
        click: [...preset.customPattern.click, ...Array(36).fill(false)].slice(
          0,
          36
        ),
        woodblock: [
          ...preset.customPattern.woodblock,
          ...Array(36).fill(false),
        ].slice(0, 36),
        shaker: [
          ...preset.customPattern.shaker,
          ...Array(36).fill(false),
        ].slice(0, 36),
        triangle: [
          ...preset.customPattern.triangle,
          ...Array(36).fill(false),
        ].slice(0, 36),
      }
      setPatterns(paddedPattern)
    } else {
      // Load built-in pattern but preserve preset's time signature
      const pattern = commonPatterns.find(p => p.id === preset.selectedPattern)
      if (pattern) {
        const paddedPattern = {
          accent: [...pattern.pattern.accent, ...Array(36).fill(false)].slice(
            0,
            36
          ),
          click: [...pattern.pattern.click, ...Array(36).fill(false)].slice(
            0,
            36
          ),
          woodblock: [
            ...pattern.pattern.woodblock,
            ...Array(36).fill(false),
          ].slice(0, 36),
          shaker: [...pattern.pattern.shaker, ...Array(36).fill(false)].slice(
            0,
            36
          ),
          triangle: [
            ...pattern.pattern.triangle,
            ...Array(36).fill(false),
          ].slice(0, 36),
        }
        setPatterns(paddedPattern)
      }
    }

    setSelectedPresetId(presetId)
  }

  const handleDeletePreset = (presetId: string) => {
    if (window.confirm(t('ui:components.metronome.presets.deleteConfirm'))) {
      deletePreset(presetId)
      if (selectedPresetId === presetId) {
        setSelectedPresetId('')
      }
    }
  }

  const handleTimerComplete = (duration: number, startTime?: Date) => {
    setShowTimer(false)
    setTimerDuration(duration)
    setTimerStartTime(startTime)
    setShowManualEntry(true)
  }

  const handleToolboxAdd = () => {
    setShowManualEntry(true)
  }

  const handleManualEntryClose = () => {
    setShowManualEntry(false)
    setTimerDuration(undefined)
    setTimerStartTime(undefined)
  }

  const handleManualEntrySave = () => {
    setShowManualEntry(false)
    setTimerDuration(undefined)
    setTimerStartTime(undefined)
  }

  return (
    <AppLayout
      onNewEntry={handleToolboxAdd}
      onTimerClick={() => setShowTimer(true)}
      onToolboxAdd={handleToolboxAdd}
    >
      {/* Main Content */}
      <div className="p-3 sm:px-6 sm:py-4">
        {/* Tabs */}
        <Tabs
          tabs={[
            {
              id: 'metronome',
              label: t('tabs.metronome'),
              icon: <Music size={20} />,
            },
            {
              id: 'counter',
              label: t('tabs.counter'),
              icon: <ListChecks size={20} />,
            },
            {
              id: 'circle-of-fifths',
              label: t('tabs.circleOfFifths'),
              icon: <Circle size={20} />,
            },
            {
              id: 'dictionary',
              label: t('tabs.dictionary'),
              icon: <Book size={20} />,
            },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="mb-6"
        />

        {/* Tab Content */}
        {activeTab === 'metronome' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Control Panel */}
            <div className="lg:w-1/3">
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 space-y-3 sm:space-y-4">
                {/* Play/Pause and BPM */}
                <div className="text-center">
                  <button
                    onClick={handlePlayPause}
                    className={`w-20 h-20 mx-auto mb-4 bg-morandi-purple-400 text-white rounded-full flex items-center justify-center hover:bg-morandi-purple-500 transition-all duration-300 ${
                      isFlashing && isPlaying
                        ? 'scale-110 bg-morandi-purple-500'
                        : ''
                    }`}
                  >
                    {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                  </button>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-center gap-4 mb-2">
                        <button
                          onClick={() =>
                            updateSettings({
                              bpm: Math.max(40, settings.bpm - 1),
                            })
                          }
                          className="w-10 h-10 bg-morandi-stone-100 rounded-full flex items-center justify-center hover:bg-morandi-stone-200"
                        >
                          <Minus size={18} />
                        </button>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-morandi-stone-900">
                            {settings.bpm}
                          </div>
                          <div className="text-sm text-morandi-stone-500">
                            BPM
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            updateSettings({
                              bpm: Math.min(240, settings.bpm + 1),
                            })
                          }
                          className="w-10 h-10 bg-morandi-stone-100 rounded-full flex items-center justify-center hover:bg-morandi-stone-200"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="240"
                        value={settings.bpm}
                        onChange={e =>
                          updateSettings({ bpm: Number(e.target.value) })
                        }
                        className="w-full accent-morandi-purple-400"
                      />
                      <button
                        onClick={handleTapTempo}
                        className="w-full mt-2 py-2 bg-morandi-stone-100 text-morandi-stone-700 rounded-lg hover:bg-morandi-stone-200 text-sm font-medium"
                      >
                        {t('toolbox:metronome.tapTempo')}
                      </button>
                    </div>

                    {/* Time Signature */}
                    <div>
                      <label className="text-sm text-morandi-stone-600 mb-1 block">
                        {t('toolbox:metronome.timeSignature')}
                      </label>
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="36"
                          value={beatsInputValue}
                          onChange={e => {
                            const value = e.target.value
                            setBeatsInputValue(value) // Always update local state

                            // Only update settings if valid number
                            if (value !== '') {
                              const numValue = Number(value)
                              if (
                                !isNaN(numValue) &&
                                numValue >= 1 &&
                                numValue <= 36
                              ) {
                                updateSettings({
                                  beatsPerMeasure: numValue,
                                })
                              }
                            }
                          }}
                          onBlur={e => {
                            // Ensure valid value when user leaves the field
                            const value = e.target.value
                            if (value === '' || Number(value) < 1) {
                              setBeatsInputValue('1')
                              updateSettings({ beatsPerMeasure: 1 })
                            } else if (Number(value) > 36) {
                              setBeatsInputValue('36')
                              updateSettings({ beatsPerMeasure: 36 })
                            }
                          }}
                          className="w-16 px-2 py-1 text-center border border-morandi-stone-200 rounded"
                        />
                        <span className="text-xl text-morandi-stone-400">
                          /
                        </span>
                        <select
                          value={settings.beatValue}
                          onChange={e =>
                            updateSettings({
                              beatValue: Number(e.target.value),
                            })
                          }
                          className="w-16 px-2 py-1 border border-morandi-stone-200 rounded"
                        >
                          <option value="2">2</option>
                          <option value="4">4</option>
                          <option value="8">8</option>
                          <option value="16">16</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Beat Pattern Grid */}
            <div className="lg:w-2/3">
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
                <div className="w-full">
                  <div
                    className={`${
                      settings.beatsPerMeasure <= 16
                        ? 'w-full'
                        : 'overflow-x-auto overflow-y-hidden'
                    }`}
                  >
                    <div
                      className={`${
                        settings.beatsPerMeasure <= 16
                          ? 'w-full'
                          : 'inline-block min-w-fit'
                      }`}
                    >
                      {/* Grid with beat numbers and layers */}
                      <div
                        className={`grid gap-1 ${
                          settings.beatsPerMeasure <= 16
                            ? 'grid-cols-[96px_1fr]'
                            : 'grid-cols-[96px_repeat(36,40px)]'
                        }`}
                      >
                        {/* Header row with beat numbers */}
                        <div></div>
                        {settings.beatsPerMeasure <= 16 ? (
                          <div className="grid grid-cols-subgrid col-span-1">
                            <div className="flex justify-around">
                              {Array.from(
                                { length: settings.beatsPerMeasure },
                                (_, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 h-6 flex items-center justify-center text-sm text-morandi-stone-600"
                                  >
                                    {i + 1}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {Array.from(
                              { length: settings.beatsPerMeasure },
                              (_, i) => (
                                <div
                                  key={i}
                                  className="w-10 h-6 flex items-center justify-center text-sm text-morandi-stone-600"
                                >
                                  {i + 1}
                                </div>
                              )
                            )}
                            {/* Fill remaining columns */}
                            {Array.from(
                              { length: 36 - settings.beatsPerMeasure },
                              (_, i) => (
                                <div key={`empty-${i}`}></div>
                              )
                            )}
                          </>
                        )}

                        {/* Sound Layers */}
                        {soundLayers.map(layer => (
                          <React.Fragment key={layer.id}>
                            <div className="text-sm text-morandi-stone-700 text-right pr-2 flex items-center justify-end">
                              {t(`toolbox:metronome.sounds.${layer.id}`)}
                            </div>
                            {settings.beatsPerMeasure <= 16 ? (
                              <div className="grid grid-cols-subgrid col-span-1">
                                <div className="flex justify-around gap-1">
                                  {Array.from(
                                    { length: settings.beatsPerMeasure },
                                    (_, i) => (
                                      <button
                                        key={i}
                                        onClick={() =>
                                          toggleBeat(
                                            layer.id as keyof PatternState,
                                            i
                                          )
                                        }
                                        className={`flex-1 h-10 rounded transition-all ${
                                          patterns[
                                            layer.id as keyof PatternState
                                          ][i]
                                            ? layer.color + ' text-white'
                                            : 'bg-morandi-stone-100 hover:bg-morandi-stone-200'
                                        } ${
                                          i === currentBeat && isPlaying
                                            ? 'shadow-lg shadow-morandi-purple-400/50 ring-2 ring-morandi-purple-400 ring-opacity-75'
                                            : ''
                                        }`}
                                      />
                                    )
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                {Array.from({ length: 36 }, (_, i) => (
                                  <button
                                    key={i}
                                    onClick={() =>
                                      i < settings.beatsPerMeasure &&
                                      toggleBeat(
                                        layer.id as keyof PatternState,
                                        i
                                      )
                                    }
                                    disabled={i >= settings.beatsPerMeasure}
                                    className={`w-10 h-10 rounded transition-all ${
                                      i < settings.beatsPerMeasure
                                        ? patterns[
                                            layer.id as keyof PatternState
                                          ][i]
                                          ? layer.color + ' text-white'
                                          : 'bg-morandi-stone-100 hover:bg-morandi-stone-200'
                                        : 'bg-transparent cursor-default'
                                    } ${
                                      i === currentBeat &&
                                      isPlaying &&
                                      i < settings.beatsPerMeasure
                                        ? 'shadow-lg shadow-morandi-purple-400/50 ring-2 ring-morandi-purple-400 ring-opacity-75'
                                        : ''
                                    }`}
                                  />
                                ))}
                              </>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-sm text-morandi-stone-600">
                  <p>{t('toolbox:metronome.clickToCreate')}</p>
                </div>

                {/* Secondary Controls */}
                <div className="mt-6 space-y-6">
                  {/* Pattern Selector */}
                  <div>
                    <label className="text-sm text-morandi-stone-600 mb-2 block">
                      {t('toolbox:metronome.presetPatterns')}
                    </label>
                    <select
                      value={settings.selectedPattern}
                      onChange={e => loadPattern(e.target.value)}
                      className="w-full px-3 py-2 border border-morandi-stone-200 rounded-lg"
                    >
                      {commonPatterns.map(pattern => (
                        <option key={pattern.id} value={pattern.id}>
                          {t(`toolbox:metronome.patterns.${pattern.id}.name`)} -{' '}
                          {t(
                            `toolbox:metronome.patterns.${pattern.id}.description`
                          )}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-morandi-stone-600">
                        {t('ui:components.metronome.presets.savedPresets')}
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
                      className="w-full mb-3 px-3 py-2 bg-morandi-purple-100 hover:bg-morandi-purple-200 text-morandi-purple-700 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                      title={t(
                        'ui:components.metronome.presets.saveCurrentSettingsTooltip'
                      )}
                    >
                      <Save size={16} />
                      {t(
                        'ui:components.metronome.presets.saveCurrentSettingsAsPreset'
                      )}
                    </button>

                    {presets.length > 0 && (
                      <>
                        <select
                          value={selectedPresetId}
                          onChange={e => {
                            if (e.target.value) {
                              loadPreset(e.target.value)
                            }
                          }}
                          className="w-full px-3 py-2 border border-morandi-stone-200 rounded-lg mb-2"
                        >
                          <option value="">
                            {t(
                              'ui:components.metronome.presets.selectSavedPreset'
                            )}
                          </option>
                          {presets.map(preset => (
                            <option key={preset.id} value={preset.id}>
                              {preset.name}{' '}
                              {!preset.synced && !isAuthenticated
                                ? ` (${t('ui:components.metronome.presets.local')})`
                                : ''}
                            </option>
                          ))}
                        </select>

                        {selectedPresetId && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const preset = presets.find(
                                  p => p.id === selectedPresetId
                                )
                                if (preset) {
                                  const newName = window.prompt(
                                    t(
                                      'ui:components.metronome.presets.enterNewName'
                                    ),
                                    preset.name
                                  )
                                  if (newName && newName.trim()) {
                                    updatePreset(selectedPresetId, {
                                      name: newName.trim(),
                                    })
                                  }
                                }
                              }}
                              className="flex-1 px-3 py-1 text-sm bg-morandi-stone-100 hover:bg-morandi-stone-200 rounded-lg"
                            >
                              {t('ui:components.metronome.presets.rename')}
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    t(
                                      'ui:components.metronome.presets.updateConfirm',
                                      {
                                        presetName: presets.find(
                                          p => p.id === selectedPresetId
                                        )?.name,
                                      }
                                    )
                                  )
                                ) {
                                  // Save current settings to the selected preset
                                  const builtInPattern =
                                    metronomeData.patterns.find(
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
                                        ...Array(settings.beatsPerMeasure).fill(
                                          false
                                        ),
                                      ].slice(0, settings.beatsPerMeasure),
                                      click: [
                                        ...builtInPattern.pattern.click,
                                        ...Array(settings.beatsPerMeasure).fill(
                                          false
                                        ),
                                      ].slice(0, settings.beatsPerMeasure),
                                      woodblock: [
                                        ...builtInPattern.pattern.woodblock,
                                        ...Array(settings.beatsPerMeasure).fill(
                                          false
                                        ),
                                      ].slice(0, settings.beatsPerMeasure),
                                      shaker: [
                                        ...builtInPattern.pattern.shaker,
                                        ...Array(settings.beatsPerMeasure).fill(
                                          false
                                        ),
                                      ].slice(0, settings.beatsPerMeasure),
                                      triangle: [
                                        ...builtInPattern.pattern.triangle,
                                        ...Array(settings.beatsPerMeasure).fill(
                                          false
                                        ),
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
                              className="flex-1 px-3 py-1 text-sm bg-morandi-purple-100 hover:bg-morandi-purple-200 text-morandi-purple-700 rounded-lg"
                            >
                              {t('ui:components.metronome.presets.update')}
                            </button>
                            <button
                              onClick={() =>
                                handleDeletePreset(selectedPresetId)
                              }
                              className="flex-1 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                            >
                              {t('ui:components.metronome.presets.delete')}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Volume */}
                  <div>
                    <label className="text-sm text-morandi-stone-600 mb-1 block flex items-center gap-2">
                      <Volume2 size={16} />
                      {t('toolbox:metronome.volume')}: {settings.volume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.volume}
                      onChange={e =>
                        updateSettings({ volume: Number(e.target.value) })
                      }
                      className="w-full accent-morandi-purple-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Practice Counter Tab */}
        {activeTab === 'counter' && <PracticeCounter />}

        {/* Circle of Fifths Tab */}
        {activeTab === 'circle-of-fifths' && (
          <div>
            <CircleOfFifths />
          </div>
        )}

        {/* Dictionary Tab */}
        {activeTab === 'dictionary' && <Dictionary />}
      </div>

      {/* Timer Modal */}
      <TimerEntry
        isOpen={showTimer}
        onClose={() => setShowTimer(false)}
        onComplete={handleTimerComplete}
      />

      {/* Manual Entry Form */}
      {showManualEntry && (
        <ManualEntryForm
          onClose={handleManualEntryClose}
          onSave={handleManualEntrySave}
          initialDuration={timerDuration}
          initialStartTime={timerStartTime}
        />
      )}

      {/* Save Preset Modal */}
      <Modal
        isOpen={saveModal.isOpen}
        onClose={() => {
          saveModal.close()
          setPresetName('')
        }}
        title={t('ui:components.metronome.presets.savePresetTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
              {t('ui:components.metronome.presets.presetName')}
            </label>
            <Input
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder={t(
                'ui:components.metronome.presets.presetNamePlaceholder'
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
              {t('ui:components.metronome.presets.currentSettings')}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-morandi-stone-500">
                  {t('ui:components.metronome.presets.tempo')}:
                </span>
                <span className="ml-1 font-medium">{settings.bpm} BPM</span>
              </div>
              <div>
                <span className="text-morandi-stone-500">
                  {t('ui:components.metronome.presets.time')}:
                </span>
                <span className="ml-1 font-medium">
                  {settings.beatsPerMeasure}/{settings.beatValue}
                </span>
              </div>
              <div>
                <span className="text-morandi-stone-500">
                  {t('ui:components.metronome.presets.volume')}:
                </span>
                <span className="ml-1 font-medium">{settings.volume}%</span>
              </div>
              <div>
                <span className="text-morandi-stone-500">
                  {t('ui:components.metronome.presets.pattern')}:
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
              <span>✓ {t('ui:components.metronome.presets.syncToCloud')}</span>
            ) : (
              <span>
                💡 {t('ui:components.metronome.presets.signInToSync')}
              </span>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                saveModal.close()
                setPresetName('')
              }}
            >
              {t('ui:components.metronome.presets.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
            >
              {t('ui:components.metronome.presets.savePreset')}
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

export default Toolbox
