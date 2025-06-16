import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { useModules } from '../contexts/ModulesContext'
import { getSyncManager } from '../services/sync'
import type { SyncManager } from '../services/sync'
import type { SyncState } from '../services/sync/types'

/**
 * Hook to manage sync lifecycle and state
 * Connects SyncManager with auth state changes
 */
export const useSync = () => {
  const { user, syncState, clearSyncError, updateSyncState } = useAuth()
  const { eventBus, isInitialized } = useModules()
  const syncManagerRef = useRef<SyncManager | null>(null)

  // Initialize sync manager when modules are ready
  useEffect(() => {
    if (!isInitialized || !eventBus) {
      return
    }

    // Get or create sync manager instance
    syncManagerRef.current = getSyncManager(eventBus)

    return () => {
      // Don't dispose singleton on unmount
    }
  }, [isInitialized, eventBus])

  // Update sync manager when auth state changes
  useEffect(() => {
    if (!syncManagerRef.current) {
      return
    }

    // Notify sync manager of auth state change
    syncManagerRef.current.onAuthStateChange(user)
  }, [user])

  // Subscribe to sync state changes from SyncManager
  useEffect(() => {
    if (!syncManagerRef.current) {
      return
    }

    // Subscribe to state changes and update auth context
    const unsubscribe = syncManagerRef.current.onStateChange(
      (state: SyncState) => {
        updateSyncState(state)
      }
    )

    return unsubscribe
  }, [updateSyncState])

  return {
    syncState,
    clearSyncError,
    syncNow: async () => {
      if (syncManagerRef.current) {
        return syncManagerRef.current.syncNow()
      }
      return {
        status: 'skipped' as const,
        message: 'Sync manager not initialized',
      }
    },
  }
}
