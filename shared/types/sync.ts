/**
 * Shared sync types for the new sync system
 * These types are used by both frontend sync services and backend sync resolvers
 */

// Sync status for entities
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict'

// Base interface for all syncable entities
export interface SyncableBase {
  id: string
  localId: string
  remoteId?: string
  createdAt: number // timestamp
  updatedAt: number // timestamp
  deletedAt?: number // timestamp
  syncStatus: SyncStatus
  syncVersion: number
  checksum: string
}

// Entity types that can be synced
export type SyncableEntityType =
  | 'practiceSession'
  | 'practiceLog'
  | 'goal'
  | 'logbookEntry'

// Sync metadata stored per user
export interface SyncMetadata {
  lastSyncTimestamp: number
  syncToken: string | null
  pendingSyncCount: number
  lastSyncStatus: 'success' | 'partial' | 'failed' | 'never_synced'
  lastSyncError?: string
}

// Sync operation for queue
export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: unknown
  timestamp: number
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retryCount: number
  error?: string
}

// Conflict detection
export interface SyncConflict {
  localEntity: SyncableBase & { data: unknown }
  remoteEntity: SyncableBase & { data: unknown }
  type: 'update-update' | 'delete-update' | 'create-create'
  detectedAt: number
}

// Sync result
export interface SyncResult {
  status: 'success' | 'partial' | 'failed' | 'skipped' | 'timeout'
  message?: string
  uploaded?: number
  downloaded?: number
  conflicts?: number
  merged?: number
  errors?: Array<{ code: string; message: string; details?: unknown }>
}

// Sync state for UI
export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline'
  lastSync: number | null
  pendingOperations: number
  error: { code: string; message: string; details?: unknown } | null
}

// Helper to add sync fields to existing types
export type WithSync<T> = T & {
  syncStatus: SyncStatus
  syncVersion: number
  isSynced: boolean // For backward compatibility
}
