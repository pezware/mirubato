import { useState, useCallback, useRef } from 'react'
import { createRequestSignature } from '../utils/contentSignature'

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

interface ContentCache {
  signature: string
  timestamp: number
  data: unknown
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
  const contentCache = useRef<Map<string, ContentCache>>(new Map())
  const recentSignatures = useRef<Map<string, number>>(new Map()) // signature -> timestamp

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
   * Check for content-based duplicates
   */
  const checkContentDuplicate = useCallback(
    async (data: unknown): Promise<boolean> => {
      if (!enabled) return false

      try {
        // Create content signature
        const signature = await createRequestSignature(data)
        const now = Date.now()

        // Clean old signatures (older than 5 minutes)
        const fiveMinutesAgo = now - 5 * 60 * 1000
        for (const [sig, timestamp] of recentSignatures.current.entries()) {
          if (timestamp < fiveMinutesAgo) {
            recentSignatures.current.delete(sig)
          }
        }

        // Check if we've seen this content recently
        const lastSeenTimestamp = recentSignatures.current.get(signature)
        if (lastSeenTimestamp) {
          const timeSinceLastSeen = now - lastSeenTimestamp
          // Consider duplicate if submitted within last 30 seconds
          if (timeSinceLastSeen < 30000) {
            console.log(
              '[SubmissionProtection] Blocked content duplicate - identical content submitted recently'
            )
            return true
          }
        }

        // Record this signature
        recentSignatures.current.set(signature, now)
        return false
      } catch (error) {
        console.error(
          '[SubmissionProtection] Error checking content duplicate:',
          error
        )
        return false // Don't block on error
      }
    },
    [enabled]
  )

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

      // Note: Content duplicate check will be done in handleSubmissionWithContent

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
   * Protected submission handler with content-based duplicate detection
   */
  const handleSubmissionWithContent = useCallback(
    async <T>(
      content: unknown,
      submissionFn: () => Promise<T>
    ): Promise<T | null> => {
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

      // Check content-based duplicates
      if (await checkContentDuplicate(content)) {
        const error =
          'Duplicate content detected. Please wait before submitting the same data again.'
        setState(prev => ({ ...prev, error }))
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
      checkContentDuplicate,
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
    contentCache.current.clear()
    recentSignatures.current.clear()
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
    handleSubmissionWithContent,
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

  const reset = useCallback(() => {
    setIsClicking(false)
    lastClickTime.current = 0
  }, [])

  return {
    handleClick,
    isClicking,
    reset,
  }
}
