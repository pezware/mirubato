import React, { useState, useEffect } from 'react'
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Volume2,
} from 'lucide-react'
import { getPatternMetronome } from '../../services/patternMetronomeService'
import metronomeData from '../../data/metronomePatterns.json'
import type { MetronomePattern } from '../../types/metronome'

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
  position = 'corner',
  onTripleClick,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [beatValue, setBeatValue] = useState(4)
  const [volume, setVolume] = useState(70)
  const [selectedPattern, setSelectedPattern] = useState('basic')
  const [currentBeat, setCurrentBeat] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const [patterns, setPatterns] = useState<PatternState>({
    accent: [true, false, false, false],
    click: [false, true, true, true],
    woodblock: [false, false, false, false],
    shaker: [false, false, false, false],
    triangle: [false, false, false, false],
  })

  const commonPatterns = metronomeData.patterns as MetronomePattern[]
  const soundLayers = Object.entries(metronomeData.soundLayers).map(
    ([id, layer]) => ({
      id,
      name: layer.name,
      color: `bg-${layer.color}`,
    })
  )

  // Get metronome instance
  const metronome = getPatternMetronome()

  // Initialize metronome
  useEffect(() => {
    metronome.setTempo(bpm)
    metronome.setVolume(volume / 100)
    return () => {
      // Always stop metronome when component unmounts
      metronome.stop()
    }
  }, [])

  // Handle tempo changes
  useEffect(() => {
    metronome.setTempo(bpm)
  }, [bpm])

  // Handle volume changes
  useEffect(() => {
    metronome.setVolume(volume / 100)
  }, [volume])

  // Handle pattern changes while playing
  useEffect(() => {
    if (isPlaying) {
      const trimmedPatterns = {
        accent: patterns.accent.slice(0, beatsPerMeasure),
        click: patterns.click.slice(0, beatsPerMeasure),
        woodblock: patterns.woodblock.slice(0, beatsPerMeasure),
        shaker: patterns.shaker.slice(0, beatsPerMeasure),
        triangle: patterns.triangle.slice(0, beatsPerMeasure),
      }
      metronome.setPatterns(trimmedPatterns)
    }
  }, [patterns, beatsPerMeasure, isPlaying])

  // Visual beat indicator
  useEffect(() => {
    if (isPlaying) {
      let nextBeatTime = Date.now()
      let animationId: number
      let beatCount = 0

      const scheduleBeat = () => {
        const now = Date.now()
        const beatInterval = (60 / bpm) * 1000

        if (now >= nextBeatTime) {
          setCurrentBeat(beatCount % beatsPerMeasure)
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
  }, [isPlaying, bpm, beatsPerMeasure])

  const handleTripleClick = () => {
    if (clickCount === 2) {
      if (onTripleClick) {
        onTripleClick()
      } else {
        setIsExpanded(!isExpanded)
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
          accent: patterns.accent.slice(0, beatsPerMeasure),
          click: patterns.click.slice(0, beatsPerMeasure),
          woodblock: patterns.woodblock.slice(0, beatsPerMeasure),
          shaker: patterns.shaker.slice(0, beatsPerMeasure),
          triangle: patterns.triangle.slice(0, beatsPerMeasure),
        }

        await metronome.start({
          tempo: bpm,
          volume: volume / 100,
          beatValue: beatValue,
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
      setSelectedPattern(patternId)
      setBeatsPerMeasure(pattern.beats)
      setBeatValue(pattern.value)
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
          isExpanded ? 'w-80 bg-morandi-stone-50/90 backdrop-blur-sm' : 'w-16'
        } ${
          position === 'corner' && !isExpanded
            ? 'bg-morandi-stone-50/80 backdrop-blur-sm'
            : 'bg-morandi-stone-50'
        } ${
          isFlashing && isPlaying ? 'ring-2 ring-morandi-purple-400/50' : ''
        }`}
        onClick={handleTripleClick}
      >
        {!isExpanded ? (
          /* Collapsed State */
          <div className="p-2 space-y-2">
            <button
              onClick={handlePlayPause}
              className={`w-12 h-12 bg-morandi-purple-400 text-white rounded-full flex items-center justify-center hover:bg-morandi-purple-500 transition-all duration-300 ${
                isFlashing && isPlaying ? 'scale-110 bg-morandi-purple-500' : ''
              }`}
              title="Play/Pause"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <div
              className={`text-center transition-all duration-100 ${
                isFlashing && isPlaying ? 'scale-105' : ''
              }`}
            >
              <div className="text-xl font-bold text-morandi-stone-900">
                {bpm}
              </div>
              <div className="text-xs text-morandi-stone-500">BPM</div>
            </div>

            <div className="text-center">
              <div className="text-sm font-semibold text-morandi-stone-700">
                {beatsPerMeasure}/{beatValue}
              </div>
              {isPlaying && (
                <div className="flex justify-center mt-1 space-x-1">
                  {Array.from({ length: beatsPerMeasure }, (_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-100 ${
                        i === currentBeat
                          ? 'bg-morandi-purple-400 scale-150'
                          : 'bg-morandi-stone-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              className="w-12 h-12 text-morandi-stone-400 flex items-center justify-center hover:text-morandi-stone-600"
              title="Expand metronome"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        ) : (
          /* Expanded State */
          <div className="p-4 opacity-90">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-morandi-stone-900">
                Advanced Metronome
              </h3>
              <button
                onClick={e => {
                  e.stopPropagation()
                  setIsExpanded(false)
                }}
                className="text-morandi-stone-400 hover:text-morandi-stone-600"
                title="Collapse"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* BPM Control */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => setBpm(Math.max(40, bpm - 5))}
                  className="w-8 h-8 bg-morandi-stone-100 rounded-full flex items-center justify-center hover:bg-morandi-stone-200"
                >
                  <Minus size={14} />
                </button>
                <div className="text-center">
                  <div className="text-2xl font-bold text-morandi-stone-900">
                    {bpm}
                  </div>
                  <div className="text-xs text-morandi-stone-500">BPM</div>
                </div>
                <button
                  onClick={() => setBpm(Math.min(240, bpm + 5))}
                  className="w-8 h-8 bg-morandi-stone-100 rounded-full flex items-center justify-center hover:bg-morandi-stone-200"
                >
                  <Plus size={14} />
                </button>
              </div>
              <input
                type="range"
                min="40"
                max="240"
                value={bpm}
                onChange={e => setBpm(Number(e.target.value))}
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
                value={selectedPattern}
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
                  max="16"
                  value={beatsPerMeasure}
                  onChange={e =>
                    setBeatsPerMeasure(
                      Math.max(1, Math.min(16, Number(e.target.value)))
                    )
                  }
                  className="w-12 px-1 py-1 text-sm text-center border border-morandi-stone-200 rounded"
                />
                <span className="text-lg text-morandi-stone-400">/</span>
                <select
                  value={beatValue}
                  onChange={e => setBeatValue(Number(e.target.value))}
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
                Volume: {volume}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
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
                      {Array.from({ length: beatsPerMeasure }, (_, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            toggleBeat(layer.id as keyof PatternState, i)
                          }
                          className={`w-6 h-6 rounded text-xs transition-all ${
                            patterns[layer.id as keyof PatternState][i]
                              ? layer.color.replace('bg-', 'bg-') +
                                ' opacity-80'
                              : 'bg-morandi-stone-100 hover:bg-morandi-stone-200'
                          }`}
                        />
                      ))}
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
