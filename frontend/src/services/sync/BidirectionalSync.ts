import { LogbookEntry, Goal } from '../../modules/logger/types'
import { StorageModule } from '../../modules/infrastructure/StorageModule'
import { EventBus } from '../../modules/core/EventBus'
import { DuplicateDetector } from './DuplicateDetector'
import { SyncableEntity } from './types'
import { createHash } from './utils'

export interface CloudEntry {
  id: string
  timestamp: string
  duration: number
  type: string
  instrument: string
  pieces: Array<{ id?: string; title: string; composer?: string }>
  techniques: string[]
  goalIds: string[]
  notes: string
  mood?: string
  tags: string[]
  metadata?: Record<string, unknown>
  updatedAt?: string
  syncVersion?: number
}

export interface CloudGoal {
  id: string
  title: string
  description: string
  targetDate?: string
  milestones: Array<{ id: string; title: string; completed: boolean }>
  updatedAt?: string
  syncVersion?: number
}

export interface BidirectionalSyncResult {
  localToCloud: {
    entries: number
    goals: number
  }
  cloudToLocal: {
    entries: number
    goals: number
  }
  conflicts: {
    entries: number
    goals: number
  }
}

export class BidirectionalSync {
  private duplicateDetector: DuplicateDetector

  constructor(
    private storageModule: StorageModule,
    private eventBus: EventBus,
    private userId: string
  ) {
    this.duplicateDetector = new DuplicateDetector()
  }

  async performSync(
    localEntries: LogbookEntry[],
    localGoals: Goal[],
    cloudEntries: CloudEntry[],
    cloudGoals: CloudGoal[]
  ): Promise<BidirectionalSyncResult> {
    const result: BidirectionalSyncResult = {
      localToCloud: { entries: 0, goals: 0 },
      cloudToLocal: { entries: 0, goals: 0 },
      conflicts: { entries: 0, goals: 0 },
    }

    // Step 1: Convert to SyncableEntity format for deduplication
    const localEntriesAsSyncable =
      this.convertLocalEntriesToSyncable(localEntries)
    const cloudEntriesAsSyncable =
      this.convertCloudEntriesToSyncable(cloudEntries)

    // Step 2: Merge and deduplicate entries
    const mergedEntries = await this.mergeEntries(
      localEntriesAsSyncable,
      cloudEntriesAsSyncable,
      result
    )

    // Step 3: Apply merged entries to local storage
    await this.applyMergedEntriesToLocal(mergedEntries)

    // Step 4: Merge and deduplicate goals
    const localGoalsAsSyncable = this.convertLocalGoalsToSyncable(localGoals)
    const cloudGoalsAsSyncable = this.convertCloudGoalsToSyncable(cloudGoals)

    const mergedGoals = await this.mergeGoals(
      localGoalsAsSyncable,
      cloudGoalsAsSyncable,
      result
    )

    // Step 5: Apply merged goals to local storage
    await this.applyMergedGoalsToLocal(mergedGoals)

    return result
  }

  private async mergeEntries(
    local: SyncableEntity[],
    cloud: SyncableEntity[],
    result: BidirectionalSyncResult
  ): Promise<SyncableEntity[]> {
    // Combine all entries
    const allEntries = [...local, ...cloud]

    // Deduplicate by ID
    const merged = await this.duplicateDetector.detectAndMerge(allEntries)

    // Track what needs to be synced where
    for (const entity of merged) {
      const existsLocally = local.some(l => l.id === entity.id)
      const existsInCloud = cloud.some(c => c.id === entity.id)

      if (existsLocally && existsInCloud) {
        // Check if there's a conflict
        const localEntity = local.find(l => l.id === entity.id)!
        const cloudEntity = cloud.find(c => c.id === entity.id)!

        if (localEntity.checksum !== cloudEntity.checksum) {
          result.conflicts.entries++
          // The duplicate detector already resolved this by choosing the newer one
        }
      } else if (existsLocally && !existsInCloud) {
        result.localToCloud.entries++
      } else if (!existsLocally && existsInCloud) {
        result.cloudToLocal.entries++
      }
    }

    return merged
  }

  private async mergeGoals(
    local: SyncableEntity[],
    cloud: SyncableEntity[],
    result: BidirectionalSyncResult
  ): Promise<SyncableEntity[]> {
    const allGoals = [...local, ...cloud]
    const merged = await this.duplicateDetector.detectAndMerge(allGoals)

    for (const entity of merged) {
      const existsLocally = local.some(l => l.id === entity.id)
      const existsInCloud = cloud.some(c => c.id === entity.id)

      if (existsLocally && existsInCloud) {
        const localEntity = local.find(l => l.id === entity.id)!
        const cloudEntity = cloud.find(c => c.id === entity.id)!

        if (localEntity.checksum !== cloudEntity.checksum) {
          result.conflicts.goals++
        }
      } else if (existsLocally && !existsInCloud) {
        result.localToCloud.goals++
      } else if (!existsLocally && existsInCloud) {
        result.cloudToLocal.goals++
      }
    }

    return merged
  }

