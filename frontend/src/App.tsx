import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AudioProvider } from './contexts/AudioContext'
import { ModulesProvider } from './contexts/ModulesContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { VersionInfo } from './components/VersionInfo'

// Eager load landing page for fast initial render
import LandingPage from './components/LandingPage'

// Lazy load heavy pages
// Phase 2 - Practice mode temporarily phased out
// const Practice = lazy(() => import('./pages/Practice'))
const AuthVerify = lazy(() => import('./pages/AuthVerify'))
const Docs = lazy(() => import('./pages/Docs'))
const Logbook = lazy(() => import('./pages/Logbook'))

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // TODO: Send to error tracking service (e.g., Sentry)
        // For now, we'll just log in development
        if (process.env.NODE_ENV === 'development') {
          console.error('App Error:', error, errorInfo)
        }
      }}
    >
      <Router>
        <ModulesProvider>
          <AuthProvider>
            <AudioProvider>
              <div className="min-h-screen">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route
                      path="/login"
                      element={<div>Login Page (TODO)</div>}
                    />
                    <Route path="/auth/verify" element={<AuthVerify />} />
                    <Route
                      path="/magic-link"
                      element={<div>Magic Link Verification (TODO)</div>}
                    />
                    {/* Phase 2 - Practice mode temporarily phased out */}
                    {/* <Route path="/practice" element={<Practice />} /> */}
                    <Route path="/logbook" element={<Logbook />} />
                    <Route
                      path="/profile"
                      element={<div>Profile Page (TODO)</div>}
                    />
                    <Route
                      path="/settings"
                      element={<div>Settings Page (TODO)</div>}
                    />
                    <Route path="/docs/*" element={<Docs />} />
                  </Routes>
                </Suspense>
                <VersionInfo />
              </div>
            </AudioProvider>
          </AuthProvider>
        </ModulesProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
