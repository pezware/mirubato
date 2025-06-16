import {
  SyncMetadata,
  SyncableEntity,
  SyncablePracticeSession,
  SyncablePracticeLog,
  SyncableGoal,
  SyncableLogbookEntry,
} from './types'
import { createHash } from './utils'

const SYNC_METADATA_KEY = 'sync:metadata'
const SYNC_ENTITIES_KEY = 'sync:entities'

/**
 * Service for managing local sync data and operations
 */
export class LocalSyncService {
  constructor(private storage: Storage = localStorage) {}

  /**
   * Get sync metadata for a user
   */
  async getSyncMetadata(userId: string): Promise<SyncMetadata | null> {
    const key = `${SYNC_METADATA_KEY}:${userId}`
    const data = this.storage.getItem(key)
    return data ? JSON.parse(data) : null
  }

  /**
   * Save sync metadata for a user
   */
  async saveSyncMetadata(
    userId: string,
    metadata: SyncMetadata
  ): Promise<void> {
    const key = `${SYNC_METADATA_KEY}:${userId}`
    this.storage.setItem(key, JSON.stringify(metadata))
  }

  /**
   * Get all unsynced entities
   */
  async getUnsyncedEntries(): Promise<SyncableEntity[]> {
    const entities = await this.getAllEntities()
    return entities.filter(e => e.syncStatus === 'pending' && !e.deletedAt)
  }

  /**
   * Get all entities from local storage
   */
  async getAllEntities(): Promise<SyncableEntity[]> {
    const allEntities: SyncableEntity[] = []

    // Get practice sessions
    const sessions = this.getPracticeSessionsFromStorage()
    allEntities.push(...sessions)

    // Get practice logs
    const logs = this.getPracticeLogsFromStorage()
    allEntities.push(...logs)

    // Get goals
    const goals = this.getGoalsFromStorage()
    allEntities.push(...goals)

    // Get logbook entries
    const entries = this.getLogbookEntriesFromStorage()
    allEntities.push(...entries)

    return allEntities
  }

  /**
   * Mark entities as synced
   */
  async markAsSynced(ids: string[]): Promise<void> {
    const entities = await this.getAllEntities()

    const updatedEntities = entities.map(entity => {
      if (ids.includes(entity.id)) {
        return {
          ...entity,
          syncStatus: 'synced' as const,
          syncVersion: entity.syncVersion + 1,
        }
      }
      return entity
    })

    await this.saveAllEntities(updatedEntities)
  }

  /**
   * Save remote changes to local storage
   */
  async saveRemoteChanges(entities: SyncableEntity[]): Promise<void> {
    const existingEntities = await this.getAllEntities()
    const entityMap = new Map(existingEntities.map(e => [e.id, e]))

    // Merge remote changes
    entities.forEach(remoteEntity => {
      const existing = entityMap.get(remoteEntity.id)

      if (!existing || remoteEntity.updatedAt > existing.updatedAt) {
        entityMap.set(remoteEntity.id, {
          ...remoteEntity,
          syncStatus: 'synced',
        })
      }
    })

    await this.saveAllEntities(Array.from(entityMap.values()))
  }

  /**
   * Replace all entities (used for full sync)
   */
  async replaceAllEntities(entities: SyncableEntity[]): Promise<void> {
    // Clear existing data
    this.clearEntityStorage()

    // Save new data
    await this.saveAllEntities(entities)
  }

  /**
   * Queue pending changes for later sync
   */
  async queuePendingChanges(entities: SyncableEntity[]): Promise<void> {
    const queueKey = 'sync:pendingQueue'
    const existingQueue = this.storage.getItem(queueKey)
    const queue = existingQueue ? JSON.parse(existingQueue) : []

    const updatedQueue = [...queue, ...entities]
    this.storage.setItem(queueKey, JSON.stringify(updatedQueue))
  }

  /**
   * Get pending queue
   */
  async getPendingQueue(): Promise<SyncableEntity[]> {
    const queueKey = 'sync:pendingQueue'
    const data = this.storage.getItem(queueKey)
    return data ? JSON.parse(data) : []
  }

  /**
   * Clear pending queue
   */
  async clearPendingQueue(): Promise<void> {
    this.storage.removeItem('sync:pendingQueue')
  }

  // Private helper methods

