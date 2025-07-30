import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from './ui/Modal'
import Button from './ui/Button'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { formatTime } from '@/utils/dateUtils'

interface TimerEntryProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (duration: number) => void
}

export default function TimerEntry({
  isOpen,
  onClose,
  onComplete,
}: TimerEntryProps) {
  const { t } = useTranslation(['logbook', 'common'])
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const accumulatedSecondsRef = useRef(0)

  // High-precision timer with background tab handling
  useEffect(() => {
    if (isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = performance.now()
      }

      const updateTimer = () => {
        if (startTimeRef.current) {
          const currentTime = performance.now()
          const elapsedMs = currentTime - startTimeRef.current
          const totalSeconds =
            accumulatedSecondsRef.current + Math.floor(elapsedMs / 1000)
          setSeconds(totalSeconds)
        }
      }

      intervalRef.current = setInterval(updateTimer, 100) // More frequent updates for precision

      // Handle visibility changes to maintain accuracy
      const handleVisibilityChange = () => {
        if (!document.hidden && isRunning && startTimeRef.current) {
          // Recalculate when tab becomes visible
          const currentTime = performance.now()
          const elapsedMs = currentTime - startTimeRef.current
          const totalSeconds =
            accumulatedSecondsRef.current + Math.floor(elapsedMs / 1000)
          setSeconds(totalSeconds)
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      // Accumulate elapsed time when pausing
      if (startTimeRef.current) {
        const currentTime = performance.now()
        const elapsedMs = currentTime - startTimeRef.current
        accumulatedSecondsRef.current += Math.floor(elapsedMs / 1000)
        startTimeRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const handleStart = () => {
    if (!startTime) {
      setStartTime(new Date())
    }
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleStop = () => {
    setIsRunning(false)
    if (seconds > 0) {
      // Convert seconds to minutes for the entry form
      const minutes = Math.round(seconds / 60)
      onComplete(minutes)
      setSeconds(0)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setSeconds(0)
    setStartTime(null)
    startTimeRef.current = null
    accumulatedSecondsRef.current = 0
  }

  const handleClose = () => {
    if (isRunning) {
      const confirm = window.confirm(t('logbook:timer.confirmClose'))
      if (!confirm) return
    }
    setIsRunning(false)
    setSeconds(0)
    setStartTime(null)
    startTimeRef.current = null
    accumulatedSecondsRef.current = 0
    onClose()
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('logbook:timer.title')}
    >
      <div className="text-center py-8">
        {/* Timer Display */}
        <div className="text-6xl md:text-7xl font-inter font-light text-stone-800 mb-2">
          {formatTime(seconds)}
        </div>

        {/* Start time display */}
        {startTime && (
          <div className="text-xs text-stone-500 mb-6">
            {t('logbook:timer.startedAt')} {formatTime(startTime)}
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              variant="primary"
              size="lg"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Play className="w-5 h-5" />
              {seconds > 0
                ? t('logbook:timer.resume')
                : t('logbook:timer.start')}
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              variant="secondary"
              size="lg"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Pause className="w-5 h-5" />
              {t('logbook:timer.pause')}
            </Button>
          )}

          {seconds > 0 && (
            <>
              <Button
                onClick={handleStop}
                variant="primary"
                size="lg"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Square className="w-5 h-5" />
                {t('logbook:timer.stop')}
              </Button>

              <Button
                onClick={handleReset}
                variant="ghost"
                size="lg"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <RotateCcw className="w-5 h-5" />
                {t('logbook:timer.reset')}
              </Button>
            </>
          )}
        </div>

        {/* Instructions - Mobile optimized */}
        <p className="text-sm text-stone-600 sm:hidden">
          {isRunning
            ? t('logbook:timer.runningHintMobile')
            : seconds > 0
              ? t('logbook:timer.stopHintMobile')
              : t('logbook:timer.startHintMobile')}
        </p>

        {/* Instructions - Desktop */}
        <p className="text-sm text-stone-600 hidden sm:block">
          {isRunning
            ? t('logbook:timer.runningHint')
            : seconds > 0
              ? t('logbook:timer.stopHint')
              : t('logbook:timer.startHint')}
        </p>
      </div>
    </Modal>
  )
}
