import React, { useState, useEffect, useMemo } from 'react'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Volume2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getPatternMetronome } from '../../services/patternMetronomeService'
import metronomeData from '../../data/metronomePatterns.json'
import type { MetronomePattern } from '../../types/metronome'
import { useMetronomeSettings } from '../../hooks/useMetronomeSettings'

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

  // Use prop position if provided, otherwise use settings position
  const position = propPosition ?? settings.position
  const [isPlaying, setIsPlaying] = useState(false)
  const [, setCurrentBeat] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [clickCount, setClickCount] = useState(0)

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns, settings.beatsPerMeasure, isPlaying])

  // Visual beat indicator
  useEffect(() => {
    if (isPlaying) {
      let nextBeatTime = Date.now()
      let animationId: number
      let beatCount = 0

      const scheduleBeat = () => {
        const now = Date.now()
        const beatInterval = (60 / settings.bpm) * 1000

        if (now >= nextBeatTime) {
          setCurrentBeat(beatCount % settings.beatsPerMeasure)
          setIsFlashing(true)
          setTimeout(() => setIsFlashing(false), 100)

          nextBeatTime += beatInterval
          beatCount++

          if (nextBeatTime < now) {
            nextBeatTime = now + beatInterval
          }
        }

        animationId = requestAnimationFrame(scheduleBeat)
      }

      animationId = requestAnimationFrame(scheduleBeat)

      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId)
        }
      }
    } else {
      setCurrentBeat(0)
    }
  }, [isPlaying, settings.bpm, settings.beatsPerMeasure])

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
    } else {
      try {
        // Only use the beats that are within the current beats per measure
        const trimmedPatterns = {
          accent: patterns.accent.slice(0, settings.beatsPerMeasure),
          click: patterns.click.slice(0, settings.beatsPerMeasure),
          woodblock: patterns.woodblock.slice(0, settings.beatsPerMeasure),
          shaker: patterns.shaker.slice(0, settings.beatsPerMeasure),
          triangle: patterns.triangle.slice(0, settings.beatsPerMeasure),
        }

        await metronome.start({
          tempo: settings.bpm,
          volume: settings.volume / 100,
          beatValue: settings.beatValue,
          patterns: trimmedPatterns,
        })
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
  }

  const loadPattern = (patternId: string) => {
    const pattern = commonPatterns.find(p => p.id === patternId)
    if (pattern) {
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
    </div>
  )
}

export default CollapsibleMetronome
