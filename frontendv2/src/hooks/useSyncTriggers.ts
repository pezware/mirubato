import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useLogbookStore } from '../stores/logbookStore'
import { useRepertoireStore } from '../stores/repertoireStore'
import { syncMutex } from '../utils/syncMutex'
import { SyncEventQueue, type SyncEvent } from '../utils/syncEventQueue'
import { syncEventLogger } from '../utils/syncEventLogger'

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
  const lastVisibilityChangeRef = useRef<Date>(new Date())
  const lastFocusEventRef = useRef<Date>(new Date(0)) // Track last focus event
  const isFormSubmittingRef = useRef<boolean>(false) // Track form submission state
  const formSubmissionTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Auto-reset form submission state

  // Initialize event queue with our sync handler
  const eventQueue = useRef<SyncEventQueue>()
  if (!eventQueue.current) {
    eventQueue.current = new SyncEventQueue(async (event: SyncEvent) => {
      await performSyncWithMutex(event.trigger)
    })
  }

  // Helper to perform sync with mutex protection
  const performSyncWithMutex = useCallback(
    async (trigger: string) => {
      // Skip if not authenticated or in local mode
      if (!isAuthenticated || isLocalMode) {
        return
      }

      // Try to acquire the mutex using runExclusive pattern
      const syncId = syncEventLogger.startSync(trigger)

      return await syncMutex.runExclusive(async () => {
        try {
          console.log(`[Sync] 🔄 Starting sync from ${trigger}`)

          // Check debounce after acquiring mutex
          const now = new Date()
          const minInterval = trigger === 'manual' ? 1000 : 30000

          // Check debounce timing manually
          const timeSinceLastSync =
            now.getTime() - lastSyncRef.current.getTime()
          if (timeSinceLastSync < minInterval) {
            console.log(
              `[Sync] Skipping ${trigger} sync - too soon (${Math.round(timeSinceLastSync / 1000)}s ago)`
            )
            syncEventLogger.failSync(syncId, 'Too soon after last sync')
            return
          }

          // Perform sync operations with timeout protection
          const syncTimeout = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Sync timeout after 30 seconds')),
              30000
            )
          )

          try {
            // Track stats
            const stats = {
              entriesProcessed: 0,
              duplicatesPrevented: 0,
              goalsProcessed: 0,
            }

            // Sync both logbook and repertoire data in parallel with timeout
            await Promise.race([
              Promise.all([
                syncWithServer().catch(err => {
                  console.error(`[Sync] Logbook sync failed:`, err)
                  // Don't throw - log error but continue
                }),
                syncRepertoireData().catch(err => {
                  console.error(`[Sync] Repertoire sync failed:`, err)
                  // Don't throw - continue even if repertoire sync fails
                }),
              ]),
              syncTimeout,
            ])

            // Update last sync time manually
            lastSyncRef.current = now
            const duration = Date.now() - now.getTime()

            syncEventLogger.completeSync(syncId, stats)
            console.log(`[Sync] ✅ ${trigger} sync completed in ${duration}ms`)
          } catch (timeoutError) {
            console.warn(
              `[Sync] ⏱️ ${trigger} sync timed out or had network issues:`,
              timeoutError
            )
            // Don't throw timeout errors - just log them
            syncEventLogger.failSync(syncId, timeoutError as Error)
          }
        } catch (error) {
          console.error(`[Sync] ❌ ${trigger} sync failed:`, error)
          syncEventLogger.failSync(syncId, error as Error)
          // Don't throw error to prevent queue from getting stuck
          // Individual sync failures should not crash the sync system
        }
      }, `sync-${trigger}`)
    },
    [isAuthenticated, isLocalMode, syncWithServer, syncRepertoireData]
  )

  // Queue sync event instead of performing directly
  const queueSync = useCallback(
    (trigger: string) => {
      if (!isAuthenticated || isLocalMode) {
        return
      }

      eventQueue.current?.queueEvent(trigger)
    },
    [isAuthenticated, isLocalMode]
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
          queueSync('visibility')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also sync on focus (but only if we haven't synced recently and avoid rapid focus events)
    const handleFocus = () => {
      const now = Date.now()
      const timeSinceLastSync = now - lastSyncRef.current.getTime()
      const timeSinceLastFocus = now - lastFocusEventRef.current.getTime()

      // Skip if form is submitting or focus events are too frequent
      if (isFormSubmittingRef.current) {
        console.log('[Sync] Skipping focus sync - form is submitting')
        return
      }

      // Increase debounce time for focus events to prevent rapid firing
      if (timeSinceLastFocus < 5000) {
        // 5 seconds between focus syncs
        console.log(
          '[Sync] Skipping focus sync - too soon since last focus event'
        )
        return
      }

      if (timeSinceLastSync > 120000) {
        // 2 minutes since last sync
        lastFocusEventRef.current = new Date(now)
        queueSync('focus')
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [enableVisibility, isAuthenticated, isLocalMode, queueSync])

  // 2. Route change sync (only for important routes)
  useEffect(() => {
    if (!enableRouteChange) return

    // Only sync when navigating to logbook or repertoire pages (data-heavy pages)
    const importantRoutes = ['/logbook', '/repertoire']
    const isImportantRoute = importantRoutes.some(route =>
      location.pathname.startsWith(route)
    )

    if (isImportantRoute) {
      queueSync('route-change')
    }
  }, [
    location.pathname,
    enableRouteChange,
    isAuthenticated,
    isLocalMode,
    queueSync,
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
      queueSync('periodic')
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
    queueSync,
  ])

  // 4. Online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Device came online')
      queueSync('online')
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [isAuthenticated, isLocalMode, queueSync])

  // 5. Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear the event queue on unmount
      eventQueue.current?.clear()

      // Clear form submission timeout
      if (formSubmissionTimeoutRef.current) {
        clearTimeout(formSubmissionTimeoutRef.current)
      }
    }
  }, [])

  return {
    lastSync: lastSyncRef.current,
    isSyncing: syncMutex.isLocked(),
    triggerSync: () => queueSync('manual'),
    forceSync: () => eventQueue.current?.forceProcess(),
    getSyncStatus: () => ({
      isLocked: syncMutex.isLocked(),
      currentOperation: syncMutex.getCurrentOperation(),
      queueLength: syncMutex.getQueueLength(),
      queueStatus: eventQueue.current?.getStatus(),
    }),
    // Expose form submission state management with auto-reset
    setFormSubmitting: (submitting: boolean) => {
      isFormSubmittingRef.current = submitting
      console.log(`[Sync] Form submission state: ${submitting}`)

      // Auto-reset form submission state after 15 seconds to prevent stuck state (reduced from 30s)
      if (formSubmissionTimeoutRef.current) {
        clearTimeout(formSubmissionTimeoutRef.current)
      }

      if (submitting) {
        formSubmissionTimeoutRef.current = setTimeout(() => {
          console.warn(
            '[Sync] Auto-resetting stuck form submission state (15s timeout)'
          )
          isFormSubmittingRef.current = false
        }, 15000) // 15 seconds timeout (reduced for better UX)
      } else {
        // Clear timeout immediately when manually set to false
        if (formSubmissionTimeoutRef.current) {
          clearTimeout(formSubmissionTimeoutRef.current)
          formSubmissionTimeoutRef.current = null
        }
      }
    },
  }
}
