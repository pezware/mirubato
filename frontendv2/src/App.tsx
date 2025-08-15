import { useEffect, lazy, Suspense } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useLogbookStore } from './stores/logbookStore'
import { useRepertoireStore } from './stores/repertoireStore'
import { setupPdfWorker } from './utils/pdfWorkerSetup'
import { AutoLoggingProvider } from './modules/auto-logging'
import { runLowercaseMigration } from './utils/migrations/lowercaseMigration'
import { useBetaFeature } from './hooks/useBetaFeatures'
import { TimerProvider } from './contexts/TimerContext'

// Set up PDF worker before any components load
setupPdfWorker()

// Eagerly load the home page (most visited)
import HomePage from './pages/Home'

// Lazy load other pages
const LogbookPage = lazy(() => import('./pages/Logbook'))
const AuthVerifyPage = lazy(() => import('./pages/AuthVerify'))
const ScorebookPage = lazy(() => import('./pages/Scorebook'))
const ScoreBrowser = lazy(() => import('./pages/ScoreBrowser'))
const CollectionView = lazy(() => import('./pages/CollectionView'))
const Toolbox = lazy(() => import('./pages/Toolbox'))
const About = lazy(() => import('./pages/About'))

// Components
import ProtectedRoute from './components/ProtectedRoute'
import { ToastProvider } from './components/ui/ToastProvider'
import { PrivacyBanner } from './components/privacy/PrivacyBanner'

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-purple-600"></div>
  </div>
)

// Component to handle route changes and refresh auth status
function RouteChangeHandler({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { refreshAuth } = useAuthStore()

  useEffect(() => {
    // Refresh auth status on route change to ensure UI is in sync
    refreshAuth()
  }, [location.pathname, refreshAuth])

  return <>{children}</>
}

// Component to handle beta-protected routes
function BetaProtectedRoute({ children }: { children: React.ReactNode }) {
  const isScorebookEnabled = useBetaFeature('scorebook')

  if (!isScorebookEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-stone-100">
        <div className="max-w-md mx-auto text-center p-8">
          <h2 className="text-2xl font-lexend text-morandi-stone-700 mb-4">
            Feature Not Available
          </h2>
          <p className="text-gray-600 mb-6">
            The Scorebook feature is currently in beta and not enabled.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            To enable beta features, add{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">?beta=on</code> to
            any URL.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  const { refreshAuth, isAuthInitialized } = useAuthStore()
  const { enableRealtimeSync } = useLogbookStore()
  const { enableRealtimeSync: enableRepertoireSync } = useRepertoireStore()

  useEffect(() => {
    let isMounted = true

    const initializeApp = async () => {
      // Run lowercase migration for enum values
      runLowercaseMigration()

      // Check if user is authenticated on app load
      if (isMounted) {
        await refreshAuth()
      }

      // Auto-enable WebSocket sync in staging environment AFTER auth is complete
      const hostname = window.location.hostname
      if (hostname.includes('staging') && isMounted) {
        // Set feature flag
        localStorage.setItem('mirubato:feature:realtime-sync', 'true')

        // Wait a bit for auth to settle, then enable WebSocket sync
        setTimeout(async () => {
          const authToken = localStorage.getItem('auth-token')
          const userStr = localStorage.getItem('mirubato:user')

          if (authToken && userStr && isMounted) {
            try {
              // Enable both logbook and repertoire sync
              await Promise.all([enableRealtimeSync(), enableRepertoireSync()])
              console.log(
                '✅ Auto-enabled WebSocket sync for staging environment (logbook + repertoire)'
              )
            } catch (error) {
              console.warn('⚠️ Failed to auto-enable WebSocket sync:', error)
            }
          } else {
            console.warn(
              '⚠️ WebSocket sync not enabled - missing auth credentials:',
              {
                hasToken: !!authToken,
                hasUser: !!userStr,
              }
            )
          }
        }, 1000) // Wait 1 second for auth to complete
      }
    }

    initializeApp()

    return () => {
      isMounted = false
    }
  }, [refreshAuth, enableRealtimeSync, enableRepertoireSync])

  // Show loading screen while auth is being determined
  if (!isAuthInitialized) {
    return <PageLoader />
  }

  return (
    <TimerProvider>
      <AutoLoggingProvider>
        <Router>
          <RouteChangeHandler>
            <div className="min-h-screen bg-morandi-stone-100">
              <ToastProvider />
              <PrivacyBanner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auth/verify" element={<AuthVerifyPage />} />
                  <Route path="/toolbox" element={<Toolbox />} />
                  <Route path="/about" element={<About />} />

                  {/* Protected routes (but work for anonymous users too) */}
                  <Route
                    path="/logbook"
                    element={
                      <ProtectedRoute>
                        <LogbookPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Scorebook routes (beta-protected) */}
                  <Route path="/scorebook">
                    <Route
                      index
                      element={
                        <BetaProtectedRoute>
                          <Suspense fallback={<PageLoader />}>
                            <ScoreBrowser />
                          </Suspense>
                        </BetaProtectedRoute>
                      }
                    />
                    <Route
                      path="browse"
                      element={
                        <BetaProtectedRoute>
                          <Suspense fallback={<PageLoader />}>
                            <ScoreBrowser />
                          </Suspense>
                        </BetaProtectedRoute>
                      }
                    />
                    <Route
                      path="collection/user/:id"
                      element={
                        <BetaProtectedRoute>
                          <Suspense fallback={<PageLoader />}>
                            <CollectionView />
                          </Suspense>
                        </BetaProtectedRoute>
                      }
                    />
                    <Route
                      path="collection/:slug"
                      element={
                        <BetaProtectedRoute>
                          <Suspense fallback={<PageLoader />}>
                            <CollectionView />
                          </Suspense>
                        </BetaProtectedRoute>
                      }
                    />
                    <Route
                      path=":scoreId"
                      element={
                        <BetaProtectedRoute>
                          <Suspense fallback={<PageLoader />}>
                            <ScorebookPage />
                          </Suspense>
                        </BetaProtectedRoute>
                      }
                    />
                  </Route>

                  {/* Redirect unknown routes to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
          </RouteChangeHandler>
        </Router>
      </AutoLoggingProvider>
    </TimerProvider>
  )
}

export default App
