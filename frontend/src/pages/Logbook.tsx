import React, { useState, useEffect } from 'react'
import ManualEntryForm from '../components/ManualEntryForm'
import LogbookEntryList from '../components/LogbookEntryList'
import LogbookReports from '../components/LogbookReports'
import { PracticeHeader } from '../components/PracticeHeader'
import type { LogbookEntry } from '../modules/logger/types'
import { useModules } from '../contexts/ModulesContext'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@apollo/client'
import { GET_LOGBOOK_ENTRIES } from '../graphql/queries/practice'

const Logbook: React.FC = () => {
  const isMobile = window.innerWidth < 768
  const { practiceLogger, isInitialized, eventBus } = useModules()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)
  const [entries, setEntries] = useState<LogbookEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

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

  // Load entries based on authentication status
  useEffect(() => {
    if (!isInitialized || !practiceLogger) {
      return
    }

    const loadEntries = async () => {
      try {
        // Only show loading on initial load or when switching between storage types
        if (isInitialLoad) {
          setIsLoading(true)
        }

        if (shouldUseGraphQL && graphqlData?.myLogbookEntries?.edges) {
          // Transform GraphQL data to match our interface
          const transformedEntries: LogbookEntry[] =
            graphqlData.myLogbookEntries.edges
              .map((edge: { node: unknown }) => edge.node as any)
              .map(
                (entry: {
                  id: string
                  userId: string
                  timestamp: string
                  duration: number
                  type: string
                  instrument: string
                  pieces: Array<{
                    id: string
                    title: string
                    composer?: string
                  }>
                  techniques: string[]
                  goalIds: string[]
                  notes?: string
                  mood?: string
                  tags: string[]
                  metadata?: { source: string; accuracy?: number }
                  createdAt: string
                  updatedAt: string
                }) => ({
                  ...entry,
                  timestamp: new Date(entry.timestamp).getTime(),
                  goals: entry.goalIds, // Map goalIds to goals
                })
              )
          setEntries(transformedEntries)
        } else if (!shouldUseGraphQL) {
          // Use localStorage for anonymous users
          const filters = user?.id ? { userId: user.id } : {}
          const loadedEntries = await practiceLogger.getLogEntries(filters)
          setEntries(loadedEntries)
        }
      } catch (error) {
        console.error('Failed to load logbook entries:', error)
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
      eventBus.unsubscribe(subscriptionId)
    }
  }, [eventBus, shouldUseGraphQL, refetch])

  const handleSaveEntry = async (
    entry: Omit<LogbookEntry, 'id' | 'userId'>
  ) => {
    if (!practiceLogger) {
      return
    }

    try {
      const newEntry = await practiceLogger.createLogEntry({
        ...entry,
        userId: user?.id || 'guest',
      })

      if (shouldUseGraphQL) {
        // For authenticated users, update local state and trigger refetch
        setEntries([newEntry, ...entries])
        setShowNewEntryForm(false)
        // Trigger refetch to get updated data from server after sync
        setTimeout(() => refetch(), 1000)
      } else {
        // For anonymous users, just update local state
        setEntries([newEntry, ...entries])
        setShowNewEntryForm(false)
      }
    } catch (error) {
      console.error('Failed to save entry:', error)
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
