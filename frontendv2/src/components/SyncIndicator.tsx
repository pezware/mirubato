import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useLogbookStore } from '@/stores/logbookStore'
import { useSyncTriggers } from '@/hooks'
import { useTranslation } from 'react-i18next'
import {
  IconRefresh,
  IconCloud,
  IconCloudOff,
  IconCloudCheck,
  IconCloudX,
} from '@tabler/icons-react'

interface SyncIndicatorProps {
  className?: string
  showText?: boolean
}

export function SyncIndicator({
  className = '',
  showText = true,
}: SyncIndicatorProps) {
  const { t } = useTranslation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLocalMode = useLogbookStore(state => state.isLocalMode)
  const { lastSync, isSyncing, triggerSync } = useSyncTriggers()

  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'success' | 'error'
  >('idle')
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    if (isSyncing) {
      setSyncStatus('syncing')
    } else if (lastSync && lastSync > (lastSyncTime?.getTime() || 0)) {
      setSyncStatus('success')
      setLastSyncTime(new Date(lastSync))
      // Reset to idle after 3 seconds
      const timer = setTimeout(() => setSyncStatus('idle'), 3000)
      return () => clearTimeout(timer)
    }
  }, [isSyncing, lastSync, lastSyncTime])

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleManualSync = async () => {
    try {
      await triggerSync()
      setSyncStatus('success')
    } catch (error) {
      setSyncStatus('error')
      console.error('Manual sync failed:', error)
    }
  }

  const getIcon = () => {
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
        return <span className="text-sm text-red-500">{t('sync.error')}</span>
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
      <button
        onClick={handleManualSync}
        disabled={isLocalMode || isSyncing}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={isLocalMode ? t('sync.offlineMode') : t('sync.syncNow')}
      >
        {getIcon()}
      </button>
      {getText()}
    </div>
  )
}