  private getPracticeSessionsFromStorage(): SyncablePracticeSession[] {
    const sessions: SyncablePracticeSession[] = []

    // Get from legacy practice_sessions key
    const legacyData = this.storage.getItem('practice_sessions')
    if (legacyData) {
      const legacySessions = JSON.parse(legacyData)
      sessions.push(...this.convertLegacyPracticeSessions(legacySessions))
    }

    // Get from new sync storage
    const syncData = this.storage.getItem(
      `${SYNC_ENTITIES_KEY}:practiceSession`
    )
    if (syncData) {
      sessions.push(...JSON.parse(syncData))
    }

    return sessions
  }

  private getPracticeLogsFromStorage(): SyncablePracticeLog[] {
    const logs: SyncablePracticeLog[] = []

    // Get from legacy storage
    const keys = Object.keys(this.storage).filter(k =>
      k.startsWith('practice_logs:')
    )
    keys.forEach(key => {
      const data = this.storage.getItem(key)
      if (data) {
        const sessionLogs = JSON.parse(data)
        logs.push(...this.convertLegacyPracticeLogs(sessionLogs, key))
      }
    })

    // Get from new sync storage
    const syncData = this.storage.getItem(`${SYNC_ENTITIES_KEY}:practiceLog`)
    if (syncData) {
      logs.push(...JSON.parse(syncData))
    }

    return logs
  }

  private getGoalsFromStorage(): SyncableGoal[] {
    const goals: SyncableGoal[] = []

    // Get from module storage
    const moduleData = this.storage.getItem('practiceLogger:goals')
    if (moduleData) {
      const moduleGoals = JSON.parse(moduleData)
      goals.push(...this.convertModuleGoals(moduleGoals))
    }

    // Get from new sync storage
    const syncData = this.storage.getItem(`${SYNC_ENTITIES_KEY}:goal`)
    if (syncData) {
      goals.push(...JSON.parse(syncData))
    }

    return goals
  }

  private getLogbookEntriesFromStorage(): SyncableLogbookEntry[] {
    const entries: SyncableLogbookEntry[] = []

    // Get from module storage
    const moduleData = this.storage.getItem('practiceLogger:entries')
    if (moduleData) {
      const moduleEntries = JSON.parse(moduleData)
      entries.push(...this.convertModuleLogbookEntries(moduleEntries))
    }

    // Get from new sync storage
    const syncData = this.storage.getItem(`${SYNC_ENTITIES_KEY}:logbookEntry`)
    if (syncData) {
      entries.push(...JSON.parse(syncData))
    }

    return entries
  }

  private convertLegacyPracticeSessions(
    sessions: unknown[]
  ): SyncablePracticeSession[] {
    return sessions.map(s => {
      const session = s as Record<string, unknown>
      return {
        id: String(session.id),
        localId: String(session.id),
        remoteId: session.remoteId ? String(session.remoteId) : undefined,
        createdAt: new Date(String(session.startedAt)).getTime(),
        updatedAt: session.completedAt
          ? new Date(String(session.completedAt)).getTime()
          : new Date(String(session.startedAt)).getTime(),
        syncStatus: session.isSynced
          ? ('synced' as const)
          : ('pending' as const),
        syncVersion: 1,
        checksum: createHash(session),
        entityType: 'practiceSession' as const,
        data: {
          userId: String(session.userId),
          instrument: String(session.instrument),
          sheetMusicId: session.sheetMusicId
            ? String(session.sheetMusicId)
            : null,
          sessionType: String(session.sessionType) as
            | 'FREE_PRACTICE'
            | 'GUIDED_PRACTICE'
            | 'ASSESSMENT',
          startedAt: String(session.startedAt),
          completedAt: session.completedAt ? String(session.completedAt) : null,
          pausedDuration: Number(session.pausedDuration) || 0,
          accuracyPercentage:
            session.accuracyPercentage !== null &&
            session.accuracyPercentage !== undefined
              ? Number(session.accuracyPercentage)
              : null,
          notesAttempted: Number(session.notesAttempted) || 0,
          notesCorrect: Number(session.notesCorrect) || 0,
          sheetMusicTitle: session.sheetMusicTitle
            ? String(session.sheetMusicTitle)
            : undefined,
        },
      }
    })
  }

  private convertLegacyPracticeLogs(
    logs: unknown[],
    storageKey: string
  ): SyncablePracticeLog[] {
    const sessionId = storageKey.replace('practice_logs:', '')

    return logs.map((l: unknown, index: number) => {
      const log = l as Record<string, unknown>
      return {
        id: `${sessionId}_log_${index}`,
        localId: `${sessionId}_log_${index}`,
        createdAt: new Date(String(log.timestamp)).getTime(),
        updatedAt: new Date(String(log.timestamp)).getTime(),
        syncStatus: 'pending' as const,
        syncVersion: 1,
        checksum: createHash(log),
        entityType: 'practiceLog' as const,
        data: {
          sessionId,
          message: String(log.message),
          level: String(log.level) as 'info' | 'warning' | 'error' | 'success',
          timestamp: String(log.timestamp),
          metadata: log.metadata as Record<string, unknown> | undefined,
        },
      }
    })
  }

