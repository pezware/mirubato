import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Minus, Check } from 'lucide-react'
import { Button } from '../ui'
import { CounterMode } from './CounterSetup'

export interface RepetitionData {
  repNumber: number
  duration: number
  timestamp: number
}

interface CounterActiveProps {
  mode: CounterMode
  initialValue: number
  onFinish: (reps: RepetitionData[], totalTime: number) => void
  practiceTime?: string
  isTracking?: boolean
}

export const CounterActive: React.FC<CounterActiveProps> = ({
  mode,
  initialValue,
  onFinish,
  practiceTime,
  isTracking,
}) => {
  const { t } = useTranslation('toolbox')
  const [count, setCount] = useState(mode === 'up' ? 0 : initialValue)
  const [isPressed, setIsPressed] = useState(false)
  const [repetitions, setRepetitions] = useState<RepetitionData[]>([])
  const startTimeRef = useRef<number>(Date.now())
  const lastClickTimeRef = useRef<number>(Date.now())

  // Use the practice time from the auto-logging system if provided
  // Otherwise fall back to local timer (for backward compatibility)
  const [localElapsedTime, setLocalElapsedTime] = useState(0)

  useEffect(() => {
    if (!practiceTime) {
      const interval = setInterval(() => {
        setLocalElapsedTime(Date.now() - startTimeRef.current)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [practiceTime])

  const formatLocalTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const displayTime = practiceTime || formatLocalTime(localElapsedTime)

  // Auto-finish when countdown reaches 0
  useEffect(() => {
    if (mode === 'down' && count === 0 && repetitions.length > 0) {
      handleFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, mode])

  const handleCountClick = () => {
    if (mode === 'down' && count === 0) return

    const now = Date.now()
    const duration = now - lastClickTimeRef.current
    lastClickTimeRef.current = now

    const newRep: RepetitionData = {
      repNumber: repetitions.length + 1,
      duration,
      timestamp: now,
    }

    setRepetitions(prev => [...prev, newRep])
    setCount(prev => (mode === 'up' ? prev + 1 : Math.max(0, prev - 1)))

    // Visual feedback
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 100)
  }

  const handleFinish = () => {
    const totalTime = Date.now() - startTimeRef.current
    onFinish(repetitions, totalTime)
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-6">
      {/* Elapsed Time Display */}
      <div className="text-sm text-morandi-stone-600">
        {isTracking && <span className="text-xs mr-1">●</span>}
        {displayTime}
      </div>

      {/* Main Count Display */}
      <div className="text-6xl font-bold text-morandi-stone-900 tabular-nums">
        {count}
      </div>

      {/* Large Action Button - Similar to metronome */}
      <button
        onClick={handleCountClick}
        disabled={mode === 'down' && count === 0}
        className={`
          relative w-32 h-32 rounded-full flex items-center justify-center
          transition-all duration-150 transform
          ${
            mode === 'up'
              ? 'bg-morandi-sage-400 hover:bg-morandi-sage-500 active:bg-morandi-sage-600'
              : 'bg-morandi-blush-400 hover:bg-morandi-blush-500 active:bg-morandi-blush-600'
          }
          ${isPressed ? 'scale-95' : 'scale-100'}
          ${
            mode === 'down' && count === 0
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer active:scale-95'
          }
          shadow-lg hover:shadow-xl
        `}
      >
        <span className="text-white">
          {mode === 'up' ? <Plus size={48} /> : <Minus size={48} />}
        </span>
      </button>

      {/* Progress Indicator for Countdown */}
      {mode === 'down' && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-morandi-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-morandi-blush-400 transition-all duration-300"
              style={{
                width: `${((initialValue - count) / initialValue) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Finish Button */}
      <Button
        variant="secondary"
        size="md"
        onClick={handleFinish}
        className="mt-8"
        leftIcon={<Check size={20} />}
      >
        {t('counter.button.finish')}
      </Button>
    </div>
  )
}

export default CounterActive
