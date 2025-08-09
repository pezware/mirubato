import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from './ui/Modal'
import Button from './ui/Button'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'
import { formatTime as formatTimeUtil } from '@/utils/dateUtils'

interface TimerEntryProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (duration: number, startTime?: Date) => void
}

interface TimerCheckpoint {
  startTimestamp: number | null
  accumulatedSeconds: number
  isRunning: boolean
  lastCheckpoint: number
  sessionStartTime: string | null
}

const TIMER_STORAGE_KEY = 'mirubato_timer_state'

export default function TimerEntry({
  isOpen,
  onClose,
  onComplete,
}: TimerEntryProps) {
  const { t } = useTranslation(['logbook', 'common'])
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null)
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0)
  const [wasRunningInBackground, setWasRunningInBackground] = useState(false)
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate elapsed seconds based on real time
  const getElapsedSeconds = useCallback(() => {
    if (!startTimestamp) return accumulatedSeconds
    const elapsedMs = Date.now() - startTimestamp
    return accumulatedSeconds + Math.floor(elapsedMs / 1000)
  }, [startTimestamp, accumulatedSeconds])

  // Save timer state to localStorage
  const saveCheckpoint = useCallback(() => {
    const checkpoint: TimerCheckpoint = {
      startTimestamp,
      accumulatedSeconds: getElapsedSeconds(),
      isRunning,
      lastCheckpoint: Date.now(),
      sessionStartTime: startTime?.toISOString() || null,
    }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(checkpoint))
  }, [startTimestamp, getElapsedSeconds, isRunning, startTime])

  // Load timer state from localStorage on mount
  useEffect(() => {
    if (!isOpen) return

    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY)
      if (saved) {
        const checkpoint: TimerCheckpoint = JSON.parse(saved)

        // Only restore if timer was running and less than 24 hours old
        const timeSinceCheckpoint = Date.now() - checkpoint.lastCheckpoint
        if (checkpoint.isRunning && timeSinceCheckpoint < 24 * 60 * 60 * 1000) {
          // Calculate how much time passed since last checkpoint
          const missedSeconds = Math.floor(timeSinceCheckpoint / 1000)
          const totalAccumulated = checkpoint.accumulatedSeconds + missedSeconds

          setAccumulatedSeconds(totalAccumulated)
          setSeconds(totalAccumulated)
          setStartTime(
            checkpoint.sessionStartTime
              ? new Date(checkpoint.sessionStartTime)
              : new Date()
          )
          setWasRunningInBackground(true)

          // Clear the saved state since we've recovered it
          localStorage.removeItem(TIMER_STORAGE_KEY)
        } else if (!checkpoint.isRunning && checkpoint.accumulatedSeconds > 0) {
          // Restore paused timer
          setAccumulatedSeconds(checkpoint.accumulatedSeconds)
          setSeconds(checkpoint.accumulatedSeconds)
          setStartTime(
            checkpoint.sessionStartTime
              ? new Date(checkpoint.sessionStartTime)
              : null
          )
        }
      }
    } catch (error) {
      console.error('Failed to restore timer state:', error)
      localStorage.removeItem(TIMER_STORAGE_KEY)
    }
  }, [isOpen])

  // Main timer update loop
  useEffect(() => {
    if (isRunning) {
      // Use requestAnimationFrame for smooth updates when visible
      const updateDisplay = () => {
        const elapsed = getElapsedSeconds()
        setSeconds(elapsed)

        if (isRunning && !document.hidden) {
          animationFrameRef.current = requestAnimationFrame(updateDisplay)
        }
      }

      // Start the animation frame loop
      updateDisplay()

      // Also use interval as fallback for background updates
      intervalRef.current = setInterval(() => {
        const elapsed = getElapsedSeconds()
        setSeconds(elapsed)
        saveCheckpoint()
      }, 1000)

      // Handle visibility changes
      const handleVisibilityChange = () => {
        if (!document.hidden && isRunning) {
          // Tab became visible - recalculate and update immediately
          const elapsed = getElapsedSeconds()
          setSeconds(elapsed)

          // Check if significant time passed in background
          const checkpoint = localStorage.getItem(TIMER_STORAGE_KEY)
          if (checkpoint) {
            try {
              const saved: TimerCheckpoint = JSON.parse(checkpoint)
              const timeSinceCheckpoint = Date.now() - saved.lastCheckpoint
              if (timeSinceCheckpoint > 5000) {
                setWasRunningInBackground(true)
                setTimeout(() => setWasRunningInBackground(false), 3000)
              }
            } catch {
              // Ignore errors when parsing checkpoint
            }
          }

          // Restart animation frame
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
          }
          updateDisplay()
        } else if (document.hidden && isRunning) {
          // Tab became hidden - save checkpoint
          saveCheckpoint()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    } else {
      // Timer stopped - clean up
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, getElapsedSeconds, saveCheckpoint])

  const handleStart = () => {
    const now = new Date()
    if (!startTime) {
      setStartTime(now)
    }

    // Set the timestamp for this session
    setStartTimestamp(Date.now())
    setIsRunning(true)
    setWasRunningInBackground(false)

    // Save initial checkpoint
    setTimeout(() => saveCheckpoint(), 100)
  }

  const handlePause = () => {
    // Calculate and save accumulated time before pausing
    const elapsed = getElapsedSeconds()
    setAccumulatedSeconds(elapsed)
    setStartTimestamp(null)
    setIsRunning(false)

    // Save checkpoint with paused state
    setTimeout(() => {
      const checkpoint: TimerCheckpoint = {
        startTimestamp: null,
        accumulatedSeconds: elapsed,
        isRunning: false,
        lastCheckpoint: Date.now(),
        sessionStartTime: startTime?.toISOString() || null,
      }
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(checkpoint))
    }, 100)
  }

  const handleStop = () => {
    // Calculate final elapsed time
    const finalSeconds = getElapsedSeconds()
    setIsRunning(false)

    if (finalSeconds > 0) {
      // Convert seconds to minutes for the entry form
      const minutes = Math.round(finalSeconds / 60)
      onComplete(minutes, startTime || undefined)

      // Clear state
      setSeconds(0)
      setAccumulatedSeconds(0)
      setStartTimestamp(null)
      localStorage.removeItem(TIMER_STORAGE_KEY)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setSeconds(0)
    setStartTime(null)
    setStartTimestamp(null)
    setAccumulatedSeconds(0)
    setWasRunningInBackground(false)
    localStorage.removeItem(TIMER_STORAGE_KEY)
  }

  const handleClose = () => {
    if (isRunning) {
      const confirm = window.confirm(t('logbook:timer.confirmClose'))
      if (!confirm) return
    }

    // Save state if timer has accumulated time
    if (seconds > 0 && !isRunning) {
      saveCheckpoint()
    } else if (!isRunning) {
      localStorage.removeItem(TIMER_STORAGE_KEY)
    }

    setIsRunning(false)
    setSeconds(0)
    setStartTime(null)
    setStartTimestamp(null)
    setAccumulatedSeconds(0)
    setWasRunningInBackground(false)
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
            {t('logbook:timer.startedAt')} {formatTimeUtil(startTime)}
            {wasRunningInBackground && (
              <span className="ml-2 text-green-600">
                ✓{' '}
                {t(
                  'logbook:timer.continuedInBackground',
                  'Continued in background'
                )}
              </span>
            )}
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
