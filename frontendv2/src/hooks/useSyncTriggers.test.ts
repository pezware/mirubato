import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useSyncTriggers } from './useSyncTriggers'
import { useAuthStore } from '../stores/authStore'
import { useLogbookStore } from '../stores/logbookStore'
import { useRepertoireStore } from '../stores/repertoireStore'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/test' }),
}))

// Mock stores
vi.mock('../stores/authStore')
vi.mock('../stores/logbookStore')
vi.mock('../stores/repertoireStore')

describe.skip('useSyncTriggers', () => {
  const mockSyncWithServer = vi.fn()
  const mockSyncRepertoireData = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Setup default mock implementations
    ;(useAuthStore as unknown as any).mockImplementation((selector: any) => {
      const state = { isAuthenticated: true }
      return selector(state)
    })
    ;(useLogbookStore as unknown as any).mockImplementation((selector: any) => {
      const state = {
        syncWithServer: mockSyncWithServer,
        isLocalMode: false,
      }
      return selector(state)
    })
    ;(useRepertoireStore as unknown as any).mockImplementation(
      (selector: any) => {
        const state = {
          syncLocalData: mockSyncRepertoireData,
        }
        return selector(state)
      }
    )

    mockSyncWithServer.mockResolvedValue(undefined)
    mockSyncRepertoireData.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should not sync when not authenticated', () => {
    // Mock unauthenticated state
    ;(useAuthStore as unknown as any).mockImplementation((selector: any) => {
      const state = { isAuthenticated: false }
      return selector(state)
    })

    renderHook(() => useSyncTriggers())

    // Trigger visibility change
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockSyncWithServer).not.toHaveBeenCalled()
    expect(mockSyncRepertoireData).not.toHaveBeenCalled()
  })

  it('should not sync when in local mode', () => {
    // Mock local mode
    ;(useLogbookStore as unknown as any).mockImplementation((selector: any) => {
      const state = {
        syncWithServer: mockSyncWithServer,
        isLocalMode: true,
      }
      return selector(state)
    })

    renderHook(() => useSyncTriggers())

    // Trigger visibility change
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(mockSyncWithServer).not.toHaveBeenCalled()
    expect(mockSyncRepertoireData).not.toHaveBeenCalled()
  })

  it('should sync on visibility change when authenticated', async () => {
    const { result } = renderHook(() =>
      useSyncTriggers({
        enablePeriodic: false,
        enableRouteChange: false,
      })
    )

    // Clear any initial calls
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Trigger visibility change
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))

      // Wait for async sync to complete
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)
    expect(mockSyncRepertoireData).toHaveBeenCalledTimes(1)
  })

  it('should sync on window focus', async () => {
    const { result } = renderHook(() =>
      useSyncTriggers({
        enablePeriodic: false,
        enableRouteChange: false,
      })
    )

    // Clear any initial calls
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Trigger focus event
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)
    expect(mockSyncRepertoireData).toHaveBeenCalledTimes(1)
  })

  it('should sync periodically when enabled', async () => {
    renderHook(() =>
      useSyncTriggers({
        enablePeriodic: true,
        periodicInterval: 1000, // 1 second for testing
        enableVisibility: false,
        enableRouteChange: false,
      })
    )

    // Clear any initial calls
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Initial sync should not happen
    expect(mockSyncWithServer).not.toHaveBeenCalled()

    // Advance time by 1 second and run timers
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)
    expect(mockSyncRepertoireData).toHaveBeenCalledTimes(1)

    // Clear calls
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Advance time by another second
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)
    expect(mockSyncRepertoireData).toHaveBeenCalledTimes(1)
  })

  it('should sync when coming back online', async () => {
    const { result } = renderHook(() =>
      useSyncTriggers({
        enablePeriodic: false,
        enableRouteChange: false,
      })
    )

    // Clear any initial calls
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Trigger online event
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)
    expect(mockSyncRepertoireData).toHaveBeenCalledTimes(1)
  })

  it('should provide manual sync trigger', async () => {
    const { result } = renderHook(() =>
      useSyncTriggers({
        enablePeriodic: false,
        enableRouteChange: false,
      })
    )

    // Clear any initial calls
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Trigger manual sync
    await act(async () => {
      await result.current.triggerSync()
    })

    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)
    expect(mockSyncRepertoireData).toHaveBeenCalledTimes(1)
  })

  it('should handle sync errors gracefully', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockSyncWithServer.mockRejectedValue(new Error('Sync failed'))

    const { result } = renderHook(() =>
      useSyncTriggers({
        enablePeriodic: false,
        enableRouteChange: false,
      })
    )

    // Clear any initial calls
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Trigger sync
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      // Wait for the promise to resolve/reject
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Sync] focus sync failed:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  it('should debounce rapid sync attempts', async () => {
    const { result } = renderHook(() =>
      useSyncTriggers({
        enablePeriodic: false,
        enableRouteChange: false,
      })
    )

    // First sync should work
    await act(async () => {
      await result.current.triggerSync()
    })

    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)

    // Clear mocks
    mockSyncWithServer.mockClear()
    mockSyncRepertoireData.mockClear()

    // Immediate second sync should be debounced
    await act(async () => {
      await result.current.triggerSync()
    })

    // Should NOT sync due to debouncing
    expect(mockSyncWithServer).not.toHaveBeenCalled()

    // Advance time past debounce period
    await act(async () => {
      vi.advanceTimersByTime(6000)
      await result.current.triggerSync()
    })

    // Now it should sync
    expect(mockSyncWithServer).toHaveBeenCalledTimes(1)
  })
})
