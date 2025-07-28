import { useEffect, useRef, useCallback } from 'react'
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
    periodicInterval = 300000, // 5 minutes
  } = options

  const location = useLocation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const syncWithServer = useLogbookStore(state => state.syncWithServer)
  const isLocalMode = useLogbookStore(state => state.isLocalMode)
  const syncRepertoireData = useRepertoireStore(state => state.syncLocalData)

  // Initialize lastSync to 30 seconds ago to allow initial sync on first meaningful interaction
  const lastSyncRef = useRef<Date>(new Date(Date.now() - 30000))
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSyncingRef = useRef(false)
  const lastVisibilityChangeRef = useRef<Date>(new Date())

  // Helper to perform sync with debouncing
  const performSync = useCallback(
    async (trigger: string) => {
      // Skip if not authenticated or in local mode
      if (!isAuthenticated || isLocalMode) {
        return
      }

      // Skip if already syncing
      if (isSyncingRef.current) {
        console.log(`[Sync] Skipping ${trigger} sync - already in progress`)
        return
      }

      // Debounce: Skip if synced within last 30 seconds (except for manual sync)
      const now = new Date()
      const timeSinceLastSync = now.getTime() - lastSyncRef.current.getTime()
      const minInterval = trigger === 'manual' ? 1000 : 30000 // 1s for manual, 30s for auto

      if (timeSinceLastSync < minInterval) {
        console.log(
          `[Sync] Skipping ${trigger} sync - too soon (${Math.round(timeSinceLastSync / 1000)}s ago)`
        )
        return
      }

      try {
        isSyncingRef.current = true
        console.log(`[Sync] 🔄 Starting sync from ${trigger}`)

        // Sync both logbook and repertoire data in parallel
        await Promise.all([
          syncWithServer(),
          syncRepertoireData().catch(err => {
            console.error(`[Sync] Repertoire sync failed:`, err)
            // Don't throw - continue even if repertoire sync fails
          }),
        ])

        lastSyncRef.current = now
        const duration = Date.now() - now.getTime()
        console.log(`[Sync] ✅ ${trigger} sync completed in ${duration}ms`)
      } catch (error) {
        console.error(`[Sync] ❌ ${trigger} sync failed:`, error)
      } finally {
        isSyncingRef.current = false
      }
    },
    [isAuthenticated, isLocalMode, syncWithServer, syncRepertoireData]
  )

  // 1. Visibility change sync (when tab becomes visible after being hidden)
  useEffect(() => {
    if (!enableVisibility) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Track when we went hidden
        lastVisibilityChangeRef.current = new Date()
      } else if (document.visibilityState === 'visible') {
        // Only sync if we were hidden for more than 1 minute
        const hiddenDuration =
          Date.now() - lastVisibilityChangeRef.current.getTime()
        if (hiddenDuration > 60000) {
          // 1 minute
          performSync('visibility')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also sync on focus (but only if we haven't synced recently)
    const handleFocus = () => {
      const timeSinceLastSync = Date.now() - lastSyncRef.current.getTime()
      if (timeSinceLastSync > 120000) {
        // 2 minutes
        performSync('focus')
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [enableVisibility, isAuthenticated, isLocalMode, performSync])

  // 2. Route change sync (only for important routes)
  useEffect(() => {
    if (!enableRouteChange) return

    // Only sync when navigating to logbook or repertoire pages (data-heavy pages)
    const importantRoutes = ['/logbook', '/repertoire']
    const isImportantRoute = importantRoutes.some(route =>
      location.pathname.startsWith(route)
    )

    if (isImportantRoute) {
      performSync('route-change')
    }
  }, [
    location.pathname,
    enableRouteChange,
    isAuthenticated,
    isLocalMode,
    performSync,
  ])

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
  }, [
    enablePeriodic,
    periodicInterval,
    isAuthenticated,
    isLocalMode,
    performSync,
  ])

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
  }, [isAuthenticated, isLocalMode, performSync])

  return {
    lastSync: lastSyncRef.current,
    isSyncing: isSyncingRef.current,
    triggerSync: () => performSync('manual'),
  }
}
