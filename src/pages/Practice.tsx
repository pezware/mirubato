import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import * as Tone from 'tone'
import { audioManager } from '../utils/audioManager'
import { NotationRenderer } from '../utils/notationRenderer'
import { moonlightSonata3rdMovement, getPlayableNotes } from '../data/sheetMusic'

const Practice: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempo, setTempo] = useState(40) // Start at slow practice tempo
  const [currentMeasure, setCurrentMeasure] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const notationRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)
  const sequenceRef = useRef<Tone.Part | null>(null)
  const notationRendererRef = useRef<NotationRenderer | null>(null)
  
  // Get the current piece data
  const currentPiece = moonlightSonata3rdMovement
  const playableNotes = getPlayableNotes(currentPiece)

  // Initialize audio
  useEffect(() => {
    const initializeAudio = async () => {
      setIsLoading(true)
      try {
        // Ensure piano instrument is selected
        audioManager.setInstrument('piano')
        
        // Initialize the audio system
        await audioManager.initialize()
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize audio:', error)
        setIsLoading(false)
      }
    }

    initializeAudio()

    return () => {
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

    // Create or update notation renderer
    if (!notationRendererRef.current) {
      notationRendererRef.current = new NotationRenderer(notationRef.current)
    }

    const { width, scale } = getNotationDimensions()

    // Render the current piece using NotationRenderer
    notationRendererRef.current.render(currentPiece, {
      width,
      scale,
      measuresPerLine: 2
    })

    return () => {
      notationRendererRef.current?.dispose()
    }
  }, [viewportWidth, currentPiece])

  const handlePlayPause = async () => {
    if (!isPlaying && !isLoading) {
      await Tone.start()
      
      // Clean up any existing sequence
      if (sequenceRef.current) {
        sequenceRef.current.dispose()
      }

      // Calculate tempo-adjusted timing
      const bpm = tempo
      const secondsPerBeat = 60 / bpm
      
      // Create a new part with the playable notes
      sequenceRef.current = new Tone.Part((time, note) => {
        // Use our audio manager to play notes with realistic piano sound
        audioManager.playNoteAt(note.note, time, '16n', 0.7)
        
        // Update current measure for visual feedback
        Tone.Draw.schedule(() => {
          // Update measure based on time
          const currentMeasureNum = Math.floor(note.time)
          setCurrentMeasure(currentMeasureNum)
        }, time)
      }, playableNotes.map(n => ({ 
        time: n.time * secondsPerBeat, 
        note: n.note 
      })))

      // Configure the part
      sequenceRef.current.loop = true
      sequenceRef.current.loopEnd = currentPiece.measures.length * secondsPerBeat
      
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
        sequenceRef.current.dispose()
        sequenceRef.current = null
      }
      
      // Reset transport position
      Tone.Transport.position = 0
      
      setIsPlaying(false)
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
              <p className="font-medium text-mirubato-wood-800">{currentPiece.title}</p>
              <p className="text-mirubato-wood-400 text-xs">{currentPiece.composer}</p>
            </div>
            <div>
              <p className="text-mirubato-wood-500 text-sm">Key</p>
              <p className="font-medium text-mirubato-wood-800">
                {currentPiece.measures[0]?.keySignature || 'C Major'}
              </p>
            </div>
            <div>
              <p className="text-mirubato-wood-500 text-sm">Tempo</p>
              <p className="font-medium text-mirubato-wood-800">
                {currentPiece.measures[0]?.tempo?.marking || 'Moderato'}
              </p>
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
              disabled={isLoading}
              className={`
                px-8 py-3 rounded-lg font-medium transition-all
                ${isLoading 
                  ? 'bg-mirubato-wood-300 cursor-not-allowed text-mirubato-wood-500'
                  : isPlaying 
                  ? 'bg-mirubato-wood-600 hover:bg-mirubato-wood-700 text-white' 
                  : 'bg-mirubato-leaf-400 hover:bg-mirubato-leaf-500 text-white'}
              `}
            >
              {isLoading ? 'Loading Piano...' : isPlaying ? 'Pause' : 'Play'}
            </button>

            {/* Tempo Control */}
            <div className="flex items-center gap-3">
              <label className="text-mirubato-wood-600 text-sm">Tempo:</label>
              <input
                type="range"
                min="30"
                max="180"
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
              <span className="text-mirubato-wood-500 text-xs ml-2">
                {tempo <= 40 ? '(Slow practice)' : 
                 tempo <= 60 ? '(Medium)' : 
                 tempo <= 100 ? '(Target)' : 
                 '(Performance)'}
              </span>
            </div>

            {/* Measure Progress */}
            <div className="text-mirubato-wood-600 text-sm">
              Measure: <span className="font-mono">{currentMeasure + 1}/{currentPiece.measures.length}</span>
              <span className="text-mirubato-wood-400 ml-2">(First 20 measures)</span>
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