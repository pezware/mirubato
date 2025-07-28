import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useLogbookStore } from '../stores/logbookStore'
import { useRepertoireStore } from '../stores/repertoireStore'

interface SyncTriggerOptions {
  enableVisibility?: boolean
  enableRouteChange?: boolean
  enablePeriodic?: boolean
  periodicInterval?: number // milliseconds
}

export function useSyncTriggers(options: SyncTriggerOptions = {}) {
  const {
    enableVisibility = true,
    enableRouteChange = true,
    enablePeriodic = true,
    periodicInterval = 30000, // 30 seconds
  } = options

  const location = useLocation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const syncWithServer = useLogbookStore(state => state.syncWithServer)
  const isLocalMode = useLogbookStore(state => state.isLocalMode)
  const syncRepertoireData = useRepertoireStore(state => state.syncLocalData)

  // Initialize lastSync to 5 seconds ago to allow immediate first sync
  const lastSyncRef = useRef<Date>(new Date(Date.now() - 5000))
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSyncingRef = useRef(false)

  // Helper to perform sync with debouncing
  const performSync = async (trigger: string) => {
    // Skip if not authenticated or in local mode
    if (!isAuthenticated || isLocalMode) {
      return
    }

    // Skip if already syncing
    if (isSyncingRef.current) {
      console.log(`[Sync] Skipping ${trigger} sync - already in progress`)
      return
    }

    // Debounce: Skip if synced within last 5 seconds
    const now = new Date()
    const timeSinceLastSync = now.getTime() - lastSyncRef.current.getTime()
    if (timeSinceLastSync < 5000) {
      console.log(
        `[Sync] Skipping ${trigger} sync - too soon (${timeSinceLastSync}ms)`
      )
      return
    }

    try {
      isSyncingRef.current = true
      console.log(`[Sync] Triggering sync from ${trigger}`)

      // Sync both logbook and repertoire data in parallel
      await Promise.all([
        syncWithServer(),
        syncRepertoireData().catch(err => {
          console.error(`[Sync] Repertoire sync failed:`, err)
          // Don't throw - continue even if repertoire sync fails
        }),
      ])

      lastSyncRef.current = now
      console.log(`[Sync] ${trigger} sync completed successfully`)
    } catch (error) {
      console.error(`[Sync] ${trigger} sync failed:`, error)
    } finally {
      isSyncingRef.current = false
    }
  }

  // 1. Visibility change sync (when tab becomes visible)
  useEffect(() => {
    if (!enableVisibility) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync('visibility')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also sync on focus
    const handleFocus = () => performSync('focus')
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [enableVisibility, isAuthenticated, isLocalMode])

  // 2. Route change sync
  useEffect(() => {
    if (!enableRouteChange) return

    // Sync on route change (excluding initial mount)
    if (location.pathname !== '/') {
      performSync('route-change')
    }
  }, [location.pathname, enableRouteChange, isAuthenticated, isLocalMode])

  // 3. Periodic sync
  useEffect(() => {
    if (!enablePeriodic || !isAuthenticated || isLocalMode) {
      // Clear any existing interval
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
      return
    }

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      performSync('periodic')
    }, periodicInterval)

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [enablePeriodic, periodicInterval, isAuthenticated, isLocalMode])

  // 4. Online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Device came online')
      performSync('online')
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [isAuthenticated, isLocalMode])

  return {
    lastSync: lastSyncRef.current,
    isSyncing: isSyncingRef.current,
    triggerSync: () => performSync('manual'),
  }
}
