import React, { useState, useEffect } from 'react'
import ManualEntryForm from '../components/ManualEntryForm'
import LogbookEntryList from '../components/LogbookEntryList'
import { PracticeHeader } from '../components/PracticeHeader'
import type { LogbookEntry } from '../modules/logger/types'

const LOGBOOK_STORAGE_KEY = 'mirubato_logbook_entries'

const Logbook: React.FC = () => {
  const isMobile = window.innerWidth < 768
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)
  const [entries, setEntries] = useState<LogbookEntry[]>([])

  // Load entries from localStorage on mount
  useEffect(() => {
    try {
      const storedEntries = localStorage.getItem(LOGBOOK_STORAGE_KEY)
      if (storedEntries) {
        const parsedEntries = JSON.parse(storedEntries)
        setEntries(parsedEntries)
      }
    } catch (error) {
      console.error('Failed to load logbook entries from localStorage:', error)
    }
  }, [])

  // Save entries to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LOGBOOK_STORAGE_KEY, JSON.stringify(entries))
    } catch (error) {
      console.error('Failed to save logbook entries to localStorage:', error)
    }
  }, [entries])

  const handleSaveEntry = (entry: Omit<LogbookEntry, 'id' | 'userId'>) => {
    // TODO: Save entry using PracticeLoggerModule
    // For now, create a complete entry and add to state
    const newEntry: LogbookEntry = {
      ...entry,
      id: `local-${Date.now()}`,
      userId: 'current-user', // TODO: Get from auth context
    }
    setEntries([newEntry, ...entries])
    setShowNewEntryForm(false)
  }

  const handleEditEntry = (entry: LogbookEntry) => {
    // TODO: Implement edit functionality
    console.log('Edit entry:', entry)
  }

  const handleDeleteEntry = (entryId: string) => {
    // TODO: Delete using PracticeLoggerModule
    setEntries(entries.filter(e => e.id !== entryId))
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

        {/* Entry List or Empty State */}
        {entries.length === 0 && !searchQuery ? (
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
