import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  scoreService,
  type Score,
  type ScoreSearchParams,
} from '../services/scoreService'
import type { Collection } from '../types/collections'
import AppLayout from '../components/layout/AppLayout'
import AddToCollectionModal from '../components/score/AddToCollectionModal'
import ImportScoreModal from '../components/score/ImportScoreModal'
import CollectionsManager from '../components/score/CollectionsManager'
import ScoreListItem from '../components/score/ScoreListItem'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import { Tabs } from '../components/ui'
import { Plus, BookOpen, Folder, User } from 'lucide-react'

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
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCollectionsManager, setShowCollectionsManager] = useState(false)
  const [selectedScoreForCollection, setSelectedScoreForCollection] =
    useState<Score | null>(null)
  const [tabView, setTabView] = useState<TabView>('scores')
  const [hasInitializedTab, setHasInitializedTab] = useState(false)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(
    new Set()
  )
  const [scoreCollections, setScoreCollections] = useState<
    Record<string, Collection[]>
  >({})

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, selectedInstrument, selectedDifficulty, isAuthenticated])

  // Set default tab to "My Collections" if user is authenticated and has collections
  useEffect(() => {
    if (!hasInitializedTab && isAuthenticated && userCollections.length > 0) {
      setTabView('myCollections')
      setHasInitializedTab(true)
    }
  }, [isAuthenticated, userCollections, hasInitializedTab])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load collections
      const collectionsData = await scoreService.getCollections()
      setCollections(collectionsData)

      // Load user's data if authenticated
      let allUserCollections: Collection[] = []
      if (isAuthenticated) {
        try {
          const userCollectionsData = await scoreService.getUserCollections()
          setUserCollections(userCollectionsData)
          allUserCollections = userCollectionsData
        } catch (error) {
          console.error('Failed to load user data:', error)
        }
      }

      // Load scores based on filters or collection
      let loadedScores: Score[] = []
      if (slug) {
        // Load specific collection
        const collection = await scoreService.getCollection(slug)
        const collectionScores = await scoreService.getScores({
          tags: [collection.slug],
        })
        // Normalize scores to ensure tags property exists
        loadedScores = collectionScores.items.map(score => ({
          ...score,
          tags: score.tags || [],
        }))
        setScores(loadedScores)
      } else {
        // Load all scores with filters
        const params: ScoreSearchParams = {}
        if (selectedInstrument) params.instrument = selectedInstrument
        if (selectedDifficulty) params.difficulty = selectedDifficulty

        const scoresData = await scoreService.getScores(params)
        // Normalize scores to ensure tags property exists
        loadedScores = scoresData.items.map(score => ({
          ...score,
          tags: score.tags || [],
        }))
        setScores(loadedScores)
      }

      // Load collections for each score
      if (loadedScores.length > 0) {
        // Include both user collections and public collections
        const allCollections = [
          ...allUserCollections,
          ...collectionsData.filter(col => col.visibility === 'public'),
        ]
        await loadScoreCollections(loadedScores, allCollections)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadScoreCollections = async (
    scores: Score[],
    allCollections: Collection[]
  ) => {
    const collectionMap: Record<string, Collection[]> = {}

    // For public collections, we need to check which scores they contain
    // Since we don't have a direct API to get score's public collections,
    // we'll match based on tags for now
    scores.forEach(score => {
      const scoreCollectionsList: Collection[] = []

      // Check public collections that might contain this score
      allCollections.forEach(collection => {
        // If collection has tags that match score tags, it might contain the score
        if (
          collection.visibility === 'public' &&
          collection.tags &&
          score.tags &&
          score.tags.some(tag => collection.tags?.includes(tag))
        ) {
          scoreCollectionsList.push(collection)
        }
      })

      if (scoreCollectionsList.length > 0) {
        collectionMap[score.id] = scoreCollectionsList
      }
    })

    // If authenticated, also load user's private collections for scores
    if (isAuthenticated) {
      const userCollectionIds = allCollections
        .filter(col => col.visibility !== 'public')
        .map(col => col.id)

      if (userCollectionIds.length > 0) {
        const collectionById = new Map(allCollections.map(col => [col.id, col]))

        await Promise.all(
          scores.map(async score => {
            try {
              const collectionIds = await scoreService.getScoreCollections(
                score.id
              )
              const userScoreCollections = collectionIds
                .map(id => collectionById.get(id))
                .filter(
                  (col): col is Collection =>
                    col !== undefined && col.visibility !== 'public'
                )

              if (userScoreCollections.length > 0) {
                collectionMap[score.id] = [
                  ...(collectionMap[score.id] || []),
                  ...userScoreCollections,
                ]
              }
            } catch (error) {
              console.error(
                `Failed to load collections for score ${score.id}:`,
                error
              )
            }
          })
        )
      }
    }

    setScoreCollections(collectionMap)
  }

  const toggleCollectionExpansion = (id: string) => {
    const newExpanded = new Set(expandedCollections)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCollections(newExpanded)
  }

  const handleAddToCollection = (e: React.MouseEvent, score: Score) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      // The AppLayout will handle showing sign in modal
      return
    }
    setSelectedScoreForCollection(score)
    setShowCollectionModal(true)
  }

  const handleCollectionModalClose = () => {
    setShowCollectionModal(false)
    setSelectedScoreForCollection(null)
  }

  const handleCollectionModalSave = async () => {
    handleCollectionModalClose()
    // Refresh only the collections for the affected score
    if (selectedScoreForCollection && isAuthenticated) {
      try {
        const userCollections = await scoreService.getUserCollections()
        const collectionIds = await scoreService.getScoreCollections(
          selectedScoreForCollection.id
        )
        const collectionById = new Map(
          userCollections.map(col => [col.id, col])
        )
        const scoreCollectionsList = collectionIds
          .map(id => collectionById.get(id))
          .filter((col): col is Collection => col !== undefined)

        setScoreCollections(prev => ({
          ...prev,
          [selectedScoreForCollection.id]: scoreCollectionsList,
        }))
      } catch (error) {
        console.error('Failed to refresh collections:', error)
      }
    }
  }

  const handleImportSuccess = async (
    score: Score,
    _selectedCollectionIds?: string[]
  ) => {
    setShowImportModal(false)
    // Refresh data to show the new score
    await loadData()
    // Navigate to the imported score
    navigate(`/scorebook/${score.id}`)
  }

  const renderCollectionRow = (collection: Collection) => {
    const isExpanded = expandedCollections.has(collection.id)

    return (
      <div
        key={collection.id}
        className="border-b border-morandi-stone-200 last:border-b-0"
      >
        <div
          className="p-4 hover:bg-morandi-stone-50 cursor-pointer"
          onClick={() => toggleCollectionExpansion(collection.id)}
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
                <span>
                  {collection.scoreIds?.length || collection.scoreCount || 0}{' '}
                  scores
                </span>
                {collection.tags.length > 0 && (
                  <span>{collection.tags.join(', ')}</span>
                )}
              </div>
            </div>

            <button
              onClick={e => {
                e.stopPropagation()
                // For user collections, pass the ID in the URL
                if (tabView === 'myCollections') {
                  navigate(`/scorebook/collection/user/${collection.id}`)
                } else {
                  navigate(`/scorebook/collection/${collection.slug}`)
                }
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
                // For user collections, pass the ID in the URL
                if (tabView === 'myCollections') {
                  navigate(`/scorebook/collection/user/${collection.id}`)
                } else {
                  navigate(`/scorebook/collection/${collection.slug}`)
                }
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
    <AppLayout>
      <div className="p-8">
        {/* Navigation Tabs - Outside any white box to match Toolbox/Logbook */}
        <Tabs
          tabs={[
            {
              id: 'scores',
              label: t('scorebook:scores', 'Scores'),
              icon: <BookOpen size={20} />,
            },
            {
              id: 'publicCollections',
              label: t('scorebook:publicCollections', 'Public Collections'),
              icon: <Folder size={20} />,
            },
            ...(isAuthenticated
              ? [
                  {
                    id: 'myCollections',
                    label: t('scorebook:myCollections', 'My Collections'),
                    icon: <User size={20} />,
                  },
                ]
              : []),
          ]}
          activeTab={tabView}
          onTabChange={tabId => setTabView(tabId as TabView)}
          className="mb-6"
        />

        <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200">
          {/* Import Button - moved here after tabs */}
          {isAuthenticated && tabView === 'scores' && (
            <div className="flex items-center justify-end px-4 md:px-6 pt-4">
              <Button
                onClick={() => setShowImportModal(true)}
                size="sm"
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('scorebook:importScore', 'Import Score')}
              </Button>
            </div>
          )}

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
                  <option value="piano">{t('scorebook:piano', 'Piano')}</option>
                  <option value="guitar">
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
                  <option value="beginner">
                    {t('scorebook:beginner', 'Beginner')}
                  </option>
                  <option value="intermediate">
                    {t('scorebook:intermediate', 'Intermediate')}
                  </option>
                  <option value="advanced">
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
                      scores.map(score => (
                        <ScoreListItem
                          key={score.id}
                          score={score}
                          onAddToCollection={handleAddToCollection}
                          collections={scoreCollections[score.id]}
                          showCollections={true}
                          showTagsInCollapsed={true}
                        />
                      ))
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
                  <div>
                    {/* Header with Create Button */}
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium text-morandi-stone-800">
                        {t('scorebook:myCollections', 'My Collections')}
                      </h2>
                      <Button
                        onClick={() => setShowCollectionsManager(true)}
                        size="sm"
                        variant="primary"
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        {t('scorebook:createCollection', 'Create Collection')}
                      </Button>
                    </div>

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
                          <Button
                            onClick={() => setShowCollectionsManager(true)}
                            variant="secondary"
                            className="mt-4"
                          >
                            {t(
                              'scorebook:createCollection',
                              'Create Collection'
                            )}
                          </Button>
                        </div>
                      ) : (
                        userCollections.map(collection =>
                          renderCollectionRow(collection)
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add to Collection Modal */}
        {showCollectionModal && selectedScoreForCollection && (
          <AddToCollectionModal
            scoreId={selectedScoreForCollection.id}
            scoreTitle={selectedScoreForCollection.title}
            onClose={handleCollectionModalClose}
            onSave={handleCollectionModalSave}
          />
        )}

        {/* Import Score Modal */}
        <ImportScoreModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />

        {/* Collections Manager Modal */}
        {showCollectionsManager && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <CollectionsManager
                onClose={() => {
                  setShowCollectionsManager(false)
                  // Reload user collections after closing
                  loadData()
                }}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
