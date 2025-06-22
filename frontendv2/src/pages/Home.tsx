import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

export default function HomePage() {
  const { user, isAuthenticated, login, logout, isLoading, error } =
    useAuthStore()
  const [email, setEmail] = useState('')
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email)
      setLoginSuccess(true)
      setShowLoginForm(false)
    } catch (err) {
      // Error is handled in the store
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Mirubato
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Your Personal Music Practice Companion
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          {/* User Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Logged in as
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You're using Mirubato anonymously. Your data is stored
                  locally.
                </p>
                {!showLoginForm && !loginSuccess && (
                  <button
                    onClick={() => setShowLoginForm(true)}
                    className="btn-primary"
                  >
                    Sign in for Cloud Sync
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Login Form */}
          {showLoginForm && !isAuthenticated && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Sign In
              </h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="your@email.com"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary flex-1"
                  >
                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLoginForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Login Success Message */}
          {loginSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                Check Your Email!
              </h3>
              <p className="text-green-700 dark:text-green-400">
                We've sent a magic link to {email}. Click the link in your email
                to sign in.
              </p>
            </div>
          )}

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                📚 Practice Logbook
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Track your practice sessions, set goals, and monitor your
                progress over time.
              </p>
              <Link
                to="/logbook"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Open Logbook →
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                🎼 Sheet Music Library
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Access a curated collection of sheet music for piano and guitar.
              </p>
              <span className="text-gray-500 italic">Coming Soon</span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center">
            <p className="text-blue-800 dark:text-blue-300">
              {isAuthenticated
                ? 'Your data is automatically synced to the cloud.'
                : 'Your data is stored locally. Sign in to enable cloud sync across devices.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
