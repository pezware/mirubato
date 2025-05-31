import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Practice from './pages/Practice'
import PracticeRedesign from './pages/PracticeRedesign'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/practice-redesign" element={<PracticeRedesign />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
