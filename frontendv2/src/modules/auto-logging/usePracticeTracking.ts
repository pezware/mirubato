import { useState, useCallback, useEffect } from 'react'
import { useAutoLogging } from './AutoLoggingProvider'
import type { PracticeType, PracticeMetadata } from './types'

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
    updateSession,
    cancelSession,
    isTracking,
    elapsedTime,
    config,
  } = useAutoLogging()

  const [showSummary, setShowSummary] = useState(false)
  const [pendingSession, setPendingSession] = useState<{
    duration: number
    metadata: PracticeMetadata
  } | null>(null)

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
      // Store session data for summary modal
      setPendingSession({
        duration: session.duration,
        metadata: session.metadata,
      })
      setShowSummary(true)
    } else if (session) {
      // Call callback if no summary needed
      onSessionEnd?.(session.duration, session.metadata)
    }

    return session
  }, [stopSession, config.showSummary, onSessionEnd])

  const cancel = useCallback(() => {
    cancelSession()
    setPendingSession(null)
    setShowSummary(false)
  }, [cancelSession])

  const confirmSave = useCallback(() => {
    if (pendingSession) {
      onSessionEnd?.(pendingSession.duration, pendingSession.metadata)
    }
    setPendingSession(null)
    setShowSummary(false)
  }, [pendingSession, onSessionEnd])

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
