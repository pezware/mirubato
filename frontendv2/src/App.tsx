import { useEffect } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Pages (to be implemented)
import HomePage from './pages/Home'
import LogbookPage from './pages/Logbook'
import AuthVerifyPage from './pages/AuthVerify'

// Components
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { refreshAuth } = useAuthStore()

  useEffect(() => {
    // Check if user is authenticated on app load
    refreshAuth()
  }, [refreshAuth])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />

          {/* Protected routes (but work for anonymous users too) */}
          <Route
            path="/logbook"
            element={
              <ProtectedRoute>
                <LogbookPage />
              </ProtectedRoute>
            }
          />

          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
