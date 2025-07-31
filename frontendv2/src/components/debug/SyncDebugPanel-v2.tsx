/**
 * Debug panel for the new delta-based sync system
 */

import { useState, useEffect } from 'react'
import { syncV2Api } from '../../api/sync-v2'
import { changeQueueDebug } from '../../utils/changeQueue'
import Button from '../ui/Button'
import { Modal } from '../ui/Modal'

interface SyncStats {
  pendingChanges: number
  failedChanges: number
  lastSyncTime: number | null
  oldestChange: number | null
}

export function SyncDebugPanelV2() {
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadStats = async () => {
    try {
      const syncStats = await syncV2Api.getLocalStats()
      setStats(syncStats)
    } catch (error) {
      console.error('Failed to load sync stats:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadStats()
      // Refresh stats every 5 seconds while panel is open
      const interval = setInterval(loadStats, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const handleManualSync = async () => {
    setIsLoading(true)
    try {
      await syncV2Api.forceSync()
      await loadStats() // Refresh stats after sync
    } catch (error) {
      console.error('Manual sync failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      await changeQueueDebug.export()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleClearQueue = async () => {
    if (
      confirm(
        'Are you sure you want to clear all pending changes? This cannot be undone.'
      )
    ) {
      try {
        await changeQueueDebug.clear()
        await loadStats()
      } catch (error) {
        console.error('Clear failed:', error)
      }
    }
  }

  // Only show in development or with debug flag
  const debugEnabled =
    process.env.NODE_ENV === 'development' ||
    localStorage.getItem('mirubato_debug') === 'true'

  if (!debugEnabled) return null

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white hover:bg-gray-700"
        size="sm"
      >
        🔄 Debug
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Sync Debug Panel V2"
        size="lg"
      >
        <div className="space-y-6">
          {/* Sync Statistics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Sync Statistics</h3>
            {stats ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600">
                    Pending Changes
                  </div>
                  <div className="text-lg font-inter">
                    {stats.pendingChanges}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">
                    Failed Changes
                  </div>
                  <div className="text-lg font-inter text-red-600">
                    {stats.failedChanges}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Last Sync</div>
                  <div className="text-sm font-inter">
                    {stats.lastSyncTime
                      ? new Date(stats.lastSyncTime).toLocaleString()
                      : 'Never'}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Oldest Change</div>
                  <div className="text-sm font-inter">
                    {stats.oldestChange
                      ? new Date(stats.oldestChange).toLocaleString()
                      : 'None'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Loading...</div>
            )}
          </div>

          {/* Sync Status */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Sync Status</h3>
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-3 h-3 rounded-full ${
                  syncV2Api.isSyncing()
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-green-500'
                }`}
              />
              <span>{syncV2Api.isSyncing() ? 'Syncing...' : 'Ready'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleManualSync}
              disabled={isLoading}
              variant="primary"
            >
              {isLoading ? 'Syncing...' : 'Force Sync'}
            </Button>

            <Button onClick={handleExportData} variant="secondary">
              Export Data
            </Button>

            <Button onClick={handleClearQueue} variant="danger">
              Clear Queue
            </Button>
          </div>

          {/* Debug Info */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Debug Commands</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <code>changeQueueDebug.getAll()</code> - View all pending
                changes
              </div>
              <div>
                <code>changeQueueDebug.getStats()</code> - Get detailed
                statistics
              </div>
              <div>
                <code>syncV2Api.getLocalStats()</code> - Get sync statistics
              </div>
              <div>
                <code>localStorage.setItem('mirubato_debug', 'true')</code> -
                Enable debug mode
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
