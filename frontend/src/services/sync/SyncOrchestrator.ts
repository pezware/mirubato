import { EventBus } from '../../modules/core/EventBus'
import { LocalSyncService } from './LocalSyncService'
import { RemoteSyncService } from './RemoteSyncService'
import { ConflictResolver, ConflictStrategy } from './ConflictResolver'
import { SyncQueue } from './SyncQueue'
import { DuplicateDetector } from './DuplicateDetector'
import {
  SyncResult,
  SyncMetadata,
  SyncOperation,
  SyncError,
  SyncState,
} from './types'

export interface SyncOrchestratorConfig {
  syncIntervalMs?: number
  maxRetries?: number
  conflictStrategy?: ConflictStrategy
  enableRealtime?: boolean
}

/**
 * Central orchestrator for all sync operations.
 * Coordinates between local storage, remote API, and conflict resolution.
 */
export class SyncOrchestrator {
  private syncInterval: number | null = null
  private isSyncing = false
  private syncMetadata: SyncMetadata | null = null
  private userId: string | null = null
  private config: Required<SyncOrchestratorConfig>
  private eventSubscriptionIds: string[] = []
  private onlineHandler: (() => void) | null = null
  private logger: { error: (msg: string, error?: unknown) => void }
  private stateChangeCallbacks: Array<(state: SyncState) => void> = []
  private currentState: SyncState = {
    status: 'idle',
    lastSync: null,
    pendingOperations: 0,
    error: null,
  }

  constructor(
    private localSync: LocalSyncService,
    private remoteSync: RemoteSyncService,
    private conflictResolver: ConflictResolver,
    private syncQueue: SyncQueue,
    private duplicateDetector: DuplicateDetector,
    private eventBus: EventBus,
    config: SyncOrchestratorConfig = {}
  ) {
    this.config = {
      syncIntervalMs: 5 * 60 * 1000, // 5 minutes
      maxRetries: 3,
      conflictStrategy: 'lastWriteWins',
      enableRealtime: true,
      ...config,
    }

    // Simple logger to avoid console.error references
    this.logger = {
      error: (msg: string, error?: unknown) => {
        this.eventBus.publish({
          source: 'sync',
          type: 'sync:error',
          data: { message: msg, error },
          metadata: { version: '1.0.0' },
        })
      },
    }

    this.setupEventListeners()
  }

  /**
   * Initialize sync for a user after login
   */
  async initializeSync(userId: string): Promise<SyncResult> {
    this.userId = userId

    try {
      this.eventBus.publish({
        source: 'sync',
        type: 'sync:initializing',
        data: { userId },
        metadata: {
          userId,
          version: '1.0.0',
        },
      })

      // Get sync metadata from both local and remote
      const [localMetadata, remoteMetadata] = await Promise.all([
        this.localSync.getSyncMetadata(userId),
        this.remoteSync.fetchSyncMetadata(userId),
      ])

      // Determine sync strategy based on metadata
      const syncResult = await this.determineSyncStrategy(
        localMetadata,
        remoteMetadata
      )

      // Setup automatic sync
      this.startAutomaticSync()

      // Setup realtime sync if enabled
      if (this.config.enableRealtime) {
        this.subscribeToRealtimeUpdates()
      }

      this.eventBus.publish({
        source: 'sync',
        type: 'sync:initialized',
        data: { userId, result: syncResult },
        metadata: {
          userId,
          version: '1.0.0',
        },
      })

      return syncResult
    } catch (error) {
      const syncError: SyncError = {
        code: 'SYNC_INIT_FAILED',
        message: 'Failed to initialize sync',
        details: error,
      }

      this.eventBus.publish({
        source: 'sync',
        type: 'sync:error',
        data: { error: syncError },
        metadata: {
          userId: this.userId || 'unknown',
          version: '1.0.0',
        },
      })

      throw syncError
    }
  }

