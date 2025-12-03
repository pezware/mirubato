import { useEffect, useState, useMemo, useCallback } from 'react'
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
import ScoreGridItem from '../components/score/ScoreGridItem'
import SelectionToolbar from '../components/score/SelectionToolbar'
import TimerEntry from '../components/TimerEntry'
import { useAuthStore } from '../stores/authStore'
import { useModals } from '../hooks/useModal'
import { Button, Tabs, Select, Modal, Input } from '../components/ui'
import {
  Plus,
  BookOpen,
  Folder,
  User,
  Search,
  LayoutGrid,
  List,
  X,
  CheckSquare,
} from 'lucide-react'

type TabView = 'scores' | 'publicCollections' | 'myCollections'
type ViewMode = 'list' | 'grid'
type SortBy = 'title' | 'composer' | 'difficulty' | 'createdAt' | 'popularity'
type SortOrder = 'asc' | 'desc'

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Persist user preferences in localStorage
const STORAGE_KEY = 'mirubato_scorebrowser_prefs'

interface UserPreferences {
  viewMode: ViewMode
  sortBy: SortBy
  sortOrder: SortOrder
}

const getStoredPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return { viewMode: 'list', sortBy: 'createdAt', sortOrder: 'desc' }
}

const setStoredPreferences = (prefs: Partial<UserPreferences>) => {
  try {
    const current = getStoredPreferences()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }))
  } catch {
    // Ignore storage errors
  }
}

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
  const modals = useModals([
    'collection',
    'import',
    'collectionsManager',
  ] as const)
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
  const [scoreFavorites, setScoreFavorites] = useState<Record<string, boolean>>(
    {}
  )
  const [showTimer, setShowTimer] = useState(false)
  const [defaultCollectionScores, setDefaultCollectionScores] = useState<
    Score[]
  >([])
  const [isLoadingDefaultCollection, setIsLoadingDefaultCollection] =
    useState(false)

  // New state for search, sort, and view mode
  const storedPrefs = useMemo(() => getStoredPreferences(), [])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(storedPrefs.viewMode)
  const [sortBy, setSortBy] = useState<SortBy>(storedPrefs.sortBy)
  const [sortOrder, setSortOrder] = useState<SortOrder>(storedPrefs.sortOrder)
  const [totalScores, setTotalScores] = useState(0)

  // Pagination state
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const PAGE_SIZE = 20

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedScoreIds, setSelectedScoreIds] = useState<Set<string>>(
    new Set()
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingToCollection, setIsAddingToCollection] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Sort options for the dropdown
  const sortOptions = useMemo(
    () => [
      {
        value: 'createdAt-desc',
        label: t('scorebook:sort.recentFirst', 'Recently Added'),
      },
      {
        value: 'createdAt-asc',
        label: t('scorebook:sort.oldestFirst', 'Oldest First'),
      },
      { value: 'title-asc', label: t('scorebook:sort.titleAZ', 'Title (A-Z)') },
      {
        value: 'title-desc',
        label: t('scorebook:sort.titleZA', 'Title (Z-A)'),
      },
      {
        value: 'composer-asc',
        label: t('scorebook:sort.composerAZ', 'Composer (A-Z)'),
      },
      {
        value: 'composer-desc',
        label: t('scorebook:sort.composerZA', 'Composer (Z-A)'),
      },
      {
        value: 'difficulty-asc',
        label: t('scorebook:sort.difficultyEasy', 'Difficulty (Easy First)'),
      },
      {
        value: 'difficulty-desc',
        label: t('scorebook:sort.difficultyHard', 'Difficulty (Hard First)'),
      },
      {
        value: 'popularity-desc',
        label: t('scorebook:sort.popular', 'Most Popular'),
      },
    ],
    [t]
  )

  // Handle sort change
  const handleSortChange = useCallback((value: string | number) => {
    const [newSortBy, newSortOrder] = (value as string).split('-') as [
      SortBy,
      SortOrder,
    ]
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    setStoredPreferences({ sortBy: newSortBy, sortOrder: newSortOrder })
  }, [])

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    setStoredPreferences({ viewMode: mode })
  }, [])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slug,
    selectedInstrument,
    selectedDifficulty,
    isAuthenticated,
    debouncedSearchQuery,
    sortBy,
    sortOrder,
  ])

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

          // Find and load default collection
          const defaultColl = userCollectionsData.find(
            c => c.is_default === true
          )
          if (defaultColl) {
            // Auto-expand default collection
            setExpandedCollections(prev => new Set([...prev, defaultColl.id]))
            // Load default collection scores
            loadDefaultCollectionScores(defaultColl.id)
          }
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
          sortBy,
          sortOrder,
          query: debouncedSearchQuery || undefined,
          limit: PAGE_SIZE,
          offset: 0,
        })
        // Normalize scores to ensure tags property exists
        loadedScores = collectionScores.items.map(score => ({
          ...score,
          tags: score.tags || [],
        }))
        setScores(loadedScores)
        setTotalScores(collectionScores.total)
        setHasMore(collectionScores.hasMore)
      } else {
        // Load all scores with filters, search, and sort
        const params: ScoreSearchParams = {
          sortBy,
          sortOrder,
          limit: PAGE_SIZE,
          offset: 0,
        }
        if (selectedInstrument) params.instrument = selectedInstrument
        if (selectedDifficulty) params.difficulty = selectedDifficulty
        if (debouncedSearchQuery) params.query = debouncedSearchQuery

        const scoresData = await scoreService.getScores(params)
        // Normalize scores to ensure tags property exists
        loadedScores = scoresData.items.map(score => ({
          ...score,
          tags: score.tags || [],
        }))
        setScores(loadedScores)
        setTotalScores(scoresData.total)
        setHasMore(scoresData.hasMore)
      }

      // Load collections for each score
      if (loadedScores.length > 0) {
        // Include both user collections and public collections
        const allCollections = [
          ...allUserCollections,
          ...collectionsData.filter(col => col.visibility === 'public'),
        ]
        await loadScoreCollections(loadedScores, allCollections)

        // Load favorites status (graceful degradation - won't break if this fails)
        await loadScoreFavorites(loadedScores)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load more scores for pagination
  const loadMoreScores = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const currentOffset = scores.length

      const params: ScoreSearchParams = {
        sortBy,
        sortOrder,
        limit: PAGE_SIZE,
        offset: currentOffset,
      }
      if (selectedInstrument) params.instrument = selectedInstrument
      if (selectedDifficulty) params.difficulty = selectedDifficulty
      if (debouncedSearchQuery) params.query = debouncedSearchQuery
      if (slug) {
        // For collection view
        const collection = await scoreService.getCollection(slug)
        params.tags = [collection.slug]
      }

      const scoresData = await scoreService.getScores(params)

      // Normalize and append new scores
      const newScores = scoresData.items.map(score => ({
        ...score,
        tags: score.tags || [],
      }))

      setScores(prev => [...prev, ...newScores])
      setHasMore(scoresData.hasMore)

      // Load collections for new scores
      if (newScores.length > 0 && isAuthenticated) {
        const allCollections = [
          ...userCollections,
          ...collections.filter(col => col.visibility === 'public'),
        ]
        await loadScoreCollections(newScores, allCollections)
      }

      // Load favorites for new scores (graceful degradation)
      if (newScores.length > 0) {
        await loadScoreFavorites(newScores)
      }
    } catch (error) {
      console.error('Failed to load more scores:', error)
    } finally {
      setIsLoadingMore(false)
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

    // If authenticated, load user's private collections for all scores in a single batch request
    if (isAuthenticated) {
      const collectionById = new Map(allCollections.map(col => [col.id, col]))

      try {
        // Use batch endpoint to get collections for all scores at once (eliminates N+1 queries)
        const scoreIds = scores.map(s => s.id)
        const batchCollections =
          await scoreService.getBatchScoreCollections(scoreIds)

        // Process batch results
        for (const score of scores) {
          const collectionsForScore = batchCollections[score.id] || []
          const userScoreCollections = collectionsForScore
            .map(c => collectionById.get(c.id))
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
        }
      } catch (error) {
        console.error('Failed to batch load score collections:', error)
      }
    }

    setScoreCollections(collectionMap)
  }

  // Load favorites status for scores (uses batch API to avoid N+1)
  const loadScoreFavorites = async (scoresToLoad: Score[]) => {
    if (!isAuthenticated || scoresToLoad.length === 0) {
      return
    }

    try {
      const scoreIds = scoresToLoad.map(s => s.id)
      const favoriteStatus = await scoreService.getBatchFavoriteStatus(scoreIds)

      // Merge with existing favorites (for pagination)
      setScoreFavorites(prev => ({
        ...prev,
        ...favoriteStatus,
      }))
    } catch (error) {
      // Graceful degradation - don't break the app if favorites fail
      console.error('Failed to load favorites status:', error)
    }
  }

  const loadDefaultCollectionScores = async (collectionId: string) => {
    setIsLoadingDefaultCollection(true)
    try {
      const fullCollection = await scoreService.getUserCollection(collectionId)
      if (fullCollection.scores && Array.isArray(fullCollection.scores)) {
        // Normalize scores to ensure tags property exists
        const normalizedScores = fullCollection.scores.map(score => ({
          ...score,
          tags: Array.isArray(score.tags)
            ? score.tags
            : typeof score.tags === 'string'
              ? [score.tags]
              : score.tags === null || score.tags === undefined
                ? []
                : [],
        }))
        setDefaultCollectionScores(normalizedScores)
      } else if (
        fullCollection.scoreIds &&
        fullCollection.scoreIds.length > 0
      ) {
        // If we only have scoreIds but no full scores, we need to load them
        const scorePromises = fullCollection.scoreIds.map(id =>
          scoreService.getScore(id).catch(err => {
            console.error(`Failed to load score ${id}:`, err)
            return null
          })
        )
        const loadedScores = await Promise.all(scorePromises)
        const validScores = loadedScores
          .filter(s => s !== null)
          .map(score => ({
            ...score,
            tags: Array.isArray(score.tags)
              ? score.tags
              : typeof score.tags === 'string'
                ? [score.tags]
                : score.tags === null || score.tags === undefined
                  ? []
                  : [],
          }))
        setDefaultCollectionScores(validScores)
      } else {
        setDefaultCollectionScores([])
      }
    } catch (error) {
      console.error('Failed to load default collection scores:', error)
      setDefaultCollectionScores([])
    } finally {
      setIsLoadingDefaultCollection(false)
    }
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
    modals.open('collection')
  }

  const handleToggleFavorite = async (e: React.MouseEvent, score: Score) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      // The AppLayout will handle showing sign in modal
      return
    }

    try {
      const newFavoriteStatus = await scoreService.toggleFavorite(score.id)
      setScoreFavorites(prev => ({
        ...prev,
        [score.id]: newFavoriteStatus,
      }))
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      // Could show a toast notification here
    }
  }

  const handleCollectionModalClose = () => {
    modals.close('collection')
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
    modals.close('import')
    // Refresh data to show the new score
    await loadData()
    // Navigate to the imported score
    navigate(`/scorebook/${score.id}`)
  }

  // Selection mode handlers
  const toggleSelectionMode = () => {
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedScoreIds(new Set())
    }
    setSelectionMode(!selectionMode)
  }

  const handleToggleSelection = (scoreId: string) => {
    setSelectedScoreIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(scoreId)) {
        newSet.delete(scoreId)
      } else {
        newSet.add(scoreId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    setSelectedScoreIds(new Set(scores.map(s => s.id)))
  }

  const handleDeselectAll = () => {
    setSelectedScoreIds(new Set())
  }

  const handleBatchAddToCollection = async (collectionId: string) => {
    if (selectedScoreIds.size === 0) return

    setIsAddingToCollection(true)
    try {
      const result = await scoreService.batchAddScoresToCollection(
        collectionId,
        Array.from(selectedScoreIds)
      )

      // Show success message (could use toast notification)
      console.log(
        `Added ${result.addedCount} scores to collection (${result.skippedCount} already in collection)`
      )

      // Clear selection and exit selection mode
      setSelectedScoreIds(new Set())
      setSelectionMode(false)

      // Refresh collections data
      await loadData()
    } catch (error) {
      console.error('Failed to add scores to collection:', error)
      // Could show error toast here
    } finally {
      setIsAddingToCollection(false)
    }
  }

  const handleBatchDelete = () => {
    if (selectedScoreIds.size === 0) return
    setShowDeleteConfirmModal(true)
  }

  const confirmBatchDelete = async () => {
    setShowDeleteConfirmModal(false)
    setIsDeleting(true)

    try {
      const result = await scoreService.batchDeleteScores(
        Array.from(selectedScoreIds)
      )

      // Show success message
      console.log(`Deleted ${result.deletedCount} scores`)

      // Clear selection and exit selection mode
      setSelectedScoreIds(new Set())
      setSelectionMode(false)

      // Refresh scores
      await loadData()
    } catch (error) {
      console.error('Failed to delete scores:', error)
      // Could show error toast here
    } finally {
      setIsDeleting(false)
    }
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

            {/* Show scores for default collection */}
            {collection.is_default && (
              <div className="mb-4">
                <p className="text-sm font-medium text-morandi-stone-700 mb-3">
                  {t('scorebook:scores', 'Scores')}:
                </p>
                {isLoadingDefaultCollection ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-sage-500 mx-auto mb-2"></div>
                    <p className="text-sm text-morandi-stone-600">
                      {t('common:loading')}...
                    </p>
                  </div>
                ) : defaultCollectionScores.length === 0 ? (
                  <div className="text-center py-4 text-morandi-stone-600 text-sm">
                    {t(
                      'scorebook:noScoresInCollection',
                      'No scores in this collection yet'
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-morandi-stone-200 overflow-hidden mb-3">
                    {defaultCollectionScores.slice(0, 5).map(score => (
                      <ScoreListItem
                        key={score.id}
                        score={score}
                        onAddToCollection={handleAddToCollection}
                        collections={scoreCollections[score.id]}
                        showCollections={false}
                        showTagsInCollapsed={false}
                        className="border-b-0"
                      />
                    ))}
                    {defaultCollectionScores.length > 5 && (
                      <div className="p-3 bg-morandi-stone-50 text-center text-sm text-morandi-stone-600">
                        {t(
                          'scorebook:showingFirst',
                          'Showing first 5 of {{total}} scores',
                          {
                            total: defaultCollectionScores.length,
                          }
                        )}
                      </div>
                    )}
                  </div>
                )}
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

  const handleTimerComplete = (_duration: number, _startTime?: Date) => {
    setShowTimer(false)
    // Could add practice session logging here if needed
  }

  return (
    <AppLayout
      onTimerClick={() => setShowTimer(true)}
      onImportScore={() => modals.open('import')}
    >
      <div className="p-3 sm:px-6 sm:py-4">
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
          {/* Search, Sort, and Actions Bar - only show for scores tab */}
          {tabView === 'scores' && (
            <div className="p-3 md:p-4 border-b border-morandi-stone-200 space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t(
                    'scorebook:searchPlaceholder',
                    'Search by title, composer, or opus...'
                  )}
                  leftIcon={<Search className="w-4 h-4" />}
                  rightIcon={
                    searchQuery ? (
                      <button
                        onClick={handleClearSearch}
                        className="p-1 hover:bg-morandi-stone-100 rounded-full transition-colors pointer-events-auto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : undefined
                  }
                  fullWidth
                  className="text-sm"
                />
              </div>

              {/* Filters, Sort, View Mode, and Import Button Row */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <select
                    value={selectedInstrument}
                    onChange={e => setSelectedInstrument(e.target.value)}
                    className="px-3 py-1.5 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
                  >
                    <option value="">
                      {t('scorebook:allInstruments', 'All Instruments')}
                    </option>
                    <option value="piano">
                      {t('scorebook:piano', 'Piano')}
                    </option>
                    <option value="guitar">
                      {t('scorebook:guitar', 'Guitar')}
                    </option>
                  </select>

                  <select
                    value={selectedDifficulty}
                    onChange={e => setSelectedDifficulty(e.target.value)}
                    className="px-3 py-1.5 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
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

                {/* Sort, View Toggle, and Import Button */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Sort Dropdown */}
                  <Select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={handleSortChange}
                    options={sortOptions}
                    className="min-w-[160px]"
                  />

                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-morandi-stone-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleViewModeChange('list')}
                      className={`p-2 transition-colors ${
                        viewMode === 'list'
                          ? 'bg-morandi-sage-100 text-morandi-sage-700'
                          : 'bg-white text-morandi-stone-500 hover:bg-morandi-stone-50'
                      }`}
                      title={t('scorebook:listView', 'List view')}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewModeChange('grid')}
                      className={`p-2 transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-morandi-sage-100 text-morandi-sage-700'
                          : 'bg-white text-morandi-stone-500 hover:bg-morandi-stone-50'
                      }`}
                      title={t('scorebook:gridView', 'Grid view')}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Select Mode Toggle */}
                  {isAuthenticated && scores.length > 0 && (
                    <Button
                      onClick={toggleSelectionMode}
                      size="sm"
                      variant={selectionMode ? 'primary' : 'ghost'}
                      className="flex items-center gap-1"
                      title={t(
                        'scorebook:selectMode',
                        'Select multiple scores'
                      )}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {selectionMode
                          ? t('scorebook:cancelSelect', 'Cancel')
                          : t('scorebook:select', 'Select')}
                      </span>
                    </Button>
                  )}

                  {/* Import Button */}
                  {isAuthenticated && !selectionMode && (
                    <Button
                      onClick={() => modals.open('import')}
                      size="sm"
                      variant="primary"
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {t('scorebook:importScore', 'Import')}
                      </span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Results count */}
              {!isLoading && !selectionMode && (
                <div className="text-xs text-morandi-stone-500">
                  {debouncedSearchQuery ? (
                    <>
                      {t('scorebook:searchResults', '{{count}} results for', {
                        count: totalScores,
                      })}{' '}
                      <span className="font-medium">
                        "{debouncedSearchQuery}"
                      </span>
                    </>
                  ) : (
                    t('scorebook:totalScores', '{{count}} scores', {
                      count: totalScores,
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Selection Toolbar */}
          {selectionMode && tabView === 'scores' && (
            <SelectionToolbar
              selectedCount={selectedScoreIds.size}
              totalCount={scores.length}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onDelete={handleBatchDelete}
              onAddToCollection={handleBatchAddToCollection}
              collections={userCollections}
              isDeleting={isDeleting}
              isAddingToCollection={isAddingToCollection}
            />
          )}

          {/* Content */}
          <div className="p-3 md:p-4">
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
                  <>
                    {scores.length === 0 ? (
                      <div className="bg-white rounded-lg border border-morandi-stone-200 p-8 text-center">
                        {debouncedSearchQuery ? (
                          <div>
                            <Search className="w-12 h-12 mx-auto text-morandi-stone-300 mb-4" />
                            <p className="text-morandi-stone-600 mb-2">
                              {t(
                                'scorebook:noSearchResults',
                                'No scores found matching your search'
                              )}
                            </p>
                            <p className="text-sm text-morandi-stone-500 mb-4">
                              {t(
                                'scorebook:tryDifferentSearch',
                                'Try a different search term or clear filters'
                              )}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearSearch}
                            >
                              {t('scorebook:clearSearch', 'Clear Search')}
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <BookOpen className="w-12 h-12 mx-auto text-morandi-stone-300 mb-4" />
                            <p className="text-morandi-stone-600 mb-2">
                              {t('scorebook:noScoresFound', 'No scores found')}
                            </p>
                            {isAuthenticated && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => modals.open('import')}
                                className="mt-4"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                {t(
                                  'scorebook:importFirstScore',
                                  'Import your first score'
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : viewMode === 'list' ? (
                      <div className="bg-white rounded-lg border border-morandi-stone-200 overflow-hidden">
                        {scores.map(score => (
                          <ScoreListItem
                            key={score.id}
                            score={score}
                            onAddToCollection={
                              selectionMode ? undefined : handleAddToCollection
                            }
                            onToggleFavorite={
                              selectionMode
                                ? undefined
                                : isAuthenticated
                                  ? handleToggleFavorite
                                  : undefined
                            }
                            collections={scoreCollections[score.id]}
                            isFavorited={scoreFavorites[score.id] || false}
                            showCollections={!selectionMode}
                            showTagsInCollapsed={!selectionMode}
                            selectionMode={selectionMode}
                            isSelected={selectedScoreIds.has(score.id)}
                            onToggleSelection={handleToggleSelection}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {scores.map(score => (
                          <ScoreGridItem
                            key={score.id}
                            score={score}
                            onAddToCollection={
                              selectionMode ? undefined : handleAddToCollection
                            }
                            onToggleFavorite={
                              selectionMode
                                ? undefined
                                : isAuthenticated
                                  ? handleToggleFavorite
                                  : undefined
                            }
                            collections={scoreCollections[score.id]}
                            isFavorited={scoreFavorites[score.id] || false}
                            selectionMode={selectionMode}
                            isSelected={selectedScoreIds.has(score.id)}
                            onToggleSelection={handleToggleSelection}
                          />
                        ))}
                      </div>
                    )}

                    {/* Load More Button */}
                    {hasMore && scores.length > 0 && (
                      <div className="mt-6 text-center">
                        <Button
                          onClick={loadMoreScores}
                          variant="secondary"
                          disabled={isLoadingMore}
                          className="min-w-[200px]"
                        >
                          {isLoadingMore ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                              {t('common:loading', 'Loading...')}
                            </span>
                          ) : (
                            t(
                              'scorebook:loadMore',
                              'Load More ({{remaining}} remaining)',
                              {
                                remaining: totalScores - scores.length,
                              }
                            )
                          )}
                        </Button>
                      </div>
                    )}
                  </>
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
                        onClick={() => modals.open('collectionsManager')}
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
                            onClick={() => modals.open('collectionsManager')}
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
        {modals.isOpen('collection') && selectedScoreForCollection && (
          <AddToCollectionModal
            scoreId={selectedScoreForCollection.id}
            scoreTitle={selectedScoreForCollection.title}
            onClose={handleCollectionModalClose}
            onSave={handleCollectionModalSave}
          />
        )}

        {/* Import Score Modal */}
        <ImportScoreModal
          isOpen={modals.isOpen('import')}
          onClose={() => modals.close('import')}
          onSuccess={handleImportSuccess}
        />

        {/* Collections Manager Modal */}
        {modals.isOpen('collectionsManager') && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <CollectionsManager
                onClose={() => {
                  modals.close('collectionsManager')
                  // Reload user collections after closing
                  loadData()
                }}
                className="h-full"
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteConfirmModal}
          onClose={() => setShowDeleteConfirmModal(false)}
          title={t('scorebook:confirmDelete', 'Confirm Delete')}
        >
          <div className="p-4">
            <p className="text-morandi-stone-700 mb-4">
              {t(
                'scorebook:deleteConfirmMessage',
                'Are you sure you want to delete {{count}} scores? This action cannot be undone.',
                { count: selectedScoreIds.size }
              )}
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirmModal(false)}
              >
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={confirmBatchDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? t('common:deleting', 'Deleting...')
                  : t('common:delete', 'Delete')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>

      {/* Timer Modal */}
      <TimerEntry
        isOpen={showTimer}
        onClose={() => setShowTimer(false)}
        onComplete={handleTimerComplete}
      />
    </AppLayout>
  )
}
