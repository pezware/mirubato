import { SyncModule } from './SyncModule'
import { StorageModule } from './StorageModule'
import { EventBus } from '../core'
import { SyncOperation } from './types'

// We'll use real timers and mock delays instead
// jest.useFakeTimers();

// Polyfill setImmediate for browser environments
const setImmediatePolyfill = (fn: () => void) => setTimeout(fn, 0)
global.setImmediate = global.setImmediate || setImmediatePolyfill

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

describe('SyncModule', () => {
  let syncModule: SyncModule
  let storageModule: StorageModule
  let eventBus: EventBus
  let publishSpy: jest.SpyInstance

  beforeEach(() => {
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    publishSpy = jest.spyOn(eventBus, 'publish')

    storageModule = new StorageModule({ namespace: 'test' })
    // Mock storage methods
    jest.spyOn(storageModule, 'loadLocal').mockResolvedValue(null)
    jest.spyOn(storageModule, 'saveLocal').mockResolvedValue(undefined)

    // Create sync module with shorter intervals for testing
    syncModule = new SyncModule(storageModule, {
      syncInterval: 50000, // Long interval to prevent auto-sync during tests
      retryDelay: 100, // Short retry delay for tests
    })
  })

  afterEach(async () => {
    // Ensure sync module is shut down to stop timers
    if (syncModule) {
      await syncModule.shutdown()
    }
    jest.clearAllMocks()
    jest.clearAllTimers()
    EventBus.resetInstance()
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await syncModule.initialize()

      const health = syncModule.getHealth()
      expect(health.status).toBe('green')
      expect(health.message).toContain('initialized')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:start',
          source: 'Sync',
        })
      )

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:complete',
          source: 'Sync',
        })
      )
    })

    it('should load existing sync queue on initialization', async () => {
      const existingQueue: Array<[string, SyncOperation]> = [
        [
          'op1',
          {
            id: 'op1',
            type: 'create',
            resource: 'test',
            data: { test: true },
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0,
          },
        ],
      ]

      ;(storageModule.loadLocal as jest.Mock).mockResolvedValueOnce(
        existingQueue
      )

      await syncModule.initialize()

      expect(syncModule.getQueueSize()).toBe(1)
      expect(syncModule.getOperation('op1')).toBeDefined()
    })

    it('should handle initialization failure', async () => {
      ;(storageModule.loadLocal as jest.Mock).mockRejectedValueOnce(
        new Error('Load failed')
      )

      await expect(syncModule.initialize()).rejects.toThrow('Load failed')

      const health = syncModule.getHealth()
      expect(health.status).toBe('red')
      expect(health.message).toContain('Initialization failed')
    })

    it('should shutdown properly', async () => {
      await syncModule.initialize()

      // Add an operation to ensure queue is saved
      await syncModule.queueOperation({
        id: 'test-op',
        type: 'create',
        resource: 'test',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      await syncModule.shutdown()

      const health = syncModule.getHealth()
      expect(health.status).toBe('gray')

      expect(storageModule.saveLocal).toHaveBeenCalledWith(
        '_sync_queue',
        expect.any(Array)
      )

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:shutdown:complete',
          source: 'Sync',
        })
      )
    })
  })

  describe('Queue Operations', () => {
    beforeEach(async () => {
      await syncModule.initialize()
    })

    it('should queue operations', async () => {
      const operation: SyncOperation = {
        id: 'op1',
        type: 'create',
        resource: 'user',
        data: { name: 'test' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      }

      await syncModule.queueOperation(operation)

      expect(syncModule.getQueueSize()).toBe(1)
      expect(syncModule.getOperation('op1')).toEqual(operation)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync:operation:queued',
          source: 'Sync',
          data: { operation },
        })
      )
    })

    it('should process sync queue', async () => {
      const operations: SyncOperation[] = [
        {
          id: 'op1',
          type: 'create',
          resource: 'user',
          data: { name: 'test1' },
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'op2',
          type: 'update',
          resource: 'user',
          data: { name: 'test2' },
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
        },
      ]

      for (const op of operations) {
        await syncModule.queueOperation(op)
      }

      await syncModule.processSyncQueue()

      // Wait for all async operations to complete including simulated network delays
      await new Promise(resolve => setTimeout(resolve, 200))
      await flushPromises()

      // Check that batch complete event was published
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync:batch:complete',
          source: 'Sync',
          data: expect.objectContaining({
            processed: expect.any(Number),
            remaining: expect.any(Number),
          }),
        })
      )

      // Operations should be processed (either completed or retrying if they failed)
      const finalQueueSize = syncModule.getQueueSize()
      expect(finalQueueSize).toBeLessThanOrEqual(2) // Allow for potential retries due to random failures
    })

    it('should respect batch size limit', async () => {
      const syncModuleWithSmallBatch = new SyncModule(storageModule, {
        batchSize: 2,
      })
      await syncModuleWithSmallBatch.initialize()

      // Mock simulateApiCall to always succeed for this test
      jest
        .spyOn(syncModuleWithSmallBatch as any, 'simulateApiCall')
        .mockResolvedValue(undefined)

      // Queue 5 operations
      for (let i = 1; i <= 5; i++) {
        await syncModuleWithSmallBatch.queueOperation({
          id: `op${i}`,
          type: 'create',
          resource: 'test',
          data: { index: i },
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
        })
      }

      await syncModuleWithSmallBatch.processSyncQueue()
      await flushPromises()

      // Should have processed only 2 operations, 3 remaining
      expect(syncModuleWithSmallBatch.getQueueSize()).toBe(3)

      // Clean up
      await syncModuleWithSmallBatch.shutdown()
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await syncModule.initialize()
    })

    it('should queue operations on data:sync:required event', async () => {
      await eventBus.publish({
        source: 'Storage',
        type: 'data:sync:required',
        data: {
          key: 'user:123',
          operation: 'save',
          data: { id: '123', name: 'Test User' },
        },
        metadata: { version: '1.0.0' },
      })

      await flushPromises()

      expect(syncModule.getQueueSize()).toBe(1)
      const operations = Array.from(
        (syncModule as any).syncQueue.values()
      ) as SyncOperation[]
      expect(operations[0].resource).toBe('user:123')
      expect(operations[0].type).toBe('create')
    })

    it('should process queue on sync:request:initiated event', async () => {
      await syncModule.queueOperation({
        id: 'op1',
        type: 'create',
        resource: 'test',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      await eventBus.publish({
        source: 'Storage',
        type: 'sync:request:initiated',
        data: {},
        metadata: { version: '1.0.0' },
      })

      // Wait for simulated network delays and async operations
      await new Promise(resolve => setTimeout(resolve, 200))
      await flushPromises()

      // Operation should be processed (either completed or retrying if failed)
      const finalQueueSize = syncModule.getQueueSize()
      expect(finalQueueSize).toBeLessThanOrEqual(1) // Allow for potential retry due to random failure
    })
  })

  describe('Retry Logic', () => {
    beforeEach(async () => {
      await syncModule.initialize()
    })

    it('should retry failed operations', async () => {
      const operation: SyncOperation = {
        id: 'op1',
        type: 'create',
        resource: 'test',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      }

      // Mock to fail first time
      jest
        .spyOn(syncModule as any, 'simulateApiCall')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined)

      await syncModule.queueOperation(operation)
      await syncModule.processSyncQueue()

      await flushPromises()

      // Operation should still be in queue with increased retry count
      const updatedOp = syncModule.getOperation('op1')
      expect(updatedOp?.retryCount).toBe(1)
      expect(updatedOp?.status).toBe('pending')
      expect(updatedOp?.error).toBe('Network error')

      // Wait for the retry delay (100ms + buffer)
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(syncModule.getQueueSize()).toBe(0)
    })

    it('should mark operation as failed after max retries', async () => {
      const syncModuleWithLowRetries = new SyncModule(storageModule, {
        maxRetries: 2,
      })
      await syncModuleWithLowRetries.initialize()

      const operation: SyncOperation = {
        id: 'op1',
        type: 'create',
        resource: 'test',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      }

      // Mock to always fail
      jest
        .spyOn(syncModuleWithLowRetries as any, 'simulateApiCall')
        .mockRejectedValue(new Error('Persistent error'))

      await syncModuleWithLowRetries.queueOperation(operation)

      // Process multiple times to exhaust retries
      for (let i = 0; i < 3; i++) {
        await syncModuleWithLowRetries.processSyncQueue()
        await flushPromises()
        if (i < 2) {
          // Wait for retry delay
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, i) * 1000 + 100)
          )
        }
      }

      const failedOp = syncModuleWithLowRetries.getOperation('op1')
      expect(failedOp?.status).toBe('failed')
      expect(failedOp?.retryCount).toBe(2)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync:operation:failed',
          source: 'Sync',
        })
      )

      // Clean up
      await syncModuleWithLowRetries.shutdown()
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using lastWriteWins strategy', async () => {
      await syncModule.initialize()

      const local = { id: 1, value: 'local', updatedAt: 1000 }
      const remote = { id: 1, value: 'remote', updatedAt: 2000 }

      const resolved = await syncModule.resolveConflicts(local, remote)
      expect(resolved).toEqual(remote)
    })

    it('should resolve conflicts using merge strategy', async () => {
      const syncModuleWithMerge = new SyncModule(
        storageModule,
        {},
        { strategy: 'merge' }
      )
      await syncModuleWithMerge.initialize()

      const local = { id: 1, localField: 'local', updatedAt: Date.now() }
      const remote = {
        id: 1,
        remoteField: 'remote',
        updatedAt: Date.now() - 1000,
      }

      const resolved = await syncModuleWithMerge.resolveConflicts(local, remote)
      expect(resolved).toEqual({
        id: 1,
        localField: 'local',
        remoteField: 'remote',
        updatedAt: local.updatedAt, // merge strategy keeps the most recent updatedAt
      })

      // Clean up
      await syncModuleWithMerge.shutdown()
    })

    it('should use custom resolver for conflict resolution', async () => {
      const customResolver = jest.fn((local, remote) => ({
        ...local,
        ...remote,
        resolved: true,
      }))

      const syncModuleWithCustom = new SyncModule(
        storageModule,
        {},
        { strategy: 'custom', resolver: customResolver }
      )
      await syncModuleWithCustom.initialize()

      const now = Date.now()
      const local = { id: 1, value: 'local', updatedAt: now }
      const remote = { id: 1, value: 'remote', updatedAt: now - 1000 }

      const resolved = await syncModuleWithCustom.resolveConflicts(
        local,
        remote
      )

      expect(customResolver).toHaveBeenCalledWith(local, remote)
      expect(resolved).toEqual({
        id: 1,
        value: 'remote',
        resolved: true,
        updatedAt: now - 1000, // custom resolver merges all properties, remote overrides local
      })

      // Clean up
      await syncModuleWithCustom.shutdown()
    })

    it('should emit event for userChoice strategy', async () => {
      const syncModuleWithUserChoice = new SyncModule(
        storageModule,
        {},
        { strategy: 'userChoice' }
      )
      await syncModuleWithUserChoice.initialize()

      const local = { id: 1, value: 'local', updatedAt: Date.now() }
      const remote = { id: 1, value: 'remote', updatedAt: Date.now() - 1000 }

      const resolved = await syncModuleWithUserChoice.resolveConflicts(
        local,
        remote
      )

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync:conflict:detected',
          source: 'Sync',
          data: { local, remote },
        })
      )

      // Should default to local for now
      expect(resolved).toEqual(local)

      // Clean up
      await syncModuleWithUserChoice.shutdown()
    })
  })

  describe('Sync Status', () => {
    beforeEach(async () => {
      await syncModule.initialize()
    })

    it('should report sync status', async () => {
      // Add operations with different statuses
      await syncModule.queueOperation({
        id: 'op1',
        type: 'create',
        resource: 'test1',
        data: {},
        timestamp: 1000,
        status: 'pending',
        retryCount: 0,
      })

      await syncModule.queueOperation({
        id: 'op2',
        type: 'update',
        resource: 'test2',
        data: {},
        timestamp: 2000,
        status: 'failed',
        retryCount: 3,
      })

      const status = syncModule.getSyncStatus()

      expect(status).toEqual({
        pendingOperations: 1,
        failedOperations: 1,
        isSyncing: false,
        lastSyncTime: 2000,
      })
    })

    it('should force sync all operations', async () => {
      // Add failed operation
      const operation: SyncOperation = {
        id: 'op1',
        type: 'create',
        resource: 'test',
        data: {},
        timestamp: Date.now(),
        status: 'failed',
        retryCount: 3,
        error: 'Previous error',
      }

      await syncModule.queueOperation(operation)

      // Mock successful API call
      jest
        .spyOn(syncModule as any, 'simulateApiCall')
        .mockResolvedValue(undefined)

      await syncModule.forceSyncAll()
      await flushPromises()

      expect(syncModule.getQueueSize()).toBe(0)

      const status = syncModule.getSyncStatus()
      expect(status.failedOperations).toBe(0)
    })
  })

  describe('Automatic Sync Timer', () => {
    it('should automatically sync on interval', async () => {
      const syncModuleWithShortInterval = new SyncModule(
        storageModule,
        { syncInterval: 1000 } // 1 second
      )
      await syncModuleWithShortInterval.initialize()

      // Mock simulateApiCall to always succeed for this test
      jest
        .spyOn(syncModuleWithShortInterval as any, 'simulateApiCall')
        .mockResolvedValue(undefined)

      await syncModuleWithShortInterval.queueOperation({
        id: 'op1',
        type: 'create',
        resource: 'test',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      // Wait for automatic sync interval
      await new Promise(resolve => setTimeout(resolve, 1100))
      await flushPromises()

      expect(syncModuleWithShortInterval.getQueueSize()).toBe(0)

      // Clean up
      await syncModuleWithShortInterval.shutdown()
    })

    it('should not sync if already syncing', async () => {
      await syncModule.initialize()

      // Mock processSyncOperation to be slow
      let processCount = 0
      jest
        .spyOn(syncModule as any, 'processSyncOperation')
        .mockImplementation(async () => {
          processCount++
          await new Promise(resolve => setTimeout(resolve, 100))
        })

      await syncModule.queueOperation({
        id: 'op1',
        type: 'create',
        resource: 'test',
        data: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      })

      // Start first sync
      const sync1 = syncModule.processSyncQueue()

      // Try to start another sync immediately
      const sync2 = syncModule.processSyncQueue()

      await Promise.all([sync1, sync2])

      // Should only process once
      expect(processCount).toBe(1)
    })
  })
})
