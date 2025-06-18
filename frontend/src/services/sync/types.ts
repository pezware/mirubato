/**
 * Core types for the sync system
 */

export interface SyncMetadata {
  lastSyncTimestamp: number
  syncToken: string | null
  pendingSyncCount: number
  lastSyncStatus: 'success' | 'partial' | 'failed'
  lastSyncError?: string
}

export interface SyncableEntity {
  id: string
  localId: string
  remoteId?: string
  createdAt: number
  updatedAt: number
  deletedAt?: number
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict'
  syncVersion: number
  checksum: string
  entityType: 'practiceSession' | 'practiceLog' | 'goal' | 'logbookEntry'
  deviceId?: string // Track which device created/modified this
  data: unknown
}

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

export interface SyncResult {
  status: 'success' | 'partial' | 'failed' | 'skipped' | 'timeout'
  message?: string
  uploaded?: number
  downloaded?: number
  conflicts?: number
  merged?: number
  errors?: SyncError[]
}

export interface SyncError {
  code: string
  message: string
  details?: unknown
}

export interface SyncBatch {
  entities: SyncableEntity[]
  userId: string
  syncToken: string | null
}

export interface SyncDelta {
  entities: SyncableEntity[]
  deletedIds: string[]
  newSyncToken: string
}

export interface Conflict {
  localEntity: SyncableEntity
  remoteEntity: SyncableEntity
  type: 'update-update' | 'delete-update' | 'create-create'
  detectedAt: number
}

export interface ResolvedEntity extends SyncableEntity {
  conflictResolution?: {
    strategy: string
    resolvedAt: number
    originalLocal?: unknown
    originalRemote?: unknown
  }
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSync: number | null
  pendingOperations: number
  error: SyncError | null
}

// Entity-specific types
export interface SyncablePracticeSession extends SyncableEntity {
  entityType: 'practiceSession'
  data: {
    userId: string
    instrument: string
    sheetMusicId?: string | null
    sessionType: string
    startedAt: string
    completedAt?: string | null
    pausedDuration: number
    accuracyPercentage?: number | null
    notesAttempted: number
    notesCorrect: number
    sheetMusicTitle?: string
  }
}

export interface SyncablePracticeLog extends SyncableEntity {
  entityType: 'practiceLog'
  data: {
    sessionId: string
    message: string
    level: 'info' | 'warning' | 'error' | 'success'
    timestamp: string
    metadata?: Record<string, unknown>
  }
}

export interface SyncableGoal extends SyncableEntity {
  entityType: 'goal'
  data: {
    title: string
    description?: string
    targetValue: number
    currentValue: number
    unit: string
    deadline?: string
    completed: boolean
    completedAt?: string
  }
}

export interface SyncableLogbookEntry extends SyncableEntity {
  entityType: 'logbookEntry'
  data: {
    date: string
    practiceMinutes: number
    repertoirePieces: number
    techniqueMinutes: number
    notes?: string
    mood?: 'great' | 'good' | 'okay' | 'frustrated'
    goals?: string[]
  }
}
