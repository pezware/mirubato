import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useLogbookStore } from '@/stores/logbookStore'
import { useTranslation } from 'react-i18next'
import {
  IconRefresh,
  IconCloud,
  IconCloudOff,
  IconCloudCheck,
  IconCloudX,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react'

interface SyncIndicatorProps {
  className?: string
  showText?: boolean
}

export function SyncIndicator({
  className = '',
  showText = true,
}: SyncIndicatorProps) {
  const { t } = useTranslation(['common', 'ui'])
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const {
    isLocalMode,
    isSyncing,
    lastSyncTime,
    // Real-time sync state
    isRealtimeSyncEnabled,
    realtimeSyncStatus,
    realtimeSyncError,
    enableRealtimeSync,
    disableRealtimeSync,
  } = useLogbookStore()

  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'success' | 'error'
  >('idle')

  // WebSocket sync is now enabled by default

  useEffect(() => {
    if (isSyncing) {
      setSyncStatus('syncing')
    } else if (realtimeSyncError) {
      setSyncStatus('error')
    } else if (lastSyncTime) {
      setSyncStatus('success')
      // Reset to idle after 3 seconds
      const timer = setTimeout(() => setSyncStatus('idle'), 3000)
      return () => clearTimeout(timer)
    } else {
      setSyncStatus('idle')
    }
  }, [isSyncing, realtimeSyncError, lastSyncTime])

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleRealtimeSyncToggle = async () => {
    if (isRealtimeSyncEnabled) {
      disableRealtimeSync()
    } else {
      await enableRealtimeSync()
    }
  }

  const getIcon = () => {
    // Show real-time sync status if enabled
    if (isRealtimeSyncEnabled) {
      switch (realtimeSyncStatus) {
        case 'connected':
          return <IconWifi className="h-5 w-5 text-green-500" />
        case 'connecting':
        case 'reconnecting':
          return <IconRefresh className="h-5 w-5 text-blue-500 animate-spin" />
        case 'disconnected':
          return <IconWifiOff className="h-5 w-5 text-red-500" />
        default:
          return <IconWifi className="h-5 w-5 text-gray-400" />
      }
    }

    // Fallback to manual sync status
    if (isLocalMode) {
      return <IconCloudOff className="h-5 w-5 text-gray-400" />
    }

    switch (syncStatus) {
      case 'syncing':
        return <IconRefresh className="h-5 w-5 text-blue-500 animate-spin" />
      case 'success':
        return <IconCloudCheck className="h-5 w-5 text-green-500" />
      case 'error':
        return <IconCloudX className="h-5 w-5 text-red-500" />
      default:
        return <IconCloud className="h-5 w-5 text-gray-400" />
    }
  }

  const getText = () => {
    if (!showText) return null

    // Show real-time sync status if enabled
    if (isRealtimeSyncEnabled) {
      switch (realtimeSyncStatus) {
        case 'connected':
          return (
            <span className="text-sm text-green-500">
              Real-time sync active
            </span>
          )
        case 'connecting':
          return <span className="text-sm text-blue-500">Connecting...</span>
        case 'reconnecting':
          return <span className="text-sm text-blue-500">Reconnecting...</span>
        case 'disconnected': {
          const error = realtimeSyncError || 'Disconnected'
          return (
            <span className="text-sm text-red-500" title={error}>
              Real-time sync offline
            </span>
          )
        }
        default:
          return <span className="text-sm text-gray-500">Real-time sync</span>
      }
    }

    // Fallback to manual sync status
    if (isLocalMode) {
      return <span className="text-sm text-gray-500">{t('sync.offline')}</span>
    }

    switch (syncStatus) {
      case 'syncing':
        return (
          <span className="text-sm text-blue-500">{t('sync.syncing')}</span>
        )
      case 'success':
        return (
          <span className="text-sm text-green-500">{t('sync.synced')}</span>
        )
      case 'error':
        return (
          <span
            className="text-sm text-red-500"
            title={realtimeSyncError || undefined}
          >
            {t('sync.error')}
          </span>
        )
      default:
        if (lastSyncTime) {
          const minutesAgo = Math.floor(
            (Date.now() - lastSyncTime.getTime()) / 60000
          )
          if (minutesAgo < 1) {
            return (
              <span className="text-sm text-gray-500">{t('sync.justNow')}</span>
            )
          } else if (minutesAgo < 60) {
            return (
              <span className="text-sm text-gray-500">
                {t('sync.minutesAgo', { minutes: minutesAgo })}
              </span>
            )
          } else {
            const hoursAgo = Math.floor(minutesAgo / 60)
            return (
              <span className="text-sm text-gray-500">
                {t('sync.hoursAgo', { hours: hoursAgo })}
              </span>
            )
          }
        }
        return (
          <span className="text-sm text-gray-500">{t('sync.notSynced')}</span>
        )
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* WebSocket sync status indicator and toggle */}
      <button
        onClick={handleRealtimeSyncToggle}
        disabled={
          isLocalMode ||
          (isRealtimeSyncEnabled && realtimeSyncStatus === 'connecting')
        }
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={
          isRealtimeSyncEnabled
            ? realtimeSyncStatus === 'connected'
              ? 'Disable real-time sync'
              : 'Enable real-time sync'
            : isLocalMode
              ? t('sync.offlineMode')
              : 'Enable real-time sync'
        }
      >
        {getIcon()}
      </button>

      {getText()}
    </div>
  )
}
