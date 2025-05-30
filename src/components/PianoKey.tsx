import React, { useState, useCallback } from 'react'
import { audioManager } from '../utils/audioManager'

interface PianoKeyProps {
  note: string
  className?: string
}

const PianoKey: React.FC<PianoKeyProps> = ({ note, className = '' }) => {
  const [isPressed, setIsPressed] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  const handleKeyPress = useCallback(async () => {
    console.log('Piano key clicked!')
    
    try {
      setIsPressed(true)
      
      // Show initializing state on first click
      if (!hasPlayed) {
        setIsInitializing(true)
      }
      
      console.log('Attempting to play note:', note)
      
      // Play the note - this will initialize audio on first click
      await audioManager.playNote(note)
      
      // Mark that we've played at least once (for visual feedback)
      if (!hasPlayed) {
        setHasPlayed(true)
      }

      // Visual feedback duration
      setTimeout(() => {
        setIsPressed(false)
      }, 150)
    } catch (error) {
      console.error('Failed to play note:', error)
      setIsInitializing(false)
    } finally {
      setIsInitializing(false)
    }
  }, [note, hasPlayed])

  return (
    <div className="flex flex-col items-center">
      {/* Piano Key */}
      <button
        onClick={handleKeyPress}
        className={`
          relative w-16 h-48 bg-white rounded-b-lg shadow-lg
          border-2 border-rubato-wood-300
          transition-all duration-75 cursor-pointer select-none
          hover:bg-rubato-wood-50
          ${isPressed ? 'translate-y-1 shadow-md bg-rubato-wood-100' : 'shadow-xl'}
          ${hasPlayed ? 'ring-2 ring-rubato-leaf-400/30' : ''}
          ${isInitializing ? 'opacity-80' : ''}
          ${className}
        `}
        aria-label={`Piano key for ${note}`}
      >
        {/* Key Label */}
        <span className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-rubato-wood-600 text-sm font-medium">
          F#
        </span>
        
        {/* Visual feedback indicator */}
        {isPressed && (
          <div className="absolute inset-0 bg-rubato-leaf-400/10 rounded-b-lg animate-pulse" />
        )}
      </button>

      {/* Instruction text that appears after first play */}
      {hasPlayed && (
        <p className="mt-4 text-rubato-leaf-600 text-sm animate-fade-in">
          Beautiful! You just played F# (F-sharp)
        </p>
      )}
      
      {/* Loading indicator */}
      {isInitializing && (
        <p className="mt-4 text-rubato-wood-400 text-sm animate-pulse">
          Initializing audio...
        </p>
      )}
    </div>
  )
}

export default PianoKey