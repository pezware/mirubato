import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createMultiVoiceAudioManager } from '../utils/multiVoiceAudioManager'
import { createLogger } from '../utils/logger'
import { theme } from '../utils/theme'
import styles from './PianoChord.module.css'

const logger = createLogger('PianoChord')

interface PianoChordProps {
  className?: string
}

const PianoChord: React.FC<PianoChordProps> = ({ className = '' }) => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [hasPlayed, setHasPlayed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [audioManager] = useState(() => createMultiVoiceAudioManager())

  useEffect(() => {
    return () => {
      audioManager.dispose()
    }
  }, [audioManager])

  // Draw simple treble clef and C major chord notation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set up styling
    ctx.strokeStyle = '#52525b' // mirubato-wood-600
    ctx.fillStyle = '#52525b'
    ctx.lineWidth = 1

    // Draw staff lines
    const { staffTop, lineSpacing, noteX, notePositions } = theme.piano.notation
    for (let i = 0; i < 5; i++) {
      const y = staffTop + i * lineSpacing
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
    ctx.beginPath()
    ctx.moveTo(noteX - 10, staffTop + notePositions.C)
    ctx.lineTo(noteX + 10, staffTop + notePositions.C)
    ctx.stroke()

    // Draw note heads
    ctx.beginPath()
    // C note
    ctx.ellipse(noteX, staffTop + notePositions.C, 5, 4, 0, 0, 2 * Math.PI)
    ctx.fill()

    // E note (bottom line)
    ctx.beginPath()
    ctx.ellipse(noteX + 25, staffTop + notePositions.E, 5, 4, 0, 0, 2 * Math.PI)
    ctx.fill()

    // G note (second line)
    ctx.beginPath()
    ctx.ellipse(noteX + 50, staffTop + notePositions.G, 5, 4, 0, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  const handleKeyPress = useCallback(
    async (note: string) => {
      logger.debug('Piano key pressed', { note })

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
        }, parseInt(theme.animation.duration.fast))
      } catch (error) {
        logger.error('Failed to play note', error, { note })
      }
    },
    [hasPlayed, audioManager]
  )

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
          width={theme.sizes.piano.canvas.width}
          height={theme.sizes.piano.canvas.height}
          className="bg-white/50 rounded-lg p-2"
        />
      </div>

      {/* Piano keys */}
      <div className="flex relative">
        {pianoKeys.map(key => (
          <button
            key={key.note}
            onClick={() => handleKeyPress(key.note)}
            className={`
              relative w-12 h-36 bg-white border-2 border-mirubato-wood-300
              transition-all duration-75 cursor-pointer select-none
              hover:bg-mirubato-wood-50
              ${pressedKeys.has(key.note) ? 'translate-y-1 shadow-md bg-mirubato-wood-100' : 'shadow-lg'}
              ${key.position === 0 ? 'rounded-bl-md' : ''}
              ${key.position === pianoKeys.length - 1 ? 'rounded-br-md' : ''}
              ${key.position > 0 ? 'border-l-0' : ''}
            `}
            aria-label={`Piano key ${key.note}`}
          >
            {key.label && (
              <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-mirubato-wood-400 text-xs">
                {key.label}
              </span>
            )}
          </button>
        ))}

        {/* Black keys (C# and D# for visual accuracy) */}
        <div className={`${styles.blackKey} ${styles.blackKeyCSharp}`} />
        <div className={`${styles.blackKey} ${styles.blackKeyDSharp}`} />
      </div>

      {/* Chord name hint */}
      <p className="mt-4 text-mirubato-wood-500 text-sm">C major</p>

      {/* Success message */}
      {hasPlayed && (
        <p className="mt-2 text-mirubato-leaf-600 text-sm animate-fade-in">
          Beautiful! Try playing all three notes
        </p>
      )}
    </div>
  )
}

export default PianoChord
