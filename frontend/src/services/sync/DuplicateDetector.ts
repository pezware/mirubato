import { SyncableEntity } from './types'
import { createHash } from './utils'

export interface DuplicateGroup {
  contentHash: string
  entities: SyncableEntity[]
}

/**
 * Service for detecting and merging duplicate entities
 */
export class DuplicateDetector {
  /**
   * Detect and merge duplicates in a set of entities
   */
  async detectAndMerge(entities: SyncableEntity[]): Promise<SyncableEntity[]> {
    // Group entities by content hash
    const groups = this.groupByContent(entities)

    // Merge each group of duplicates
    const merged: SyncableEntity[] = []

    for (const group of groups.values()) {
      if (group.entities.length === 1) {
        // No duplicates
        merged.push(group.entities[0])
      } else {
        // Merge duplicates
        const mergedEntity = this.mergeDuplicates(group.entities)
        merged.push(mergedEntity)
      }
    }

    return merged
  }

  /**
   * Find duplicate entities by comparing content
   */
  findDuplicates(entities: SyncableEntity[]): DuplicateGroup[] {
    const groups = this.groupByContent(entities)

    return Array.from(groups.values()).filter(
      group => group.entities.length > 1
    )
  }

  /**
   * Merge a group of duplicate entities
   */
  mergeDuplicates(duplicates: SyncableEntity[]): SyncableEntity {
    if (duplicates.length === 0) {
      throw new Error('No entities to merge')
    }

    if (duplicates.length === 1) {
      return duplicates[0]
    }

    // Sort by priority: synced > pending, then by update time
    const sorted = duplicates.sort((a, b) => {
      // Prefer synced over pending
      if (a.syncStatus === 'synced' && b.syncStatus !== 'synced') return -1
      if (b.syncStatus === 'synced' && a.syncStatus !== 'synced') return 1

      // Then by update time (newest first)
      return b.updatedAt - a.updatedAt
    })

    // Use the highest priority entity as base
    const base = sorted[0]

    // Merge metadata from all duplicates
    const merged: SyncableEntity = {
      ...base,
      // Keep the oldest creation time
      createdAt: Math.min(...duplicates.map(e => e.createdAt)),
      // Use the newest update time
      updatedAt: Math.max(...duplicates.map(e => e.updatedAt)),
      // Use the highest sync version
      syncVersion: Math.max(...duplicates.map(e => e.syncVersion)),
      // Prefer remote ID if any duplicate has one
      remoteId: duplicates.find(e => e.remoteId)?.remoteId || base.remoteId,
      // Mark as needing sync if any duplicate is pending
      syncStatus: duplicates.some(e => e.syncStatus === 'pending')
        ? 'pending'
        : 'synced',
    }

    // Merge entity-specific data based on type
    if (base.entityType === 'practiceSession') {
      merged.data = this.mergePracticeSessionData(duplicates.map(e => e.data))
    } else if (base.entityType === 'goal') {
      merged.data = this.mergeGoalData(duplicates.map(e => e.data))
    }

    // Update checksum for merged entity
    merged.checksum = createHash(merged.data)

    return merged
  }

  // Private methods

  private groupByContent(
    entities: SyncableEntity[]
  ): Map<string, DuplicateGroup> {
    const groups = new Map<string, DuplicateGroup>()

    for (const entity of entities) {
      const contentHash = this.getContentHash(entity)

      if (!groups.has(contentHash)) {
        groups.set(contentHash, {
          contentHash,
          entities: [],
        })
      }

      groups.get(contentHash)!.entities.push(entity)
    }

    return groups
  }

  private getContentHash(entity: SyncableEntity): string {
    // Create a content hash based on entity type and key fields
    let keyData: Record<string, unknown>

    switch (entity.entityType) {
      case 'practiceSession': {
        const sessionData = entity.data as Record<string, unknown>
        keyData = {
          type: 'practiceSession',
          userId: sessionData.userId,
          instrument: sessionData.instrument,
          startedAt: sessionData.startedAt,
          sheetMusicId: sessionData.sheetMusicId,
        }
        break
      }

      case 'practiceLog': {
        const logData = entity.data as Record<string, unknown>
        keyData = {
          type: 'practiceLog',
          sessionId: logData.sessionId,
          timestamp: logData.timestamp,
          message: logData.message,
        }
        break
      }

      case 'goal': {
        const goalData = entity.data as Record<string, unknown>
        keyData = {
          type: 'goal',
          title: goalData.title,
          targetValue: goalData.targetValue,
          unit: goalData.unit,
        }
        break
      }

      case 'logbookEntry': {
        const entryData = entity.data as Record<string, unknown>
        keyData = {
          type: 'logbookEntry',
          date: entryData.date,
        }
        break
      }

      default:
        keyData = {
          type: entity.entityType,
          id: entity.id,
        }
    }

    return createHash(keyData)
  }

  private mergePracticeSessionData(
    dataArray: unknown[]
  ): Record<string, unknown> {
    // For practice sessions, merge by taking the most complete data
    const sessions = dataArray as Array<Record<string, unknown>>
    const base = sessions[0]

    return {
      ...base,
      // Take the maximum values for numeric fields
      pausedDuration: Math.max(
        ...sessions.map(d => (d.pausedDuration as number) || 0)
      ),
      notesAttempted: Math.max(
        ...sessions.map(d => (d.notesAttempted as number) || 0)
      ),
      notesCorrect: Math.max(
        ...sessions.map(d => (d.notesCorrect as number) || 0)
      ),
      // Use the best accuracy
      accuracyPercentage:
        Math.max(...sessions.map(d => (d.accuracyPercentage as number) || 0)) ||
        null,
      // Use the latest completion time
      completedAt:
        sessions
          .map(d => d.completedAt)
          .filter(Boolean)
          .sort()
          .pop() || null,
    }
  }

  private mergeGoalData(dataArray: unknown[]): Record<string, unknown> {
    // For goals, take the highest progress
    const goals = dataArray as Array<Record<string, unknown>>
    const base = goals[0]

    return {
      ...base,
      // Take the maximum current value (most progress)
      currentValue: Math.max(
        ...goals.map(d => (d.currentValue as number) || 0)
      ),
      // If any is marked completed, use that
      completed: goals.some(d => Boolean(d.completed)),
      // Use the earliest completion time
      completedAt:
        goals
          .map(d => d.completedAt)
          .filter(Boolean)
          .sort()
          .shift() || null,
    }
  }
}
