/**
 * Delta-based sync API client
 * Replaces the heavy state-based sync with lightweight change tracking
 */

import { apiClient } from './client'
import {
  changeQueue,
  getDeviceId,
  type ChangeRecord,
  type SyncMetadata,
} from '../utils/changeQueue'

export interface SyncRequest {
  lastKnownServerVersion: number
  changes: ChangeRecord[]
}

export interface SyncResponse {
  newChanges: ChangeRecord[]
  latestServerVersion: number
  conflicts?: Array<{
    changeId: string
    reason: string
  }>
}

export interface SyncStatus {
  lastKnownVersion: number
  deviceCount: number
  totalChanges: number
  lastSync: string | null
}

export interface MigrationResult {
  migrated: boolean
  reason?: string
  entriesConverted?: number
  existingChanges?: number
}

export class SyncV2API {
  private syncInProgress = false
  private deviceId: string

  constructor() {
    this.deviceId = getDeviceId()
  }

  /**
   * Perform full sync - push local changes and pull server changes
   */
  async sync(): Promise<{
    success: boolean
    changesApplied: number
    changesPushed: number
    conflicts: number
    error?: string
  }> {
    if (this.syncInProgress) {
      console.log('[Sync V2] Sync already in progress, skipping')
      return {
        success: false,
        changesApplied: 0,
        changesPushed: 0,
        conflicts: 0,
        error: 'Sync already in progress',
      }
    }

    this.syncInProgress = true

    try {
      console.log('[Sync V2] Starting sync...')

      // Get current sync metadata
      let metadata = await changeQueue.getSyncMetadata()
      if (!metadata) {
        metadata = {
          lastKnownServerVersion: 0,
          lastSyncTime: 0,
          deviceId: this.deviceId,
        }
      }

      // Get pending changes
      const pendingChanges = await changeQueue.getAllPendingChanges()

      // Filter out changes that have failed too many times
      const MAX_RETRIES = 5
      const viableChanges = pendingChanges.filter(
        change => change.retryCount < MAX_RETRIES
      )
      const failedChanges = pendingChanges.filter(
        change => change.retryCount >= MAX_RETRIES
      )

      if (failedChanges.length > 0) {
        console.warn(
          `[Sync V2] ${failedChanges.length} changes have failed too many times and will be skipped`
        )
      }

      console.log(
        `[Sync V2] Syncing ${viableChanges.length} pending changes, last known version: ${metadata.lastKnownServerVersion}`
      )

      // Call sync endpoint
      const response = await apiClient.post<SyncResponse>(
        '/api/sync/v2',
        {
          lastKnownServerVersion: metadata.lastKnownServerVersion,
          changes: viableChanges,
        },
        {
          headers: {
            'X-Device-ID': this.deviceId,
          },
        }
      )

      const result = response.data
      console.log(
        `[Sync V2] Server responded with ${result.newChanges.length} new changes, version ${result.latestServerVersion}`
      )

      // Handle conflicts
      const conflicts = result.conflicts || []
      const successfulChanges = viableChanges.filter(
        change => !conflicts.some(c => c.changeId === change.changeId)
      )

      if (conflicts.length > 0) {
        console.warn(
          `[Sync V2] ${conflicts.length} conflicts occurred:`,
          conflicts
        )

        // Increment retry count for conflicted changes
        for (const conflict of conflicts) {
          await changeQueue.incrementRetryCount(conflict.changeId)
        }
      }

      // Remove successfully synced changes from queue
      if (successfulChanges.length > 0) {
        const successfulIds = successfulChanges.map(c => c.changeId)
        await changeQueue.removeChanges(successfulIds)
        console.log(
          `[Sync V2] Removed ${successfulIds.length} successfully synced changes from queue`
        )
      }

      // Update metadata
      const newMetadata: SyncMetadata = {
        lastKnownServerVersion: result.latestServerVersion,
        lastSyncTime: Date.now(),
        deviceId: this.deviceId,
      }
      await changeQueue.setSyncMetadata(newMetadata)

      console.log(`[Sync V2] Sync completed successfully`)

      return {
        success: true,
        changesApplied: result.newChanges.length,
        changesPushed: successfulChanges.length,
        conflicts: conflicts.length,
      }
    } catch (error) {
      console.error('[Sync V2] Sync failed:', error)

      // On network error, don't increment retry counts - just wait for next sync
      return {
        success: false,
        changesApplied: 0,
        changesPushed: 0,
        conflicts: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Get sync status from server
   */
  async getStatus(): Promise<SyncStatus> {
    const response = await apiClient.get<SyncStatus>('/api/sync/v2/status')
    return response.data
  }

  /**
   * Migrate user from old sync system to new delta-based system
   */
  async migrate(): Promise<MigrationResult> {
    const response = await apiClient.post<MigrationResult>(
      '/api/sync/v2/migrate'
    )
    return response.data
  }

  /**
   * Add a change to the local queue (for immediate UI updates)
   */
  async queueChange(
    change: Omit<ChangeRecord, 'changeId' | 'timestamp' | 'retryCount'>
  ): Promise<string> {
    const changeId = await changeQueue.addChange(change)
    console.log(
      `[Sync V2] Queued ${change.type} change for ${change.entityType} ${change.entityId}`
    )

    // Trigger background sync if online
    if (navigator.onLine) {
      // Don't await - let it happen in background
      this.sync().catch(error => {
        console.warn('[Sync V2] Background sync failed:', error)
      })
    }

    return changeId
  }

  /**
   * Get local sync statistics
   */
  async getLocalStats(): Promise<{
    pendingChanges: number
    failedChanges: number
    lastSyncTime: number | null
    oldestChange: number | null
  }> {
    const [stats, metadata] = await Promise.all([
      changeQueue.getStats(),
      changeQueue.getSyncMetadata(),
    ])

    return {
      pendingChanges: stats.totalChanges,
      failedChanges: stats.failedChanges,
      lastSyncTime: metadata?.lastSyncTime || null,
      oldestChange: stats.oldestChange,
    }
  }

  /**
   * Force sync (ignore debouncing)
   */
  async forceSync(): Promise<ReturnType<typeof this.sync>> {
    return this.sync()
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress
  }
}

// Singleton instance
export const syncV2Api = new SyncV2API()

// Auto-sync triggers
class AutoSyncManager {
  private syncInterval: number | null = null
  private isOnline = navigator.onLine
  private lastSyncTrigger = 0
  private readonly SYNC_INTERVAL = 30000 // 30 seconds
  private readonly MIN_SYNC_INTERVAL = 5000 // 5 seconds minimum between syncs

  constructor() {
    this.setupEventListeners()
    this.startPeriodicSync()
  }

  private setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      console.log('[Sync V2] Device came online, triggering sync')
      this.isOnline = true
      this.triggerSync('online')
    })

    window.addEventListener('offline', () => {
      console.log('[Sync V2] Device went offline')
      this.isOnline = false
    })

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.triggerSync('visibility')
      }
    })

    // Page focus/blur
    window.addEventListener('focus', () => {
      if (this.isOnline) {
        this.triggerSync('focus')
      }
    })
  }

  private startPeriodicSync() {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline) {
        this.triggerSync('periodic')
      }
    }, this.SYNC_INTERVAL)
  }

  private async triggerSync(reason: string) {
    const now = Date.now()

    // Debounce rapid triggers
    if (now - this.lastSyncTrigger < this.MIN_SYNC_INTERVAL) {
      console.log(
        `[Sync V2] Skipping ${reason} sync - too soon since last trigger`
      )
      return
    }

    this.lastSyncTrigger = now

    try {
      console.log(`[Sync V2] Triggering sync due to: ${reason}`)
      await syncV2Api.sync()
    } catch (error) {
      console.error(`[Sync V2] Auto-sync failed (${reason}):`, error)
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

// Initialize auto-sync when module loads
let autoSyncManager: AutoSyncManager | null = null

export function startAutoSync() {
  if (!autoSyncManager) {
    autoSyncManager = new AutoSyncManager()
    console.log('[Sync V2] Auto-sync started')
  }
}

export function stopAutoSync() {
  if (autoSyncManager) {
    autoSyncManager.stop()
    autoSyncManager = null
    console.log('[Sync V2] Auto-sync stopped')
  }
}

// Start auto-sync by default
if (typeof window !== 'undefined') {
  startAutoSync()
}
