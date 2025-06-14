import React, { useState, useEffect } from 'react'
import ManualEntryForm from '../components/ManualEntryForm'
import LogbookEntryList from '../components/LogbookEntryList'
import LogbookReports from '../components/LogbookReports'
import { PracticeHeader } from '../components/PracticeHeader'
import type { LogbookEntry } from '../modules/logger/types'
import { useModules } from '../contexts/ModulesContext'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation } from '@apollo/client'
import {
  GET_LOGBOOK_ENTRIES,
  CREATE_LOGBOOK_ENTRY,
} from '../graphql/queries/practice'

const Logbook: React.FC = () => {
  const isMobile = window.innerWidth < 768
  const { practiceLogger, isInitialized, eventBus } = useModules()
  const { user, syncError, clearSyncError } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)
  const [entries, setEntries] = useState<LogbookEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'success' | 'error' | 'timeout'
  >('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isWaitingForSync, setIsWaitingForSync] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{
    stage: string
    progress: number
    message: string
  } | null>(null)

  // Use GraphQL for authenticated users with cloud storage
  const shouldUseGraphQL = user && !user.isAnonymous && user.hasCloudStorage

  // GraphQL query for authenticated users
  const {
    data: graphqlData,
    loading: graphqlLoading,
    error: graphqlError,
    refetch,
  } = useQuery(GET_LOGBOOK_ENTRIES, {
    variables: {
      filter: {},
      limit: 1000,
      offset: 0,
    },
    skip: !shouldUseGraphQL,
    fetchPolicy: 'network-only', // Always fetch fresh data
    errorPolicy: 'all', // Continue even if there's an error
  })

  // GraphQL mutation for creating entries (authenticated users only)
  const [createLogbookEntry] = useMutation(CREATE_LOGBOOK_ENTRY, {
    onCompleted: () => {
      // Refetch to get updated data
      if (refetch) {
        refetch()
      }
    },
  })

  // Load entries based on authentication status
  useEffect(() => {
    if (!isInitialized || !practiceLogger) {
      return
    }

    const loadEntries = async () => {
      try {
        // Show loading when switching between storage types or initial load
        if (isInitialLoad) {
          setIsLoading(true)
        }

        if (shouldUseGraphQL && graphqlData?.myLogbookEntries?.edges) {
          // Transform GraphQL data to match our interface
          const transformedEntries: LogbookEntry[] =
            graphqlData.myLogbookEntries.edges
              .map((edge: { node: unknown }) => edge.node)
              .map(
                (entry: {
                  id: string
                  user: { id: string }
                  timestamp: string
                  duration: number
                  type: string
                  instrument: string
                  pieces: Array<{
                    id: string
                    title: string
                    composer?: string
                    measures?: string
                    tempo?: number
                  }>
                  techniques: string[]
                  goalIds: string[]
                  notes?: string
                  mood?: string
                  tags: string[]
                  metadata?: {
                    source: string
                    accuracy?: number
                    notesPlayed?: number
                    mistakeCount?: number
                  }
                  createdAt: string
                  updatedAt: string
                }) => ({
                  ...entry,
                  userId: entry.user.id, // Extract userId from user object
                  timestamp: new Date(entry.timestamp).getTime(),
                  goals: entry.goalIds, // Map goalIds to goals
                  type: entry.type.toLowerCase() as LogbookEntry['type'], // Convert GraphQL uppercase to local lowercase
                  mood: entry.mood?.toLowerCase() as
                    | LogbookEntry['mood']
                    | undefined, // Convert GraphQL uppercase to local lowercase
                })
              )
          setEntries(transformedEntries)
        } else if (!shouldUseGraphQL || (shouldUseGraphQL && graphqlError)) {
          // Use localStorage for anonymous users OR as fallback when GraphQL fails
          const filters = user?.id ? { userId: user.id } : {}
          const loadedEntries = await practiceLogger.getLogEntries(filters)
          setEntries(loadedEntries)

          // If GraphQL error, show a message but continue with local data
          if (graphqlError) {
            setErrorMessage(
              'Using local data. Your entries will sync when connection is restored.'
            )
            setTimeout(() => setErrorMessage(null), 5000)
          }
        } else if (
          shouldUseGraphQL &&
          !graphqlData?.myLogbookEntries &&
          !graphqlError
        ) {
          // GraphQL should be used but no data yet - clear entries to show loading state
          setEntries([])
        }
      } catch (error) {
        setErrorMessage('Failed to load logbook entries')
        setEntries([]) // Clear entries on error
      } finally {
        setIsLoading(false)
        setIsInitialLoad(false)
      }
    }

    if (!graphqlLoading) {
      loadEntries()
    }
  }, [
    isInitialized,
    practiceLogger,
    user,
    shouldUseGraphQL,
    graphqlData,
    graphqlLoading,
    graphqlError,
    isInitialLoad,
  ])

  // Listen for auth status changes to reload entries
  useEffect(() => {
    if (!eventBus) return

    let syncTimeout: NodeJS.Timeout | null = null

    const subscriptionId = eventBus.subscribe('auth:login', () => {
      setIsLoading(true)
      setIsInitialLoad(true) // Treat as initial load to show loading state
      setIsWaitingForSync(true) // Wait for sync to complete

      // Don't immediately refetch - wait for sync:complete event

      // Set a timeout to prevent getting stuck indefinitely
      syncTimeout = setTimeout(() => {
        setIsWaitingForSync(false)
        setSyncStatus('timeout')
        setErrorMessage(
          'Sync is taking longer than expected. Your data will sync in the background.'
        )

        // Clear the timeout status after 5 seconds
        setTimeout(() => {
          setSyncStatus('idle')
          setErrorMessage(null)
        }, 5000)
      }, 30000) // 30 second timeout
    })

    return () => {
      if (eventBus && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe(subscriptionId)
      }
      if (syncTimeout) {
        clearTimeout(syncTimeout)
      }
    }
  }, [eventBus, refetch, shouldUseGraphQL])

  // On initial load, check if we're already authenticated and have data
  useEffect(() => {
    if (
      shouldUseGraphQL &&
      !graphqlLoading &&
      graphqlData &&
      isWaitingForSync
    ) {
      // If we have GraphQL data, we're not actually waiting for sync
      setIsWaitingForSync(false)
    }
  }, [shouldUseGraphQL, graphqlLoading, graphqlData, isWaitingForSync])

  // Listen for sync complete events to refetch data
  useEffect(() => {
    if (!eventBus || !shouldUseGraphQL) return

    const subscriptionId = eventBus.subscribe('sync:complete', () => {
      setIsWaitingForSync(false)
      setSyncStatus('success')
      setSyncProgress(null)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle')
      }, 3000)

      // Now refetch data from GraphQL if using cloud storage
      if (shouldUseGraphQL && refetch) {
        refetch()
      }
    })

    return () => {
      if (eventBus && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe(subscriptionId)
      }
    }
  }, [eventBus, refetch, shouldUseGraphQL])

  // Listen for sync progress events
  useEffect(() => {
    if (!eventBus) return

    const subscriptionId = eventBus.subscribe('sync:progress', payload => {
      const data = payload.data as
        | { stage?: string; progress?: number; message?: string }
        | undefined
      const { stage, progress, message } = data || {}

      if (
        stage === 'started' ||
        stage === 'collecting' ||
        stage === 'preparing' ||
        stage === 'syncing'
      ) {
        setSyncStatus('syncing')
        setSyncProgress({
          stage: stage || '',
          progress: progress || 0,
          message: message || '',
        })
      } else if (stage === 'completed') {
        setSyncProgress({
          stage: stage || '',
          progress: progress || 0,
          message: message || '',
        })
        // Success status will be set by sync:complete event
      } else if (stage === 'timeout') {
        setSyncStatus('timeout')
        setErrorMessage(message || 'Sync timed out')
        setSyncProgress(null)
        setIsWaitingForSync(false)

        // Clear error after 10 seconds
        setTimeout(() => {
          setSyncStatus('idle')
          setErrorMessage(null)
        }, 10000)
      } else if (stage === 'error') {
        setSyncStatus('error')
        setErrorMessage(message || 'Sync failed')
        setSyncProgress(null)
        setIsWaitingForSync(false)

        // Clear error after 10 seconds
        setTimeout(() => {
          setSyncStatus('idle')
          setErrorMessage(null)
        }, 10000)
      }
    })

    return () => {
      if (eventBus && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe(subscriptionId)
      }
    }
  }, [eventBus])

  const handleSaveEntry = async (
    entry: Omit<LogbookEntry, 'id' | 'userId'>
  ) => {
    try {
      if (shouldUseGraphQL) {
        // For authenticated users: Use direct GraphQL mutation
        setSyncStatus('syncing')
        setErrorMessage(null)

        // Transform entry to GraphQL format
        const graphqlInput = {
          timestamp: new Date(entry.timestamp).toISOString(),
          duration: entry.duration,
          type: entry.type.toUpperCase() as
            | 'PRACTICE'
            | 'PERFORMANCE'
            | 'LESSON'
            | 'REHEARSAL',
          instrument: entry.instrument,
          pieces: entry.pieces.map(piece => ({
            id:
              piece.id ||
              `piece_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: piece.title,
            composer: piece.composer || undefined,
            measures: piece.measures || undefined,
            tempo: piece.tempo || undefined,
          })),
          techniques: entry.techniques || [],
          goalIds: entry.goals || [],
          notes: entry.notes || undefined,
          mood: entry.mood?.toUpperCase() as
            | 'FRUSTRATED'
            | 'NEUTRAL'
            | 'SATISFIED'
            | 'EXCITED'
            | undefined,
          tags: entry.tags || [],
          sessionId: entry.sessionId || undefined,
          metadata: entry.metadata
            ? {
                source: entry.metadata.source || 'manual',
                accuracy: entry.metadata.accuracy || undefined,
                notesPlayed: entry.metadata.notesPlayed || undefined,
                mistakeCount: entry.metadata.mistakeCount || undefined,
              }
            : undefined,
        }

        await createLogbookEntry({
          variables: { input: graphqlInput },
        })

        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 3000)
        setShowNewEntryForm(false)
      } else {
        // For anonymous users: Use localStorage via PracticeLoggerModule
        if (!practiceLogger) {
          throw new Error('Practice logger not available')
        }

        const newEntry = await practiceLogger.createLogEntry({
          ...entry,
          userId: user?.id || 'guest',
        })

        // Update local state
        setEntries([newEntry, ...entries])
        setShowNewEntryForm(false)
      }
    } catch (error) {
      if (shouldUseGraphQL) {
        setSyncStatus('error')
        setErrorMessage(
          error instanceof Error
            ? `Failed to create entry: ${error.message}`
            : 'Failed to create entry'
        )
        setTimeout(() => {
          setSyncStatus('idle')
          setErrorMessage(null)
        }, 10000)
      }
    }
  }

  const handleEditEntry = async (_entry: LogbookEntry) => {
    if (!practiceLogger) {
      return
    }

    // TODO: Implement edit UI and then call practiceLogger.updateLogEntry
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!practiceLogger) {
      return
    }

    try {
      await practiceLogger.deleteLogEntry(entryId)
      setEntries(entries.filter(e => e.id !== entryId))
    } catch (error) {
      // Failed to delete entry
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PracticeHeader isMobile={isMobile} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            📚 Practice Logbook
          </h1>
          <p className="mt-2 text-gray-600">
            Track your practice sessions, monitor progress, and reflect on your
            musical journey
          </p>
        </div>

        {/* Sync Error from AuthContext */}
        {syncError && (
          <div className="mb-4 p-4 rounded-lg border bg-yellow-50 border-yellow-200 text-yellow-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{syncError}</span>
              </div>
              <button
                onClick={clearSyncError}
                className="text-yellow-600 hover:text-yellow-800"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Sync Status Bar */}
        {syncStatus !== 'idle' && (
          <div
            className={`mb-4 p-4 rounded-lg border ${
              syncStatus === 'syncing'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : syncStatus === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : syncStatus === 'timeout'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncStatus === 'syncing' && syncProgress && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span>{syncProgress.message}</span>
                      <span className="text-sm">{syncProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${syncProgress.progress}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
              {syncStatus === 'success' && (
                <>
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Synced successfully!</span>
                </>
              )}
              {syncStatus === 'timeout' && (
                <>
                  <svg
                    className="w-4 h-4 text-yellow-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{errorMessage || 'Sync timed out'}</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <svg
                    className="w-4 h-4 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{errorMessage || 'Sync failed'}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setShowNewEntryForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 gap-2"
          >
            + New Entry
          </button>

          <div className="flex-1 flex gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2">
              ⚙️ Filters
            </button>
          </div>
        </div>

        {/* Reports Section - Only show when we have data */}
        {!isLoading && entries.length > 0 && (
          <div className="mb-6">
            <LogbookReports />
          </div>
        )}

        {/* Loading State */}
        {isLoading || isWaitingForSync ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="text-6xl text-gray-400 mx-auto mb-4 animate-pulse">
                ⏳
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {isWaitingForSync
                  ? 'Syncing your practice data...'
                  : 'Loading your practice history...'}
              </h3>
            </div>
          </div>
        ) : entries.length === 0 && !searchQuery ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="text-6xl text-gray-400 mx-auto mb-4">🎵</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No practice entries yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Start logging your practice sessions to track your progress and
                build a record of your musical journey.
              </p>
              <button
                onClick={() => setShowNewEntryForm(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 gap-2"
              >
                + Create Your First Entry
              </button>
            </div>
          </div>
        ) : (
          <LogbookEntryList
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            searchQuery={searchQuery}
          />
        )}
      </div>

      {/* Modal for new entry form */}
      {showNewEntryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">✏️ New Logbook Entry</h2>
            <ManualEntryForm
              onSave={handleSaveEntry}
              onCancel={() => setShowNewEntryForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Logbook