  /**
   * Perform incremental sync of changes
   */
  async performIncrementalSync(): Promise<SyncResult> {
    if (this.isSyncing || !this.userId) {
      return {
        status: 'skipped',
        message: 'Sync already in progress or user not initialized',
      }
    }

    this.isSyncing = true
    this.updateState({ status: 'syncing', error: null })

    try {
      this.eventBus.publish({
        source: 'sync',
        type: 'sync:started',
        data: { type: 'incremental' },
        metadata: {
          userId: this.userId,
          version: '1.0.0',
        },
      })

      // Process queued operations first
      await this.syncQueue.processQueue()

      // Get unsynced local changes
      const unsyncedEntities = await this.localSync.getUnsyncedEntries()

      // Get remote changes since last sync
      const remoteChangesRaw = this.syncMetadata?.syncToken
        ? await this.remoteSync.fetchChangesSince(this.syncMetadata.syncToken)
        : await this.remoteSync.fetchInitialData(this.userId)

      // Normalize to consistent format
      const remoteChanges = Array.isArray(remoteChangesRaw)
        ? { entities: remoteChangesRaw, deletedIds: [], newSyncToken: '' }
        : remoteChangesRaw

      // Detect and resolve conflicts
      const conflicts = await this.conflictResolver.detectConflicts(
        unsyncedEntities,
        remoteChanges.entities
      )

      const resolvedEntities = await this.conflictResolver.resolveConflicts(
        conflicts,
        this.config.conflictStrategy
      )

      // Detect and merge duplicates
      const allEntities = [
        ...unsyncedEntities,
        ...remoteChanges.entities,
        ...resolvedEntities,
      ]
      const mergedEntities =
        await this.duplicateDetector.detectAndMerge(allEntities)

      // Upload local changes
      const uploadResult = await this.remoteSync.uploadBatch({
        entities: mergedEntities.filter(e => e.syncStatus === 'pending'),
        userId: this.userId,
        syncToken: this.syncMetadata?.syncToken || null,
      })

      // Save remote changes locally
      await this.localSync.saveRemoteChanges(
        mergedEntities.filter(e => e.syncStatus !== 'pending')
      )

      // Update sync metadata
      this.syncMetadata = {
        lastSyncTimestamp: Date.now(),
        syncToken:
          uploadResult.newSyncToken ||
          remoteChanges.newSyncToken ||
          this.syncMetadata?.syncToken ||
          null,
        pendingSyncCount: 0,
        lastSyncStatus: 'success',
      }
      await this.localSync.saveSyncMetadata(this.userId, this.syncMetadata)

      const result: SyncResult = {
        status: 'success',
        uploaded: uploadResult.uploaded,
        downloaded: remoteChanges.entities.length,
        conflicts: conflicts.length,
        merged: mergedEntities.length,
      }

      this.eventBus.publish({
        source: 'sync',
        type: 'sync:completed',
        data: { result },
        metadata: {
          userId: this.userId,
          version: '1.0.0',
        },
      })

      return result
    } catch (error) {
      const syncError: SyncError = {
        code: 'SYNC_FAILED',
        message: 'Incremental sync failed',
        details: error,
      }

      this.eventBus.publish({
        source: 'sync',
        type: 'sync:error',
        data: { error: syncError },
        metadata: {
          userId: this.userId || 'unknown',
          version: '1.0.0',
        },
      })

      // Update metadata with failure
      if (this.syncMetadata) {
        this.syncMetadata.lastSyncStatus = 'failed'
        this.syncMetadata.lastSyncError = syncError.message
      }

      this.updateState({ status: 'error', error: syncError })
      throw syncError
    } finally {
      this.isSyncing = false
      if (this.currentState.status === 'syncing') {
        this.updateState({ status: 'idle' })
      }
    }
  }

  /**
   * Force full sync, bypassing incremental logic
   */
  async forceFullSync(): Promise<SyncResult> {
    if (!this.userId) {
      throw new Error('User not initialized')
    }

    this.isSyncing = true
    this.updateState({ status: 'syncing', error: null })

    try {
      this.eventBus.publish({
        source: 'sync',
        type: 'sync:started',
        data: { type: 'full' },
        metadata: {
          userId: this.userId,
          version: '1.0.0',
        },
      })

      // Get all local data
      const allLocalEntities = await this.localSync.getAllEntities()

      // Get all remote data
      const allRemoteEntities = await this.remoteSync.fetchAllData(this.userId)

      // Detect duplicates across all data
      const mergedEntities = await this.duplicateDetector.detectAndMerge([
        ...allLocalEntities,
        ...allRemoteEntities,
      ])

      // Resolve any conflicts with configured strategy
      const conflicts = await this.conflictResolver.detectConflicts(
        allLocalEntities,
        allRemoteEntities
      )

      await this.conflictResolver.resolveConflicts(
        conflicts,
        this.config.conflictStrategy
      )

      // Replace all local data with merged set
      await this.localSync.replaceAllEntities(mergedEntities)

      // Upload any local-only changes
      const localOnly = mergedEntities.filter(
        e => !e.remoteId && e.syncStatus === 'pending'
      )

      if (localOnly.length > 0) {
        await this.remoteSync.uploadBatch({
          entities: localOnly,
          userId: this.userId,
          syncToken: null,
        })
      }

      const result: SyncResult = {
        status: 'success',
        uploaded: localOnly.length,
        downloaded: allRemoteEntities.length,
        conflicts: conflicts.length,
        merged: mergedEntities.length,
      }

      this.eventBus.publish({
        source: 'sync',
        type: 'sync:completed',
        data: { result, fullSync: true },
        metadata: {
          userId: this.userId,
          version: '1.0.0',
        },
      })

      return result
    } finally {
      this.isSyncing = false
      this.updateState({ status: 'idle', lastSync: Date.now() })
    }
  }

