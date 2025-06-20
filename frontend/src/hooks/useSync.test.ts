import { renderHook, act, waitFor } from '@testing-library/react'

// Mock dependencies before imports
jest.mock('../contexts/AuthContext')
jest.mock('../modules/core/EventBus')
jest.mock('../services/sync')

import { useSync } from './useSync'
import { useAuth } from '../contexts/AuthContext'
import { eventBus } from '../modules/core/EventBus'
import * as syncService from '../services/sync'

// Event bus is already mocked above

describe('useSync', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    hasCloudStorage: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const mockSubscribe = jest.fn()
  const mockUnsubscribe = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAnonymous: false,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false,
      error: null,
    })
    ;(eventBus.subscribe as jest.Mock) = mockSubscribe
    ;(eventBus.unsubscribe as jest.Mock) = mockUnsubscribe
    ;(syncService.performInitialSync as jest.Mock).mockResolvedValue(undefined)
    ;(syncService.performIncrementalSync as jest.Mock).mockResolvedValue(
      undefined
    )
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Initial Sync', () => {
    it('should perform initial sync when user is authenticated', async () => {
      const { result } = renderHook(() => useSync())

      await waitFor(() => {
        expect(syncService.performInitialSync).toHaveBeenCalledWith(mockUser.id)
      })

      expect(result.current.isSyncing).toBe(false)
      expect(result.current.syncError).toBeNull()
      expect(result.current.lastSyncTimestamp).toBeDefined()
    })

    it('should not perform sync when user is anonymous', async () => {
      ;(useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAnonymous: true,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false,
        error: null,
      })

      renderHook(() => useSync())

      await waitFor(() => {
        expect(syncService.performInitialSync).not.toHaveBeenCalled()
      })
    })

    it('should handle initial sync errors', async () => {
      const syncError = new Error('Initial sync failed')
      ;(syncService.performInitialSync as jest.Mock).mockRejectedValue(
        syncError
      )

      const { result } = renderHook(() => useSync())

      await waitFor(() => {
        expect(result.current.syncError).toBe(syncError.message)
        expect(result.current.isSyncing).toBe(false)
      })
    })
  })

  describe('Event-Driven Sync', () => {
    it('should subscribe to data change events', () => {
      renderHook(() => useSync())

      expect(eventBus.subscribe).toHaveBeenCalledWith(
        'data:created',
        expect.any(Function)
      )
      expect(eventBus.subscribe).toHaveBeenCalledWith(
        'data:updated',
        expect.any(Function)
      )
      expect(eventBus.subscribe).toHaveBeenCalledWith(
        'data:deleted',
        expect.any(Function)
      )
    })

    it('should trigger incremental sync on data changes', async () => {
      renderHook(() => useSync())

      // Get the callback passed to subscribe for 'data:created'
      const dataCreatedCallback = mockSubscribe.mock.calls.find(
        call => call[0] === 'data:created'
      )?.[1]

      expect(dataCreatedCallback).toBeDefined()

      // Trigger the callback
      await act(async () => {
        await dataCreatedCallback({
          entityId: 'test-123',
          entityType: 'practice',
        })
      })

      await waitFor(() => {
        expect(syncService.performIncrementalSync).toHaveBeenCalledWith(
          mockUser.id
        )
      })
    })

    it('should debounce multiple sync requests', async () => {
      jest.useFakeTimers()

      renderHook(() => useSync())

      const dataCreatedCallback = mockSubscribe.mock.calls.find(
        call => call[0] === 'data:created'
      )?.[1]

      // Trigger multiple data changes rapidly
      await act(async () => {
        await dataCreatedCallback({ entityId: 'test-1' })
        await dataCreatedCallback({ entityId: 'test-2' })
        await dataCreatedCallback({ entityId: 'test-3' })
      })

      // Should not sync immediately
      expect(syncService.performIncrementalSync).not.toHaveBeenCalled()

      // Fast forward past debounce delay
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })

      // Should sync only once
      await waitFor(() => {
        expect(syncService.performIncrementalSync).toHaveBeenCalledTimes(1)
      })

      jest.useRealTimers()
    })
  })

  describe('Manual Sync', () => {
    it('should allow manual sync trigger', async () => {
      const { result } = renderHook(() => useSync())

      await act(async () => {
        await result.current.syncNow()
      })

      expect(syncService.performIncrementalSync).toHaveBeenCalledWith(
        mockUser.id
      )
      expect(result.current.lastSyncTimestamp).toBeDefined()
    })

    it('should prevent concurrent sync operations', async () => {
      const { result } = renderHook(() => useSync())

      // Make sync take time
      ;(syncService.performIncrementalSync as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      // Trigger multiple syncs
      act(() => {
        result.current.syncNow()
        result.current.syncNow()
        result.current.syncNow()
      })

      // Only one sync should be in progress
      expect(result.current.isSyncing).toBe(true)
      expect(syncService.performIncrementalSync).toHaveBeenCalledTimes(1)
    })

    it('should handle manual sync errors', async () => {
      const syncError = new Error('Manual sync failed')
      ;(syncService.performIncrementalSync as jest.Mock).mockRejectedValue(
        syncError
      )

      const { result } = renderHook(() => useSync())

      await act(async () => {
        await result.current.syncNow()
      })

      expect(result.current.syncError).toBe(syncError.message)
      expect(result.current.isSyncing).toBe(false)
    })
  })

  describe('Periodic Sync', () => {
    it('should set up periodic sync interval', async () => {
      jest.useFakeTimers()

      renderHook(() => useSync())

      // Fast forward 5 minutes
      await act(async () => {
        jest.advanceTimersByTime(5 * 60 * 1000)
      })

      await waitFor(() => {
        expect(syncService.performIncrementalSync).toHaveBeenCalledTimes(2) // Initial + periodic
      })

      jest.useRealTimers()
    })

    it('should clear interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      const { unmount } = renderHook(() => useSync())

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from events on unmount', () => {
      const { unmount } = renderHook(() => useSync())

      unmount()

      expect(eventBus.unsubscribe).toHaveBeenCalledWith(
        'data:created',
        expect.any(Function)
      )
      expect(eventBus.unsubscribe).toHaveBeenCalledWith(
        'data:updated',
        expect.any(Function)
      )
      expect(eventBus.unsubscribe).toHaveBeenCalledWith(
        'data:deleted',
        expect.any(Function)
      )
    })

    it('should not sync after unmount', async () => {
      const { unmount } = renderHook(() => useSync())

      unmount()

      // Clear previous calls
      ;(syncService.performIncrementalSync as jest.Mock).mockClear()

      // Try to trigger sync after unmount
      const dataCreatedCallback = mockSubscribe.mock.calls.find(
        call => call[0] === 'data:created'
      )?.[1]

      await act(async () => {
        await dataCreatedCallback?.({ entityId: 'test-after-unmount' })
      })

      expect(syncService.performIncrementalSync).not.toHaveBeenCalled()
    })
  })

  describe('Sync Status', () => {
    it('should track sync progress', async () => {
      let resolveSyncPromise: () => void
      const syncPromise = new Promise<void>(resolve => {
        resolveSyncPromise = resolve
      })

      ;(syncService.performIncrementalSync as jest.Mock).mockReturnValue(
        syncPromise
      )

      const { result } = renderHook(() => useSync())

      expect(result.current.isSyncing).toBe(false)

      act(() => {
        result.current.syncNow()
      })

      expect(result.current.isSyncing).toBe(true)

      await act(async () => {
        resolveSyncPromise!()
        await syncPromise
      })

      expect(result.current.isSyncing).toBe(false)
    })

    it('should update last sync timestamp on successful sync', async () => {
      const { result } = renderHook(() => useSync())

      const initialTimestamp = result.current.lastSyncTimestamp

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      await act(async () => {
        await result.current.syncNow()
      })

      expect(result.current.lastSyncTimestamp).toBeGreaterThan(
        initialTimestamp!
      )
    })
  })
})
