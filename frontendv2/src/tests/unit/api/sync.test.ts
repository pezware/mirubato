import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type {
  SyncData,
  SyncChanges,
  SyncResult,
  BatchSyncResult,
  SyncStatus,
} from '../../../api/sync'
import type { LogbookEntry, Goal } from '../../../api/logbook'

// Mock the API client module
vi.mock('../../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

// Import after mocking
import { syncApi } from '../../../api/sync'
import { apiClient } from '../../../api/client'

describe('Sync API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('pull', () => {
    it('should pull sync data from the cloud', async () => {
      const mockSyncData: SyncData = {
        entries: [
          {
            id: 'entry1',
            timestamp: '2025-06-26T10:00:00Z',
            duration: 30,
            type: 'PRACTICE',
            instrument: 'PIANO',
            pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
            techniques: ['scales'],
            goalIds: ['goal1'],
            mood: null,
            tags: ['morning'],
            createdAt: '2025-06-26T10:00:00Z',
            updatedAt: '2025-06-26T10:00:00Z',
          },
        ],
        goals: [
          {
            id: 'goal1',
            title: 'Master Moonlight Sonata',
            progress: 30,
            milestones: [],
            status: 'ACTIVE',
            linkedEntries: ['entry1'],
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-06-26T10:00:00Z',
          },
        ],
        syncToken: 'sync-token-123',
        timestamp: '2025-06-26T10:00:00Z',
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockSyncData,
      })

      const result = await syncApi.pull()

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/pull')
      expect(result).toEqual(mockSyncData)
    })

    it('should handle API errors during pull', async () => {
      const error = new Error('Network error')
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(syncApi.pull()).rejects.toThrow('Network error')
    })
  })

  describe('push', () => {
    it('should push local changes to the cloud', async () => {
      const mockChanges: SyncChanges = {
        changes: {
          entries: [
            {
              id: 'entry2',
              timestamp: '2025-06-26T11:00:00Z',
              duration: 45,
              type: 'PRACTICE',
              instrument: 'GUITAR',
              pieces: [
                { title: 'Stairway to Heaven', composer: 'Led Zeppelin' },
              ],
              techniques: ['fingerpicking'],
              goalIds: [],
              tags: ['evening'],
              createdAt: '2025-06-26T11:00:00Z',
              updatedAt: '2025-06-26T11:00:00Z',
            },
          ],
          goals: [],
        },
        lastSyncToken: 'sync-token-123',
      }

      const mockResult: SyncResult = {
        success: true,
        syncToken: 'sync-token-124',
        conflicts: [],
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResult,
      })

      const result = await syncApi.push(mockChanges)

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/push', mockChanges)
      expect(result).toEqual(mockResult)
    })

    it('should handle conflicts during push', async () => {
      const mockChanges: SyncChanges = {
        changes: {
          entries: [
            {
              id: 'entry1',
              timestamp: '2025-06-26T11:00:00Z',
              duration: 60,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: [],
              techniques: [],
              goalIds: [],
              tags: [],
              createdAt: '2025-06-26T09:00:00Z',
              updatedAt: '2025-06-26T11:00:00Z',
            },
          ],
          goals: [],
        },
      }

      const mockResult: SyncResult = {
        success: false,
        syncToken: 'sync-token-124',
        conflicts: [
          {
            entityId: 'entry1',
            localVersion: 2,
            remoteVersion: 3,
          },
        ],
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResult,
      })

      const result = await syncApi.push(mockChanges)

      expect(result.success).toBe(false)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].entityId).toBe('entry1')
    })

    it('should handle API errors during push', async () => {
      const mockChanges: SyncChanges = {
        changes: { entries: [], goals: [] },
      }

      const error = new Error('Server error')
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(syncApi.push(mockChanges)).rejects.toThrow('Server error')
    })
  })

  describe('batch', () => {
    it('should perform batch sync operation', async () => {
      const entities = [
        {
          id: 'entry1',
          type: 'logbook_entry' as const,
          data: {
            id: 'entry1',
            timestamp: '2025-06-26T10:00:00Z',
            duration: 30,
            type: 'PRACTICE' as const,
            instrument: 'PIANO' as const,
            pieces: [],
            techniques: [],
            goalIds: [],
            tags: [],
            createdAt: '2025-06-26T10:00:00Z',
            updatedAt: '2025-06-26T10:00:00Z',
          } as LogbookEntry,
          checksum: 'checksum123',
          version: 1,
        },
        {
          id: 'goal1',
          type: 'goal' as const,
          data: {
            id: 'goal1',
            title: 'Learn Jazz',
            progress: 10,
            milestones: [],
            status: 'ACTIVE' as const,
            linkedEntries: [],
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-06-26T10:00:00Z',
          } as Goal,
          checksum: 'checksum456',
          version: 2,
        },
      ]

      const mockResult: BatchSyncResult = {
        uploaded: 2,
        downloaded: 1,
        conflicts: [],
        newSyncToken: 'sync-token-125',
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResult,
      })

      const result = await syncApi.batch(entities, 'sync-token-124')

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/batch', {
        entities,
        syncToken: 'sync-token-124',
      })
      expect(result).toEqual(mockResult)
    })

    it('should handle batch sync without sync token', async () => {
      const entities = [
        {
          id: 'entry1',
          type: 'logbook_entry' as const,
          data: {} as LogbookEntry,
          checksum: 'checksum123',
          version: 1,
        },
      ]

      const mockResult: BatchSyncResult = {
        uploaded: 1,
        downloaded: 0,
        conflicts: [],
        newSyncToken: 'sync-token-001',
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResult,
      })

      const result = await syncApi.batch(entities)

      expect(apiClient.post).toHaveBeenCalledWith('/api/sync/batch', {
        entities,
        syncToken: undefined,
      })
      expect(result.newSyncToken).toBe('sync-token-001')
    })

    it('should handle conflicts in batch sync', async () => {
      const entities = [
        {
          id: 'entry1',
          type: 'logbook_entry' as const,
          data: {} as LogbookEntry,
          checksum: 'checksum123',
          version: 2,
        },
      ]

      const mockResult: BatchSyncResult = {
        uploaded: 0,
        downloaded: 0,
        conflicts: [
          {
            entityId: 'entry1',
            localVersion: 2,
            remoteVersion: 4,
          },
        ],
        newSyncToken: 'sync-token-126',
      }

      ;(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResult,
      })

      const result = await syncApi.batch(entities, 'sync-token-125')

      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].entityId).toBe('entry1')
      expect(result.uploaded).toBe(0)
    })
  })

  describe('getStatus', () => {
    it('should fetch sync status', async () => {
      const mockStatus: SyncStatus = {
        lastSyncTime: '2025-06-26T09:00:00Z',
        syncToken: 'sync-token-123',
        pendingChanges: 5,
        deviceCount: 3,
        entityCount: 150,
      }

      ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockStatus,
      })

      const result = await syncApi.getStatus()

      expect(apiClient.get).toHaveBeenCalledWith('/api/sync/status')
      expect(result).toEqual(mockStatus)
    })

    it('should handle null sync time for new users', async () => {
      const mockStatus: SyncStatus = {
        lastSyncTime: null,
        syncToken: null,
        pendingChanges: 0,
        deviceCount: 1,
        entityCount: 0,
      }

      ;(apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockStatus,
      })

      const result = await syncApi.getStatus()

      expect(result.lastSyncTime).toBeNull()
      expect(result.syncToken).toBeNull()
      expect(result.entityCount).toBe(0)
    })

    it('should handle API errors when fetching status', async () => {
      const error = new Error('Unauthorized')
      ;(apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      await expect(syncApi.getStatus()).rejects.toThrow('Unauthorized')
    })
  })

  describe('Local-first architecture alignment', () => {
    it('should support offline-first workflow with pull', async () => {
      // Simulate offline scenario where pull fails
      const error = new Error('Network error')
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      // Pull should fail gracefully, allowing app to continue with local data
      await expect(syncApi.pull()).rejects.toThrow('Network error')

      // The app would continue using local storage data
      // This is handled by the logbookStore, not the API layer
    })

    it('should queue changes for later sync when push fails', async () => {
      const mockChanges: SyncChanges = {
        changes: {
          entries: [
            {
              id: 'offline-entry',
              timestamp: '2025-06-26T12:00:00Z',
              duration: 30,
              type: 'PRACTICE',
              instrument: 'PIANO',
              pieces: [],
              techniques: [],
              goalIds: [],
              tags: ['offline'],
              createdAt: '2025-06-26T12:00:00Z',
              updatedAt: '2025-06-26T12:00:00Z',
            },
          ],
          goals: [],
        },
      }

      const error = new Error('Network unavailable')
      ;(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      // Push should fail, but the data remains in local storage
      await expect(syncApi.push(mockChanges)).rejects.toThrow(
        'Network unavailable'
      )

      // The logbookStore would keep this data locally and retry later
    })
  })
})
