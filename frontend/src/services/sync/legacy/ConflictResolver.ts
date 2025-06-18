import { SyncableEntity, Conflict, ResolvedEntity } from '../types'

export type ConflictStrategy =
  | 'lastWriteWins'
  | 'firstWriteWins'
  | 'merge'
  | 'userChoice'
  | 'custom'

export interface ConflictResolutionOptions {
  strategy: ConflictStrategy
  customResolver?: (conflict: Conflict) => ResolvedEntity
  userChoiceCallback?: (conflict: Conflict) => Promise<'local' | 'remote'>
}

/**
 * Service for detecting and resolving sync conflicts
 */
export class ConflictResolver {
  constructor(private defaultStrategy: ConflictStrategy = 'lastWriteWins') {}

  /**
   * Detect conflicts between local and remote entities
   */
  async detectConflicts(
    localEntities: SyncableEntity[],
    remoteEntities: SyncableEntity[]
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = []
    const remoteMap = new Map(remoteEntities.map(e => [e.id, e]))

    for (const localEntity of localEntities) {
      const remoteEntity = remoteMap.get(localEntity.id)

      if (!remoteEntity) {
        continue // No conflict - local only
      }

      // Check for conflicts based on different scenarios
      const conflict = this.checkForConflict(localEntity, remoteEntity)
      if (conflict) {
        conflicts.push(conflict)
      }
    }

    return conflicts
  }

  /**
   * Resolve conflicts based on strategy
   */
  async resolveConflicts(
    conflicts: Conflict[],
    strategy: ConflictStrategy = this.defaultStrategy,
    options?: Partial<ConflictResolutionOptions>
  ): Promise<ResolvedEntity[]> {
    const resolved: ResolvedEntity[] = []

    for (const conflict of conflicts) {
      let resolvedEntity: ResolvedEntity

      switch (strategy) {
        case 'lastWriteWins':
          resolvedEntity = this.resolveLastWriteWins(conflict)
          break

        case 'firstWriteWins':
          resolvedEntity = this.resolveFirstWriteWins(conflict)
          break

        case 'merge':
          resolvedEntity = this.resolveMerge(conflict)
          break

        case 'userChoice':
          if (options?.userChoiceCallback) {
            const choice = await options.userChoiceCallback(conflict)
            resolvedEntity =
              choice === 'local'
                ? this.chooseLocal(conflict)
                : this.chooseRemote(conflict)
          } else {
            // Fallback to last write wins
            resolvedEntity = this.resolveLastWriteWins(conflict)
          }
          break

        case 'custom':
          if (options?.customResolver) {
            resolvedEntity = options.customResolver(conflict)
          } else {
            // Fallback to last write wins
            resolvedEntity = this.resolveLastWriteWins(conflict)
          }
          break

        default:
          resolvedEntity = this.resolveLastWriteWins(conflict)
      }

      resolved.push(resolvedEntity)
    }

    return resolved
  }

  /**
   * Check if two entities have a conflict
   */
  private checkForConflict(
    localEntity: SyncableEntity,
    remoteEntity: SyncableEntity
  ): Conflict | null {
    // No conflict if checksums match
    if (localEntity.checksum === remoteEntity.checksum) {
      return null
    }

    // No conflict if one is clearly newer (with buffer for clock skew)
    const timeDiff = Math.abs(localEntity.updatedAt - remoteEntity.updatedAt)
    const clockSkewBuffer = 5000 // 5 seconds

    if (
      timeDiff > clockSkewBuffer &&
      localEntity.syncVersion === remoteEntity.syncVersion
    ) {
      return null
    }

    // Detect conflict type
    let type: Conflict['type'] = 'update-update'

    if (localEntity.deletedAt && !remoteEntity.deletedAt) {
      type = 'delete-update'
    } else if (!localEntity.deletedAt && remoteEntity.deletedAt) {
      type = 'delete-update'
    } else if (
      localEntity.createdAt === localEntity.updatedAt &&
      remoteEntity.createdAt === remoteEntity.updatedAt
    ) {
      type = 'create-create'
    }

    return {
      localEntity,
      remoteEntity,
      type,
      detectedAt: Date.now(),
    }
  }

  /**
   * Resolve using last-write-wins strategy
   */
  private resolveLastWriteWins(conflict: Conflict): ResolvedEntity {
    const winner =
      conflict.localEntity.updatedAt > conflict.remoteEntity.updatedAt
        ? conflict.localEntity
        : conflict.remoteEntity

    return {
      ...winner,
      syncStatus: 'synced',
      conflictResolution: {
        strategy: 'lastWriteWins',
        resolvedAt: Date.now(),
        originalLocal: conflict.localEntity.data,
        originalRemote: conflict.remoteEntity.data,
      },
    }
  }

