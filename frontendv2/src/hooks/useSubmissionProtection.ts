import { useState, useCallback, useRef } from 'react'

/**
 * Hook for preventing duplicate form submissions and API calls
 * Provides debouncing, loading states, and duplicate prevention
 */

interface SubmissionProtectionOptions {
  /** Debounce delay in milliseconds (default: 300ms for mobile, 150ms for desktop) */
  debounceMs?: number
  /** Whether to enable submission protection (default: true) */
  enabled?: boolean
  /** Maximum number of submissions per minute (default: 10) */
  maxSubmissionsPerMinute?: number
}

interface SubmissionState {
  isSubmitting: boolean
  lastSubmissionAt: number | null
  submissionCount: number
  error: string | null
}

export function useSubmissionProtection(
  options: SubmissionProtectionOptions = {}
) {
  const {
    debounceMs = window.innerWidth <= 768 ? 300 : 150, // Longer debounce on mobile
    enabled = true,
    maxSubmissionsPerMinute = 10,
  } = options

  const [state, setState] = useState<SubmissionState>({
    isSubmitting: false,
    lastSubmissionAt: null,
    submissionCount: 0,
    error: null,
  })

  const timeoutRef = useRef<number | null>(null)
  const submissionTimestamps = useRef<number[]>([])

  /**
   * Clear any pending timeouts
   */
  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  /**
   * Check if submission is rate limited
   */
  const isRateLimited = useCallback(() => {
    if (!enabled) return false

    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000

    // Clean old timestamps
    submissionTimestamps.current = submissionTimestamps.current.filter(
      timestamp => timestamp > oneMinuteAgo
    )

    return submissionTimestamps.current.length >= maxSubmissionsPerMinute
  }, [enabled, maxSubmissionsPerMinute])

  /**
   * Check if submission should be debounced
   */
  const shouldDebounce = useCallback(() => {
    if (!enabled || !state.lastSubmissionAt) return false

    const timeSinceLastSubmission = Date.now() - state.lastSubmissionAt
    return timeSinceLastSubmission < debounceMs
  }, [enabled, state.lastSubmissionAt, debounceMs])

  /**
   * Protected submission handler with debouncing and rate limiting
   */
  const handleSubmission = useCallback(
    async <T>(submissionFn: () => Promise<T>): Promise<T | null> => {
      // Clear any pending submissions
      clearPendingTimeout()

      // Check if submission protection is disabled
      if (!enabled) {
        return await submissionFn()
      }

      // Check if already submitting
      if (state.isSubmitting) {
        console.log(
          '[SubmissionProtection] Blocked duplicate submission - already in progress'
        )
        return null
      }

      // Check rate limiting
      if (isRateLimited()) {
        const error =
          'Too many submissions. Please wait a moment and try again.'
        setState(prev => ({ ...prev, error }))
        throw new Error(error)
      }

      // Check debouncing
      if (shouldDebounce()) {
        console.log(
          '[SubmissionProtection] Blocked rapid submission - debouncing'
        )
        return null
      }

      // Start submission
      setState(prev => ({
        ...prev,
        isSubmitting: true,
        error: null,
      }))

      try {
        // Record submission timestamp
        const now = Date.now()
        submissionTimestamps.current.push(now)

        // Execute the submission
        const result = await submissionFn()

        // Update state on success
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          lastSubmissionAt: now,
          submissionCount: prev.submissionCount + 1,
        }))

        return result
      } catch (error) {
        // Handle submission error
        const errorMessage =
          error instanceof Error ? error.message : 'Submission failed'
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          error: errorMessage,
        }))
        throw error
      }
    },
    [
      enabled,
      state.isSubmitting,
      isRateLimited,
      shouldDebounce,
      clearPendingTimeout,
    ]
  )

  /**
   * Debounced submission handler - queues submission after debounce delay
   */
  const handleDebouncedSubmission = useCallback(
    async <T>(submissionFn: () => Promise<T>): Promise<void> => {
      clearPendingTimeout()

      if (!enabled) {
        await submissionFn()
        return
      }

      // Check if already submitting
      if (state.isSubmitting) {
        console.log(
          '[SubmissionProtection] Blocked debounced submission - already in progress'
        )
        return
      }

      // Queue the submission after debounce delay
      timeoutRef.current = window.setTimeout(async () => {
        try {
          await handleSubmission(submissionFn)
        } catch (error) {
          console.error(
            '[SubmissionProtection] Debounced submission failed:',
            error
          )
        }
      }, debounceMs)
    },
    [
      enabled,
      state.isSubmitting,
      debounceMs,
      handleSubmission,
      clearPendingTimeout,
    ]
  )

  /**
   * Reset submission state (useful for cleanup or testing)
   */
  const reset = useCallback(() => {
    clearPendingTimeout()
    submissionTimestamps.current = []
    setState({
      isSubmitting: false,
      lastSubmissionAt: null,
      submissionCount: 0,
      error: null,
    })
  }, [clearPendingTimeout])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    isSubmitting: state.isSubmitting,
    error: state.error,
    submissionCount: state.submissionCount,
    lastSubmissionAt: state.lastSubmissionAt,

    // Handlers
    handleSubmission,
    handleDebouncedSubmission,

    // Utilities
    reset,
    clearError,
    isRateLimited: isRateLimited(),
    shouldDebounce: shouldDebounce(),
  }
}

/**
 * Simple hook for button click protection
 * Prevents rapid clicking and provides loading state
 */
export function useClickProtection(
  onClick: () => void | Promise<void>,
  debounceMs: number = 300
) {
  const [isClicking, setIsClicking] = useState(false)
  const lastClickTime = useRef<number>(0)

  const handleClick = useCallback(async () => {
    const now = Date.now()

    // Prevent rapid clicks
    if (isClicking) return

    // Debounce check
    if (now - lastClickTime.current < debounceMs) return

    lastClickTime.current = now
    setIsClicking(true)
    try {
      await onClick()
    } finally {
      setIsClicking(false)
    }
  }, [onClick, isClicking, debounceMs])

  return {
    handleClick,
    isClicking,
  }
}
