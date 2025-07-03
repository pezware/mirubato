import { useEffect, lazy, Suspense } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { migrateLegacyData } from './utils/migrateLegacyData'
import { fixLocalStorageData } from './utils/fixLocalStorageData'
import { setupPdfWorker } from './utils/pdfWorkerSetup'

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
const ScoreImport = lazy(() =>
  import('./components/scorebook/ScoreImport').then(module => ({
    default: module.ScoreImport,
  }))
)
const Toolbox = lazy(() => import('./pages/Toolbox'))

// Components
import ProtectedRoute from './components/ProtectedRoute'

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-purple-600"></div>
  </div>
)

function App() {
  const { refreshAuth } = useAuthStore()

  useEffect(() => {
    // Fix any corrupted localStorage data first
    fixLocalStorageData()

    // Migrate any legacy data on first load
    migrateLegacyData()

    // Check if user is authenticated on app load
    refreshAuth()
  }, [refreshAuth])

  return (
    <Router>
      <div className="min-h-screen bg-morandi-stone-100">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/verify" element={<AuthVerifyPage />} />
            <Route path="/toolbox" element={<Toolbox />} />

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
                path="import"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ScoreImport />
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
  )
}

export default App
