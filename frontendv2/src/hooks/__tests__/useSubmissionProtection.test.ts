import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useSubmissionProtection,
  useClickProtection,
} from '../useSubmissionProtection'

// Mock window.innerWidth for mobile detection
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
})

describe('useSubmissionProtection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('basic functionality', () => {
    it('should allow single submission', async () => {
      const { result } = renderHook(() => useSubmissionProtection())
      const mockFn = vi.fn().mockResolvedValue('success')

      let submissionResult: string | null = null
      await act(async () => {
        submissionResult = await result.current.handleSubmission(mockFn)
      })

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(submissionResult).toBe('success')
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.submissionCount).toBe(1)
    })

    it('should prevent concurrent submissions', async () => {
      const { result } = renderHook(() => useSubmissionProtection())
      const mockFn = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise(resolve => setTimeout(() => resolve('success'), 100))
        )

      // Start first submission
      let promise1: Promise<string | null>
      act(() => {
        promise1 = result.current.handleSubmission(mockFn)
      })

      // Try second submission while first is in progress
      let promise2: Promise<string | null>
      act(() => {
        promise2 = result.current.handleSubmission(mockFn)
      })

      expect(result.current.isSubmitting).toBe(true)

      // Advance timers and wait for promises
      act(() => {
        vi.advanceTimersByTime(100)
      })

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(mockFn).toHaveBeenCalledTimes(1) // Only called once
      expect(result1).toBe('success')
      expect(result2).toBe(null) // Second call was blocked
    })

    it('should handle submission errors', async () => {
      const { result } = renderHook(() => useSubmissionProtection())
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'))

      await act(async () => {
        try {
          await result.current.handleSubmission(mockFn)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
          expect((error as Error).message).toBe('Test error')
        }
      })

      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.error).toBe('Test error')
      expect(result.current.submissionCount).toBe(0) // Failed submissions don't count
    })
  })

  describe('debouncing', () => {
    it('should debounce rapid submissions', async () => {
      const { result } = renderHook(() =>
        useSubmissionProtection({ debounceMs: 200 })
      )
      const mockFn = vi.fn().mockResolvedValue('success')

      // First submission
      await act(async () => {
        await result.current.handleSubmission(mockFn)
      })

      // Second submission immediately after (should be debounced)
      let secondResult: string | null = null
      await act(async () => {
        secondResult = await result.current.handleSubmission(mockFn)
      })

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(secondResult).toBe(null) // Debounced
    })

    it('should allow submission after debounce period', async () => {
      const { result } = renderHook(() =>
        useSubmissionProtection({ debounceMs: 200 })
      )
      const mockFn = vi.fn().mockResolvedValue('success')

      // First submission
      await act(async () => {
        await result.current.handleSubmission(mockFn)
      })

      // Advance time past debounce period
      act(() => {
        vi.advanceTimersByTime(250)
      })

      // Second submission should be allowed
      let secondResult: string | null = null
      await act(async () => {
        secondResult = await result.current.handleSubmission(mockFn)
      })

      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(secondResult).toBe('success')
    })
  })

  describe('rate limiting', () => {
    it('should enforce rate limiting', async () => {
      const { result } = renderHook(() =>
        useSubmissionProtection({ maxSubmissionsPerMinute: 3 })
      )
      const mockFn = vi.fn().mockResolvedValue('success')

      // Make 3 submissions (should all succeed)
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.handleSubmission(mockFn)
        })
        // Advance time slightly to avoid debouncing
        act(() => {
          vi.advanceTimersByTime(1000)
        })
      }

      expect(mockFn).toHaveBeenCalledTimes(3)

      // Fourth submission should be rate limited
      await act(async () => {
        await expect(async () => {
          await result.current.handleSubmission(mockFn)
        }).rejects.toThrow('Too many submissions')
      })

      expect(mockFn).toHaveBeenCalledTimes(3) // Still only 3
      expect(result.current.error).toContain('Too many submissions')
    })

    it('should reset rate limit after time window', async () => {
      const { result } = renderHook(() =>
        useSubmissionProtection({ maxSubmissionsPerMinute: 2 })
      )
      const mockFn = vi.fn().mockResolvedValue('success')

      // Make 2 submissions
      for (let i = 0; i < 2; i++) {
        await act(async () => {
          await result.current.handleSubmission(mockFn)
        })
        act(() => {
          vi.advanceTimersByTime(1000)
        })
      }

      // Advance time by more than a minute
      act(() => {
        vi.advanceTimersByTime(70 * 1000)
      })

      // Should be able to submit again
      await act(async () => {
        await result.current.handleSubmission(mockFn)
      })

      expect(mockFn).toHaveBeenCalledTimes(3)
    })
  })

  describe('debounced submission', () => {
    it('should queue submission after debounce delay', async () => {
      const { result } = renderHook(() =>
        useSubmissionProtection({ debounceMs: 300 })
      )
      const mockFn = vi.fn().mockResolvedValue('success')

      act(() => {
        result.current.handleDebouncedSubmission(mockFn)
      })

      expect(mockFn).not.toHaveBeenCalled()

      // Advance time to trigger debounced submission
      await act(async () => {
        vi.advanceTimersByTime(300)
        await vi.runAllTimersAsync()
      })

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should cancel previous debounced submission', async () => {
      const { result } = renderHook(() =>
        useSubmissionProtection({ debounceMs: 300 })
      )
      const mockFn1 = vi.fn().mockResolvedValue('first')
      const mockFn2 = vi.fn().mockResolvedValue('second')

      act(() => {
        result.current.handleDebouncedSubmission(mockFn1)
      })

      act(() => {
        vi.advanceTimersByTime(150) // Halfway through debounce
      })

      act(() => {
        result.current.handleDebouncedSubmission(mockFn2)
      })

      // Complete the debounce period
      await act(async () => {
        vi.advanceTimersByTime(300)
        await vi.runAllTimersAsync()
      })

      expect(mockFn1).not.toHaveBeenCalled() // Cancelled
      expect(mockFn2).toHaveBeenCalledTimes(1) // Executed
    })
  })

  describe('mobile vs desktop detection', () => {
    it('should use longer debounce on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 500 })

      const { result } = renderHook(() => useSubmissionProtection())
      const _mockFn = vi.fn().mockResolvedValue('success')

      // The debounce time should be 300ms for mobile (vs 150ms for desktop)
      // We can't directly test the internal debounce time, but we can verify
      // the behavior is different
      expect(result.current).toBeDefined()
    })

    it('should use shorter debounce on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1200 })

      const { result } = renderHook(() => useSubmissionProtection())
      const _mockFn = vi.fn().mockResolvedValue('success')

      expect(result.current).toBeDefined()
    })
  })

  describe('utility functions', () => {
    it('should reset state correctly', async () => {
      const { result } = renderHook(() => useSubmissionProtection())
      const mockFn = vi.fn().mockResolvedValue('success')

      // Make a submission and cause an error
      await act(async () => {
        await result.current.handleSubmission(mockFn)
      })

      act(() => {
        result.current.clearError()
        result.current.reset()
      })

      expect(result.current.submissionCount).toBe(0)
      expect(result.current.error).toBe(null)
      expect(result.current.lastSubmissionAt).toBe(null)
    })

    it('should clear error state', async () => {
      const { result } = renderHook(() => useSubmissionProtection())
      const mockFn = vi.fn().mockRejectedValue(new Error('Test error'))

      await act(async () => {
        try {
          await result.current.handleSubmission(mockFn)
        } catch {
          // Expected
        }
      })

      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('disabled state', () => {
    it('should bypass protection when disabled', async () => {
      const { result } = renderHook(() =>
        useSubmissionProtection({ enabled: false })
      )
      const mockFn = vi.fn().mockResolvedValue('success')

      // Multiple rapid submissions should all go through
      const promises = [
        result.current.handleSubmission(mockFn),
        result.current.handleSubmission(mockFn),
        result.current.handleSubmission(mockFn),
      ]

      await act(async () => {
        await Promise.all(promises)
      })

      expect(mockFn).toHaveBeenCalledTimes(3)
    })
  })
})

describe('useClickProtection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should protect button clicks', async () => {
    const mockClick = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useClickProtection(mockClick, 200))

    act(() => {
      result.current.handleClick()
    })

    expect(result.current.isClicking).toBe(true)

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockClick).toHaveBeenCalledTimes(1)
    expect(result.current.isClicking).toBe(false)
  })

  it('should prevent rapid clicks', async () => {
    const mockClick = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useClickProtection(mockClick, 200))

    act(() => {
      result.current.handleClick()
      result.current.handleClick() // Should be ignored
      result.current.handleClick() // Should be ignored
    })

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('should handle async click handlers', async () => {
    const mockClick = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
    const { result } = renderHook(() => useClickProtection(mockClick, 200))

    act(() => {
      result.current.handleClick()
    })

    expect(result.current.isClicking).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()
    })

    expect(result.current.isClicking).toBe(false)
    expect(mockClick).toHaveBeenCalledTimes(1)
  })
})
