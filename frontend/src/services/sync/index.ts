/**
 * Sync service exports - New bidirectional sync implementation
 */

export * from './types'
export * from './BidirectionalSync'
export * from './DuplicateDetector'
export * from './utils'

// Legacy exports (to be removed after migration)
export * from './legacy/SyncOrchestrator'
export * from './legacy/LocalSyncService'
export * from './legacy/RemoteSyncService'
export * from './legacy/ConflictResolver'
export * from './legacy/SyncQueue'
export * from './legacy/SyncManager'

// Legacy factory function (to be removed after migration)
import { EventBus } from '../../modules/core/EventBus'
import {
  SyncOrchestrator,
  SyncOrchestratorConfig,
} from './legacy/SyncOrchestrator'
import { LocalSyncService } from './legacy/LocalSyncService'
import { RemoteSyncService } from './legacy/RemoteSyncService'
import { ConflictResolver } from './legacy/ConflictResolver'
import { SyncQueue } from './legacy/SyncQueue'
import { DuplicateDetector } from './DuplicateDetector'

export interface CreateSyncOrchestratorOptions {
  graphqlEndpoint: string
  authToken?: string
  storage?: Storage
  eventBus?: EventBus
  syncConfig?: SyncOrchestratorConfig
}

export function createSyncOrchestrator(
  options: CreateSyncOrchestratorOptions
): SyncOrchestrator {
  const {
    graphqlEndpoint,
    authToken,
    storage = localStorage,
    eventBus = EventBus.getInstance(),
    syncConfig,
  } = options

  const localSync = new LocalSyncService(storage)
  const remoteSync = new RemoteSyncService({
    graphqlEndpoint,
    authToken,
  })
  const conflictResolver = new ConflictResolver()
  const syncQueue = new SyncQueue(storage)
  const duplicateDetector = new DuplicateDetector()

  return new SyncOrchestrator(
    localSync,
    remoteSync,
    conflictResolver,
    syncQueue,
    duplicateDetector,
    eventBus,
    syncConfig
  )
}
