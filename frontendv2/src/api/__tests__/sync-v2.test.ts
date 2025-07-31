/**
 * Tests for the new delta-based sync API client
 */

import { SyncV2API } from '../sync-v2'
import { changeQueue } from '../../utils/changeQueue'
import { apiClient } from '../client'

// Mock dependencies
jest.mock('../client')
jest.mock('../../utils/changeQueue')
jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: true }),
  },
}))

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>
const mockChangeQueue = changeQueue as jest.Mocked<typeof changeQueue>

describe('SyncV2API', () => {
  let syncApi: SyncV2API

  beforeEach(() => {
    jest.clearAllMocks()
    syncApi = new SyncV2API()
  })

  describe('sync', () => {
    it('should perform successful sync with no changes', async () => {
      // Mock empty change queue
      mockChangeQueue.getSyncMetadata.mockResolvedValue({
        lastKnownServerVersion: 5,
        lastSyncTime: Date.now() - 60000,
        deviceId: 'test-device',
      })

      mockChangeQueue.getAllPendingChanges.mockResolvedValue([])

      // Mock successful API response
      mockApiClient.post.mockResolvedValue({
        data: {
          newChanges: [],
          latestServerVersion: 5,
          conflicts: [],
        },
      })

      const result = await syncApi.sync()

      expect(result.success).toBe(true)
      expect(result.changesPushed).toBe(0)
      expect(result.changesApplied).toBe(0)
      expect(result.conflicts).toBe(0)
    })

    it('should handle pending changes and server updates', async () => {
      const pendingChanges = [
        {
          changeId: 'change1',
          type: 'CREATED' as const,
          entityType: 'logbook_entry' as const,
          entityId: 'entry1',
          data: { title: 'New Entry' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]

      const serverChanges = [
        {
          changeId: 'server-change1',
          type: 'CREATED' as const,
          entityType: 'goal' as const,
          entityId: 'goal1',
          data: { title: 'Server Goal' },
        },
      ]

      mockChangeQueue.getSyncMetadata.mockResolvedValue({
        lastKnownServerVersion: 5,
        lastSyncTime: Date.now() - 60000,
        deviceId: 'test-device',
      })

      mockChangeQueue.getAllPendingChanges.mockResolvedValue(pendingChanges)

      mockApiClient.post.mockResolvedValue({
        data: {
          newChanges: serverChanges,
          latestServerVersion: 7,
          conflicts: [],
        },
      })

      mockChangeQueue.removeChanges.mockResolvedValue()
      mockChangeQueue.setSyncMetadata.mockResolvedValue()

      const result = await syncApi.sync()

      expect(result.success).toBe(true)
      expect(result.changesPushed).toBe(1)
      expect(result.changesApplied).toBe(1)
      expect(result.conflicts).toBe(0)

      // Verify API was called correctly
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/sync/v2',
        {
          lastKnownServerVersion: 5,
          changes: pendingChanges,
        },
        {
          headers: {
            'X-Device-ID': expect.any(String),
          },
        }
      )

      // Verify successful changes were removed
      expect(mockChangeQueue.removeChanges).toHaveBeenCalledWith(['change1'])

      // Verify metadata was updated
      expect(mockChangeQueue.setSyncMetadata).toHaveBeenCalledWith({
        lastKnownServerVersion: 7,
        lastSyncTime: expect.any(Number),
        deviceId: expect.any(String),
      })
    })

    it('should handle conflicts gracefully', async () => {
      const pendingChanges = [
        {
          changeId: 'change1',
          type: 'UPDATED' as const,
          entityType: 'logbook_entry' as const,
          entityId: 'entry1',
          data: { title: 'Updated Entry' },
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          changeId: 'change2',
          type: 'CREATED' as const,
          entityType: 'goal' as const,
          entityId: 'goal1',
          data: { title: 'New Goal' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]

      const conflicts = [
        {
          changeId: 'change1',
          reason: 'Entry was modified by another device',
        },
      ]

      mockChangeQueue.getSyncMetadata.mockResolvedValue({
        lastKnownServerVersion: 5,
        lastSyncTime: Date.now() - 60000,
        deviceId: 'test-device',
      })

      mockChangeQueue.getAllPendingChanges.mockResolvedValue(pendingChanges)

      mockApiClient.post.mockResolvedValue({
        data: {
          newChanges: [],
          latestServerVersion: 6,
          conflicts,
        },
      })

      mockChangeQueue.removeChanges.mockResolvedValue()
      mockChangeQueue.incrementRetryCount.mockResolvedValue()
      mockChangeQueue.setSyncMetadata.mockResolvedValue()

      const result = await syncApi.sync()

      expect(result.success).toBe(true)
      expect(result.changesPushed).toBe(1) // Only change2 succeeded
      expect(result.conflicts).toBe(1)

      // Verify only successful changes were removed
      expect(mockChangeQueue.removeChanges).toHaveBeenCalledWith(['change2'])

      // Verify retry count was incremented for conflicted change
      expect(mockChangeQueue.incrementRetryCount).toHaveBeenCalledWith(
        'change1'
      )
    })

    it('should skip changes that have failed too many times', async () => {
      const pendingChanges = [
        {
          changeId: 'good-change',
          type: 'CREATED' as const,
          entityType: 'logbook_entry' as const,
          entityId: 'entry1',
          data: { title: 'Good Entry' },
          timestamp: Date.now(),
          retryCount: 2,
        },
        {
          changeId: 'failed-change',
          type: 'CREATED' as const,
          entityType: 'logbook_entry' as const,
          entityId: 'entry2',
          data: { title: 'Failed Entry' },
          timestamp: Date.now(),
          retryCount: 5, // Exceeds MAX_RETRIES
        },
      ]

      mockChangeQueue.getSyncMetadata.mockResolvedValue({
        lastKnownServerVersion: 5,
        lastSyncTime: Date.now() - 60000,
        deviceId: 'test-device',
      })

      mockChangeQueue.getAllPendingChanges.mockResolvedValue(pendingChanges)

      mockApiClient.post.mockResolvedValue({
        data: {
          newChanges: [],
          latestServerVersion: 6,
          conflicts: [],
        },
      })

      await syncApi.sync()

      // Verify only the viable change was sent to server
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/sync/v2',
        {
          lastKnownServerVersion: 5,
          changes: [pendingChanges[0]], // Only the first change
        },
        expect.any(Object)
      )
    })

    it('should handle network errors gracefully', async () => {
      mockChangeQueue.getSyncMetadata.mockResolvedValue({
        lastKnownServerVersion: 5,
        lastSyncTime: Date.now() - 60000,
        deviceId: 'test-device',
      })

      mockChangeQueue.getAllPendingChanges.mockResolvedValue([])

      // Mock network error
      mockApiClient.post.mockRejectedValue(new Error('Network error'))

      const result = await syncApi.sync()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.changesPushed).toBe(0)
      expect(result.changesApplied).toBe(0)
    })

    it('should prevent concurrent syncs', async () => {
      mockChangeQueue.getSyncMetadata.mockResolvedValue({
        lastKnownServerVersion: 5,
        lastSyncTime: Date.now() - 60000,
        deviceId: 'test-device',
      })

      mockChangeQueue.getAllPendingChanges.mockResolvedValue([])

      // Mock slow API response
      let resolveApiCall: (value: unknown) => void
      const apiPromise = new Promise(resolve => {
        resolveApiCall = resolve
      })
      mockApiClient.post.mockReturnValue(apiPromise as Promise<unknown>)

      // Start first sync
      const firstSync = syncApi.sync()

      // Try to start second sync while first is in progress
      const secondSync = syncApi.sync()

      // Second sync should return immediately
      const secondResult = await secondSync
      expect(secondResult.success).toBe(false)
      expect(secondResult.error).toBe('Sync already in progress')

      // Complete first sync
      resolveApiCall!({
        data: {
          newChanges: [],
          latestServerVersion: 5,
          conflicts: [],
        },
      })

      const firstResult = await firstSync
      expect(firstResult.success).toBe(true)
    })
  })

  describe('queueChange', () => {
    it('should add change to queue and trigger background sync', async () => {
      const changeData = {
        type: 'CREATED' as const,
        entityType: 'logbook_entry' as const,
        entityId: 'entry1',
        data: { title: 'New Entry' },
      }

      mockChangeQueue.addChange.mockResolvedValue('change-id')

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })

      const changeId = await syncApi.queueChange(changeData)

      expect(changeId).toBe('change-id')
      expect(mockChangeQueue.addChange).toHaveBeenCalledWith(changeData)
    })

    it('should not trigger background sync when offline', async () => {
      const changeData = {
        type: 'CREATED' as const,
        entityType: 'logbook_entry' as const,
        entityId: 'entry1',
        data: { title: 'New Entry' },
      }

      mockChangeQueue.addChange.mockResolvedValue('change-id')

      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      const changeId = await syncApi.queueChange(changeData)

      expect(changeId).toBe('change-id')
      expect(mockChangeQueue.addChange).toHaveBeenCalledWith(changeData)
      // Background sync should not be triggered
    })
  })

  describe('getLocalStats', () => {
    it('should return combined local statistics', async () => {
      mockChangeQueue.getStats.mockResolvedValue({
        totalChanges: 5,
        changesByType: {
          CREATED_logbook_entry: 3,
          UPDATED_goal: 2,
        },
        oldestChange: 1000,
        failedChanges: 1,
      })

      mockChangeQueue.getSyncMetadata.mockResolvedValue({
        lastKnownServerVersion: 10,
        lastSyncTime: 5000,
        deviceId: 'test-device',
      })

      const stats = await syncApi.getLocalStats()

      expect(stats.pendingChanges).toBe(5)
      expect(stats.failedChanges).toBe(1)
      expect(stats.lastSyncTime).toBe(5000)
      expect(stats.oldestChange).toBe(1000)
    })

    it('should handle missing metadata gracefully', async () => {
      mockChangeQueue.getStats.mockResolvedValue({
        totalChanges: 0,
        changesByType: {},
        oldestChange: null,
        failedChanges: 0,
      })

      mockChangeQueue.getSyncMetadata.mockResolvedValue(null)

      const stats = await syncApi.getLocalStats()

      expect(stats.lastSyncTime).toBe(null)
    })
  })
})
