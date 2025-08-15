import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { scoreService, type Score } from '../services/scoreService'
import type { Collection } from '../types/collections'
import AppLayout from '../components/layout/AppLayout'
import AddToCollectionModal from '../components/score/AddToCollectionModal'
import ScoreListItem from '../components/score/ScoreListItem'
import ErrorBoundary from '../components/ErrorBoundary'
import { useAuthStore } from '../stores/authStore'

export default function CollectionViewPage() {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const { slug, id } = useParams<{ slug?: string; id?: string }>()
  const { isAuthenticated } = useAuthStore()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [selectedScoreForCollection, setSelectedScoreForCollection] =
    useState<Score | null>(null)

  useEffect(() => {
    if (slug || id) {
      loadCollection()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, id])

  const loadCollection = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // If we have an ID parameter, this is a user collection
      if (id && isAuthenticated) {
        try {
          console.log('Loading user collection by ID:', id)
          const fullCollection = await scoreService.getUserCollection(id)
          console.log('Full collection with scores:', fullCollection)
          setCollection(fullCollection)
          // The collection should have scores property with full score details
          if (fullCollection.scores && Array.isArray(fullCollection.scores)) {
            console.log('Score data structure:', fullCollection.scores[0])
            // Ensure each score has tags property (at least empty array)
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
            setScores(normalizedScores)
          } else if (
            fullCollection.scoreIds &&
            fullCollection.scoreIds.length > 0
          ) {
            // If we only have scoreIds but no full scores, we need to load them
            console.log(
              'Collection has scoreIds but no scores, loading scores:',
              fullCollection.scoreIds
            )
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
            setScores(validScores)
          } else {
            console.warn('No scores found in collection', {
              collection: fullCollection,
              hasScores: !!fullCollection.scores,
              isArray: Array.isArray(fullCollection.scores),
              scoreIds: fullCollection.scoreIds,
            })
            setScores([])
          }
          return
        } catch (error) {
          console.error('Error loading user collection:', error)
          setError(
            t('scorebook:errors.loadCollection', 'Failed to load collection')
          )
          return
        }
      }

      // If we have a slug parameter, this is a public collection
      if (slug) {
        try {
          const publicCollection = await scoreService.getCollection(slug)
          setCollection(publicCollection)

          // For public collections, we need to load scores by tags
          if (publicCollection.tags && publicCollection.tags.length > 0) {
            const collectionScores = await scoreService.getScores({
              tags: publicCollection.tags,
            })
            // Normalize scores to ensure tags property exists
            const normalizedScores = collectionScores.items.map(score => ({
              ...score,
              tags: Array.isArray(score.tags)
                ? score.tags
                : typeof score.tags === 'string'
                  ? [score.tags]
                  : score.tags === null || score.tags === undefined
                    ? []
                    : [],
            }))
            setScores(normalizedScores)
          } else {
            setScores([])
          }
        } catch (error) {
          console.error('Failed to load public collection:', error)
          setError(
            t('scorebook:errors.loadCollection', 'Failed to load collection')
          )
        }
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

  const handleCollectionModalSave = () => {
    loadCollection()
    handleCollectionModalClose()
  }

  return (
    <AppLayout>
      <div className="p-8">
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
                {scores.map(score => (
                  <ErrorBoundary key={score.id}>
                    <ScoreListItem
                      score={score}
                      onAddToCollection={handleAddToCollection}
                      showCollections={false}
                      showTagsInCollapsed={false}
                    />
                  </ErrorBoundary>
                ))}
              </div>
            )}
          </div>
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
    </AppLayout>
  )
}
