import React, { useState, useRef, useEffect } from 'react'
import * as Tone from 'tone'
import { audioManager } from '../utils/audioManager'

export interface PlayableNote {
  note: string
  time: number
  originalTime?: number
}

interface MusicPlayerProps {
  // Required props
  notes: PlayableNote[]

  // Optional props with defaults
  initialTempo?: number
  minTempo?: number
  maxTempo?: number
  showStopButton?: boolean
  showTempoControl?: boolean
  showMeasureProgress?: boolean
  totalMeasures?: number
  loop?: boolean

  // Callbacks
  onMeasureChange?: (measure: number) => void
  onPlayStateChange?: (isPlaying: boolean, isPaused: boolean) => void
  onTempoChange?: (tempo: number) => void

  // Styling
  className?: string
  compact?: boolean
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  notes,
  initialTempo = 60,
  minTempo = 30,
  maxTempo = 180,
  showStopButton = true,
  showTempoControl = true,
  showMeasureProgress = true,
  totalMeasures = 20,
  loop = true,
  onMeasureChange,
  onPlayStateChange,
  onTempoChange,
  className = '',
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [tempo, setTempo] = useState(initialTempo)
  const [currentMeasure, setCurrentMeasure] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const sequenceRef = useRef<Tone.Part | null>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sequenceRef.current?.dispose()
      Tone.Transport.stop()
      Tone.Transport.cancel()
    }
  }, [])

  // Notify parent of state changes
  useEffect(() => {
    onPlayStateChange?.(isPlaying, isPaused)
  }, [isPlaying, isPaused, onPlayStateChange])

  // Notify parent of measure changes
  useEffect(() => {
    onMeasureChange?.(currentMeasure)
  }, [currentMeasure, onMeasureChange])

  const handlePlayPause = async () => {
    if (!isPlaying && !isLoading) {
      try {
        // Initialize audio if not already initialized
        if (!audioManager.isInitialized()) {
          setIsLoading(true)
          await audioManager.initialize()
          setIsLoading(false)
        }

        await Tone.start()
      } catch (error) {
        console.error('Failed to initialize audio:', error)
        setIsLoading(false)
        return
      }

      if (!isPaused) {
        // Clean up any existing sequence
        if (sequenceRef.current) {
          sequenceRef.current.dispose()
          sequenceRef.current = null
        }

        // Clear any scheduled events and reset transport
        Tone.Transport.cancel()
        Tone.Transport.stop()
        Tone.Transport.position = 0

        // Set BPM on Transport
        Tone.Transport.bpm.value = tempo

        // Create notes using Transport time notation
        const notesToSchedule = notes.map(n => {
          const totalSixteenths = Math.round(n.time * 16)
          const bars = Math.floor(totalSixteenths / 16)
          const remainingSixteenths = totalSixteenths % 16
          const beats = Math.floor(remainingSixteenths / 4)
          const sixteenths = remainingSixteenths % 4

          return {
            time: `${bars}:${beats}:${sixteenths}`,
            note: n.note,
            originalTime: n.originalTime || n.time,
          }
        })

        sequenceRef.current = new Tone.Part((time, note) => {
          audioManager.playNoteAt(note.note, time, '16n', 0.7)

          Tone.Draw.schedule(() => {
            const currentMeasureNum = Math.floor(note.originalTime)
            setCurrentMeasure(currentMeasureNum)
          }, time)
        }, notesToSchedule)

        // Configure the part
        sequenceRef.current.loop = loop
        const lastNote = notes[notes.length - 1]
        const totalSixteenths = Math.round((lastNote.time + 1) * 16)
        const loopBars = Math.floor(totalSixteenths / 16)
        sequenceRef.current.loopEnd = `${loopBars}:0:0`

        // Start sequence and transport
        sequenceRef.current.start(0)
        Tone.Transport.start()
      } else {
        // Resume from paused position
        Tone.Transport.start()
        setIsPaused(false)
      }

      setIsPlaying(true)
    } else {
      // Pause playback
      setIsPaused(true)
      Tone.Transport.pause()
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    if (sequenceRef.current) {
      sequenceRef.current.stop()
      sequenceRef.current.dispose()
      sequenceRef.current = null
    }

    Tone.Transport.stop()
    Tone.Transport.cancel()
    Tone.Transport.position = 0

    setIsPaused(false)
    setIsPlaying(false)
    setCurrentMeasure(0)
  }

  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo)
    if (isPlaying) {
      Tone.Transport.bpm.value = newTempo
    }
    onTempoChange?.(newTempo)
  }

  const containerClass = compact
    ? 'flex items-center gap-3'
    : 'flex flex-col sm:flex-row items-center justify-center gap-6'

  return (
    <div className={`${className} ${containerClass}`}>
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        disabled={isLoading}
        className={`
          ${compact ? 'px-4 py-2 text-sm' : 'px-8 py-3'}
          rounded-lg font-medium transition-all
          ${
            isLoading
              ? 'bg-mirubato-wood-300 cursor-not-allowed text-mirubato-wood-500'
              : isPlaying
                ? 'bg-mirubato-wood-600 hover:bg-mirubato-wood-700 text-white'
                : 'bg-mirubato-leaf-400 hover:bg-mirubato-leaf-500 text-white'
          }
        `}
      >
        {isLoading
          ? 'Loading...'
          : isPlaying
            ? 'Pause'
            : isPaused
              ? 'Resume'
              : 'Play'}
      </button>

      {/* Stop Button */}
      {showStopButton && (isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          className={`
            ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-3'}
            rounded-lg font-medium transition-all 
            bg-mirubato-wood-400 hover:bg-mirubato-wood-500 text-white
          `}
        >
          Stop
        </button>
      )}

      {/* Tempo Control */}
      {showTempoControl && (
        <div className="flex items-center gap-3">
          <label
            className={`text-sm ${isPaused ? 'text-mirubato-wood-400' : 'text-mirubato-wood-600'}`}
          >
            Tempo:
          </label>
          <input
            type="range"
            min={minTempo}
            max={maxTempo}
            value={tempo}
            disabled={isPaused}
            onChange={e => handleTempoChange(Number(e.target.value))}
            className={`${compact ? 'w-24' : 'w-32'} ${isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <span
            className={`font-mono text-sm w-12 ${isPaused ? 'text-mirubato-wood-400' : 'text-mirubato-wood-800'}`}
          >
            {tempo}
          </span>
          {!compact && (
            <span className="text-mirubato-wood-500 text-xs ml-2">
              {tempo <= 40
                ? '(Slow practice)'
                : tempo <= 60
                  ? '(Medium)'
                  : tempo <= 100
                    ? '(Target)'
                    : '(Performance)'}
            </span>
          )}
        </div>
      )}

      {/* Measure Progress */}
      {showMeasureProgress && (
        <div className="text-mirubato-wood-600 text-sm">
          Measure:{' '}
          <span className="font-mono">
            {currentMeasure + 1}/{totalMeasures}
          </span>
        </div>
      )}
    </div>
  )
}
