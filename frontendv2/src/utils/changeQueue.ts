/**
 * IndexedDB-based change queue for offline-first sync
 * Replaces localStorage with robust persistent storage
 */

import { nanoid } from 'nanoid'

export interface ChangeRecord {
  changeId: string // Client-generated UUID for idempotency
  type: 'CREATED' | 'UPDATED' | 'DELETED'
  entityType: 'logbook_entry' | 'goal'
  entityId: string
  data?: unknown // Full object for CREATED, delta for UPDATED, omitted for DELETED
  timestamp: number // When change was made locally
  retryCount: number // How many times we've tried to sync this
}

export interface SyncMetadata {
  lastKnownServerVersion: number
  lastSyncTime: number
  deviceId: string
}

class ChangeQueueDB {
  private db: IDBDatabase | null = null
  private dbName = 'mirubato_sync'
  private version = 1

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        // Change queue store
        if (!db.objectStoreNames.contains('changes')) {
          const changeStore = db.createObjectStore('changes', {
            keyPath: 'changeId',
          })
          changeStore.createIndex('timestamp', 'timestamp')
          changeStore.createIndex('entityType', 'entityType')
          changeStore.createIndex('retryCount', 'retryCount')
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      }
    })
  }

  async addChange(
    change: Omit<ChangeRecord, 'changeId' | 'timestamp' | 'retryCount'>
  ): Promise<string> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const changeRecord: ChangeRecord = {
      ...change,
      changeId: nanoid(),
      timestamp: Date.now(),
      retryCount: 0,
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction(['changes'], 'readwrite')
      const store = transaction.objectStore('changes')
      const request = store.add(changeRecord)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(changeRecord.changeId)
    })
  }

  async getAllPendingChanges(): Promise<ChangeRecord[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction(['changes'], 'readonly')
      const store = transaction.objectStore('changes')
      const index = store.index('timestamp')
      const request = index.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async removeChanges(changeIds: string[]): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction(['changes'], 'readwrite')
      const store = transaction.objectStore('changes')

      let completed = 0
      let hasError = false

      for (const changeId of changeIds) {
        const request = store.delete(changeId)

        request.onerror = () => {
          if (!hasError) {
            hasError = true
            reject(request.error)
          }
        }

        request.onsuccess = () => {
          completed++
          if (completed === changeIds.length && !hasError) {
            resolve()
          }
        }
      }

      if (changeIds.length === 0) resolve()
    })
  }

  async incrementRetryCount(changeId: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction(['changes'], 'readwrite')
      const store = transaction.objectStore('changes')
      const getRequest = store.get(changeId)

      getRequest.onerror = () => reject(getRequest.error)
      getRequest.onsuccess = () => {
        const change = getRequest.result
        if (change) {
          change.retryCount++
          const putRequest = store.put(change)
          putRequest.onerror = () => reject(putRequest.error)
          putRequest.onsuccess = () => resolve()
        } else {
          resolve() // Change no longer exists
        }
      }
    })
  }

  async getSyncMetadata(): Promise<SyncMetadata | null> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction(['metadata'], 'readonly')
      const store = transaction.objectStore('metadata')
      const request = store.get('sync')

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result?.value || null)
    })
  }

  async setSyncMetadata(metadata: SyncMetadata): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction(['metadata'], 'readwrite')
      const store = transaction.objectStore('metadata')
      const request = store.put({ key: 'sync', value: metadata })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearAll(): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'))

      const transaction = this.db.transaction(
        ['changes', 'metadata'],
        'readwrite'
      )

      const changesStore = transaction.objectStore('changes')
      const metadataStore = transaction.objectStore('metadata')

      changesStore.clear()
      metadataStore.clear()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  async getStats(): Promise<{
    totalChanges: number
    changesByType: Record<string, number>
    oldestChange: number | null
    failedChanges: number
  }> {
    const changes = await this.getAllPendingChanges()

    const stats = {
      totalChanges: changes.length,
      changesByType: {} as Record<string, number>,
      oldestChange: null as number | null,
      failedChanges: 0,
    }

    for (const change of changes) {
      // Count by type
      const key = `${change.type}_${change.entityType}`
      stats.changesByType[key] = (stats.changesByType[key] || 0) + 1

      // Track oldest
      if (!stats.oldestChange || change.timestamp < stats.oldestChange) {
        stats.oldestChange = change.timestamp
      }

      // Count failures
      if (change.retryCount > 0) {
        stats.failedChanges++
      }
    }

    return stats
  }
}

// Singleton instance
export const changeQueue = new ChangeQueueDB()

// Device ID management
const DEVICE_ID_KEY = 'mirubato_device_id'

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = `web_${nanoid()}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}

// Migration helper: Move localStorage data to IndexedDB
export async function migrateFromLocalStorage(): Promise<{
  entriesMigrated: number
  goalsMigrated: number
}> {
  const ENTRIES_KEY = 'mirubato:logbook:entries'
  const GOALS_KEY = 'mirubato:logbook:goals'

  const stats = { entriesMigrated: 0, goalsMigrated: 0 }

  try {
    // Migrate entries
    const entriesData = localStorage.getItem(ENTRIES_KEY)
    if (entriesData) {
      const entries = JSON.parse(entriesData)
      for (const entry of entries) {
        await changeQueue.addChange({
          type: 'CREATED',
          entityType: 'logbook_entry',
          entityId: entry.id,
          data: entry,
        })
        stats.entriesMigrated++
      }
    }

    // Migrate goals
    const goalsData = localStorage.getItem(GOALS_KEY)
    if (goalsData) {
      const goals = JSON.parse(goalsData)
      for (const goal of goals) {
        await changeQueue.addChange({
          type: 'CREATED',
          entityType: 'goal',
          entityId: goal.id,
          data: goal,
        })
        stats.goalsMigrated++
      }
    }

    console.log('[Migration] Migrated from localStorage:', stats)
    return stats
  } catch (error) {
    console.error('[Migration] Failed to migrate from localStorage:', error)
    return stats
  }
}

// Debug utilities
export const changeQueueDebug = {
  async getAll() {
    return changeQueue.getAllPendingChanges()
  },

  async getStats() {
    return changeQueue.getStats()
  },

  async clear() {
    return changeQueue.clearAll()
  },

  async export() {
    const changes = await changeQueue.getAllPendingChanges()
    const metadata = await changeQueue.getSyncMetadata()
    const stats = await changeQueue.getStats()

    const exportData = {
      changes,
      metadata,
      stats,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mirubato-sync-data-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  },
}
