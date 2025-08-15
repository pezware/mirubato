import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useScoreStore } from '../stores/scoreStore'
import ScoreViewer from '../components/score/ScoreViewer'
import ScoreControls from '../components/score/ScoreControls'
import ScoreManagement from '../components/score/ScoreManagement'
import AppLayout from '../components/layout/AppLayout'
import TimerEntry from '../components/TimerEntry'
import { MusicTitle, MusicComposer } from '../components/ui'

export default function ScorebookPage() {
  const { t } = useTranslation(['scorebook', 'common'])
  const { scoreId } = useParams<{ scoreId?: string }>()
  const navigate = useNavigate()
  const {
    currentScore,
    isLoading,
    error,
    showManagement,
    loadScore,
    clearError,
    loadCollections,
  } = useScoreStore()

  const [showTimer, setShowTimer] = useState(false)

  // Load score if scoreId is provided
  useEffect(() => {
    if (scoreId) {
      loadScore(scoreId)
    }
  }, [scoreId, loadScore])

  // Load collections on mount
  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const handleTimerComplete = (_duration: number, _startTime?: Date) => {
    setShowTimer(false)
    // Could add practice session logging here if needed
  }

  const handleImportScore = () => {
    // Navigate to score browser for import
    navigate('/scorebook/browse')
  }

  // If no scoreId, show the score browser
  if (!scoreId) {
    navigate('/scorebook/browse')
    return null
  }

  return (
    <AppLayout
      onTimerClick={() => setShowTimer(true)}
      onImportScore={handleImportScore}
    >
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Score Info Bar */}
        {currentScore && (
          <div className="bg-white border-b border-morandi-stone-200 px-3 sm:px-4 py-2 sm:py-3">
            <div className="container mx-auto max-w-6xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <MusicTitle as="h2" className="text-morandi-stone-800">
                  {currentScore.title}
                </MusicTitle>
                <MusicComposer as="span" className="text-morandi-stone-600">
                  {currentScore.composer}
                </MusicComposer>
                <span className="px-2 py-1 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                  {currentScore.difficulty}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-sage-500 mx-auto mb-4"></div>
              <p className="text-morandi-stone-600">
                {t('scorebook:loading', 'Loading score...')}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center p-3 sm:px-6 sm:py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 max-w-md">
              <h3 className="text-red-800 font-medium mb-2">
                {t('scorebook:error', 'Error loading score')}
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => {
                  clearError()
                  if (scoreId) loadScore(scoreId)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common:retry')}
              </button>
            </div>
          </div>
        )}

        {/* Score Display */}
        {currentScore && !isLoading && !error && (
          <>
            <ScoreViewer score={currentScore} />
            <ScoreControls />
          </>
        )}
      </div>

      {/* Score Management Panel */}
      {showManagement && <ScoreManagement />}

      {/* Timer Modal */}
      <TimerEntry
        isOpen={showTimer}
        onClose={() => setShowTimer(false)}
        onComplete={handleTimerComplete}
      />
    </AppLayout>
  )
}
