import { Link } from 'react-router-dom'
import { useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import GoogleSignInButton from '../components/GoogleSignInButton'
import LanguageSwitcher from '../components/LanguageSwitcher'

// Lazy load the piano component (contains Tone.js)
const InteractivePiano = lazy(() => import('../components/InteractivePiano'))

// Loading placeholder for piano
const PianoLoader = () => (
  <div className="flex justify-center items-center h-32">
    <div className="text-white/60 animate-pulse">Loading piano...</div>
  </div>
)

export default function HomePage() {
  const { t } = useTranslation(['common', 'auth', 'logbook'])
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
    } catch {
      // Error is handled in the store
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center relative"
      style={{
        backgroundImage: 'url(/mirubato-cover.jpeg)',
      }}
    >
      {/* Subtle overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
          <div className="text-white/90">{/* Logo placeholder */}</div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                <span className="text-white/90 text-sm">{user.email}</span>
                <Link
                  to="/logbook"
                  className="text-white/90 hover:text-white text-sm transition-colors"
                >
                  {t('common:navigation.logbook')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white/90 hover:text-white text-sm transition-colors"
                  disabled={isLoading}
                >
                  {t('auth:signOut')}
                </button>
              </div>
            ) : (
              <>
                {!showLoginForm && !loginSuccess && (
                  <button
                    onClick={() => setShowLoginForm(true)}
                    className="text-white/90 hover:text-white text-sm transition-colors"
                  >
                    {t('auth:signIn')}
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            {/* Title */}
            <h1 className="text-7xl font-thin text-white mb-4 tracking-wide animate-fade-in">
              {t('common:appName')}
            </h1>
            <p className="text-xl text-white/80 mb-12 font-light">
              {t('common:tagline')}
            </p>

            {/* Interactive Piano Panel */}
            <Suspense fallback={<PianoLoader />}>
              <InteractivePiano />
            </Suspense>

            {/* CTA or User Status */}
            {!isAuthenticated ? (
              <Link
                to="/logbook"
                className="inline-block bg-white/90 hover:bg-white text-morandi-stone-700 px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t('logbook:openLogbook')} →
              </Link>
            ) : (
              <Link
                to="/logbook"
                className="inline-block bg-morandi-sage-400 hover:bg-morandi-sage-500 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t('logbook:continueToLogbook')} →
              </Link>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-white/70 text-sm">
            Open-source practice journal for musicians
          </p>
        </footer>
      </div>

      {/* Login Modal */}
      {showLoginForm && !isAuthenticated && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="glass-panel p-8 w-full max-w-md animate-slide-up">
            <h2 className="text-2xl font-light mb-6 text-morandi-stone-700">
              {t('auth:signIn')}
            </h2>

            {/* Google Sign In */}
            <div className="mb-6">
              <GoogleSignInButton
                onSuccess={() => {
                  setShowLoginForm(false)
                  setLoginSuccess(false)
                }}
                onError={error => {
                  // Error is already handled in the store, but we can add extra handling here if needed
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
                  {t('auth:orContinueWithEmail')}
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
                  placeholder={t('auth:emailPlaceholder')}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary flex-1"
                >
                  {isLoading ? t('common:loading') : t('auth:sendMagicLink')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginForm(false)}
                  className="btn-secondary flex-1"
                >
                  {t('common:cancel')}
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
                {t('auth:checkYourEmail')}
              </h3>
              <p className="text-morandi-stone-600 mb-6">
                {t('auth:magicLinkSent', { email })}
              </p>
              <button
                onClick={() => setLoginSuccess(false)}
                className="btn-secondary"
              >
                {t('auth:gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
