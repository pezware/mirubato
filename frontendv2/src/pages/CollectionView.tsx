import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { scoreService, type Score } from '../services/scoreService'
import type { Collection } from '../types/collections'
import UnifiedHeader from '../components/layout/UnifiedHeader'
import SignInModal from '../components/auth/SignInModal'
import AddToCollectionModal from '../components/score/AddToCollectionModal'
import { useAuthStore } from '../stores/authStore'

export default function CollectionViewPage() {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { isAuthenticated } = useAuthStore()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [selectedScoreForCollection, setSelectedScoreForCollection] =
    useState<Score | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (slug) {
      loadCollection()
    }
  }, [slug])

  const loadCollection = async () => {
    if (!slug) return

    setIsLoading(true)
    setError(null)
    try {
      // First, check if this is a user collection by trying to find it in user collections
      if (isAuthenticated) {
        try {
          const userCollections = await scoreService.getUserCollections()
          const userCollection = userCollections.find(c => c.slug === slug)

          if (userCollection) {
            // This is a user collection, fetch it with scores
            const fullCollection = await scoreService.getUserCollection(
              userCollection.id
            )
            setCollection(fullCollection)
            // The collection should have scores property with full score details
            if (fullCollection.scores) {
              setScores(fullCollection.scores)
            }
            return
          }
        } catch (error) {
          console.error('Error checking user collections:', error)
        }
      }

      // If not a user collection, try public collections
      const publicCollection = await scoreService.getCollection(slug)
      setCollection(publicCollection)

      // For public collections, we need to load scores by tags
      if (publicCollection.tags && publicCollection.tags.length > 0) {
        const collectionScores = await scoreService.getScores({
          tags: publicCollection.tags,
        })
        setScores(collectionScores.items)
      }
    } catch (error) {
      console.error('Failed to load collection:', error)
      setError(
        t('scorebook:errors.loadCollection', 'Failed to load collection')
      )
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
    loadCollection()
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

  return (
    <div className="min-h-screen bg-morandi-sand-100">
      <UnifiedHeader
        currentPage="scorebook"
        onSignInClick={() => setShowSignInModal(true)}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <button
          onClick={() => navigate('/scorebook')}
          className="mb-4 flex items-center gap-2 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('common:back', 'Back')}
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200">
          {/* Collection Header */}
          {collection && (
            <div className="p-6 border-b border-morandi-stone-200">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-medium text-morandi-stone-800 mb-2">
                    {collection.name}
                  </h1>
                  {collection.description && (
                    <p className="text-morandi-stone-600">
                      {collection.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    {collection.visibility === 'public' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {t('scorebook:public', 'Public')}
                      </span>
                    )}
                    {collection.featuredAt && (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                        {t('scorebook:featured', 'Featured')}
                      </span>
                    )}
                    <span className="text-sm text-morandi-stone-500">
                      {scores.length} {t('scorebook:scores', 'scores')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-sage-500 mx-auto mb-4"></div>
                <p className="text-morandi-stone-600">
                  {t('common:loading')}...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-morandi-stone-600">
                  {t(
                    'scorebook:noScoresInCollection',
                    'No scores in this collection yet'
                  )}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-morandi-stone-200 overflow-hidden">
                {scores.map(score => renderScoreRow(score))}
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
