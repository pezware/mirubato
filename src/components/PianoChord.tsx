import React, { useState, useCallback, useEffect, useRef } from 'react'
import { audioManager } from '../utils/audioManager'

interface PianoChordProps {
  className?: string
}

const PianoChord: React.FC<PianoChordProps> = ({ className = '' }) => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [hasPlayed, setHasPlayed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw simple treble clef and C major chord notation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Set up styling
    ctx.strokeStyle = '#52525b' // rubato-wood-600
    ctx.fillStyle = '#52525b'
    ctx.lineWidth = 1

    // Draw staff lines
    const staffTop = 20
    const lineSpacing = 8
    for (let i = 0; i < 5; i++) {
      const y = staffTop + (i * lineSpacing)
      ctx.beginPath()
      ctx.moveTo(10, y)
      ctx.lineTo(140, y)
      ctx.stroke()
    }

    // Draw simple treble clef symbol
    ctx.font = '32px serif'
    ctx.fillText('𝄞', 15, staffTop + 25)

    // Draw notes for C major chord
    // C (on ledger line below staff)
    const noteX = 60
    ctx.beginPath()
    ctx.moveTo(noteX - 10, staffTop + 40)
    ctx.lineTo(noteX + 10, staffTop + 40)
    ctx.stroke()
    
    // Draw note heads
    ctx.beginPath()
    // C note
    ctx.ellipse(noteX, staffTop + 40, 5, 4, 0, 0, 2 * Math.PI)
    ctx.fill()
    
    // E note (bottom line)
    ctx.beginPath()
    ctx.ellipse(noteX + 25, staffTop + 32, 5, 4, 0, 0, 2 * Math.PI)
    ctx.fill()
    
    // G note (second line)
    ctx.beginPath()
    ctx.ellipse(noteX + 50, staffTop + 24, 5, 4, 0, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  const handleKeyPress = useCallback(async (note: string) => {
    console.log('Piano key pressed:', note)
    
    try {
      // Add to pressed keys
      setPressedKeys(prev => new Set(prev).add(note))
      
      // Play the individual note
      await audioManager.playNote(note, '2n')
      
      if (!hasPlayed) {
        setHasPlayed(true)
      }

      // Remove from pressed keys after a delay
      setTimeout(() => {
        setPressedKeys(prev => {
          const next = new Set(prev)
          next.delete(note)
          return next
        })
      }, 150)
    } catch (error) {
      console.error('Failed to play note:', error)
    }
  }, [hasPlayed])

  const pianoKeys = [
    { note: 'C4', label: '', isWhite: true, position: 0 },
    { note: 'D4', label: '', isWhite: true, position: 1 },
    { note: 'E4', label: '', isWhite: true, position: 2 },
    { note: 'F4', label: '', isWhite: true, position: 3 },
    { note: 'G4', label: '', isWhite: true, position: 4 },
  ]

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Musical notation */}
      <div className="mb-4">
        <canvas 
          ref={canvasRef}
          width={150}
          height={80}
          className="bg-white/50 rounded-lg p-2"
        />
      </div>

      {/* Piano keys */}
      <div className="flex relative">
        {pianoKeys.map((key) => (
          <button
            key={key.note}
            onClick={() => handleKeyPress(key.note)}
            className={`
              relative w-12 h-36 bg-white border-2 border-rubato-wood-300
              transition-all duration-75 cursor-pointer select-none
              hover:bg-rubato-wood-50
              ${pressedKeys.has(key.note) ? 'translate-y-1 shadow-md bg-rubato-wood-100' : 'shadow-lg'}
              ${key.position === 0 ? 'rounded-bl-md' : ''}
              ${key.position === pianoKeys.length - 1 ? 'rounded-br-md' : ''}
              ${key.position > 0 ? 'border-l-0' : ''}
            `}
            aria-label={`Piano key ${key.note}`}
          >
            {key.label && (
              <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-rubato-wood-400 text-xs">
                {key.label}
              </span>
            )}
          </button>
        ))}
        
        {/* Black keys (C# and D# for visual accuracy) */}
        <div className="absolute top-0 left-9 w-6 h-24 bg-rubato-wood-800 rounded-b-sm pointer-events-none" />
        <div className="absolute top-0 left-[60px] w-6 h-24 bg-rubato-wood-800 rounded-b-sm pointer-events-none" />
      </div>

      {/* Chord name hint */}
      <p className="mt-4 text-rubato-wood-500 text-sm">
        C major
      </p>

      {/* Success message */}
      {hasPlayed && (
        <p className="mt-2 text-rubato-leaf-600 text-sm animate-fade-in">
          Beautiful! Try playing all three notes
        </p>
      )}
    </div>
  )
}

export default PianoChord