import { ModuleInterface, ModuleHealth, EventBus, EventPayload } from '../core'
import { StorageModule } from './StorageModule'
import { SyncOperation, SyncConfig, ConflictResolution } from './types'

export class SyncModule implements ModuleInterface {
  name = 'Sync'
  version = '1.0.0'

  private eventBus: EventBus
  private storageModule: StorageModule
  private config: SyncConfig
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }

  private syncQueue: Map<string, SyncOperation> = new Map()
  private syncTimer: NodeJS.Timeout | null = null
  private isSyncing = false
  private conflictResolution: ConflictResolution

  constructor(
    storageModule: StorageModule,
    config?: Partial<SyncConfig>,
    conflictResolution?: ConflictResolution
  ) {
    this.storageModule = storageModule
    this.eventBus = EventBus.getInstance()

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 10,
      syncInterval: 30000, // 30 seconds
      ...config,
    }

    this.conflictResolution = conflictResolution || {
      strategy: 'lastWriteWins',
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:start',
        data: { module: this.name },
        metadata: { version: this.version },
      })

      // Load existing sync queue from storage
      await this.loadSyncQueue()

      // Subscribe to storage events
      this.setupEventSubscriptions()

      // Start sync timer
      this.startSyncTimer()

      this.health = {
        status: 'green',
        message: 'Sync module initialized',
        lastCheck: Date.now(),
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:complete',
        data: { module: this.name },
        metadata: { version: this.version },
      })
    } catch (error) {
      this.health = {
        status: 'red',
        message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: Date.now(),
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:error',
        data: {
          module: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })

      throw error
    }
  }

  async shutdown(): Promise<void> {
    // Stop sync timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }

    // Save sync queue to storage
    await this.saveSyncQueue()

    await this.eventBus.publish({
      source: this.name,
      type: 'module:shutdown:complete',
      data: { module: this.name },
      metadata: { version: this.version },
    })

    this.health = {
      status: 'gray',
      message: 'Module shut down',
      lastCheck: Date.now(),
    }
  }

  getHealth(): ModuleHealth {
    return { ...this.health }
  }

  private setupEventSubscriptions(): void {
    // Subscribe to data sync required events
    this.eventBus.subscribe(
      'data:sync:required',
      async (payload: EventPayload) => {
        const data = payload.data as {
          operation: string
          key: string
          data: unknown
        }
        await this.queueOperation({
          id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: data.operation === 'save' ? 'create' : 'update',
          resource: data.key,
          data: data.data,
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
        })
      }
    )

    // Subscribe to sync request events
    this.eventBus.subscribe(
      'sync:request:initiated',
      async (_payload: EventPayload) => {
        await this.processSyncQueue()
      }
    )
  }

  private startSyncTimer(): void {
    this.syncTimer = setInterval(async () => {
      if (!this.isSyncing && this.syncQueue.size > 0) {
        await this.processSyncQueue()
      }
    }, this.config.syncInterval)
  }

  async queueOperation(operation: SyncOperation): Promise<void> {
    this.syncQueue.set(operation.id, operation)
    await this.saveSyncQueue()

    await this.eventBus.publish({
      source: this.name,
      type: 'sync:operation:queued',
      data: { operation },
      metadata: { version: this.version },
    })
  }

  async processSyncQueue(): Promise<void> {
    if (this.isSyncing) return

    this.isSyncing = true

    try {
      const operations = Array.from(this.syncQueue.values())
        .filter(op => op.status === 'pending')
        .slice(0, this.config.batchSize)

      for (const operation of operations) {
        await this.processSyncOperation(operation)
      }

      await this.saveSyncQueue()

      const pendingCount = Array.from(this.syncQueue.values()).filter(
        op => op.status === 'pending'
      ).length

      await this.eventBus.publish({
        source: this.name,
        type: 'sync:batch:complete',
        data: {
          processed: operations.length,
          remaining: pendingCount,
        },
        metadata: { version: this.version },
      })
    } finally {
      this.isSyncing = false
    }
  }

  private async processSyncOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing'

    try {
      // Simulate API call (this would be replaced with actual GraphQL mutation)
      await this.simulateApiCall(operation)

      operation.status = 'completed'
      this.syncQueue.delete(operation.id)

      await this.eventBus.publish({
        source: this.name,
        type: 'sync:operation:success',
        data: { operation },
        metadata: { version: this.version },
      })
    } catch (error) {
      operation.retryCount++
      operation.error = error instanceof Error ? error.message : 'Unknown error'

      if (operation.retryCount >= this.config.maxRetries) {
        operation.status = 'failed'

        await this.eventBus.publish({
          source: this.name,
          type: 'sync:operation:failed',
          data: { operation },
          metadata: { version: this.version },
        })
      } else {
        operation.status = 'pending'

        // Schedule retry with exponential backoff
        const delay =
          this.config.retryDelay * Math.pow(2, operation.retryCount - 1)
        setTimeout(() => {
          this.processSyncQueue().catch(err => {
            console.error('Error processing sync queue during retry:', err)
          })
        }, delay)
      }
    }
  }

  private async simulateApiCall(operation: SyncOperation): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Simulate occasional failures for testing
    if (Math.random() < 0.1 && operation.retryCount === 0) {
      throw new Error('Network error')
    }
  }

  async resolveConflicts<T extends { updatedAt?: number }>(
    local: T,
    remote: T
  ): Promise<T> {
    switch (this.conflictResolution.strategy) {
      case 'lastWriteWins':
        return (local.updatedAt || 0) > (remote.updatedAt || 0) ? local : remote

      case 'merge':
        // Simple merge strategy - combine properties
        return { ...remote, ...local }

      case 'userChoice':
        // Would show UI for user to choose
        await this.eventBus.publish({
          source: this.name,
          type: 'sync:conflict:detected',
          data: { local, remote },
          metadata: { version: this.version },
        })
        return local // Default to local for now

      case 'custom':
        if (this.conflictResolution.resolver) {
          return this.conflictResolution.resolver(local, remote) as T
        }
        return local

      default:
        return local
    }
  }

  getSyncStatus(): {
    pendingOperations: number
    failedOperations: number
    isSyncing: boolean
    lastSyncTime?: number
  } {
    const operations = Array.from(this.syncQueue.values())

    return {
      pendingOperations: operations.filter(op => op.status === 'pending')
        .length,
      failedOperations: operations.filter(op => op.status === 'failed').length,
      isSyncing: this.isSyncing,
      lastSyncTime:
        Math.max(...operations.map(op => op.timestamp), 0) || undefined,
    }
  }

  async forceSyncAll(): Promise<void> {
    // Reset all failed operations to pending
    for (const operation of this.syncQueue.values()) {
      if (operation.status === 'failed') {
        operation.status = 'pending'
        operation.retryCount = 0
        operation.error = undefined
      }
    }

    await this.processSyncQueue()
  }

  private async loadSyncQueue(): Promise<void> {
    const queueData =
      await this.storageModule.loadLocal<Array<[string, SyncOperation]>>(
        '_sync_queue'
      )
    if (queueData) {
      this.syncQueue = new Map(queueData)
    }
  }

  private async saveSyncQueue(): Promise<void> {
    const queueData = Array.from(this.syncQueue.entries())
    await this.storageModule.saveLocal('_sync_queue', queueData)
  }

  // Testing helpers
  clearQueue(): void {
    this.syncQueue.clear()
  }

  getQueueSize(): number {
    return this.syncQueue.size
  }

  getOperation(id: string): SyncOperation | undefined {
    return this.syncQueue.get(id)
  }
}
