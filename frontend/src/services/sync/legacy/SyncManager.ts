import { EventBus } from '../../../modules/core/EventBus'
import { LocalSyncService } from './LocalSyncService'
import { RemoteSyncService } from './RemoteSyncService'
import { ConflictResolver } from './ConflictResolver'
import { SyncQueue } from './SyncQueue'
import { DuplicateDetector } from '../DuplicateDetector'
import { SyncOrchestrator } from './SyncOrchestrator'
import { SyncResult, SyncState, SyncOperation, SyncableEntity } from '../types'
import type { User } from '../../../contexts/ImprovedAuthContext'

export interface SyncManagerConfig {
  syncIntervalMs?: number
  debounceMs?: number
  maxRetries?: number
}

/**
 * Centralized sync manager that handles all sync operations
 * Separated from AuthContext to prevent circular dependencies
 */
export class SyncManager {
  private static instance: SyncManager | null = null
  private orchestrator: SyncOrchestrator | null = null
  private syncState: SyncState = {
    status: 'idle',
    lastSync: null,
    pendingOperations: 0,
    error: null,
  }
  private pendingChanges = new Map<string, SyncOperation>()
  private debounceTimer: NodeJS.Timeout | null = null
  private config: Required<SyncManagerConfig>
  private stateChangeCallbacks: Array<(state: SyncState) => void> = []
  private currentUser: User | null = null

  private constructor(
    private eventBus: EventBus,
    config: SyncManagerConfig = {}
  ) {
    this.config = {
      syncIntervalMs: 5 * 60 * 1000, // 5 minutes
      debounceMs: 500, // 500ms debounce
      maxRetries: 3,
      ...config,
    }

    this.setupEventListeners()
  }

  static getInstance(
    eventBus: EventBus,
    config?: SyncManagerConfig
  ): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager(eventBus, config)
    }
    return SyncManager.instance
  }

  /**
   * Update user state and initialize/cleanup sync orchestrator
   */
  onAuthStateChange(user: User | null): void {
    this.currentUser = user

    // Cleanup existing orchestrator
    if (this.orchestrator) {
      this.orchestrator.dispose()
      this.orchestrator = null
    }

    // Only initialize for authenticated users with cloud storage
    if (user && !user.isAnonymous && user.hasCloudStorage) {
      this.initializeOrchestrator(user)
    } else {
      // Reset sync state for anonymous users
      this.updateState({
        status: 'idle',
        lastSync: null,
        pendingOperations: 0,
        error: null,
      })
    }
  }

  /**
   * Explicitly trigger sync now
   */
  async syncNow(): Promise<SyncResult> {
    if (!this.orchestrator || !this.currentUser) {
      return {
        status: 'skipped',
        message: 'No authenticated user or sync not initialized',
      }
    }

    // Cancel any pending debounced sync
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Process any pending changes
    await this.processPendingChanges()

    return this.orchestrator.syncNow()
  }

  /**
   * Queue a change for sync (with debouncing)
   */
  async queueChange(operation: SyncOperation): Promise<void> {
    // Don't queue if no user or anonymous
    if (!this.currentUser || this.currentUser.isAnonymous) {
      return
    }

    // Add to pending changes
    this.pendingChanges.set(operation.id, operation)
    this.updateState({
      pendingOperations: this.pendingChanges.size,
    })

    // Debounce sync trigger
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(async () => {
      await this.processPendingChanges()
      if (this.orchestrator) {
        await this.orchestrator.performIncrementalSync()
      }
    }, this.config.debounceMs)
  }

  /**
   * Subscribe to sync state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.stateChangeCallbacks.push(callback)
    // Immediately call with current state
    callback(this.syncState)

    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback)
      if (index !== -1) {
        this.stateChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return this.syncState
  }

  private async initializeOrchestrator(user: User): Promise<void> {
    const localSync = new LocalSyncService()
    // Import endpoints config to get the correct GraphQL endpoint
    const { endpoints } = await import('../../../config/endpoints')
    const remoteSync = new RemoteSyncService({
      graphqlEndpoint: endpoints.graphql,
    })
    const conflictResolver = new ConflictResolver()
    const syncQueue = new SyncQueue()
    const duplicateDetector = new DuplicateDetector()

    this.orchestrator = new SyncOrchestrator(
      localSync,
      remoteSync,
      conflictResolver,
      syncQueue,
      duplicateDetector,
      this.eventBus,
      {
        syncIntervalMs: this.config.syncIntervalMs,
        maxRetries: this.config.maxRetries,
        enableRealtime: false,
      }
    )

    // Subscribe to orchestrator state changes
    this.orchestrator.onStateChange(state => {
      this.updateState(state)
    })

    // Initialize sync
    try {
      await this.orchestrator.initializeSync(user.id)
    } catch (error) {
      console.error('Failed to initialize sync:', error)
      this.updateState({
        status: 'error',
        error: {
          code: 'INIT_FAILED',
          message: 'Failed to initialize sync',
          details: error,
        },
      })
    }
  }

  private async processPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0 || !this.orchestrator) {
      return
    }

    // Convert pending changes to sync operations
    const operations = Array.from(this.pendingChanges.values())
    this.pendingChanges.clear()

    // Queue all operations
    for (const operation of operations) {
      await this.orchestrator.queueSyncOperation(operation)
    }

    this.updateState({
      pendingOperations: 0,
    })
  }

  private setupEventListeners(): void {
    // Listen for explicit sync requests
    this.eventBus.subscribe('sync:request', async () => {
      await this.syncNow()
    })

    // Listen for data changes from modules
    this.eventBus.subscribe('module:data:changed', async event => {
      const { resource, entity, operation } = event.data as {
        resource: string
        entity: SyncableEntity
        operation: 'create' | 'update' | 'delete'
      }

      // Create sync operation
      const syncOperation: SyncOperation = {
        id: `op_${Date.now()}_${Math.random()}`,
        type: operation,
        resource,
        data: entity,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      }

      await this.queueChange(syncOperation)
    })
  }

  private updateState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates }
    this.stateChangeCallbacks.forEach(callback => {
      callback(this.syncState)
    })
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    if (this.orchestrator) {
      this.orchestrator.dispose()
    }
    this.pendingChanges.clear()
    this.stateChangeCallbacks = []
    SyncManager.instance = null
  }
}

// Export singleton getter
export const getSyncManager = (
  eventBus: EventBus,
  config?: SyncManagerConfig
): SyncManager => {
  return SyncManager.getInstance(eventBus, config)
}
