import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AudioProvider } from './contexts/AudioContext'
import { ModulesProvider } from './contexts/ModulesContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import LandingPage from './components/LandingPage'
import Practice from './pages/Practice'
import AuthVerify from './pages/AuthVerify'
import Docs from './pages/Docs'
import Logbook from './pages/Logbook'
import { VersionInfo } from './components/VersionInfo'

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
        <AuthProvider>
          <ModulesProvider>
            <AudioProvider>
              <div className="min-h-screen">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<div>Login Page (TODO)</div>} />
                  <Route path="/auth/verify" element={<AuthVerify />} />
                  <Route
                    path="/magic-link"
                    element={<div>Magic Link Verification (TODO)</div>}
                  />
                  <Route path="/practice" element={<Practice />} />
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
                <VersionInfo />
              </div>
            </AudioProvider>
          </ModulesProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
