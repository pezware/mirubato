import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from './ui/Modal'
import Button from './ui/Button'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { formatDuration } from '@/utils/dateUtils'

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  const handleStart = () => {
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
  }

  const handleClose = () => {
    if (isRunning) {
      const confirm = window.confirm(t('logbook:timer.confirmClose'))
      if (!confirm) return
    }
    setIsRunning(false)
    setSeconds(0)
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
        <div className="text-6xl md:text-7xl font-mono font-light text-stone-800 mb-2">
          {formatTime(seconds)}
        </div>

        {/* Duration in readable format */}
        <div className="text-sm text-stone-600 mb-8">
          {seconds > 0 && formatDuration(Math.round(seconds / 60))}
        </div>

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

        {/* Instructions */}
        <p className="text-sm text-stone-600">
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
