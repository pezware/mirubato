import { useState, useCallback, useEffect } from 'react'
import { useAutoLogging } from './context'
import type { PracticeType, PracticeMetadata, PracticeSession } from './types'

interface UsePracticeTrackingOptions {
  type: PracticeType
  metadata?: PracticeMetadata
  onSessionEnd?: (duration: number, metadata: PracticeMetadata) => void
  autoStart?: boolean
}

export const usePracticeTracking = ({
  type,
  metadata: initialMetadata = {},
  onSessionEnd,
  autoStart = false,
}: UsePracticeTrackingOptions) => {
  const {
    currentSession,
    startSession,
    stopSession,
    saveSessionToLogbook,
    updateSession,
    cancelSession,
    isTracking,
    elapsedTime,
    config,
  } = useAutoLogging()

  const [showSummary, setShowSummary] = useState(false)
  const [pendingSession, setPendingSession] = useState<PracticeSession | null>(
    null
  )

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !isTracking) {
      startSession(type, initialMetadata)
    }
  }, [autoStart, type, initialMetadata, isTracking, startSession])

  const start = useCallback(() => {
    if (!isTracking) {
      startSession(type, initialMetadata)
    }
  }, [type, initialMetadata, isTracking, startSession])

  const stop = useCallback(async () => {
    const session = await stopSession()

    if (session && config.showSummary) {
      // Store complete session for summary modal
      setPendingSession(session)
      setShowSummary(true)
    } else if (session) {
      // Auto-save without summary
      await saveSessionToLogbook(session)
      onSessionEnd?.(session.duration, session.metadata)
    }

    return session
  }, [stopSession, config.showSummary, onSessionEnd, saveSessionToLogbook])

  const cancel = useCallback(() => {
    cancelSession()
    setPendingSession(null)
    setShowSummary(false)
  }, [cancelSession])

  const confirmSave = useCallback(
    async (userNotes?: string) => {
      if (pendingSession) {
        // Save to logbook with user notes
        await saveSessionToLogbook(pendingSession, userNotes)

        // Call the callback if provided
        onSessionEnd?.(pendingSession.duration, pendingSession.metadata)
      }
      setPendingSession(null)
      setShowSummary(false)
    },
    [pendingSession, onSessionEnd, saveSessionToLogbook]
  )

  const update = useCallback(
    (updates: Partial<PracticeMetadata>) => {
      updateSession(updates)
    },
    [updateSession]
  )

  // Format elapsed time as MM:SS
  const formatElapsedTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Calculate session duration in minutes (rounded)
  const getDurationMinutes = useCallback((): number => {
    if (!currentSession) return 0
    const duration = elapsedTime * 1000
    return (
      Math.ceil(duration / 60000 / config.roundingInterval) *
      config.roundingInterval
    )
  }, [currentSession, elapsedTime, config.roundingInterval])

  return {
    // State
    isTracking,
    elapsedTime,
    formattedTime: formatElapsedTime(elapsedTime),
    durationMinutes: getDurationMinutes(),
    showSummary,
    pendingSession,
    currentMetadata: currentSession?.metadata || initialMetadata,

    // Actions
    start,
    stop,
    cancel,
    update,
    confirmSave,
    dismissSummary: () => setShowSummary(false),

    // Config
    config,
  }
}

export default usePracticeTracking