  /**
   * Attempt final sync before logout
   */
  async attemptFinalSync(timeoutMs: number = 5000): Promise<SyncResult> {
    if (!this.userId) {
      return {
        status: 'skipped',
        message: 'No user to sync',
      }
    }

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        resolve({
          status: 'timeout',
          message: `Sync timed out after ${timeoutMs}ms`,
        })
      }, timeoutMs)

      this.performIncrementalSync()
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          resolve({
            status: 'failed',
            message: error.message,
          })
        })
    })
  }

  /**
   * Perform sync immediately
   */
  async syncNow(): Promise<SyncResult> {
    return this.performIncrementalSync()
  }

  /**
   * Queue a sync operation for later processing
   */
  async queueSyncOperation(operation: SyncOperation): Promise<void> {
    // Prevent sync operations from queuing more operations
    if (this.isSyncing) {
      return
    }

    await this.syncQueue.addOperation(operation)

    // Trigger sync if not already running
    if (!this.isSyncing) {
      // Use setTimeout to break the synchronous call chain
      setTimeout(() => {
        this.performIncrementalSync().catch(error => {
          this.logger.error('Sync operation failed', error)
        })
      }, 100)
    }
  }

  /**
   * Subscribe to sync state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.stateChangeCallbacks.push(callback)
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback)
      if (index !== -1) {
        this.stateChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Update sync state and notify listeners
   */
  private updateState(updates: Partial<SyncState>): void {
    this.currentState = { ...this.currentState, ...updates }
    this.stateChangeCallbacks.forEach(callback => {
      callback(this.currentState)
    })
  }

  /**
   * Update the auth token for remote sync operations
   * @deprecated Auth is now handled via HTTP-only cookies
   */
  updateAuthToken(_token: string): void {
    // No-op - authentication is now handled via cookies
    // Log deprecation warning through event system
    this.eventBus.publish({
      source: 'sync',
      type: 'sync:deprecation',
      data: {
        message:
          'updateAuthToken is deprecated - authentication is now handled via HTTP-only cookies',
      },
      metadata: { version: '1.0.0' },
    })
  }

  /**
   * Cleanup and stop sync
   */
  dispose(): void {
    this.stopAutomaticSync()
    this.unsubscribeFromRealtimeUpdates()

    // Clean up event subscriptions
    this.eventSubscriptionIds.forEach(id => this.eventBus.unsubscribe(id))
    this.eventSubscriptionIds = []

    // Remove window event listener
    if (this.onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler)
      this.onlineHandler = null
    }

    this.userId = null
    this.syncMetadata = null
  }

  // Private methods

  private async determineSyncStrategy(
    localMetadata: SyncMetadata | null,
    remoteMetadata: SyncMetadata | null
  ): Promise<SyncResult> {
    // Case 1: No data anywhere - fresh start
    if (!localMetadata && !remoteMetadata) {
      // Initialize sync metadata for fresh sync
      this.syncMetadata = {
        lastSyncTimestamp: Date.now(),
        syncToken: null,
        pendingSyncCount: 0,
        lastSyncStatus: 'success',
      }

      return {
        status: 'success',
        message: 'Fresh sync initialized',
      }
    }

    // Case 2: Only local data - upload all
    if (localMetadata && !remoteMetadata) {
      const unsyncedEntities = await this.localSync.getUnsyncedEntries()
      const uploadResult = await this.remoteSync.uploadBatch({
        entities: unsyncedEntities,
        userId: this.userId!,
        syncToken: null,
      })

      await this.localSync.markAsSynced(unsyncedEntities.map(e => e.id))

      return {
        status: 'success',
        uploaded: uploadResult.uploaded,
        downloaded: 0,
      }
    }

    // Case 3: Only remote data - download all
    if (!localMetadata && remoteMetadata) {
      const remoteData = await this.remoteSync.fetchInitialData(this.userId!)
      await this.localSync.saveRemoteChanges(remoteData)

      return {
        status: 'success',
        uploaded: 0,
        downloaded: remoteData.length,
      }
    }

    // Case 4: Both have data - perform incremental sync
    return this.performIncrementalSync()
  }

  private setupEventListeners(): void {
    // REMOVED: Direct subscription to 'data:modified' events
    // This was causing circular dependencies. Sync should be triggered
    // explicitly by modules that modify data, not by listening to all changes.

    // Only listen for network status changes

    // Listen for network status
    if (typeof window !== 'undefined') {
      this.onlineHandler = () => {
        this.performIncrementalSync().catch(error => {
          this.logger.error('Failed to sync on network reconnect', error)
        })
      }
      window.addEventListener('online', this.onlineHandler)
    }
  }

  private startAutomaticSync(): void {
    this.stopAutomaticSync()

    this.syncInterval = window.setInterval(() => {
      this.performIncrementalSync().catch(error => {
        this.logger.error('Sync operation failed', error)
      })
    }, this.config.syncIntervalMs)
  }

  private stopAutomaticSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  private subscribeToRealtimeUpdates(): void {
    // TODO: Implement WebSocket or SSE subscription
    // This would listen for remote changes and trigger local sync
  }

  private unsubscribeFromRealtimeUpdates(): void {
    // TODO: Cleanup realtime subscriptions
  }
}
