import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { scoreService } from '../../services/scoreService'
import { useScoreStore } from '../../stores/scoreStore'
import {
  Collection,
  CreateCollectionInput,
  isAdmin,
  isTeacher,
  canShareCollections,
} from '../../types/collections'
import Button from '../ui/Button'
import Tag from '../ui/Tag'
import { cn } from '../../utils/cn'

interface CollectionsManagerProps {
  scoreId?: string
  onClose?: () => void
  className?: string
}

export default function CollectionsManager({
  scoreId,
  onClose,
  className,
}: CollectionsManagerProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const { user } = useAuthStore()
  const {
    userCollections,
    featuredCollections,
    createCollection,
    loadUserCollections,
    loadFeaturedCollections,
  } = useScoreStore()
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'featured'>('my')
  const [error, setError] = useState<string | null>(null)

  // Load collections on mount
  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Load collections in parallel
      await Promise.all([loadUserCollections(), loadFeaturedCollections()])

      // TODO: Load shared collections when API is ready

      // If we have a scoreId, load which collections it belongs to
      if (scoreId) {
        // TODO: Load score's collections
      }
    } catch (err) {
      console.error('Failed to load collections:', err)
      setError(
        t('scorebook:errors.loadCollections', 'Failed to load collections')
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    setIsCreating(true)
    setError(null)
    try {
      await createCollection(newCollectionName.trim())

      // Reset form
      setNewCollectionName('')

      // Collections are automatically reloaded by the store
    } catch (err) {
      console.error('Failed to create collection:', err)
      setError(
        t('scorebook:errors.createCollection', 'Failed to create collection')
      )
    } finally {
      setIsCreating(false)
    }
  }

  const toggleCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections)
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId)
    } else {
      newSelected.add(collectionId)
    }
    setSelectedCollections(newSelected)
  }

  const handleSave = async () => {
    if (!scoreId) return

    // TODO: Update score's collections
    console.log('Saving score to collections:', Array.from(selectedCollections))

    if (onClose) onClose()
  }

  // Filter collections by tab
  const filteredCollections = (() => {
    if (activeTab === 'my') {
      return userCollections
    } else if (activeTab === 'shared') {
      // TODO: Return shared collections when available
      return []
    } else if (activeTab === 'featured') {
      return featuredCollections
    }
    return []
  })()

  const showTabs = isTeacher(user) || isAdmin(user)

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-morandi-stone-200">
        <h3 className="text-lg font-medium text-morandi-stone-800">
          {scoreId
            ? t('scorebook:manageCollections', 'Manage Collections')
            : t('scorebook:myCollections', 'My Collections')}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
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
        )}
      </div>

      {/* Tabs */}
      {showTabs && (
        <div className="flex border-b border-morandi-stone-200">
          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'my'
                ? 'text-morandi-sage-600 border-b-2 border-morandi-sage-500'
                : 'text-morandi-stone-600 hover:text-morandi-stone-800'
            )}
          >
            {t('scorebook:myCollections', 'My Collections')}
          </button>
          {isTeacher(user) && (
            <button
              onClick={() => setActiveTab('shared')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'shared'
                  ? 'text-morandi-sage-600 border-b-2 border-morandi-sage-500'
                  : 'text-morandi-stone-600 hover:text-morandi-stone-800'
              )}
            >
              {t('scorebook:sharedWithMe', 'Shared with Me')}
            </button>
          )}
          <button
            onClick={() => setActiveTab('featured')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'featured'
                ? 'text-morandi-sage-600 border-b-2 border-morandi-sage-500'
                : 'text-morandi-stone-600 hover:text-morandi-stone-800'
            )}
          >
            {t('scorebook:featured', 'Featured')}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-sage-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create new collection (My Collections tab only) */}
            {activeTab === 'my' && (
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={e => setNewCollectionName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateCollection()
                    }}
                    placeholder={t(
                      'scorebook:newCollectionPlaceholder',
                      'New collection name...'
                    )}
                    className="flex-1 px-3 py-2 bg-morandi-stone-50 border border-morandi-stone-200 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-sm"
                  />
                  <Button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim() || isCreating}
                    loading={isCreating}
                    size="sm"
                  >
                    {t('common:create', 'Create')}
                  </Button>
                </div>
              </div>
            )}

            {/* Collections grid - responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCollections.length === 0 ? (
                <div className="col-span-full text-center py-8 text-morandi-stone-500">
                  {activeTab === 'my' && (
                    <>
                      <p>
                        {t('scorebook:noCollections', 'No collections yet')}
                      </p>
                      <p className="text-sm mt-1">
                        {t(
                          'scorebook:createFirstCollection',
                          'Create your first collection above'
                        )}
                      </p>
                    </>
                  )}
                  {activeTab === 'shared' && (
                    <p>
                      {t(
                        'scorebook:noSharedCollections',
                        'No collections shared with you'
                      )}
                    </p>
                  )}
                  {activeTab === 'featured' && (
                    <p>
                      {t(
                        'scorebook:noFeaturedCollections',
                        'No featured collections'
                      )}
                    </p>
                  )}
                </div>
              ) : (
                filteredCollections.map(collection => (
                  <div
                    key={collection.id}
                    onClick={() => scoreId && toggleCollection(collection.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all cursor-pointer',
                      selectedCollections.has(collection.id)
                        ? 'border-morandi-sage-500 bg-morandi-sage-50'
                        : 'border-morandi-stone-200 hover:border-morandi-stone-300'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-morandi-stone-800">
                        {collection.name}
                      </h4>
                      {selectedCollections.has(collection.id) && (
                        <svg
                          className="w-5 h-5 text-morandi-sage-600 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>

                    {collection.description && (
                      <p className="text-sm text-morandi-stone-600 mb-2">
                        {collection.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-morandi-stone-500">
                      {collection.scoreCount !== undefined && (
                        <span>
                          {collection.scoreCount}{' '}
                          {collection.scoreCount === 1 ? 'score' : 'scores'}
                        </span>
                      )}
                      {collection.visibility === 'public' && (
                        <Tag size="sm" variant="success">
                          {t('scorebook:public', 'Public')}
                        </Tag>
                      )}
                      {collection.featuredAt && (
                        <Tag size="sm" variant="primary">
                          {t('scorebook:featured', 'Featured')}
                        </Tag>
                      )}
                      {collection.sharedWith &&
                        collection.sharedWith.length > 0 && (
                          <Tag size="sm" variant="warning">
                            {t('scorebook:shared', 'Shared')}
                          </Tag>
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with save button (only when managing score collections) */}
      {scoreId && (
        <div className="p-4 sm:p-6 border-t border-morandi-stone-200">
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSave}>{t('common:save', 'Save')}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
