import { apiClient } from './client'
import { type LogbookEntry, type Goal } from './logbook'
import { sanitizeForD1 } from '../utils/sanitizeForD1'

export interface SyncData {
  entries: LogbookEntry[]
  goals: Goal[]
  syncToken: string
  timestamp: string
}

export interface SyncChanges {
  changes: {
    entries: LogbookEntry[]
    goals: Goal[]
  }
  lastSyncToken?: string
}

export interface SyncResult {
  success: boolean
  syncToken: string
  conflicts: Array<{
    entityId: string
    localVersion: number
    remoteVersion: number
  }>
}

export interface BatchSyncResult {
  uploaded: number
  downloaded: number
  conflicts: Array<{
    entityId: string
    localVersion: number
    remoteVersion: number
  }>
  newSyncToken: string
}

export interface SyncStatus {
  lastSyncTime: string | null
  syncToken: string | null
  pendingChanges: number
  deviceCount: number
  entityCount: number
}

export const syncApi = {
  // Pull all user data from cloud
  pull: async (): Promise<SyncData> => {
    const response = await apiClient.post<SyncData>('/api/sync/pull')
    return response.data
  },

  // Push local changes to cloud
  push: async (changes: SyncChanges): Promise<SyncResult> => {
    // Sanitize all entries and goals before sending to prevent D1 errors
    const sanitizedChanges = {
      changes: {
        entries: changes.changes.entries.map(
          entry => sanitizeForD1(entry) as LogbookEntry
        ),
        goals: changes.changes.goals.map(goal => sanitizeForD1(goal) as Goal),
      },
      lastSyncToken: changes.lastSyncToken,
    }

    const response = await apiClient.post<SyncResult>(
      '/api/sync/push',
      sanitizedChanges
    )
    return response.data
  },

  // Bidirectional sync batch operation
  batch: async (
    entities: Array<{
      id: string
      type: 'logbook_entry' | 'goal'
      data: LogbookEntry | Goal
      checksum: string
      version: number
    }>,
    syncToken?: string
  ): Promise<BatchSyncResult> => {
    // Sanitize entity data before sending
    const sanitizedEntities = entities.map(entity => ({
      ...entity,
      data: sanitizeForD1(entity.data) as LogbookEntry | Goal,
    }))

    const response = await apiClient.post<BatchSyncResult>('/api/sync/batch', {
      entities: sanitizedEntities,
      syncToken,
    })
    return response.data
  },

  // Get sync status
  getStatus: async (): Promise<SyncStatus> => {
    const response = await apiClient.get<SyncStatus>('/api/sync/status')
    return response.data
  },
}
