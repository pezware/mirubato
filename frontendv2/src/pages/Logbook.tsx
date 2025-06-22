import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogbookStore } from '../stores/logbookStore'
import { useAuthStore } from '../stores/authStore'
import ManualEntryForm from '../components/ManualEntryForm'
import LogbookEntryList from '../components/LogbookEntryList'

export default function LogbookPage() {
  const { user, isAuthenticated } = useAuthStore()
  const {
    entries,
    isLoading,
    error,
    searchQuery,
    loadEntries,
    setSearchQuery,
    clearError,
  } = useLogbookStore()

  const [showNewEntryForm, setShowNewEntryForm] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Filter entries based on search query
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    return (
      entry.notes?.toLowerCase().includes(searchLower) ||
      entry.pieces.some(
        p =>
          p.title.toLowerCase().includes(searchLower) ||
          p.composer?.toLowerCase().includes(searchLower)
      ) ||
      entry.techniques.some(t => t.toLowerCase().includes(searchLower)) ||
      entry.tags.some(t => t.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Practice Logbook
              </h1>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {isAuthenticated ? (
                <>Logged in as {user?.email}</>
              ) : (
                <>Using local storage</>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 dark:text-red-400"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={() => setShowNewEntryForm(true)}
            className="btn-primary"
          >
            + Add Entry
          </button>
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* New Entry Form */}
        {showNewEntryForm && (
          <div className="mb-6">
            <ManualEntryForm
              onClose={() => setShowNewEntryForm(false)}
              onSave={() => {
                setShowNewEntryForm(false)
                loadEntries()
              }}
            />
          </div>
        )}

        {/* Entry List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading entries...
            </p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {searchQuery
                ? 'No entries match your search.'
                : 'No practice entries yet. Start by adding your first entry!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewEntryForm(true)}
                className="btn-primary"
              >
                Add Your First Entry
              </button>
            )}
          </div>
        ) : (
          <LogbookEntryList
            entries={filteredEntries}
            onUpdate={() => loadEntries()}
          />
        )}

        {/* Storage Info */}
        <div className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400">
          {isAuthenticated ? (
            <p>
              Your data is synced to the cloud and available on all your
              devices.
            </p>
          ) : (
            <p>
              Your data is stored locally on this device.{' '}
              <Link
                to="/"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Sign in
              </Link>{' '}
              to enable cloud sync.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