  private convertModuleGoals(goals: unknown[]): SyncableGoal[] {
    return goals.map(g => {
      const goal = g as Record<string, unknown>
      return {
        id: String(goal.id),
        localId: String(goal.id),
        createdAt: new Date(String(goal.createdAt)).getTime(),
        updatedAt: new Date(String(goal.updatedAt || goal.createdAt)).getTime(),
        syncStatus: 'pending' as const,
        syncVersion: 1,
        checksum: createHash(goal),
        entityType: 'goal' as const,
        data: {
          title: String(goal.title),
          description: goal.description ? String(goal.description) : undefined,
          targetValue: Number(goal.targetValue),
          currentValue: Number(goal.currentValue || 0),
          unit: String(goal.unit),
          deadline: goal.deadline ? String(goal.deadline) : undefined,
          completed: Boolean(goal.completed),
          completedAt: goal.completedAt ? String(goal.completedAt) : undefined,
        },
      }
    })
  }

  private convertModuleLogbookEntries(
    entries: unknown[]
  ): SyncableLogbookEntry[] {
    return entries.map(e => {
      const entry = e as Record<string, unknown>
      return {
        id: String(entry.id),
        localId: String(entry.id),
        createdAt: new Date(String(entry.date)).getTime(),
        updatedAt: new Date(String(entry.date)).getTime(),
        syncStatus: 'pending' as const,
        syncVersion: 1,
        checksum: createHash(entry),
        entityType: 'logbookEntry' as const,
        data: {
          date: String(entry.date),
          practiceMinutes: Number(entry.practiceMinutes || 0),
          repertoirePieces: Number(entry.repertoirePieces || 0),
          techniqueMinutes: Number(entry.techniqueMinutes || 0),
          notes: entry.notes ? String(entry.notes) : undefined,
          mood: entry.mood
            ? (String(entry.mood) as 'great' | 'good' | 'okay' | 'frustrated')
            : undefined,
          goals:
            Array.isArray(entry.goals) && entry.goals.length > 0
              ? entry.goals.map(String)
              : undefined,
        },
      }
    })
  }

  private async saveAllEntities(entities: SyncableEntity[]): Promise<void> {
    // Group by entity type
    const grouped = entities.reduce(
      (acc, entity) => {
        if (!acc[entity.entityType]) {
          acc[entity.entityType] = []
        }
        acc[entity.entityType].push(entity)
        return acc
      },
      {} as Record<string, SyncableEntity[]>
    )

    // Save each group
    Object.entries(grouped).forEach(([type, typeEntities]) => {
      const key = `${SYNC_ENTITIES_KEY}:${type}`
      this.storage.setItem(key, JSON.stringify(typeEntities))
    })

    // Also update legacy storage for backward compatibility
    this.updateLegacyStorage(entities)
  }

  private updateLegacyStorage(entities: SyncableEntity[]): void {
    // Update practice sessions
    const sessions = entities.filter(e => e.entityType === 'practiceSession')
    if (sessions.length > 0) {
      const legacySessions = sessions.map(s => {
        const data = s.data as SyncablePracticeSession['data']
        return {
          id: s.id,
          remoteId: s.remoteId,
          userId: data.userId,
          instrument: data.instrument,
          sheetMusicId: data.sheetMusicId,
          sessionType: data.sessionType,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          pausedDuration: data.pausedDuration,
          accuracyPercentage: data.accuracyPercentage,
          notesAttempted: data.notesAttempted,
          notesCorrect: data.notesCorrect,
          sheetMusicTitle: data.sheetMusicTitle,
          isSynced: s.syncStatus === 'synced',
        }
      })
      this.storage.setItem('practice_sessions', JSON.stringify(legacySessions))
    }
  }

  private clearEntityStorage(): void {
    // Clear new sync storage
    const syncKeys = Object.keys(this.storage).filter(k =>
      k.startsWith(SYNC_ENTITIES_KEY)
    )
    syncKeys.forEach(key => this.storage.removeItem(key))

    // Clear legacy storage
    this.storage.removeItem('practice_sessions')
    const logKeys = Object.keys(this.storage).filter(k =>
      k.startsWith('practice_logs:')
    )
    logKeys.forEach(key => this.storage.removeItem(key))
  }
}
