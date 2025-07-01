import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Plus, Minus, Volume2 } from 'lucide-react'
import metronomeData from '../data/metronomePatterns.json'
import type { MetronomePattern } from '../types/metronome'
import { getPatternMetronome } from '../services/patternMetronomeService'
import { useMetronomeSettings } from '../hooks/useMetronomeSettings'

type PatternState = {
  accent: boolean[]
  click: boolean[]
  woodblock: boolean[]
  shaker: boolean[]
  triangle: boolean[]
}

const Toolbox: React.FC = () => {
  const { settings, updateSettings } = useMetronomeSettings()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [tapTimes, setTapTimes] = useState<number[]>([])

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
      // Always stop metronome when leaving the page
      metronome.stop()
    }
  }, [])

  // Handle tempo changes
  useEffect(() => {
    metronome.setTempo(settings.bpm)
  }, [settings.bpm])

  // Handle volume changes
  useEffect(() => {
    metronome.setVolume(settings.volume / 100)
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

  const handlePlayPause = async () => {
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

  const handleTapTempo = () => {
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
    <div className="min-h-screen bg-morandi-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-morandi-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/logbook"
              className="flex items-center gap-1 text-morandi-stone-600 hover:text-morandi-stone-700"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back to Logbook</span>
            </Link>
            <h1 className="text-lg font-semibold text-morandi-stone-900">
              Toolbox
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Control Panel */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
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
                            bpm: Math.max(40, settings.bpm - 5),
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
                            bpm: Math.min(240, settings.bpm + 5),
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
                      Tap Tempo
                    </button>
                  </div>

                  {/* Time Signature */}
                  <div>
                    <label className="text-sm text-morandi-stone-600 mb-1 block">
                      Time Signature
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="16"
                        value={settings.beatsPerMeasure}
                        onChange={e =>
                          updateSettings({
                            beatsPerMeasure: Math.max(
                              1,
                              Math.min(16, Number(e.target.value))
                            ),
                          })
                        }
                        className="w-16 px-2 py-1 text-center border border-morandi-stone-200 rounded"
                      />
                      <span className="text-xl text-morandi-stone-400">/</span>
                      <select
                        value={settings.beatValue}
                        onChange={e =>
                          updateSettings({ beatValue: Number(e.target.value) })
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

                  {/* Volume */}
                  <div>
                    <label className="text-sm text-morandi-stone-600 mb-1 block flex items-center gap-2">
                      <Volume2 size={16} />
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
                      className="w-full accent-morandi-purple-400"
                    />
                  </div>

                  {/* Beat Indicator */}
                  {isPlaying && (
                    <div className="flex justify-center gap-2">
                      {Array.from(
                        { length: settings.beatsPerMeasure },
                        (_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full transition-all duration-100 ${
                              i === currentBeat
                                ? 'bg-morandi-purple-400 scale-125'
                                : 'bg-morandi-stone-300'
                            }`}
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pattern Selector */}
              <div>
                <label className="text-sm text-morandi-stone-600 mb-2 block">
                  Preset Patterns
                </label>
                <select
                  value={settings.selectedPattern}
                  onChange={e => loadPattern(e.target.value)}
                  className="w-full px-3 py-2 border border-morandi-stone-200 rounded-lg"
                >
                  {commonPatterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.name} - {pattern.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Beat Pattern Grid */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Beat Numbers */}
                  <div className="flex mb-2">
                    <div className="w-24"></div>
                    {Array.from(
                      { length: settings.beatsPerMeasure },
                      (_, i) => (
                        <div
                          key={i}
                          className="w-10 text-center text-sm text-morandi-stone-600"
                        >
                          {i + 1}
                        </div>
                      )
                    )}
                  </div>

                  {/* Sound Layers */}
                  {soundLayers.map(layer => (
                    <div key={layer.id} className="flex items-center mb-3">
                      <div className="w-24 text-sm text-morandi-stone-700 pr-2">
                        {layer.name}
                      </div>
                      {Array.from(
                        { length: settings.beatsPerMeasure },
                        (_, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              toggleBeat(layer.id as keyof PatternState, i)
                            }
                            className={`w-10 h-10 mr-1 rounded transition-all ${
                              patterns[layer.id as keyof PatternState][i]
                                ? layer.color + ' text-white'
                                : 'bg-morandi-stone-100 hover:bg-morandi-stone-200'
                            }`}
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 text-sm text-morandi-stone-600">
                <p>
                  Click on the grid to create your own rhythm pattern. Each row
                  represents a different sound layer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Toolbox
