import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogbookStore } from '../stores/logbookStore'
import { useAuthStore } from '../stores/authStore'
import ManualEntryForm from '../components/ManualEntryForm'
import LogbookEntryList from '../components/LogbookEntryList'
import LogbookReports from '../components/LogbookReports'

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
    <div className="min-h-screen bg-morandi-sand-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-morandi-stone-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-morandi-stone-600 hover:text-morandi-stone-700"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-light text-morandi-stone-700">
                Practice Logbook
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-morandi-stone-600">
                {isAuthenticated ? (
                  <>☁️ Synced • {user?.email}</>
                ) : (
                  <>💾 Local storage</>
                )}
              </div>
              {isAuthenticated && (
                <button
                  onClick={() => {
                    const { syncWithServer } = useLogbookStore.getState()
                    syncWithServer()
                  }}
                  className="text-sm text-morandi-sage-600 hover:text-morandi-sage-700"
                >
                  Sync now
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <p className="text-red-700 flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </p>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Reports Section */}
        <LogbookReports />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowNewEntryForm(true)}
            className="btn-accent flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Add Entry
          </button>
          <input
            type="text"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
          />
        </div>

        {/* New Entry Form Modal */}
        {showNewEntryForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="glass-panel p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
              <ManualEntryForm
                onClose={() => setShowNewEntryForm(false)}
                onSave={() => {
                  setShowNewEntryForm(false)
                  loadEntries()
                }}
              />
            </div>
          </div>
        )}

        {/* Entry List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-sage-400 mx-auto mb-4"></div>
            <p className="text-morandi-stone-600">
              ⏳ Loading your practice sessions...
            </p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-12 text-center">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-morandi-stone-600 text-lg mb-6">
              {searchQuery
                ? 'No entries match your search.'
                : 'No practice entries yet. Start tracking your musical journey!'}
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
          <div className="space-y-4">
            <div className="text-sm text-morandi-stone-600 mb-4">
              Found {filteredEntries.length}{' '}
              {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </div>
            <LogbookEntryList
              entries={filteredEntries}
              onUpdate={() => loadEntries()}
            />
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-6 inline-block">
            <p className="text-morandi-stone-600 text-sm">
              {isAuthenticated ? (
                <>
                  <span className="text-2xl mr-2">☁️</span>
                  Your practice data is automatically synced across all your
                  devices
                </>
              ) : (
                <>
                  <span className="text-2xl mr-2">💾</span>
                  Your data is stored locally on this device.{' '}
                  <Link
                    to="/"
                    className="text-morandi-sage-500 hover:text-morandi-sage-600"
                  >
                    Sign in
                  </Link>{' '}
                  to enable cloud sync.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
