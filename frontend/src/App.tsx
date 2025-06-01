import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './components/LandingPage'
import Practice from './pages/Practice'
import AuthVerify from './pages/AuthVerify'
import { VersionInfo } from './components/VersionInfo'

function App() {
  return (
    <Router>
      <AuthProvider>
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
            <Route path="/profile" element={<div>Profile Page (TODO)</div>} />
            <Route path="/settings" element={<div>Settings Page (TODO)</div>} />
          </Routes>
          <VersionInfo />
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App
