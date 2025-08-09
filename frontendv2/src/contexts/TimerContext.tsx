import React, { useState, useCallback, useEffect, useRef } from 'react'
import { showToast } from '@/utils/toastManager'
import {
  TimerContext,
  TimerContextType,
  TimerCheckpoint,
  TimerSettings,
  defaultSettings,
  TIMER_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from './TimerContextType'

export function TimerProvider({ children }: { children: React.ReactNode }) {
  // Timer state
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null)
  const [accumulatedSeconds, setAccumulatedSeconds] = useState(0)
  const [wasRunningInBackground, setWasRunningInBackground] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Settings
  const [settings, setSettings] = useState<TimerSettings>(defaultSettings)

  // Refs for intervals
  const animationFrameRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastReminderRef = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // Check and trigger reminders
  const checkReminder = useCallback(
    (currentSeconds: number) => {
      if (!settings.enableReminders || !isRunning) return

      const intervalSeconds = settings.reminderInterval * 60
      const currentInterval = Math.floor(currentSeconds / intervalSeconds)

      if (
        currentInterval > lastReminderRef.current &&
        currentSeconds >= intervalSeconds
      ) {
        lastReminderRef.current = currentInterval

        // Visual reminder
        if (
          settings.reminderType === 'visual' ||
          settings.reminderType === 'both'
        ) {
          const hours = Math.floor(currentSeconds / 3600)
          const minutes = Math.floor((currentSeconds % 3600) / 60)
          const timeStr =
            hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`
          showToast(
            `Practice timer: ${timeStr} elapsed! Keep it up! 🎵`,
            'info',
            undefined,
            5000
          )
        }

        // Sound reminder
        if (
          settings.reminderType === 'sound' ||
          settings.reminderType === 'both'
        ) {
          // Play a gentle chime sound
          if (!audioRef.current) {
            audioRef.current = new Audio(
              'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizYGHGnG8OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
            )
            audioRef.current.volume = 0.3
          }
          audioRef.current.play().catch(err => {
            console.warn('Could not play reminder sound:', err)
          })
        }
      }
    },
    [settings, isRunning]
  )

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) })
      }
    } catch (error) {
      console.error('Failed to load timer settings:', error)
    }
  }, [])

  // Load timer state from localStorage on mount
  useEffect(() => {
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
          setIsRunning(true)
          setStartTimestamp(Date.now())
          setWasRunningInBackground(true)

          // Set the last reminder checkpoint
          lastReminderRef.current = Math.floor(
            totalAccumulated / (settings.reminderInterval * 60)
          )
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
  }, [settings.reminderInterval])

  // Main timer update loop
  useEffect(() => {
    if (isRunning) {
      // Use requestAnimationFrame for smooth updates when visible
      const updateDisplay = () => {
        const elapsed = getElapsedSeconds()
        setSeconds(elapsed)
        checkReminder(elapsed)

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
        checkReminder(elapsed)
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
  }, [isRunning, getElapsedSeconds, saveCheckpoint, checkReminder])

  // Timer controls
  const start = useCallback(() => {
    const now = new Date()
    if (!startTime) {
      setStartTime(now)
    }

    // Reset reminder counter when starting fresh
    if (seconds === 0) {
      lastReminderRef.current = 0
    }

    setStartTimestamp(Date.now())
    setIsRunning(true)
    setWasRunningInBackground(false)

    // Save initial checkpoint
    setTimeout(() => saveCheckpoint(), 100)
  }, [startTime, seconds, saveCheckpoint])

  const pause = useCallback(() => {
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
  }, [getElapsedSeconds, startTime])

  const stop = useCallback(
    (callback?: (duration: number, startTime?: Date) => void) => {
      // Calculate final elapsed time
      const finalSeconds = getElapsedSeconds()
      setIsRunning(false)

      if (finalSeconds > 0 && callback) {
        // Convert seconds to minutes for the entry form
        const minutes = Math.round(finalSeconds / 60)
        callback(minutes, startTime || undefined)
      }

      // Clear state
      setSeconds(0)
      setAccumulatedSeconds(0)
      setStartTimestamp(null)
      setStartTime(null)
      lastReminderRef.current = 0
      localStorage.removeItem(TIMER_STORAGE_KEY)
    },
    [getElapsedSeconds, startTime]
  )

  const reset = useCallback(() => {
    setIsRunning(false)
    setSeconds(0)
    setStartTime(null)
    setStartTimestamp(null)
    setAccumulatedSeconds(0)
    setWasRunningInBackground(false)
    lastReminderRef.current = 0
    localStorage.removeItem(TIMER_STORAGE_KEY)
  }, [])

  // Modal controls
  const openModal = useCallback(() => {
    setIsModalOpen(true)
    setIsMinimized(false)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setIsMinimized(false)
  }, [])

  const minimizeModal = useCallback(() => {
    setIsMinimized(true)
    setIsModalOpen(false)
  }, [])

  // Settings management
  const updateSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const value: TimerContextType = {
    seconds,
    isRunning,
    startTime,
    wasRunningInBackground,
    isModalOpen,
    isMinimized,
    start,
    pause,
    stop,
    reset,
    openModal,
    closeModal,
    minimizeModal,
    settings,
    updateSettings,
  }

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}
