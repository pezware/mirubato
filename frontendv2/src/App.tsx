import { useEffect, lazy, Suspense } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { setupPdfWorker } from './utils/pdfWorkerSetup'
import { AutoLoggingProvider } from './modules/auto-logging'
import { runLowercaseMigration } from './utils/migrations/lowercaseMigration'

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

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-purple-600"></div>
  </div>
)

function App() {
  const { refreshAuth } = useAuthStore()

  useEffect(() => {
    let isMounted = true

    const initializeApp = async () => {
      // Run lowercase migration for enum values
      runLowercaseMigration()

      // Check if user is authenticated on app load
      if (isMounted) {
        await refreshAuth()
      }
    }

    initializeApp()

    return () => {
      isMounted = false
    }
  }, [refreshAuth])

  return (
    <AutoLoggingProvider>
      <Router>
        <div className="min-h-screen bg-morandi-stone-100">
          <ToastProvider />
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

              {/* Scorebook routes (public access) */}
              <Route path="/scorebook">
                <Route
                  index
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ScoreBrowser />
                    </Suspense>
                  }
                />
                <Route
                  path="browse"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ScoreBrowser />
                    </Suspense>
                  }
                />
                <Route
                  path="collection/user/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <CollectionView />
                    </Suspense>
                  }
                />
                <Route
                  path="collection/:slug"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <CollectionView />
                    </Suspense>
                  }
                />
                <Route
                  path=":scoreId"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ScorebookPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </AutoLoggingProvider>
  )
}

export default App
