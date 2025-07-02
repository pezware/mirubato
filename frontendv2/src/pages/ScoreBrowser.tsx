import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  scoreService,
  type Score,
  type Collection,
} from '../services/scoreService'
import UnifiedHeader from '../components/layout/UnifiedHeader'
import SignInModal from '../components/auth/SignInModal'
import { useAuthStore } from '../stores/authStore'

export default function ScoreBrowserPage() {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const { slug } = useParams<{ slug?: string }>()
  const { isAuthenticated } = useAuthStore()
  const [scores, setScores] = useState<Score[]>([])
  const [userScores, setUserScores] = useState<Score[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [userCollections, setUserCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInstrument, setSelectedInstrument] = useState<string>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')
  const [showSignInModal, setShowSignInModal] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, selectedInstrument, selectedDifficulty, isAuthenticated])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load collections
      const collectionsData = await scoreService.getCollections()
      setCollections(collectionsData)

      // Load user's collections and scores if authenticated
      if (isAuthenticated) {
        try {
          const userCollectionsData = await scoreService.getUserCollections()
          setUserCollections(userCollectionsData)

          const userScoresData = await scoreService.getUserScores()
          setUserScores(userScoresData.items)
        } catch (error) {
          console.error('Failed to load user data:', error)
          // Continue loading public data even if user data fails
        }
      }

      // Load scores based on filters or collection
      if (slug) {
        // Load specific collection
        const collection = await scoreService.getCollection(slug)
        // For now, load all scores and filter by IDs
        const allScores = await scoreService.getScores()
        const collectionScores = allScores.items.filter(score =>
          collection.scoreIds.includes(score.id)
        )
        setScores(collectionScores)
      } else {
        // Load all scores with filters
        const params: Record<string, string> = {}
        if (selectedInstrument) params.instrument = selectedInstrument
        if (selectedDifficulty) params.difficulty = selectedDifficulty

        const scoresData = await scoreService.getScores(params)
        setScores(scoresData.items)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScoreSelect = (scoreId: string) => {
    navigate(`/scorebook/${scoreId}`)
  }

  return (
    <div className="min-h-screen bg-morandi-sand-100">
      <UnifiedHeader
        currentPage="scorebook"
        onSignInClick={() => setShowSignInModal(true)}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedInstrument}
              onChange={e => setSelectedInstrument(e.target.value)}
              className="px-4 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
            >
              <option value="">
                {t('scorebook:allInstruments', 'All Instruments')}
              </option>
              <option value="PIANO">{t('scorebook:piano', 'Piano')}</option>
              <option value="GUITAR">{t('scorebook:guitar', 'Guitar')}</option>
            </select>

            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
            >
              <option value="">
                {t('scorebook:allDifficulties', 'All Difficulties')}
              </option>
              <option value="BEGINNER">
                {t('scorebook:beginner', 'Beginner')}
              </option>
              <option value="INTERMEDIATE">
                {t('scorebook:intermediate', 'Intermediate')}
              </option>
              <option value="ADVANCED">
                {t('scorebook:advanced', 'Advanced')}
              </option>
            </select>
          </div>
        </div>

        {/* Collections */}
        {collections.filter(c => c.isFeatured).length > 0 && !slug && (
          <div className="mb-8">
            <h2 className="text-xl font-medium text-morandi-stone-800 mb-4">
              {t('scorebook:featuredCollections', 'Featured Collections')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections
                .filter(c => c.isFeatured)
                .map(collection => (
                  <Link
                    key={collection.id}
                    to={`/scorebook/collection/${collection.slug}`}
                    className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-morandi-stone-800 mb-2">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-morandi-stone-600 mb-3">
                      {collection.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-morandi-stone-500">
                      {collection.instrument && (
                        <span className="px-2 py-1 bg-morandi-sand-100 rounded">
                          {collection.instrument}
                        </span>
                      )}
                      {collection.difficulty && (
                        <span className="px-2 py-1 bg-morandi-sage-100 rounded">
                          {collection.difficulty}
                        </span>
                      )}
                      <span>{collection.scoreIds.length} scores</span>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* My Scores Section - Only show if authenticated and not viewing a collection */}
        {isAuthenticated && !slug && userScores.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-medium text-morandi-stone-800 mb-4">
              {t('scorebook:myScores', 'My Scores')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userScores.map(score => (
                <button
                  key={score.id}
                  onClick={() => handleScoreSelect(score.id)}
                  className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-6 hover:shadow-md transition-shadow text-left"
                >
                  <h3 className="font-medium text-morandi-stone-800 mb-2">
                    {score.title}
                  </h3>
                  <p className="text-sm text-morandi-stone-600 mb-3">
                    {score.composer}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-1 bg-morandi-sand-100 text-morandi-stone-700 rounded">
                      {score.instrument === 'PIANO' ? '🎹' : '🎸'}{' '}
                      {score.instrument}
                    </span>
                    <span className="px-2 py-1 bg-morandi-sage-100 text-morandi-stone-700 rounded">
                      {score.difficulty}
                    </span>
                    {score.source_type && (
                      <span className="px-2 py-1 bg-morandi-rose-100 text-morandi-stone-700 rounded">
                        {score.source_type === 'multi-image' ? '📷' : '📄'}
                      </span>
                    )}
                  </div>
                  {score.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {score.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-600 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scores Grid */}
        <div>
          <h2 className="text-xl font-medium text-morandi-stone-800 mb-4">
            {slug
              ? t('scorebook:collectionScores', 'Collection Scores')
              : t('scorebook:allScores', 'All Scores')}
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-sage-500 mx-auto mb-4"></div>
              <p className="text-morandi-stone-600">{t('common:loading')}...</p>
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-morandi-stone-600">
                {t('scorebook:noScoresFound', 'No scores found')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scores.map(score => (
                <button
                  key={score.id}
                  onClick={() => handleScoreSelect(score.id)}
                  className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-6 hover:shadow-md transition-shadow text-left"
                >
                  <h3 className="font-medium text-morandi-stone-800 mb-2">
                    {score.title}
                  </h3>
                  <p className="text-sm text-morandi-stone-600 mb-3">
                    {score.composer}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2 py-1 bg-morandi-sand-100 text-morandi-stone-700 rounded">
                      {score.instrument === 'PIANO' ? '🎹' : '🎸'}{' '}
                      {score.instrument}
                    </span>
                    <span className="px-2 py-1 bg-morandi-sage-100 text-morandi-stone-700 rounded">
                      {score.difficulty}
                    </span>
                    {score.difficulty_level && (
                      <span className="text-morandi-stone-500">
                        Level {score.difficulty_level}
                      </span>
                    )}
                  </div>
                  {score.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {score.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-600 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </div>
  )
}
