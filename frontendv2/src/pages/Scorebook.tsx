import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useScoreStore } from '../stores/scoreStore'
import ScoreViewer from '../components/score/ScoreViewer'
import ScoreControls from '../components/score/ScoreControls'
import ScoreManagement from '../components/score/ScoreManagement'

export default function ScorebookPage() {
  const { t } = useTranslation(['scorebook', 'common'])
  const { scoreId } = useParams<{ scoreId?: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const {
    currentScore,
    isLoading,
    error,
    showManagement,
    loadScore,
    clearError,
    loadCollections,
  } = useScoreStore()

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

  // If no scoreId, show the score browser
  if (!scoreId) {
    navigate('/scorebook/browse')
    return null
  }

  return (
    <div className="min-h-screen bg-morandi-sand-100 flex flex-col">
      {/* Minimal Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-morandi-stone-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-xl sm:text-2xl font-lexend font-light text-mirubato-wood-800 hover:text-mirubato-wood-600 transition-colors"
              >
                {t('common:appName')}
              </Link>
              <h1 className="text-base sm:text-lg font-inter font-normal text-morandi-stone-600">
                {t('scorebook:title', 'Scorebook')}
              </h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm font-inter text-morandi-stone-600">
                {isAuthenticated ? (
                  <span className="flex items-center gap-1">
                    <span className="hidden sm:inline">
                      ☁️ {t('scorebook:fullAccess', 'Full Access')} •
                    </span>
                    <span className="text-xs sm:text-sm">{user?.email}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="hidden sm:inline">👁️</span>
                    <span>{t('scorebook:readOnly', 'Read-Only Mode')}</span>
                  </span>
                )}
              </div>
              {!isAuthenticated && (
                <Link
                  to="/auth"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-morandi-sage-500 text-white text-xs sm:text-sm font-inter font-medium rounded-lg hover:bg-morandi-sage-400 transition-all duration-200"
                >
                  {t('common:signIn')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Score Info Bar */}
        {currentScore && (
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
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
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
    </div>
  )
}
