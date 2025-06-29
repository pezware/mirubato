import { useState } from 'react'
import { Link } from 'react-router-dom'

// Mock component to demonstrate Scorebook UI design
export default function ScorebookPage() {
  const [isAuthenticated] = useState(true)
  const [user] = useState({ email: 'user@example.com' })
  const [isMetronomeOn, setIsMetronomeOn] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [showManagement, setShowManagement] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [currentMeasure] = useState(8)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)

  // Mock score data
  const currentScore = {
    id: 'score_bach_invention_1',
    title: 'Invention No. 1 in C Major',
    composer: 'Johann Sebastian Bach',
    difficulty: 'INTERMEDIATE',
    instrument: 'PIANO',
    totalMeasures: 22,
  }

  return (
    <div className="min-h-screen bg-morandi-sand-100 flex flex-col">
      {/* Minimal Header - Similar to Logbook */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-morandi-stone-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-xl sm:text-2xl font-lexend font-light text-mirubato-wood-800 hover:text-mirubato-wood-600 transition-colors"
              >
                Mirubato
              </Link>
              <h1 className="text-base sm:text-lg font-inter font-normal text-morandi-stone-600">
                Scorebook
              </h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm font-inter text-morandi-stone-600">
                {isAuthenticated ? (
                  <span className="flex items-center gap-1">
                    <span className="hidden sm:inline">☁️ Full Access •</span>
                    <span className="text-xs sm:text-sm">{user?.email}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="hidden sm:inline">👁️</span>
                    <span>Read-Only Mode</span>
                  </span>
                )}
              </div>
              {!isAuthenticated && (
                <button className="px-3 sm:px-4 py-1.5 sm:py-2 bg-morandi-sage-500 text-white text-xs sm:text-sm font-inter font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200">
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Score Info Bar */}
        <div className="bg-white border-b border-morandi-stone-200 px-4 py-3">
          <div className="container mx-auto max-w-6xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-morandi-stone-800">
                {currentScore.title}
              </h2>
              <span className="text-sm text-morandi-stone-600">
                {currentScore.composer}
              </span>
              <span className="px-2 py-1 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                {currentScore.difficulty}
              </span>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-morandi-stone-600">
                Measure {currentMeasure} of {currentScore.totalMeasures}
              </span>
              <div className="w-32 h-2 bg-morandi-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-morandi-sage-400 transition-all duration-300"
                  style={{
                    width: `${(currentMeasure / currentScore.totalMeasures) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Score Display Area */}
        <div className="flex-1 relative bg-white">
          {/* Score Container */}
          <div className="h-full overflow-auto p-8">
            <div className="max-w-5xl mx-auto">
              {/* Mock Score Display */}
              <div className="bg-morandi-stone-50 rounded-lg p-8 min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎼</div>
                  <p className="text-morandi-stone-600">Score rendering area</p>
                  <p className="text-sm text-morandi-stone-500 mt-2">
                    VexFlow.js will render the sheet music here
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-morandi-stone-200 px-6 py-3">
            {/* Practice Tracking Toggle */}
            <button
              onClick={() => setIsTracking(!isTracking)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isTracking
                  ? 'bg-red-500 text-white'
                  : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${isTracking ? 'bg-white animate-pulse' : 'bg-red-500'}`}
              />
              <span className="text-sm font-medium">
                {isTracking ? 'Recording' : 'Start Practice'}
              </span>
            </button>

            {/* Metronome Controls */}
            <div className="flex items-center gap-3 px-4 py-2 bg-morandi-stone-50 rounded-full">
              <button
                onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                className={`p-2 rounded-full transition-all ${
                  isMetronomeOn
                    ? 'bg-morandi-sage-500 text-white'
                    : 'bg-morandi-stone-200 text-morandi-stone-600 hover:bg-morandi-stone-300'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {isMetronomeOn && (
                <>
                  <button
                    onClick={() => setTempo(Math.max(40, tempo - 10))}
                    className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="text-lg font-mono font-medium text-morandi-stone-800 w-12 text-center">
                      {tempo}
                    </span>
                    <span className="text-xs text-morandi-stone-500">BPM</span>
                  </div>

                  <button
                    onClick={() => setTempo(Math.min(240, tempo + 10))}
                    className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Auto-scroll Toggle */}
            <button
              onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
              className={`p-2 rounded-full transition-all ${
                autoScrollEnabled
                  ? 'bg-morandi-sky-100 text-morandi-sky-700'
                  : 'bg-morandi-stone-100 text-morandi-stone-600'
              }`}
              title="Auto-scroll"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>

            {/* Management Menu Toggle */}
            <button
              onClick={() => setShowManagement(!showManagement)}
              className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 rounded-full hover:bg-morandi-stone-100 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Management Panel */}
      {showManagement && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setShowManagement(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-morandi-stone-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-morandi-stone-800">
                  Score Management
                </h3>
                <button
                  onClick={() => setShowManagement(false)}
                  className="p-2 hover:bg-morandi-stone-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Search Scores */}
              <div>
                <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                  Search Scores
                </h4>
                <input
                  type="text"
                  placeholder="Search by title, composer..."
                  className="w-full px-4 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
                />
              </div>

              {/* Upload Score */}
              {isAuthenticated && (
                <div>
                  <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                    Upload New Score
                  </h4>
                  <div className="border-2 border-dashed border-morandi-stone-300 rounded-lg p-8 text-center">
                    <svg
                      className="w-12 h-12 mx-auto text-morandi-stone-400 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-morandi-stone-600 mb-2">
                      Drop PDF files here or click to browse
                    </p>
                    <button className="px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-400 transition-colors text-sm">
                      Select Files
                    </button>
                  </div>
                </div>
              )}

              {/* My Scores */}
              <div>
                <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                  My Scores
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-morandi-stone-50 rounded-lg hover:bg-morandi-stone-100 cursor-pointer transition-colors">
                    <div className="font-medium text-morandi-stone-800">
                      Invention No. 1
                    </div>
                    <div className="text-sm text-morandi-stone-600">
                      Bach • Piano
                    </div>
                  </div>
                  <div className="p-3 bg-morandi-stone-50 rounded-lg hover:bg-morandi-stone-100 cursor-pointer transition-colors">
                    <div className="font-medium text-morandi-stone-800">
                      Clair de Lune
                    </div>
                    <div className="text-sm text-morandi-stone-600">
                      Debussy • Piano
                    </div>
                  </div>
                  <div className="p-3 bg-morandi-stone-50 rounded-lg hover:bg-morandi-stone-100 cursor-pointer transition-colors">
                    <div className="font-medium text-morandi-stone-800">
                      Study in A Minor
                    </div>
                    <div className="text-sm text-morandi-stone-600">
                      Tárrega • Guitar
                    </div>
                  </div>
                </div>
              </div>

              {/* Collections */}
              <div>
                <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
                  Browse Collections
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 bg-morandi-sage-50 text-morandi-stone-700 rounded-lg hover:bg-morandi-sage-100 transition-colors text-sm">
                    Beginner Piano
                  </button>
                  <button className="p-3 bg-morandi-sky-50 text-morandi-stone-700 rounded-lg hover:bg-morandi-sky-100 transition-colors text-sm">
                    Classical Guitar
                  </button>
                  <button className="p-3 bg-morandi-blush-50 text-morandi-stone-700 rounded-lg hover:bg-morandi-blush-100 transition-colors text-sm">
                    Sight Reading
                  </button>
                  <button className="p-3 bg-morandi-sand-200 text-morandi-stone-700 rounded-lg hover:bg-morandi-sand-300 transition-colors text-sm">
                    Popular Songs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Practice Complete Modal (shown when tracking stops) */}
      {/* <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full animate-slide-up">
            <h3 className="text-xl font-medium text-morandi-stone-800 mb-4">
              Practice Session Complete!
            </h3>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-morandi-stone-600">Duration:</span>
                <span className="font-medium">12 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-morandi-stone-600">Progress:</span>
                <span className="font-medium">Measures 1-8 completed</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-400 transition-colors">
                Save to Logbook
              </button>
              <button className="flex-1 px-4 py-2 bg-morandi-stone-200 text-morandi-stone-700 rounded-lg hover:bg-morandi-stone-300 transition-colors">
                Discard
              </button>
            </div>
          </div>
        </div> */}
    </div>
  )
}
