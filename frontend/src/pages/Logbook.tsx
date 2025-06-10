import React, { useState } from 'react'
import ManualEntryForm from '../components/ManualEntryForm'
import type { LogbookEntry } from '../modules/logger/types'

const Logbook: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)

  // TODO: This will be populated from PracticeLoggerModule
  const entries: unknown[] = []

  const handleSaveEntry = (entry: Omit<LogbookEntry, 'id' | 'userId'>) => {
    // TODO: Save entry using PracticeLoggerModule
    console.log('Saving entry:', entry)
    setShowNewEntryForm(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
        {entries.length === 0 ? (
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
          <div className="space-y-6">
            {/* Placeholder for LogbookEntryList component */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600">Entry list will appear here</p>
            </div>
          </div>
        )}

        {/* Stats Summary (Future Enhancement) */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Practice Time</p>
                <p className="text-2xl font-bold text-gray-900">0h 0m</p>
              </div>
              <div className="text-3xl text-gray-400">📅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sessions This Week</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <div className="text-3xl text-gray-400">🎵</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold text-gray-900">0 days</p>
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
