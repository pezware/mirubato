/**
 * Simplified sync triggers for delta-based sync
 * Replaces the complex event handling with cleaner, more reliable triggers
 */

import { useEffect, useCallback, useRef } from 'react'
import { syncV2Api } from '../api/sync-v2'
import { useAuthStore } from '../stores/authStore'

interface SyncTriggerOptions {
  enableAutoSync?: boolean
  enableVisibilitySync?: boolean
  enableFocusSync?: boolean
  enableOnlineSync?: boolean
  enablePeriodicSync?: boolean
  periodicInterval?: number // milliseconds
  debounceDelay?: number // milliseconds
}

export function useSyncTriggers(options: SyncTriggerOptions = {}) {
  const {
    enableAutoSync = true,
    enableVisibilitySync = true,
    enableFocusSync = true,
    enableOnlineSync = true,
    enablePeriodicSync = true,
    periodicInterval = 30000, // 30 seconds
    debounceDelay = 5000, // 5 seconds
  } = options

  const { isAuthenticated } = useAuthStore()
  const lastSyncTimeRef = useRef<number>(0)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const periodicIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Actual sync execution
  const performSync = useCallback(async (reason: string) => {
    const now = Date.now()
    lastSyncTimeRef.current = now

    console.log(`[Sync Triggers V2] 🔄 Triggering sync: ${reason}`)

    try {
      const result = await syncV2Api.sync()

      if (result.success) {
        console.log(`[Sync Triggers V2] ✅ ${reason} sync completed:`, {
          pushed: result.changesPushed,
          applied: result.changesApplied,
          conflicts: result.conflicts,
        })
      } else {
        console.warn(
          `[Sync Triggers V2] ⚠️ ${reason} sync failed:`,
          result.error
        )
      }
    } catch (error) {
      console.error(`[Sync Triggers V2] ❌ ${reason} sync error:`, error)
    }
  }, [])

  // Debounced sync function
  const debouncedSync = useCallback(
    (reason: string) => {
      if (!isAuthenticated || !enableAutoSync) {
        console.log(
          `[Sync Triggers V2] Skipping ${reason} sync - not authenticated or auto-sync disabled`
        )
        return
      }

      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }

      // Check if we're syncing too frequently
      const now = Date.now()
      const timeSinceLastSync = now - lastSyncTimeRef.current

      if (timeSinceLastSync < debounceDelay) {
        console.log(
          `[Sync Triggers V2] Debouncing ${reason} sync - too soon (${timeSinceLastSync}ms ago)`
        )

        // Schedule for later
        syncTimeoutRef.current = setTimeout(() => {
          performSync(reason)
        }, debounceDelay - timeSinceLastSync)
        return
      }

      // Perform sync immediately
      performSync(reason)
    },
    [isAuthenticated, enableAutoSync, debounceDelay, performSync]
  )

  // Manual sync function (bypasses debouncing)
  const manualSync = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[Sync Triggers V2] Manual sync skipped - not authenticated')
      return
    }

    // Cancel any pending debounced sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }

    await performSync('manual')
  }, [isAuthenticated, performSync])

  // Online/offline detection
  useEffect(() => {
    if (!enableOnlineSync) return

    const handleOnline = () => {
      console.log('[Sync Triggers V2] Device came online')
      debouncedSync('online')
    }

    const handleOffline = () => {
      console.log('[Sync Triggers V2] Device went offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [enableOnlineSync, debouncedSync])

  // Page visibility changes
  useEffect(() => {
    if (!enableVisibilitySync) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Sync Triggers V2] Page became visible')
        debouncedSync('visibility')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enableVisibilitySync, debouncedSync])

  // Window focus events
  useEffect(() => {
    if (!enableFocusSync) return

    const handleFocus = () => {
      console.log('[Sync Triggers V2] Window gained focus')
      debouncedSync('focus')
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [enableFocusSync, debouncedSync])

  // Periodic sync
  useEffect(() => {
    if (!enablePeriodicSync || !isAuthenticated) return

    console.log(
      `[Sync Triggers V2] Starting periodic sync every ${periodicInterval}ms`
    )

    periodicIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        debouncedSync('periodic')
      }
    }, periodicInterval)

    return () => {
      if (periodicIntervalRef.current) {
        clearInterval(periodicIntervalRef.current)
        periodicIntervalRef.current = null
      }
    }
  }, [enablePeriodicSync, isAuthenticated, periodicInterval, debouncedSync])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      if (periodicIntervalRef.current) {
        clearInterval(periodicIntervalRef.current)
      }
    }
  }, [])

  // Return sync controls
  return {
    manualSync,
    isSyncing: syncV2Api.isSyncing(),
    lastSyncTime: lastSyncTimeRef.current,
  }
}

// Simplified sync status hook
export function useSyncStatus() {
  const { isAuthenticated } = useAuthStore()

  return {
    isAuthenticated,
    isSyncing: syncV2Api.isSyncing(),
    isOnline: navigator.onLine,
  }
}
