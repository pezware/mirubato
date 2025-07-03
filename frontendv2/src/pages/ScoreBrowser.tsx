import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { scoreService, type Score } from '../services/scoreService'
import type { Collection } from '../types/collections'
import UnifiedHeader from '../components/layout/UnifiedHeader'
import SignInModal from '../components/auth/SignInModal'
import AddToCollectionModal from '../components/score/AddToCollectionModal'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../utils/cn'

type TabView = 'scores' | 'publicCollections' | 'myCollections'

export default function ScoreBrowserPage() {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const { slug } = useParams<{ slug?: string }>()
  const { isAuthenticated } = useAuthStore()
  const [scores, setScores] = useState<Score[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [userCollections, setUserCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInstrument, setSelectedInstrument] = useState<string>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [selectedScoreForCollection, setSelectedScoreForCollection] =
    useState<Score | null>(null)
  const [tabView, setTabView] = useState<TabView>('scores')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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

      // Load user's data if authenticated
      if (isAuthenticated) {
        try {
          const userCollectionsData = await scoreService.getUserCollections()
          setUserCollections(userCollectionsData)
        } catch (error) {
          console.error('Failed to load user data:', error)
        }
      }

      // Load scores based on filters or collection
      if (slug) {
        // Load specific collection
        const collection = await scoreService.getCollection(slug)
        const collectionScores = await scoreService.getScores({
          tags: [collection.slug],
        })
        setScores(collectionScores.items)
      } else {
        // Load all scores with filters
        const params: any = {}
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

  const toggleItemExpansion = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const handleAddToCollection = (e: React.MouseEvent, score: Score) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      setShowSignInModal(true)
      return
    }
    setSelectedScoreForCollection(score)
    setShowCollectionModal(true)
  }

  const handleCollectionModalClose = () => {
    setShowCollectionModal(false)
    setSelectedScoreForCollection(null)
  }

  const handleCollectionModalSave = () => {
    loadData()
    handleCollectionModalClose()
  }

  const renderScoreRow = (score: Score) => {
    const isExpanded = expandedItems.has(score.id)

    return (
      <div
        key={score.id}
        className="border-b border-morandi-stone-200 last:border-b-0"
      >
        <div
          className="p-4 hover:bg-morandi-stone-50 cursor-pointer group"
          onClick={() => toggleItemExpansion(score.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-morandi-stone-800">
                  {score.title}
                </h3>
                <span className="text-sm text-morandi-stone-600">
                  {score.composer}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-morandi-sand-100 text-morandi-stone-700 text-xs rounded-full">
                  {score.instrument}
                </span>
                <span className="px-2 py-0.5 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                  {score.difficulty}
                </span>
                {score.difficulty_level && (
                  <span className="text-xs text-morandi-stone-500">
                    Level {score.difficulty_level}
                  </span>
                )}
                {!isExpanded && score.tags.length > 0 && (
                  <div className="flex gap-1">
                    {score.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-morandi-stone-100 text-morandi-stone-600 rounded-full text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                    {score.tags.length > 2 && (
                      <span className="text-xs text-morandi-stone-500">
                        +{score.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleAddToCollection(e, score)
                }}
                className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('scorebook:addToCollection', 'Add to collection')}
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleScoreSelect(score.id)
                }}
                className="p-2 text-morandi-sage-600 hover:text-morandi-sage-800 transition-colors"
                title={t('scorebook:viewScore', 'View score')}
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 bg-morandi-stone-50 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                {score.opus && (
                  <p className="text-morandi-stone-600 mb-1">
                    <span className="font-medium">Opus:</span> {score.opus}
                  </p>
                )}
                {score.time_signature && (
                  <p className="text-morandi-stone-600 mb-1">
                    <span className="font-medium">Time:</span>{' '}
                    {score.time_signature}
                  </p>
                )}
                {score.key_signature && (
                  <p className="text-morandi-stone-600 mb-1">
                    <span className="font-medium">Key:</span>{' '}
                    {score.key_signature}
                  </p>
                )}
              </div>
              <div>
                {score.style_period && (
                  <p className="text-morandi-stone-600 mb-1">
                    <span className="font-medium">Period:</span>{' '}
                    {score.style_period}
                  </p>
                )}
                {score.source && (
                  <p className="text-morandi-stone-600 mb-1">
                    <span className="font-medium">Source:</span> {score.source}
                  </p>
                )}
              </div>
            </div>

            {score.tags.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-morandi-stone-700 mb-2">
                  Tags:
                </p>
                <div className="flex flex-wrap gap-1">
                  {score.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-600 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleScoreSelect(score.id)
                }}
                className="px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-600 transition-colors text-sm"
              >
                {t('scorebook:viewScore', 'View Score')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderCollectionRow = (collection: Collection) => {
    const isExpanded = expandedItems.has(collection.id)

    return (
      <div
        key={collection.id}
        className="border-b border-morandi-stone-200 last:border-b-0"
      >
        <div
          className="p-4 hover:bg-morandi-stone-50 cursor-pointer"
          onClick={() => toggleItemExpansion(collection.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-medium text-morandi-stone-800">
                  {collection.name}
                </h3>
                {collection.visibility === 'public' && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    Public
                  </span>
                )}
                {collection.featuredAt && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                    Featured
                  </span>
                )}
              </div>

              <p className="text-sm text-morandi-stone-600">
                {collection.description ||
                  t('scorebook:noDescription', 'No description')}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs text-morandi-stone-500">
                <span>{collection.scoreCount || 0} scores</span>
                {collection.tags.length > 0 && (
                  <span>{collection.tags.join(', ')}</span>
                )}
              </div>
            </div>

            <button
              onClick={e => {
                e.stopPropagation()
                navigate(`/scorebook/collection/${collection.slug}`)
              }}
              className="p-2 text-morandi-sage-600 hover:text-morandi-sage-800 transition-colors"
              title={t('scorebook:viewCollection', 'View collection')}
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 bg-morandi-stone-50 animate-fade-in">
            <div className="text-sm text-morandi-stone-600 mb-3">
              <p>
                {collection.description ||
                  t('scorebook:noDescription', 'No description available.')}
              </p>
            </div>

            {collection.tags.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-morandi-stone-700 mb-2">
                  Tags:
                </p>
                <div className="flex flex-wrap gap-1">
                  {collection.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-600 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={e => {
                e.stopPropagation()
                navigate(`/scorebook/collection/${collection.slug}`)
              }}
              className="px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-600 transition-colors text-sm"
            >
              {t('scorebook:viewCollection', 'View Collection')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-morandi-sand-100">
      <UnifiedHeader
        currentPage="scorebook"
        onSignInClick={() => setShowSignInModal(true)}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200">
          {/* Navigation Tabs */}
          <div className="flex gap-1 p-1 bg-morandi-stone-100 mx-4 md:mx-6 mt-4 rounded-lg">
            <button
              onClick={() => setTabView('scores')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
                tabView === 'scores'
                  ? 'bg-white text-morandi-stone-800 shadow-sm'
                  : 'text-morandi-stone-600 hover:text-morandi-stone-800'
              )}
            >
              {t('scorebook:scores', 'Scores')}
            </button>
            <button
              onClick={() => setTabView('publicCollections')}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
                tabView === 'publicCollections'
                  ? 'bg-white text-morandi-stone-800 shadow-sm'
                  : 'text-morandi-stone-600 hover:text-morandi-stone-800'
              )}
            >
              {t('scorebook:publicCollections', 'Public Collections')}
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setTabView('myCollections')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
                  tabView === 'myCollections'
                    ? 'bg-white text-morandi-stone-800 shadow-sm'
                    : 'text-morandi-stone-600 hover:text-morandi-stone-800'
                )}
              >
                {t('scorebook:myCollections', 'My Collections')}
              </button>
            )}
          </div>

          {/* Filters - only show for scores tab */}
          {tabView === 'scores' && (
            <div className="p-4 md:p-6 border-b border-morandi-stone-200">
              <div className="flex gap-4">
                <select
                  value={selectedInstrument}
                  onChange={e => setSelectedInstrument(e.target.value)}
                  className="px-4 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
                >
                  <option value="">
                    {t('scorebook:allInstruments', 'All Instruments')}
                  </option>
                  <option value="PIANO">{t('scorebook:piano', 'Piano')}</option>
                  <option value="GUITAR">
                    {t('scorebook:guitar', 'Guitar')}
                  </option>
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={e => setSelectedDifficulty(e.target.value)}
                  className="px-4 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
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
          )}

          {/* Content */}
          <div className="p-4 md:p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-sage-500 mx-auto mb-4"></div>
                <p className="text-morandi-stone-600">
                  {t('common:loading')}...
                </p>
              </div>
            ) : (
              <div>
                {/* Scores Tab */}
                {tabView === 'scores' && (
                  <div className="bg-white rounded-lg border border-morandi-stone-200 overflow-hidden">
                    {scores.length === 0 ? (
                      <div className="p-8 text-center text-morandi-stone-600">
                        {t('scorebook:noScoresFound', 'No scores found')}
                      </div>
                    ) : (
                      scores.map(score => renderScoreRow(score))
                    )}
                  </div>
                )}

                {/* Public Collections Tab */}
                {tabView === 'publicCollections' && (
                  <div className="bg-white rounded-lg border border-morandi-stone-200 overflow-hidden">
                    {collections.filter(
                      c => c.visibility === 'public' || c.featuredAt
                    ).length === 0 ? (
                      <div className="p-8 text-center text-morandi-stone-600">
                        {t(
                          'scorebook:noPublicCollections',
                          'No public collections found'
                        )}
                      </div>
                    ) : (
                      collections
                        .filter(c => c.visibility === 'public' || c.featuredAt)
                        .map(collection => renderCollectionRow(collection))
                    )}
                  </div>
                )}

                {/* My Collections Tab */}
                {tabView === 'myCollections' && isAuthenticated && (
                  <div className="bg-white rounded-lg border border-morandi-stone-200 overflow-hidden">
                    {userCollections.length === 0 ? (
                      <div className="p-8 text-center text-morandi-stone-600">
                        <p>
                          {t(
                            'scorebook:noUserCollections',
                            'You have no collections yet'
                          )}
                        </p>
                        <p className="text-sm mt-2">
                          {t(
                            'scorebook:createFirstCollection',
                            'Create your first collection to organize your scores'
                          )}
                        </p>
                      </div>
                    ) : (
                      userCollections.map(collection =>
                        renderCollectionRow(collection)
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />

      {/* Add to Collection Modal */}
      {showCollectionModal && selectedScoreForCollection && (
        <AddToCollectionModal
          scoreId={selectedScoreForCollection.id}
          scoreTitle={selectedScoreForCollection.title}
          onClose={handleCollectionModalClose}
          onSave={handleCollectionModalSave}
        />
      )}
    </div>
  )
}
