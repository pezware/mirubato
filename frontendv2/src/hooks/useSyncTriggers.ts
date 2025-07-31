/**
 * Legacy sync triggers - redirects to new V2 implementation
 * This maintains backward compatibility during the transition
 */

import { useSyncTriggers as useSyncTriggersV2 } from './useSyncTriggers-v2'

// Legacy interface for backward compatibility
interface SyncTriggerOptions {
  enableVisibility?: boolean
  enableRouteChange?: boolean
  enablePeriodic?: boolean
  periodicInterval?: number // milliseconds
}

// Re-export the new implementation with the same interface
export function useSyncTriggers(options: SyncTriggerOptions = {}) {
  // Map old options to new options if needed
  const v2Options = {
    enableAutoSync: true,
    enableVisibilitySync: options.enableVisibility ?? true,
    enableFocusSync: true,
    enableOnlineSync: true,
    enablePeriodicSync: options.enablePeriodic ?? true,
    periodicInterval: options.periodicInterval ?? 30000,
    debounceDelay: 5000,
  }

  const v2Result = useSyncTriggersV2(v2Options)

  // Add legacy methods for backward compatibility
  return {
    ...v2Result,
    setFormSubmitting: (submitting: boolean) => {
      // Legacy method - no-op in new implementation
      console.log(
        '[useSyncTriggers] setFormSubmitting called (legacy):',
        submitting
      )
    },
    getSyncStatus: () => {
      // Legacy method - return basic status
      return {
        isOnline: navigator.onLine,
        isSyncing: v2Result.isSyncing,
        lastSync: v2Result.lastSyncTime,
        queueStatus: {
          size: 0, // Legacy property
          isProcessing: v2Result.isSyncing,
        },
      }
    },
    triggerSync: v2Result.manualSync, // Legacy alias for manualSync
    lastSync: v2Result.lastSyncTime, // Legacy property alias
  }
}

// Re-export types for backward compatibility
export type { SyncTriggerOptions }
