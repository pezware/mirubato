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
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)
  const [entries, setEntries] = useState<LogbookEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'success' | 'error'
  >('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Use GraphQL for authenticated users with cloud storage
  const shouldUseGraphQL = user && !user.isAnonymous && user.hasCloudStorage

  // GraphQL query for authenticated users
  const {
    data: graphqlData,
    loading: graphqlLoading,
    refetch,
  } = useQuery(GET_LOGBOOK_ENTRIES, {
    variables: {
      filter: {},
      limit: 1000,
      offset: 0,
    },
    skip: !shouldUseGraphQL,
    fetchPolicy: 'network-only', // Always fetch fresh data
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
                })
              )
          setEntries(transformedEntries)
          console.log(
            `Loaded ${transformedEntries.length} entries from GraphQL`
          )
        } else if (!shouldUseGraphQL) {
          // Use localStorage for anonymous users
          const filters = user?.id ? { userId: user.id } : {}
          const loadedEntries = await practiceLogger.getLogEntries(filters)
          setEntries(loadedEntries)
          console.log(
            `Loaded ${loadedEntries.length} entries from localStorage`
          )
        } else if (shouldUseGraphQL && !graphqlData?.myLogbookEntries) {
          // GraphQL should be used but no data yet - clear entries to show loading state
          setEntries([])
        }
      } catch (error) {
        console.error('Failed to load logbook entries:', error)
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
  ])

  // Listen for auth status changes to reload entries
  useEffect(() => {
    if (!eventBus) return

    const subscriptionId = eventBus.subscribe('auth:login', () => {
      console.log('Auth login detected, reloading logbook entries...')
      setIsLoading(true)
      setIsInitialLoad(true) // Treat as initial load to show loading state

      // Refetch GraphQL data if needed
      if (shouldUseGraphQL && refetch) {
        refetch()
      }
    })

    return () => {
      if (eventBus && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe(subscriptionId)
      }
    }
  }, [eventBus, shouldUseGraphQL, refetch])

  // Listen for sync complete events to refetch data
  useEffect(() => {
    if (!eventBus || !shouldUseGraphQL) return

    const subscriptionId = eventBus.subscribe('sync:complete', () => {
      console.log('Sync completed, refetching logbook entries...')
      if (refetch) {
        refetch()
      }
    })

    return () => {
      if (eventBus && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe(subscriptionId)
      }
    }
  }, [eventBus, shouldUseGraphQL, refetch])

  const handleSaveEntry = async (
    entry: Omit<LogbookEntry, 'id' | 'userId'>
  ) => {
    try {
      if (shouldUseGraphQL) {
        // For authenticated users: Use direct GraphQL mutation
        console.log('Creating entry via GraphQL...')
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

        console.log('Entry created successfully via GraphQL')
        setSyncStatus('success')
        setTimeout(() => setSyncStatus('idle'), 3000)
        setShowNewEntryForm(false)
      } else {
        // For anonymous users: Use localStorage via PracticeLoggerModule
        if (!practiceLogger) {
          throw new Error('Practice logger not available')
        }

        console.log('Creating entry via localStorage...')
        const newEntry = await practiceLogger.createLogEntry({
          ...entry,
          userId: user?.id || 'guest',
        })

        // Update local state
        setEntries([newEntry, ...entries])
        setShowNewEntryForm(false)
      }
    } catch (error) {
      console.error('Failed to save entry:', error)

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

        {/* Sync Status Bar */}
        {syncStatus !== 'idle' && (
          <div
            className={`mb-4 p-3 rounded-lg border ${
              syncStatus === 'syncing'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : syncStatus === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncStatus === 'syncing' && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Syncing to cloud...</span>
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
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="text-6xl text-gray-400 mx-auto mb-4 animate-pulse">
                ⏳
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Loading your practice history...
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
