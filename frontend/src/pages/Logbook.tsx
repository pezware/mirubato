import React, { useState, useEffect } from 'react'
import ManualEntryForm from '../components/ManualEntryForm'
import LogbookEntryList from '../components/LogbookEntryList'
import LogbookReports from '../components/LogbookReports'
import { PracticeHeader } from '../components/PracticeHeader'
import type { LogbookEntry } from '../modules/logger/types'
import { useModules } from '../contexts/ModulesContext'
import { useAuth } from '../hooks/useAuth'

const Logbook: React.FC = () => {
  const isMobile = window.innerWidth < 768
  const { practiceLogger, isInitialized } = useModules()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)
  const [entries, setEntries] = useState<LogbookEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load entries from PracticeLoggerModule
  useEffect(() => {
    if (!isInitialized || !practiceLogger) {
      return
    }

    const loadEntries = async () => {
      try {
        setIsLoading(true)
        const filters = user?.id ? { userId: user.id } : {}
        const loadedEntries = await practiceLogger.getLogEntries(filters)
        setEntries(loadedEntries)
      } catch (error) {
        console.error('Failed to load logbook entries:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEntries()
  }, [isInitialized, practiceLogger, user])

  const handleSaveEntry = async (
    entry: Omit<LogbookEntry, 'id' | 'userId'>
  ) => {
    if (!practiceLogger) {
      console.error('PracticeLogger not initialized')
      return
    }

    try {
      const newEntry = await practiceLogger.createLogEntry({
        ...entry,
        userId: user?.id || 'guest', // Use actual user ID or 'guest'
      })
      setEntries([newEntry, ...entries])
      setShowNewEntryForm(false)
    } catch (error) {
      console.error('Failed to save entry:', error)
    }
  }

  const handleEditEntry = async (entry: LogbookEntry) => {
    if (!practiceLogger) {
      console.error('PracticeLogger not initialized')
      return
    }

    // TODO: Implement edit UI and then call practiceLogger.updateLogEntry
    console.log('Edit entry:', entry)
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!practiceLogger) {
      console.error('PracticeLogger not initialized')
      return
    }

    try {
      await practiceLogger.deleteLogEntry(entryId)
      setEntries(entries.filter(e => e.id !== entryId))
    } catch (error) {
      console.error('Failed to delete entry:', error)
    }
  }

  // Calculate stats
  const calculateStats = () => {
    const totalSeconds = entries.reduce((sum, entry) => sum + entry.duration, 0)
    const totalHours = Math.floor(totalSeconds / 3600)
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60)

    // Calculate sessions this week
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const sessionsThisWeek = entries.filter(
      entry => entry.timestamp >= oneWeekAgo
    ).length

    // Calculate streak (consecutive days)
    const sortedDates = entries
      .map(entry => new Date(entry.timestamp).toDateString())
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let streak = 0
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()

    if (sortedDates.length > 0) {
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        streak = 1
        for (let i = 1; i < sortedDates.length; i++) {
          const currentDate = new Date(sortedDates[i])
          const previousDate = new Date(sortedDates[i - 1])
          const diffDays = Math.floor(
            (previousDate.getTime() - currentDate.getTime()) /
              (24 * 60 * 60 * 1000)
          )
          if (diffDays === 1) {
            streak++
          } else {
            break
          }
        }
      }
    }

    return {
      totalTime: `${totalHours}h ${totalMinutes}m`,
      sessionsThisWeek,
      streak,
    }
  }

  const stats = calculateStats()

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

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Practice Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalTime}
                </p>
              </div>
              <div className="text-3xl text-gray-400">📅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sessions This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.sessionsThisWeek}
                </p>
              </div>
              <div className="text-3xl text-gray-400">🎵</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.streak} {stats.streak === 1 ? 'day' : 'days'}
                </p>
              </div>
              <div className="text-2xl">🔥</div>
            </div>
          </div>
        </div>
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