  private async applyMergedEntriesToLocal(
    entities: SyncableEntity[]
  ): Promise<void> {
    for (const entity of entities) {
      const entryData = entity.data as Record<string, unknown>
      const entry: LogbookEntry = {
        id: entity.id,
        userId: this.userId,
        timestamp: entryData.timestamp as number,
        duration: entryData.duration as number,
        type: entryData.type as LogbookEntry['type'],
        instrument: entryData.instrument as LogbookEntry['instrument'],
        pieces: entryData.pieces as LogbookEntry['pieces'],
        techniques: entryData.techniques as string[],
        goals: (entryData.goalIds as string[]) || [],
        notes: (entryData.notes as string) || '',
        mood: entryData.mood as LogbookEntry['mood'],
        tags: (entryData.tags as string[]) || [],
        metadata: entryData.metadata as LogbookEntry['metadata'],
      }

      // Save to storage
      await this.storageModule.saveLocal(`logbook:${entity.id}`, entry)

      // Emit event
      this.eventBus.publish({
        source: 'BidirectionalSync',
        type: 'logger:entry:synced',
        data: { entry },
        metadata: { userId: this.userId, version: '1.0.0' },
      })
    }
  }

  private async applyMergedGoalsToLocal(
    entities: SyncableEntity[]
  ): Promise<void> {
    for (const entity of entities) {
      const goalData = entity.data as Record<string, unknown>
      const goal: Goal = {
        id: entity.id,
        userId: this.userId,
        title: goalData.title as string,
        description: goalData.description as string,
        targetDate: goalData.targetDate as number,
        progress: (goalData.currentValue as number) || 0,
        milestones: (goalData.milestones as Goal['milestones']) || [],
        status: goalData.completed ? 'completed' : 'active',
        linkedEntries: (goalData.linkedEntries as string[]) || [],
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      }

      // Save to storage
      await this.storageModule.saveLocal(`goal:${entity.id}`, goal)

      // Emit event
      this.eventBus.publish({
        source: 'BidirectionalSync',
        type: 'logger:goal:synced',
        data: { goal },
        metadata: { userId: this.userId, version: '1.0.0' },
      })
    }
  }

  // Conversion helpers
  private convertLocalEntriesToSyncable(
    entries: LogbookEntry[]
  ): SyncableEntity[] {
    return entries.map(entry => ({
      id: entry.id,
      localId: entry.id,
      entityType: 'logbookEntry' as const,
      data: {
        timestamp: entry.timestamp,
        duration: entry.duration,
        type: entry.type,
        instrument: entry.instrument,
        pieces: entry.pieces,
        techniques: entry.techniques,
        goalIds: entry.goals || [],
        notes: entry.notes,
        mood: entry.mood,
        tags: entry.tags,
        metadata: entry.metadata,
      },
      createdAt: entry.timestamp,
      updatedAt: entry.timestamp,
      syncVersion: 1,
      checksum: createHash(entry),
      syncStatus: 'pending' as const,
      deviceId: entry.metadata?.deviceId as string | undefined,
    }))
  }

  private convertCloudEntriesToSyncable(
    entries: CloudEntry[]
  ): SyncableEntity[] {
    return entries.map(entry => ({
      id: entry.id,
      localId: entry.id,
      remoteId: entry.id,
      entityType: 'logbookEntry' as const,
      data: {
        timestamp: new Date(entry.timestamp).getTime(),
        duration: entry.duration,
        type: entry.type.toLowerCase(),
        instrument: entry.instrument,
        pieces: entry.pieces,
        techniques: entry.techniques,
        goalIds: entry.goalIds,
        notes: entry.notes,
        mood: entry.mood?.toLowerCase(),
        tags: entry.tags,
        metadata: entry.metadata,
      },
      createdAt: new Date(entry.timestamp).getTime(),
      updatedAt: entry.updatedAt
        ? new Date(entry.updatedAt).getTime()
        : Date.now(),
      syncVersion: entry.syncVersion || 1,
      checksum: createHash(entry),
      syncStatus: 'synced' as const,
    }))
  }

  private convertLocalGoalsToSyncable(goals: Goal[]): SyncableEntity[] {
    return goals.map(goal => ({
      id: goal.id,
      localId: goal.id,
      entityType: 'goal' as const,
      data: {
        title: goal.title,
        description: goal.description,
        targetDate: goal.targetDate,
        currentValue: goal.progress,
        milestones: goal.milestones,
        completed: goal.status === 'completed',
        linkedEntries: goal.linkedEntries,
      },
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      syncVersion: 1,
      checksum: createHash(goal),
      syncStatus: 'pending' as const,
    }))
  }

  private convertCloudGoalsToSyncable(goals: CloudGoal[]): SyncableEntity[] {
    return goals.map(goal => ({
      id: goal.id,
      localId: goal.id,
      remoteId: goal.id,
      entityType: 'goal' as const,
      data: {
        title: goal.title,
        description: goal.description,
        targetDate: goal.targetDate
          ? new Date(goal.targetDate).getTime()
          : undefined,
        currentValue: 0,
        milestones: goal.milestones,
        completed: false,
      },
      createdAt: Date.now(),
      updatedAt: goal.updatedAt
        ? new Date(goal.updatedAt).getTime()
        : Date.now(),
      syncVersion: goal.syncVersion || 1,
      checksum: createHash(goal),
      syncStatus: 'synced' as const,
    }))
  }
}
