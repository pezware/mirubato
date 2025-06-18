import { SyncOrchestrator } from './SyncOrchestrator'
import { LocalSyncService } from './LocalSyncService'
import { RemoteSyncService } from './RemoteSyncService'
import { ConflictResolver } from './ConflictResolver'
import { SyncQueue } from './SyncQueue'
import { DuplicateDetector } from '../DuplicateDetector'
import { EventBus } from '../../../modules/core/EventBus'
import { SyncableEntity, SyncOperation } from '../types'

// Mock all dependencies
jest.mock('./LocalSyncService')
jest.mock('./RemoteSyncService')
jest.mock('./ConflictResolver')
jest.mock('./SyncQueue')
jest.mock('../DuplicateDetector')
jest.mock('../../../modules/core/EventBus')

describe('SyncOrchestrator', () => {
  let orchestrator: SyncOrchestrator
  let mockLocalSync: jest.Mocked<LocalSyncService>
  let mockRemoteSync: jest.Mocked<RemoteSyncService>
  let mockConflictResolver: jest.Mocked<ConflictResolver>
  let mockSyncQueue: jest.Mocked<SyncQueue>
  let mockDuplicateDetector: jest.Mocked<DuplicateDetector>
  let mockEventBus: jest.Mocked<EventBus>

  beforeEach(() => {
    // Create mock instances
    mockLocalSync = new LocalSyncService() as jest.Mocked<LocalSyncService>
    mockRemoteSync = new RemoteSyncService({
      graphqlEndpoint: 'http://test.com/graphql',
    }) as jest.Mocked<RemoteSyncService>
    mockConflictResolver =
      new ConflictResolver() as jest.Mocked<ConflictResolver>
    mockSyncQueue = new SyncQueue() as jest.Mocked<SyncQueue>
    mockDuplicateDetector =
      new DuplicateDetector() as jest.Mocked<DuplicateDetector>

    // Create a properly mocked EventBus
    mockEventBus = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      publish: jest.fn(),
      getInstance: jest.fn(),
    } as unknown as jest.Mocked<EventBus>

    // Create orchestrator with mocked dependencies
    orchestrator = new SyncOrchestrator(
      mockLocalSync,
      mockRemoteSync,
      mockConflictResolver,
      mockSyncQueue,
      mockDuplicateDetector,
      mockEventBus
    )

    // Reset all mocks
    jest.clearAllMocks()
  })

  afterEach(() => {
    orchestrator.dispose()
  })

  describe('initializeSync', () => {
    it('should handle fresh sync for new user', async () => {
      const userId = 'user-123'

      // Mock no existing metadata
      mockLocalSync.getSyncMetadata.mockResolvedValue(null)
      mockRemoteSync.fetchSyncMetadata.mockResolvedValue(null)

      const result = await orchestrator.initializeSync(userId)

      expect(result).toEqual({
        status: 'success',
        message: 'Fresh sync initialized',
      })

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'sync',
          type: 'sync:initialized',
          data: expect.objectContaining({ userId }),
        })
      )
    })

    it('should upload local data when only local exists', async () => {
      const userId = 'user-123'
      const localEntities: SyncableEntity[] = [
        {
          id: 'session-1',
          localId: 'session-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'pending' as const,
          syncVersion: 1,
          checksum: 'abc123',
          entityType: 'practiceSession' as const,
          data: { test: 'data' },
        },
      ]

      // Mock local data but no remote
      mockLocalSync.getSyncMetadata.mockResolvedValue({
        lastSyncTimestamp: Date.now(),
        syncToken: null,
        pendingSyncCount: 1,
        lastSyncStatus: 'success',
      })
      mockRemoteSync.fetchSyncMetadata.mockResolvedValue(null)
      mockLocalSync.getUnsyncedEntries.mockResolvedValue(localEntities)
      mockRemoteSync.uploadBatch.mockResolvedValue({
        uploaded: 1,
        failed: 0,
        newSyncToken: 'token-123',
        errors: [],
      })

      const result = await orchestrator.initializeSync(userId)

      expect(result).toEqual({
        status: 'success',
        uploaded: 1,
        downloaded: 0,
      })

      expect(mockRemoteSync.uploadBatch).toHaveBeenCalledWith({
        entities: localEntities,
        userId,
        syncToken: null,
      })

      expect(mockLocalSync.markAsSynced).toHaveBeenCalledWith(['session-1'])
    })

    it('should download remote data when only remote exists', async () => {
      const userId = 'user-123'
      const remoteEntities: SyncableEntity[] = [
        {
          id: 'session-1',
          localId: 'session-1',
          remoteId: 'session-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'synced' as const,
          syncVersion: 1,
          checksum: 'def456',
          entityType: 'practiceSession' as const,
          data: { test: 'remote-data' },
        },
      ]

      // Mock no local but remote exists
      mockLocalSync.getSyncMetadata.mockResolvedValue(null)
      mockRemoteSync.fetchSyncMetadata.mockResolvedValue({
        lastSyncTimestamp: Date.now(),
        syncToken: 'remote-token',
        pendingSyncCount: 0,
        lastSyncStatus: 'success',
      })
      mockRemoteSync.fetchInitialData.mockResolvedValue(remoteEntities)

      const result = await orchestrator.initializeSync(userId)

      expect(result).toEqual({
        status: 'success',
        uploaded: 0,
        downloaded: 1,
      })

      expect(mockLocalSync.saveRemoteChanges).toHaveBeenCalledWith(
        remoteEntities
      )
    })
  })

  describe('performIncrementalSync', () => {
    const userId = 'user-123'

    beforeEach(async () => {
      // Initialize sync first
      mockLocalSync.getSyncMetadata.mockResolvedValue(null)
      mockRemoteSync.fetchSyncMetadata.mockResolvedValue(null)
      mockRemoteSync.fetchInitialData.mockResolvedValue([])
      await orchestrator.initializeSync(userId)

      // Clear mock calls from initialization
      jest.clearAllMocks()
    })

    it('should handle incremental sync with no conflicts', async () => {
      const localChanges: SyncableEntity[] = [
        {
          id: 'local-1',
          localId: 'local-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'pending' as const,
          syncVersion: 1,
          checksum: 'local-hash',
          entityType: 'practiceSession' as const,
          data: { source: 'local' },
        },
      ]

      const remoteChanges = {
        entities: [
          {
            id: 'remote-1',
            localId: 'remote-1',
            remoteId: 'remote-1',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            syncStatus: 'synced' as const,
            syncVersion: 1,
            checksum: 'remote-hash',
            entityType: 'goal' as const,
            data: { source: 'remote' },
          },
        ],
        deletedIds: [],
        newSyncToken: 'new-token-123',
      }

      // Mock sync queue and changes
      mockSyncQueue.processQueue.mockResolvedValue({
        processed: 0,
        failed: 0,
        pending: 0,
      })
      mockLocalSync.getUnsyncedEntries.mockResolvedValue(localChanges)
      mockRemoteSync.fetchChangesSince.mockResolvedValue(remoteChanges)
      mockConflictResolver.detectConflicts.mockResolvedValue([])
      mockConflictResolver.resolveConflicts.mockResolvedValue([])
      mockDuplicateDetector.detectAndMerge.mockResolvedValue([
        ...localChanges,
        ...remoteChanges.entities,
      ])
      mockRemoteSync.uploadBatch.mockResolvedValue({
        uploaded: 1,
        failed: 0,
        newSyncToken: 'final-token',
        errors: [],
      })
      mockLocalSync.saveRemoteChanges.mockResolvedValue()
      mockLocalSync.markAsSynced.mockResolvedValue()
      mockLocalSync.saveSyncMetadata.mockResolvedValue()

      const result = await orchestrator.performIncrementalSync()

      expect(result).toEqual({
        status: 'success',
        uploaded: 1,
        downloaded: 0, // fetchInitialData returns [] in our mock
        conflicts: 0,
        merged: 2,
      })

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'sync',
          type: 'sync:completed',
          data: expect.objectContaining({
            result: expect.objectContaining({ status: 'success' }),
          }),
        })
      )
    })

    it('should handle conflicts during sync', async () => {
      const conflictingEntity: SyncableEntity = {
        id: 'conflict-1',
        localId: 'conflict-1',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now(),
        syncStatus: 'pending' as const,
        syncVersion: 2,
        checksum: 'local-conflict',
        entityType: 'practiceSession' as const,
        data: { value: 'local-version' },
      }

      const remoteConflict: SyncableEntity = {
        id: 'conflict-1',
        localId: 'conflict-1',
        remoteId: 'conflict-1',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 500, // Older
        syncStatus: 'synced' as const,
        syncVersion: 2,
        checksum: 'remote-conflict',
        entityType: 'practiceSession' as const,
        data: { value: 'remote-version' },
      }

      mockSyncQueue.processQueue.mockResolvedValue({
        processed: 0,
        failed: 0,
        pending: 0,
      })
      mockLocalSync.getUnsyncedEntries.mockResolvedValue([conflictingEntity])
      mockRemoteSync.fetchChangesSince.mockResolvedValue({
        entities: [remoteConflict],
        deletedIds: [],
        newSyncToken: 'token-123',
      })

      mockConflictResolver.detectConflicts.mockResolvedValue([
        {
          localEntity: conflictingEntity,
          remoteEntity: remoteConflict,
          type: 'update-update',
          detectedAt: Date.now(),
        },
      ])

      mockConflictResolver.resolveConflicts.mockResolvedValue([
        {
          ...conflictingEntity,
          syncStatus: 'synced' as const,
          conflictResolution: {
            strategy: 'lastWriteWins',
            resolvedAt: Date.now(),
          },
        },
      ])

      mockDuplicateDetector.detectAndMerge.mockResolvedValue([
        conflictingEntity,
      ])
      mockRemoteSync.uploadBatch.mockResolvedValue({
        uploaded: 1,
        failed: 0,
        newSyncToken: 'final-token',
        errors: [],
      })
      mockLocalSync.saveRemoteChanges.mockResolvedValue()
      mockLocalSync.markAsSynced.mockResolvedValue()
      mockLocalSync.saveSyncMetadata.mockResolvedValue()

      const result = await orchestrator.performIncrementalSync()

      expect(result.conflicts).toBe(1)
      expect(mockConflictResolver.resolveConflicts).toHaveBeenCalledWith(
        expect.any(Array),
        'lastWriteWins'
      )
    })

    it('should handle sync errors gracefully', async () => {
      // Since syncMetadata.syncToken is null from initialization,
      // it will call fetchInitialData, not fetchChangesSince
      mockSyncQueue.processQueue.mockResolvedValue({
        processed: 0,
        failed: 0,
        pending: 0,
      })
      mockLocalSync.getUnsyncedEntries.mockResolvedValue([])
      mockRemoteSync.fetchInitialData.mockRejectedValue(
        new Error('Network error')
      )

      // Should throw an error
      await expect(orchestrator.performIncrementalSync()).rejects.toMatchObject(
        {
          code: 'SYNC_FAILED',
          message: 'Incremental sync failed',
        }
      )

      // Should publish error event
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'sync',
          type: 'sync:error',
          data: expect.objectContaining({
            error: expect.objectContaining({
              code: 'SYNC_FAILED',
            }),
          }),
        })
      )
    })
  })

  describe('forceFullSync', () => {
    it('should replace all local data with merged dataset', async () => {
      const userId = 'user-123'
      await orchestrator.initializeSync(userId)

      const allLocal: SyncableEntity[] = [
        {
          id: 'local-1',
          localId: 'local-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'synced' as const,
          syncVersion: 1,
          checksum: 'local-1',
          entityType: 'practiceSession' as const,
          data: {},
        },
      ]

      const allRemote: SyncableEntity[] = [
        {
          id: 'remote-1',
          localId: 'remote-1',
          remoteId: 'remote-1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncStatus: 'synced' as const,
          syncVersion: 1,
          checksum: 'remote-1',
          entityType: 'goal',
          data: {},
        },
      ]

      mockLocalSync.getAllEntities.mockResolvedValue(allLocal)
      mockRemoteSync.fetchAllData.mockResolvedValue(allRemote)
      mockDuplicateDetector.detectAndMerge.mockResolvedValue([
        ...allLocal,
        ...allRemote,
      ])
      mockConflictResolver.detectConflicts.mockResolvedValue([])
      mockConflictResolver.resolveConflicts.mockResolvedValue([])
      mockRemoteSync.uploadBatch.mockResolvedValue({
        uploaded: 0,
        failed: 0,
        newSyncToken: 'token',
        errors: [],
      })

      const result = await orchestrator.forceFullSync()

      expect(result).toEqual({
        status: 'success',
        uploaded: 0,
        downloaded: 1,
        conflicts: 0,
        merged: 2,
      })

      expect(mockLocalSync.replaceAllEntities).toHaveBeenCalledWith(
        expect.arrayContaining([...allLocal, ...allRemote])
      )
    })
  })

  describe('attemptFinalSync', () => {
    it('should complete sync within timeout', async () => {
      const userId = 'user-123'
      await orchestrator.initializeSync(userId)

      // Clear initialization mocks
      jest.clearAllMocks()

      // Setup mocks for successful sync
      mockSyncQueue.processQueue.mockResolvedValue({
        processed: 0,
        failed: 0,
        pending: 0,
      })
      mockLocalSync.getUnsyncedEntries.mockResolvedValue([])
      mockRemoteSync.fetchInitialData.mockResolvedValue([])
      mockConflictResolver.detectConflicts.mockResolvedValue([])
      mockConflictResolver.resolveConflicts.mockResolvedValue([])
      mockDuplicateDetector.detectAndMerge.mockResolvedValue([])
      mockRemoteSync.uploadBatch.mockResolvedValue({
        uploaded: 0,
        failed: 0,
        newSyncToken: 'final-token',
        errors: [],
      })
      mockLocalSync.saveRemoteChanges.mockResolvedValue()
      mockLocalSync.markAsSynced.mockResolvedValue()
      mockLocalSync.saveSyncMetadata.mockResolvedValue()

      const result = await orchestrator.attemptFinalSync(1000)

      expect(result.status).toBe('success')
    })

    it('should timeout if sync takes too long', async () => {
      const userId = 'user-123'
      await orchestrator.initializeSync(userId)

      // Mock slow sync
      mockSyncQueue.processQueue.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      )

      const result = await orchestrator.attemptFinalSync(100)

      expect(result).toEqual({
        status: 'timeout',
        message: 'Sync timed out after 100ms',
      })
    })
  })

  describe('queueSyncOperation', () => {
    it('should queue operation and trigger sync', async () => {
      const operation = {
        id: 'op-1',
        type: 'update' as const,
        resource: 'practiceSession',
        data: { id: 'session-1' },
        timestamp: Date.now(),
        status: 'pending' as const,
        retryCount: 0,
      }

      await orchestrator.queueSyncOperation(operation)

      expect(mockSyncQueue.addOperation).toHaveBeenCalledWith(operation)
    })
  })

  describe('event handling', () => {
    it('should queue sync on data modification', async () => {
      const userId = 'user-123'
      await orchestrator.initializeSync(userId)

      // With the new architecture, data modifications should be handled by SyncManager
      // not directly by SyncOrchestrator to prevent circular dependencies
      // This test should verify that sync operations can be queued directly
      const operation: SyncOperation = {
        id: 'op-1',
        type: 'create',
        resource: 'practiceSession',
        data: { id: 'session-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      }

      // Queue the operation directly
      await orchestrator.queueSyncOperation(operation)

      expect(mockSyncQueue.addOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'create',
          resource: 'practiceSession',
        })
      )
    })
  })
})
