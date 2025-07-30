import { useState, useEffect } from 'react'
import {
  IconActivity as Activity,
  IconAlertCircle as AlertCircle,
  IconCircleCheck as CheckCircle,
  IconDownload as Download,
  IconRefresh as RefreshCw,
  IconX as X,
} from '@tabler/icons-react'
import { syncEventLogger, type SyncEvent } from '../../utils/syncEventLogger'
import { syncMutex } from '../../utils/syncMutex'

export function SyncDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [events, setEvents] = useState<SyncEvent[]>([])
  const [summary, setSummary] = useState(syncEventLogger.getSummary())
  const [lockStatus, setLockStatus] = useState({
    isLocked: syncMutex.isLocked(),
    currentOperation: syncMutex.getCurrentOperation(),
    queueLength: syncMutex.getQueueLength(),
  })
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'locks'>(
    'events'
  )

  useEffect(() => {
    // Only show in development or with debug flag
    const debugEnabled =
      process.env.NODE_ENV === 'development' ||
      localStorage.getItem('mirubato_debug') === 'true'

    if (!debugEnabled) return

    // Update data every second
    const interval = setInterval(() => {
      setEvents(syncEventLogger.getRecentEvents(20))
      setSummary(syncEventLogger.getSummary())
      setLockStatus({
        isLocked: syncMutex.isLocked(),
        currentOperation: syncMutex.getCurrentOperation(),
        queueLength: syncMutex.getQueueLength(),
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Don't render if not in debug mode
  const debugEnabled =
    process.env.NODE_ENV === 'development' ||
    localStorage.getItem('mirubato_debug') === 'true'

  if (!debugEnabled) return null

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Open Sync Debug Panel"
      >
        <Activity size={20} />
      </button>
    )
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString()
  }

  const getStatusIcon = (status: SyncEvent['status']) => {
    switch (status) {
      case 'started':
        return <RefreshCw size={16} className="animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'failed':
        return <AlertCircle size={16} className="text-red-500" />
    }
  }

  const handleExport = () => {
    const blob = new Blob([syncEventLogger.export()], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync-log-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const blob = new Blob([syncEventLogger.exportCSV()], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync-log-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed bottom-4 right-4 w-[480px] max-h-[600px] bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-lg">Sync Debug Panel</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Export as JSON"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'events'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'stats'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('locks')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'locks'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Locks
        </button>
      </div>

      {/* Content */}
      <div className="overflow-auto max-h-[480px] p-4">
        {activeTab === 'events' && (
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No sync events yet
              </p>
            ) : (
              events.map(event => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${
                    event.status === 'failed'
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : event.status === 'completed'
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.status)}
                      <span className="font-medium">{event.trigger}</span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDuration(event.duration)}
                    </span>
                  </div>

                  {event.stats && (
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Processed: {event.stats.entriesProcessed}, Duplicates
                      prevented: {event.stats.duplicatesPrevented}
                    </div>
                  )}

                  {event.error && (
                    <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {event.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Success Rate
                </div>
                <div className="text-2xl font-semibold">
                  {summary.successRate.toFixed(1)}%
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Duration
                </div>
                <div className="text-2xl font-semibold">
                  {formatDuration(summary.averageDuration)}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Events
                </div>
                <div className="text-2xl font-semibold">
                  {summary.totalEvents}
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Duplicate Prevention
                </div>
                <div className="text-2xl font-semibold">
                  {summary.duplicatePreventionRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Events by Trigger</h4>
              <div className="space-y-1">
                {Object.entries(summary.eventsByTrigger).map(
                  ([trigger, count]) => (
                    <div key={trigger} className="flex justify-between text-sm">
                      <span>{trigger}</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {count}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {summary.recentFailures.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-600">
                  Recent Failures
                </h4>
                <div className="space-y-1">
                  {summary.recentFailures.map(event => (
                    <div
                      key={event.id}
                      className="text-sm text-red-600 dark:text-red-400"
                    >
                      {formatTimestamp(event.timestamp)} - {event.trigger}:{' '}
                      {event.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear all sync logs?')) {
                    syncEventLogger.clear()
                  }
                }}
                className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
              >
                Clear Logs
              </button>
            </div>
          </div>
        )}

        {activeTab === 'locks' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Global Mutex</h4>
              <div
                className={`p-3 rounded-lg ${
                  lockStatus.isLocked
                    ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    : 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {lockStatus.isLocked ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="animate-spin text-yellow-600"
                      />
                      <span className="text-yellow-700 dark:text-yellow-400">
                        Locked
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-green-700 dark:text-green-400">
                        Available
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Mutex Status</h4>
              <div className="space-y-2">
                <div className="text-sm">
                  <div>Queue Length: {lockStatus.queueLength}</div>
                  <div>
                    Current Operation: {lockStatus.currentOperation || 'None'}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              <p>
                Locks prevent concurrent sync operations to avoid race
                conditions.
              </p>
              <p className="mt-1">
                If a lock is stuck, try refreshing the page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