  /**
   * Resolve using first-write-wins strategy
   */
  private resolveFirstWriteWins(conflict: Conflict): ResolvedEntity {
    const winner =
      conflict.localEntity.createdAt < conflict.remoteEntity.createdAt
        ? conflict.localEntity
        : conflict.remoteEntity

    return {
      ...winner,
      syncStatus: 'synced',
      conflictResolution: {
        strategy: 'firstWriteWins',
        resolvedAt: Date.now(),
        originalLocal: conflict.localEntity.data,
        originalRemote: conflict.remoteEntity.data,
      },
    }
  }

  /**
   * Resolve by merging data
   */
  private resolveMerge(conflict: Conflict): ResolvedEntity {
    // Merge strategy depends on entity type
    let mergedData: unknown

    switch (conflict.localEntity.entityType) {
      case 'practiceSession':
        mergedData = this.mergePracticeSession(
          conflict.localEntity.data,
          conflict.remoteEntity.data
        )
        break

      case 'goal':
        mergedData = this.mergeGoal(
          conflict.localEntity.data,
          conflict.remoteEntity.data
        )
        break

      default:
        // For other types, use last-write-wins for data
        mergedData =
          conflict.localEntity.updatedAt > conflict.remoteEntity.updatedAt
            ? conflict.localEntity.data
            : conflict.remoteEntity.data
    }

    return {
      ...conflict.localEntity,
      data: mergedData,
      updatedAt: Math.max(
        conflict.localEntity.updatedAt,
        conflict.remoteEntity.updatedAt
      ),
      syncVersion:
        Math.max(
          conflict.localEntity.syncVersion,
          conflict.remoteEntity.syncVersion
        ) + 1,
      syncStatus: 'synced',
      conflictResolution: {
        strategy: 'merge',
        resolvedAt: Date.now(),
        originalLocal: conflict.localEntity.data,
        originalRemote: conflict.remoteEntity.data,
      },
    }
  }

  /**
   * Choose local version
   */
  private chooseLocal(conflict: Conflict): ResolvedEntity {
    return {
      ...conflict.localEntity,
      syncStatus: 'synced',
      conflictResolution: {
        strategy: 'userChoice',
        resolvedAt: Date.now(),
        originalLocal: conflict.localEntity.data,
        originalRemote: conflict.remoteEntity.data,
      },
    }
  }

  /**
   * Choose remote version
   */
  private chooseRemote(conflict: Conflict): ResolvedEntity {
    return {
      ...conflict.remoteEntity,
      syncStatus: 'synced',
      conflictResolution: {
        strategy: 'userChoice',
        resolvedAt: Date.now(),
        originalLocal: conflict.localEntity.data,
        originalRemote: conflict.remoteEntity.data,
      },
    }
  }

  /**
   * Merge practice session data
   */
  private mergePracticeSession(
    localData: unknown,
    remoteData: unknown
  ): unknown {
    const local = localData as Record<string, unknown>
    const remote = remoteData as Record<string, unknown>

    return {
      ...local,
      ...remote,
      // Take maximum values for numeric fields
      pausedDuration: Math.max(
        Number(local.pausedDuration) || 0,
        Number(remote.pausedDuration) || 0
      ),
      notesAttempted: Math.max(
        Number(local.notesAttempted) || 0,
        Number(remote.notesAttempted) || 0
      ),
      notesCorrect: Math.max(
        Number(local.notesCorrect) || 0,
        Number(remote.notesCorrect) || 0
      ),
      // Use remote accuracy if available and higher
      accuracyPercentage:
        Number(remote.accuracyPercentage ?? 0) >
        Number(local.accuracyPercentage ?? 0)
          ? remote.accuracyPercentage
          : local.accuracyPercentage,
      // Use latest completion time
      completedAt:
        String(local.completedAt || '') > String(remote.completedAt || '')
          ? local.completedAt
          : remote.completedAt,
    }
  }

  /**
   * Merge goal data
   */
  private mergeGoal(localData: unknown, remoteData: unknown): unknown {
    const local = localData as Record<string, unknown>
    const remote = remoteData as Record<string, unknown>

    return {
      ...local,
      ...remote,
      // Take maximum current value (progress)
      currentValue: Math.max(
        Number(local.currentValue) || 0,
        Number(remote.currentValue) || 0
      ),
      // If either is completed, mark as completed
      completed: local.completed || remote.completed,
      // Use earliest completion time if both completed
      completedAt:
        local.completed && remote.completed
          ? Math.min(Number(local.completedAt), Number(remote.completedAt))
          : local.completedAt || remote.completedAt,
    }
  }
}
