import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Renderer, Stave, StaveNote, Voice, Formatter, Beam } from 'vexflow'
import * as Tone from 'tone'

const Practice: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [currentMeasure, setCurrentMeasure] = useState(0)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const notationRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const sequenceRef = useRef<Tone.Part | null>(null)

  // Define the note sequence for Moonlight Sonata 3rd Movement
  const noteSequence = [
    // Measure 1 - C# minor arpeggio pattern
    { time: 0, note: 'G#3' },
    { time: 0.0625, note: 'C#4' },
    { time: 0.125, note: 'E4' },
    { time: 0.1875, note: 'G#3' },
    { time: 0.25, note: 'C#4' },
    { time: 0.3125, note: 'E4' },
    { time: 0.375, note: 'G#3' },
    { time: 0.4375, note: 'C#4' },
    { time: 0.5, note: 'E4' },
    { time: 0.5625, note: 'G#3' },
    { time: 0.625, note: 'C#4' },
    { time: 0.6875, note: 'E4' },
    { time: 0.75, note: 'G#3' },
    { time: 0.8125, note: 'C#4' },
    { time: 0.875, note: 'E4' },
    { time: 0.9375, note: 'G#3' },
    // Measure 2 - Continuation and transition to B major
    { time: 1, note: 'C#4' },
    { time: 1.0625, note: 'E4' },
    { time: 1.125, note: 'G#3' },
    { time: 1.1875, note: 'C#4' },
    { time: 1.25, note: 'E4' },
    { time: 1.3125, note: 'G#3' },
    { time: 1.375, note: 'C#4' },
    { time: 1.4375, note: 'E4' },
    { time: 1.5, note: 'D#4' },
    { time: 1.5625, note: 'F#3' },
    { time: 1.625, note: 'B3' },
    { time: 1.6875, note: 'D#4' },
    { time: 1.75, note: 'F#3' },
    { time: 1.8125, note: 'B3' },
    { time: 1.875, note: 'D#4' },
    { time: 1.9375, note: 'F#3' },
  ]

  // Initialize synthesizer
  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' }, // Cleaner sound
      envelope: {
        attack: 0.005,  // Very fast attack for piano
        decay: 0.1,
        sustain: 0.15,  // Lower sustain for more piano-like
        release: 0.3,   // Shorter release
      },
    }).toDestination()
    
    synthRef.current.volume.value = -8 // Slightly louder

    return () => {
      synthRef.current?.dispose()
      sequenceRef.current?.dispose()
    }
  }, [])

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate responsive dimensions
  const getNotationDimensions = () => {
    if (viewportWidth < 640) { // Mobile
      return { width: viewportWidth - 32, scale: 0.8 }
    } else if (viewportWidth < 1024) { // Tablet
      return { width: Math.min(viewportWidth - 64, 700), scale: 0.9 }
    } else { // Desktop
      return { width: 800, scale: 1.0 }
    }
  }

  // Render music notation
  useEffect(() => {
    if (!notationRef.current) return

    // Clear previous content
    notationRef.current.innerHTML = ''

    const { width, scale } = getNotationDimensions()

    // Create renderer
    const renderer = new Renderer(notationRef.current, Renderer.Backends.SVG)
    renderer.resize(width, 400)
    const context = renderer.getContext()
    context.scale(scale, scale)

    // Moonlight Sonata 3rd Movement - First 4 measures (simplified for demo)
    const staveWidth = (width / scale) - 50
    const staveX = 25

    // Measure 1
    const stave1 = new Stave(staveX, 50, staveWidth / 2)
    stave1.addClef('treble').addTimeSignature('4/4').addKeySignature('C#m')
    stave1.setContext(context).draw()

    const notes1 = [
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
    ]

    // Create beams for sixteenth notes (4 groups of 4)
    const beam1 = new Beam(notes1.slice(0, 4))
    const beam2 = new Beam(notes1.slice(4, 8))
    const beam3 = new Beam(notes1.slice(8, 12))
    const beam4 = new Beam(notes1.slice(12, 16))

    const voice1 = new Voice({ num_beats: 4, beat_value: 4 })
    voice1.addTickables(notes1)

    new Formatter().joinVoices([voice1]).format([voice1], staveWidth / 2 - 50)
    voice1.draw(context, stave1)
    beam1.setContext(context).draw()
    beam2.setContext(context).draw()
    beam3.setContext(context).draw()
    beam4.setContext(context).draw()

    // Measure 2 (continuation of pattern)
    const stave2 = new Stave(stave1.width + stave1.x, 50, staveWidth / 2)
    stave2.setContext(context).draw()

    const notes2 = [
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['g#/4'], duration: '16' }),
      new StaveNote({ keys: ['c#/5'], duration: '16' }),
      new StaveNote({ keys: ['e/5'], duration: '16' }),
      new StaveNote({ keys: ['d#/5'], duration: '16' }),
      new StaveNote({ keys: ['f#/4'], duration: '16' }),
      new StaveNote({ keys: ['b/4'], duration: '16' }),
      new StaveNote({ keys: ['d#/5'], duration: '16' }),
      new StaveNote({ keys: ['f#/4'], duration: '16' }),
      new StaveNote({ keys: ['b/4'], duration: '16' }),
      new StaveNote({ keys: ['d#/5'], duration: '16' }),
      new StaveNote({ keys: ['f#/4'], duration: '16' }),
    ]

    const beam5 = new Beam(notes2.slice(0, 4))
    const beam6 = new Beam(notes2.slice(4, 8))
    const beam7 = new Beam(notes2.slice(8, 12))
    const beam8 = new Beam(notes2.slice(12, 16))

    const voice2 = new Voice({ num_beats: 4, beat_value: 4 })
    voice2.addTickables(notes2)

    new Formatter().joinVoices([voice2]).format([voice2], staveWidth / 2 - 50)
    voice2.draw(context, stave2)
    beam5.setContext(context).draw()
    beam6.setContext(context).draw()
    beam7.setContext(context).draw()
    beam8.setContext(context).draw()

    // Add tempo marking
    context.setFont('Arial', 14, '')
    context.fillText('Presto agitato ♩ = 160', staveX, 30)

  }, [viewportWidth])

  const handlePlayPause = async () => {
    if (!isPlaying && synthRef.current) {
      await Tone.start()
      
      // Clean up any existing sequence
      if (sequenceRef.current) {
        sequenceRef.current.dispose()
      }

      // Calculate tempo-adjusted timing
      const bpm = tempo
      const secondsPerBeat = 60 / bpm
      
      // Create a new part with the note sequence
      sequenceRef.current = new Tone.Part((time, note) => {
        synthRef.current?.triggerAttackRelease(note.note, '32n', time)
        
        // Update current note index for visual feedback
        Tone.Draw.schedule(() => {
          const noteIndex = noteSequence.findIndex(n => n === note)
          setCurrentNoteIndex(noteIndex)
          
          // Update measure based on time
          const currentMeasureNum = Math.floor(note.time)
          setCurrentMeasure(currentMeasureNum)
        }, time)
      }, noteSequence.map(n => ({ 
        time: n.time * secondsPerBeat, 
        note: n.note 
      })))

      // Configure the part
      sequenceRef.current.loop = true
      sequenceRef.current.loopEnd = 2 * secondsPerBeat // 2 measures
      
      // Start transport and sequence
      Tone.Transport.bpm.value = bpm
      Tone.Transport.start()
      sequenceRef.current.start(0)
      
      setIsPlaying(true)
    } else {
      // Stop playback
      Tone.Transport.stop()
      Tone.Transport.cancel()
      
      if (sequenceRef.current) {
        sequenceRef.current.stop()
      }
      
      setIsPlaying(false)
      setCurrentNoteIndex(0)
      setCurrentMeasure(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mirubato-wood-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-mirubato-wood-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-lexend font-light text-mirubato-wood-800">
              mirubato practice
            </h1>
            <Link 
              to="/" 
              className="text-mirubato-wood-600 hover:text-mirubato-wood-800 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Practice Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-mirubato-wood-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-mirubato-wood-500 text-sm">Piece</p>
              <p className="font-medium text-mirubato-wood-800">Moonlight Sonata, 3rd Mvt.</p>
              <p className="text-mirubato-wood-400 text-xs">L. van Beethoven (Opening)</p>
            </div>
            <div>
              <p className="text-mirubato-wood-500 text-sm">Key</p>
              <p className="font-medium text-mirubato-wood-800">C# Minor</p>
            </div>
            <div>
              <p className="text-mirubato-wood-500 text-sm">Tempo</p>
              <p className="font-medium text-mirubato-wood-800">Presto agitato</p>
            </div>
          </div>
        </div>

        {/* Notation Display */}
        <div className="bg-white rounded-xl shadow-sm border border-mirubato-wood-200 p-8 mb-8">
          <div className="overflow-x-auto">
            <div ref={notationRef} className="mx-auto" />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-mirubato-wood-200 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlayPause}
              className={`
                px-8 py-3 rounded-lg font-medium transition-all
                ${isPlaying 
                  ? 'bg-mirubato-wood-600 hover:bg-mirubato-wood-700 text-white' 
                  : 'bg-mirubato-leaf-400 hover:bg-mirubato-leaf-500 text-white'}
              `}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            {/* Tempo Control */}
            <div className="flex items-center gap-3">
              <label className="text-mirubato-wood-600 text-sm">Tempo:</label>
              <input
                type="range"
                min="60"
                max="200"
                value={tempo}
                onChange={(e) => {
                const newTempo = Number(e.target.value)
                setTempo(newTempo)
                if (isPlaying) {
                  Tone.Transport.bpm.value = newTempo
                }
              }}
                className="w-32"
              />
              <span className="text-mirubato-wood-800 font-mono text-sm w-12">
                {tempo}
              </span>
            </div>

            {/* Measure Progress */}
            <div className="text-mirubato-wood-600 text-sm">
              Measure: <span className="font-mono">{currentMeasure + 1}/2</span>
              <span className="text-mirubato-wood-400 ml-2">(Demo excerpt)</span>
            </div>
          </div>
        </div>

        {/* Instructions (Mobile-friendly) */}
        <div className="mt-8 text-center text-mirubato-wood-500 text-sm px-4">
          <p className="mb-2">Press Play to begin sight-reading practice</p>
          <p className="text-xs">Tip: Try to keep playing even if you make mistakes - that's the "Keep Going Method"!</p>
        </div>
      </main>
    </div>
  )
}

export default Practice