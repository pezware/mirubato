import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogbookStore } from '../stores/logbookStore'
import { useAuthStore } from '../stores/authStore'
import ManualEntryForm from '../components/ManualEntryForm'
import LogbookEntryList from '../components/LogbookEntryList'
import LogbookReports from '../components/LogbookReports'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function LogbookPage() {
  const {
    user,
    isAuthenticated,
    login,
    isLoading: authLoading,
    error: authError,
  } = useAuthStore()
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
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [email, setEmail] = useState('')
  const [loginSuccess, setLoginSuccess] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email)
      setLoginSuccess(true)
      setShowLoginForm(false)
    } catch {
      // Error is handled in the store
    }
  }

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
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    const { syncWithServer } = useLogbookStore.getState()
                    syncWithServer()
                  }}
                  className="text-sm text-morandi-sage-600 hover:text-morandi-sage-700"
                >
                  Sync now
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="px-4 py-2 bg-morandi-sage-500 text-white text-sm font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200"
                >
                  Sign in
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

        {/* Login Modal */}
        {showLoginForm && !isAuthenticated && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="glass-panel p-8 w-full max-w-md animate-slide-up">
              <h2 className="text-2xl font-light mb-6 text-morandi-stone-700">
                Sign In
              </h2>

              {/* Google Sign In */}
              <div className="mb-6">
                <GoogleSignInButton
                  onSuccess={() => {
                    setShowLoginForm(false)
                    setLoginSuccess(false)
                  }}
                  onError={error => {
                    console.error('Google Sign-In error:', error)
                  }}
                />
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-morandi-stone-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/90 text-morandi-stone-500">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/50 border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                {authError && (
                  <p className="text-red-600 text-sm">{authError}</p>
                )}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-primary flex-1"
                  >
                    {authLoading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLoginForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Login Success Message */}
        {loginSuccess && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
            <div className="glass-panel p-8 w-full max-w-md animate-slide-up">
              <div className="text-center">
                <div className="text-4xl mb-4">📧</div>
                <h3 className="text-xl font-light text-morandi-stone-700 mb-2">
                  Check Your Email!
                </h3>
                <p className="text-morandi-stone-600 mb-6">
                  We've sent a magic link to {email}
                </p>
                <button
                  onClick={() => setLoginSuccess(false)}
                  className="btn-secondary"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
