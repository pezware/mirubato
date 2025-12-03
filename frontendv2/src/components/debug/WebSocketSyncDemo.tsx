/**
 * WebSocket Sync Demo Component
 * For testing real-time sync functionality during development
 */

import { useState, useEffect } from 'react'
import { useLogbookStore } from '@/stores/logbookStore'
import { useAuthStore } from '@/stores/authStore'
import { Button, Card } from '@/components/ui'
import {
  IconWifi,
  IconWifiOff,
  IconRefresh,
  IconPlus,
} from '@tabler/icons-react'

export function WebSocketSyncDemo() {
  const { isAuthenticated } = useAuthStore()
  const {
    isRealtimeSyncEnabled,
    realtimeSyncStatus,
    enableRealtimeSync,
    disableRealtimeSync,
  } = useLogbookStore()
  const [logs, setLogs] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]) // Keep last 20 logs
  }

  // Monitor sync status changes
  useEffect(() => {
    addLog(`Sync status changed: ${realtimeSyncStatus}`)
  }, [realtimeSyncStatus])

  const handleToggleRealtimeSync = async () => {
    if (isRealtimeSyncEnabled) {
      addLog('Disabling real-time sync...')
      disableRealtimeSync()
    } else {
      addLog('Enabling real-time sync...')
      const success = await enableRealtimeSync()
      addLog(
        success ? 'Real-time sync enabled!' : 'Failed to enable real-time sync'
      )
    }
  }

  const handleCreateTestEntry = () => {
    const testEntry = {
      timestamp: new Date().toISOString(),
      duration: Math.floor(Math.random() * 60) + 15, // 15-75 minutes
      type: 'practice' as const,
      instrument: 'piano' as const,
      pieces: [
        {
          title: `Test Piece ${Math.floor(Math.random() * 100)}`,
          composer: 'Test Composer',
        },
      ],
      techniques: ['scales'],
      goalIds: [],
      tags: ['demo'],
      notes: `Test entry created at ${new Date().toLocaleTimeString()}`,
    }

    useLogbookStore.getState().createEntry(testEntry)
    addLog(`Created test entry: ${testEntry.pieces[0].title}`)
  }

  const getStatusIcon = () => {
    switch (realtimeSyncStatus) {
      case 'connected':
        return <IconWifi className="h-4 w-4 text-green-500" />
      case 'connecting':
      case 'reconnecting':
        return <IconRefresh className="h-4 w-4 text-blue-500 animate-spin" />
      case 'disconnected':
      default:
        return <IconWifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (realtimeSyncStatus) {
      case 'connected':
        return 'text-green-600'
      case 'connecting':
      case 'reconnecting':
        return 'text-blue-600'
      case 'disconnected':
      default:
        return 'text-red-600'
    }
  }

  if (!isAuthenticated) {
    return (
      <Card className="p-4">
        <div className="text-center text-gray-500">
          Please sign in to test WebSocket sync
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">WebSocket Sync Demo</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {realtimeSyncStatus === 'connected' && 'Real-time sync active'}
            {realtimeSyncStatus === 'connecting' && 'Connecting...'}
            {realtimeSyncStatus === 'reconnecting' && 'Reconnecting...'}
            {realtimeSyncStatus === 'disconnected' && 'Real-time sync offline'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={handleToggleRealtimeSync}
            variant={isRealtimeSyncEnabled ? 'danger' : 'primary'}
            size="sm"
            disabled={realtimeSyncStatus === 'connecting'}
          >
            {isRealtimeSyncEnabled ? 'Disable' : 'Enable'} Real-time Sync
          </Button>

          <Button
            onClick={handleCreateTestEntry}
            variant="secondary"
            size="sm"
            disabled={
              !isRealtimeSyncEnabled || realtimeSyncStatus !== 'connected'
            }
          >
            <IconPlus className="h-4 w-4 mr-1" />
            Create Test Entry
          </Button>
        </div>

        {/* Expanded logs */}
        {isExpanded && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Activity Log</h4>
            <div className="bg-gray-50 rounded p-3 max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-sm text-gray-500">No activity yet</div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="text-xs font-inter text-gray-700"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => setLogs([])}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Clear logs
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>Instructions:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Enable real-time sync to connect to WebSocket server</li>
            <li>Open this page in another tab/device with the same account</li>
            <li>Create test entries and watch them sync in real-time</li>
            <li>Try disconnecting/reconnecting to test reconnection logic</li>
          </ol>
        </div>
      </div>
    </Card>
  )
}
