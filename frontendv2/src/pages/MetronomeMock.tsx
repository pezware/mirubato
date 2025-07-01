import React, { useState } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Volume2,
} from 'lucide-react'
import metronomeData from '../data/metronomePatterns.json'
import type { MetronomePattern } from '../types/metronome'

const MetronomeMock: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [beatValue, setBeatValue] = useState(4) // denominator of time signature
  const [clickCount, setClickCount] = useState(0)
  const [volume, setVolume] = useState(70)
  const [selectedPattern, setSelectedPattern] = useState('basic')
  const [currentBeat, setCurrentBeat] = useState(0)
  const [isFlashing, setIsFlashing] = useState(false)
  const [position, setPosition] = useState<'side' | 'corner'>('side')

  // Define the pattern type
  type PatternState = {
    accent: boolean[]
    click: boolean[]
    woodblock: boolean[]
    shaker: boolean[]
    triangle: boolean[]
  }

  // Mock beat patterns
  const [patterns, setPatterns] = useState<PatternState>({
    accent: [true, false, false, false],
    click: [false, true, true, true],
    woodblock: [false, false, true, false],
    shaker: [true, true, true, true],
    triangle: [false, false, false, true],
  })

  // Simulate metronome beat for visual feedback with proper timing
  React.useEffect(() => {
    if (isPlaying) {
      let nextBeatTime = Date.now()
      let animationId: number
      let beatCount = 0

      const scheduleBeat = () => {
        const now = Date.now()
        const beatInterval = (60 / bpm) * 1000 // milliseconds per beat

        // Check if it's time for the next beat
        if (now >= nextBeatTime) {
          // Trigger beat
          setCurrentBeat(beatCount % beatsPerMeasure)
          setIsFlashing(true)

          // Schedule flash off
          setTimeout(() => setIsFlashing(false), 100)

          // Calculate next beat time (avoid drift)
          nextBeatTime += beatInterval
          beatCount++

          // Adjust if we're running behind
          if (nextBeatTime < now) {
            nextBeatTime = now + beatInterval
          }
        }

        // Continue animation loop
        animationId = requestAnimationFrame(scheduleBeat)
      }

      // Start the loop
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

  // Use patterns from JSON file
  const commonPatterns = metronomeData.patterns as MetronomePattern[]

  // Sound layers with colors
  const soundLayers = Object.entries(metronomeData.soundLayers).map(
    ([id, layer]) => ({
      id,
      name: layer.name,
      color: `bg-${layer.color}`,
    })
  )

  const handleTripleClick = () => {
    if (clickCount === 2) {
      setIsExpanded(!isExpanded)
      setClickCount(0)
    } else {
      setClickCount(clickCount + 1)
      setTimeout(() => setClickCount(0), 500)
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
      // Ensure all layers have the correct number of beats
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
    <div className="min-h-screen bg-morandi-stone-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-morandi-stone-900 mb-8">
          Advanced Metronome Mock-up
        </h1>

        {/* Position Toggle */}
        <div className="fixed left-8 top-8 z-50 bg-morandi-stone-50 rounded-lg shadow-md p-4">
          <h3 className="text-sm font-semibold text-morandi-stone-900 mb-2">
            Widget Position
          </h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="position"
                value="side"
                checked={position === 'side'}
                onChange={e => setPosition(e.target.value as 'side' | 'corner')}
                className="text-morandi-purple-400"
              />
              <span className="text-sm">Right Side (Centered)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="position"
                value="corner"
                checked={position === 'corner'}
                onChange={e => setPosition(e.target.value as 'side' | 'corner')}
                className="text-morandi-purple-400"
              />
              <span className="text-sm">Bottom Right (Semi-transparent)</span>
            </label>
          </div>
        </div>

        {/* Minimal Metronome Widget (Always Visible) */}
        <div
          className={`fixed z-50 ${
            position === 'side'
              ? 'right-8 top-1/2 -translate-y-1/2'
              : 'right-8 bottom-8'
          }`}
        >
          <div
            className={`rounded-lg shadow-lg transition-all duration-300 ${
              isExpanded ? 'w-80' : 'w-16'
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
                  onClick={e => {
                    e.stopPropagation()
                    setIsPlaying(!isPlaying)
                  }}
                  className={`w-12 h-12 bg-morandi-purple-400 text-white rounded-full flex items-center justify-center hover:bg-morandi-purple-500 transition-all duration-300 ${
                    isFlashing && isPlaying
                      ? 'scale-110 bg-morandi-purple-500'
                      : ''
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
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-morandi-stone-900">
                    Metronome
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
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setBpm(Math.max(40, bpm - 5))}
                      className="w-7 h-7 bg-morandi-stone-200 rounded-full flex items-center justify-center hover:bg-morandi-stone-300"
                      title="Decrease tempo"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="range"
                      min="40"
                      max="240"
                      value={bpm}
                      onChange={e => setBpm(Number(e.target.value))}
                      className="flex-1 accent-morandi-purple-400"
                      title="Tempo (BPM)"
                    />
                    <button
                      onClick={() => setBpm(Math.min(240, bpm + 5))}
                      className="w-7 h-7 bg-morandi-stone-200 rounded-full flex items-center justify-center hover:bg-morandi-stone-300"
                      title="Increase tempo"
                    >
                      <Plus size={14} />
                    </button>
                    <div className="w-12 text-center font-semibold text-morandi-stone-900 text-sm">
                      {bpm}
                    </div>
                  </div>
                </div>

                {/* Time Signature */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
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
                      className="w-12 px-2 py-1 text-center border border-morandi-stone-300 rounded text-sm"
                      title="Beats per measure"
                    />
                    <span className="text-morandi-stone-600">/</span>
                    <select
                      value={beatValue}
                      onChange={e => setBeatValue(Number(e.target.value))}
                      className="w-12 px-1 py-1 border border-morandi-stone-300 rounded text-sm"
                      title="Beat value"
                    >
                      <option value="2">2</option>
                      <option value="4">4</option>
                      <option value="8">8</option>
                      <option value="16">16</option>
                    </select>
                  </div>
                </div>

                {/* Common Time Signatures */}
                <div className="mb-4 flex flex-wrap gap-1">
                  {[
                    { beats: 4, value: 4, label: '4/4' },
                    { beats: 3, value: 4, label: '3/4' },
                    { beats: 6, value: 8, label: '6/8' },
                    { beats: 2, value: 4, label: '2/4' },
                  ].map(sig => (
                    <button
                      key={sig.label}
                      onClick={() => {
                        setBeatsPerMeasure(sig.beats)
                        setBeatValue(sig.value)
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        beatsPerMeasure === sig.beats && beatValue === sig.value
                          ? 'bg-morandi-purple-400 text-white'
                          : 'bg-morandi-stone-200 text-morandi-stone-700 hover:bg-morandi-stone-300'
                      }`}
                      title={`Set to ${sig.label} time`}
                    >
                      {sig.label}
                    </button>
                  ))}
                </div>

                {/* Pattern Selector */}
                <div className="mb-4">
                  <select
                    value={selectedPattern}
                    onChange={e => loadPattern(e.target.value)}
                    className="w-full px-3 py-2 border border-morandi-stone-300 rounded text-sm bg-morandi-stone-50"
                    title="Load common rhythm pattern"
                  >
                    <option value="">-- Load Pattern --</option>
                    {commonPatterns.map(pattern => (
                      <option key={pattern.id} value={pattern.id}>
                        {pattern.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Volume Control */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <Volume2 size={14} className="text-morandi-stone-600" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={e => setVolume(Number(e.target.value))}
                      className="flex-1 accent-morandi-purple-400 h-1"
                      title="Volume"
                    />
                    <span className="text-xs text-morandi-stone-600 w-8">
                      {volume}%
                    </span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 bg-morandi-purple-400 text-white rounded-full flex items-center justify-center hover:bg-morandi-purple-500 transition-colors"
                    title="Play/Pause"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button
                    className="w-10 h-10 bg-morandi-stone-200 text-morandi-stone-700 rounded-full flex items-center justify-center hover:bg-morandi-stone-300"
                    title="Reset"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    className="w-10 h-10 bg-morandi-stone-200 text-morandi-stone-700 rounded-full flex items-center justify-center hover:bg-morandi-stone-300"
                    title="Pattern editor"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area - Design Documentation */}
        <div className="space-y-8">
          <div className="bg-morandi-stone-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-morandi-stone-900 mb-4">
              Design Concept
            </h2>
            <div className="prose max-w-none text-morandi-stone-600">
              <p className="mb-4">
                The advanced metronome features a dual-mode design with
                mobile-first approach:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Minimal Mode (Right Side):</strong> Compact design
                  shows play/pause, BPM, and time signature. Triple-click to
                  expand.
                </li>
                <li>
                  <strong>Expanded Mode:</strong> Sliding drawer with full
                  controls, volume, custom time signatures, and quick presets.
                </li>
              </ul>
            </div>
          </div>

          {/* Beat Pattern Grid Preview */}
          <div className="bg-morandi-stone-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-morandi-stone-900 mb-4">
              Beat Pattern Grid (Full View)
            </h2>
            <p className="text-morandi-stone-600 mb-6">
              This drum pad-style grid would appear in a modal when clicking the
              pattern editor button:
            </p>

            <div className="space-y-1">
              {soundLayers.map(layer => (
                <div key={layer.id} className="flex items-center space-x-2">
                  <div
                    className="w-24 text-xs font-medium text-morandi-stone-700 text-right pr-2"
                    title={layer.name}
                  >
                    {layer.name}
                  </div>
                  <div className="flex space-x-0.5">
                    {patterns[layer.id as keyof PatternState]
                      .slice(0, beatsPerMeasure)
                      .map((active: boolean, beat: number) => (
                        <button
                          key={beat}
                          onClick={() =>
                            toggleBeat(layer.id as keyof PatternState, beat)
                          }
                          className={`w-10 h-10 rounded transition-all ${
                            active
                              ? `${layer.color} shadow-md ${
                                  isPlaying && beat === currentBeat
                                    ? 'ring-2 ring-morandi-purple-400 scale-110'
                                    : ''
                                }`
                              : 'bg-morandi-stone-200 hover:bg-morandi-stone-300'
                          }`}
                          title={`${layer.name} - Beat ${beat + 1}`}
                        ></button>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex space-x-2">
              <button className="px-3 py-1.5 bg-morandi-stone-200 text-morandi-stone-700 rounded hover:bg-morandi-stone-300 text-sm">
                Clear All
              </button>
              <button className="px-3 py-1.5 bg-morandi-stone-200 text-morandi-stone-700 rounded hover:bg-morandi-stone-300 text-sm">
                Load Pattern
              </button>
              <button className="px-3 py-1.5 bg-morandi-purple-400 text-white rounded hover:bg-morandi-purple-500 text-sm">
                Save Pattern
              </button>
            </div>
          </div>

          {/* Sound Layers */}
          <div className="bg-morandi-stone-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-morandi-stone-900 mb-4">
              Sound Layers
            </h2>
            <p className="text-morandi-stone-600 mb-6">
              Each layer uses different sounds to create rich rhythmic patterns:
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-morandi-purple-400 rounded"></div>
                <span className="font-medium">Accent</span>
                <span className="text-morandi-stone-500">
                  - Strong click for downbeats
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-morandi-sky-400 rounded"></div>
                <span className="font-medium">Click</span>
                <span className="text-morandi-stone-500">
                  - Standard metronome click
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-morandi-sage-400 rounded"></div>
                <span className="font-medium">Wood Block</span>
                <span className="text-morandi-stone-500">
                  - Percussive wood sound
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-morandi-sand-400 rounded"></div>
                <span className="font-medium">Shaker</span>
                <span className="text-morandi-stone-500">
                  - Soft shaker rhythm
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-morandi-blush-400 rounded"></div>
                <span className="font-medium">Triangle</span>
                <span className="text-morandi-stone-500">
                  - Bright metallic accent
                </span>
              </div>
            </div>
          </div>

          {/* Common Rhythm Patterns */}
          <div className="bg-morandi-stone-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-morandi-stone-900 mb-4">
              10 Common Rhythm Patterns
            </h2>
            <p className="text-morandi-stone-600 mb-4">
              Based on music education research, these are the most commonly
              used metronome patterns for practice:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commonPatterns.map(pattern => (
                <div
                  key={pattern.id}
                  className="p-3 bg-morandi-stone-100 rounded"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-morandi-stone-900">
                      {pattern.name}
                    </h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        pattern.difficulty === 'beginner'
                          ? 'bg-morandi-sage-200 text-morandi-sage-700'
                          : pattern.difficulty === 'intermediate'
                            ? 'bg-morandi-sand-200 text-morandi-sand-700'
                            : 'bg-morandi-blush-200 text-morandi-blush-700'
                      }`}
                    >
                      {pattern.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-morandi-stone-600 mt-1">
                    {pattern.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-morandi-stone-500">
                      Time: {pattern.beats}/{pattern.value}
                    </p>
                    <p className="text-xs text-morandi-stone-500 capitalize">
                      {pattern.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Feedback Design */}
          <div className="bg-morandi-stone-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-morandi-stone-900 mb-4">
              Visual Feedback System
            </h2>
            <div className="space-y-4 text-morandi-stone-600">
              <div>
                <h3 className="font-semibold text-morandi-stone-900 mb-2">
                  💫 Beat Flash Effect
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Subtle ring flash around widget on each beat</li>
                  <li>Play button scales up slightly on downbeat</li>
                  <li>BPM display pulses with the rhythm</li>
                  <li>Beat indicators show current position in measure</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-morandi-stone-900 mb-2">
                  📍 Position Options
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    <strong>Right Side:</strong> Traditional centered position,
                    fully opaque
                  </li>
                  <li>
                    <strong>Bottom Corner:</strong> Semi-transparent (80%
                    opacity) with backdrop blur
                  </li>
                  <li>
                    Corner position ideal for sight-reading - minimal visual
                    obstruction
                  </li>
                  <li>Transparency only applies in collapsed state</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-morandi-stone-900 mb-2">
                  🎯 Pattern Grid Animation
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    Active beats highlight with purple ring during playback
                  </li>
                  <li>Current beat scales up for clear visual tracking</li>
                  <li>Smooth transitions between beats</li>
                  <li>Visual sync across all active sound layers</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="bg-morandi-stone-50 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-morandi-stone-900 mb-4">
              Key Features
            </h2>
            <div className="space-y-4 text-morandi-stone-600">
              <div>
                <h3 className="font-semibold text-morandi-stone-900 mb-2">
                  🎵 Mobile-First Design
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Compact minimal mode (64px width) saves screen space</li>
                  <li>All controls use tooltips instead of labels</li>
                  <li>Touch-friendly button sizes</li>
                  <li>Drum pad-style grid with minimal spacing</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-morandi-stone-900 mb-2">
                  🎛️ Advanced Controls
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Custom time signatures with input fields (1-16 beats)</li>
                  <li>Quick preset buttons for common time signatures</li>
                  <li>10 pre-programmed rhythm patterns</li>
                  <li>Volume control integrated in the drawer</li>
                  <li>BPM range from 40-240 with fine control</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-morandi-stone-900 mb-2">
                  🥁 Pattern Editor
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>5 distinct sound layers with unique timbres</li>
                  <li>Visual drum pad interface</li>
                  <li>Save and load custom patterns</li>
                  <li>Real-time visual feedback during playback</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetronomeMock
