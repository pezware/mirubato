/**
 * Sync service exports
 */

export * from './types'
export * from './SyncOrchestrator'
export * from './LocalSyncService'
export * from './RemoteSyncService'
export * from './ConflictResolver'
export * from './SyncQueue'
export * from './DuplicateDetector'
export * from './utils'
export * from './SyncManager'

// Factory function to create a fully configured sync orchestrator
import { EventBus } from '../../modules/core/EventBus'
import { SyncOrchestrator, SyncOrchestratorConfig } from './SyncOrchestrator'
import { LocalSyncService } from './LocalSyncService'
import { RemoteSyncService } from './RemoteSyncService'
// import type { RemoteSyncServiceConfig } from './RemoteSyncService'
import { ConflictResolver } from './ConflictResolver'
import { SyncQueue } from './SyncQueue'
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
