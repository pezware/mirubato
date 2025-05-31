import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { audioManager } from '../utils/audioManager'
import { NotationRenderer } from '../utils/notationRenderer'
import {
  moonlightSonata3rdMovement,
  getPlayableNotes,
} from '../data/sheetMusic'
import { MusicPlayer } from '../components'

const Practice: React.FC = () => {
  const notationRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth)
  const notationRendererRef = useRef<NotationRenderer | null>(null)

  // Get the current piece data
  const currentPiece = moonlightSonata3rdMovement
  const playableNotes = getPlayableNotes(currentPiece)

  // Initialize audio
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Ensure piano instrument is selected
        audioManager.setInstrument('piano')

        // Initialize the audio system
        await audioManager.initialize()
      } catch (error) {
        console.error('Failed to initialize audio:', error)
      }
    }

    initializeAudio()
  }, [])

  // Handle responsive sizing
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate responsive dimensions
  const getNotationDimensions = useCallback(() => {
    if (viewportWidth < 640) {
      // Mobile
      return { width: viewportWidth - 32, scale: 0.8 }
    } else if (viewportWidth < 1024) {
      // Tablet
      return { width: Math.min(viewportWidth - 64, 700), scale: 0.9 }
    } else {
      // Desktop
      return { width: 800, scale: 1.0 }
    }
  }, [viewportWidth])

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
      measuresPerLine: 2,
    })

    return () => {
      notationRendererRef.current?.dispose()
    }
  }, [viewportWidth, currentPiece, getNotationDimensions])

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
              <p className="font-medium text-mirubato-wood-800">
                {currentPiece.title}
              </p>
              <p className="text-mirubato-wood-400 text-xs">
                {currentPiece.composer}
              </p>
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
          <MusicPlayer
            notes={playableNotes.map(n => ({
              note: n.note,
              time: n.time,
              originalTime: n.time,
            }))}
            initialTempo={40}
            totalMeasures={currentPiece.measures.length}
            showMeasureProgress={true}
            showStopButton={true}
            showTempoControl={true}
          />
          <div className="text-center text-mirubato-wood-400 text-sm mt-2">
            (First 20 measures)
          </div>
        </div>

        {/* Instructions (Mobile-friendly) */}
        <div className="mt-8 text-center text-mirubato-wood-500 text-sm px-4">
          <p className="mb-2">Press Play to begin sight-reading practice</p>
          <p className="text-xs">
            Tip: Try to keep playing even if you make mistakes - that's the
            "Keep Going Method"!
          </p>
        </div>
      </main>
    </div>
  )
}

export default Practice
