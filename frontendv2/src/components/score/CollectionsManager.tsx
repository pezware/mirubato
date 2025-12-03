import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useScoreStore } from '../../stores/scoreStore'
import { scoreService } from '../../services/scoreService'
import type { Collection } from '../../types/collections'
import { Button, Tag, Input, cn } from '../ui'
import { X } from 'lucide-react'

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
  const {
    userCollections,
    featuredCollections,
    createCollection,
    loadUserCollections,
    loadFeaturedCollections,
  } = useScoreStore()
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionPublic, setNewCollectionPublic] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'featured'>('my')
  const [error, setError] = useState<string | null>(null)
  const [sharedCollections, setSharedCollections] = useState<Collection[]>([])
  const [initialCollectionIds, setInitialCollectionIds] = useState<Set<string>>(
    new Set()
  )
  const [isSaving, setIsSaving] = useState(false)

  // Load collections on mount
  useEffect(() => {
    loadCollections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCollections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Load collections in parallel
      const promises: Promise<unknown>[] = [
        loadUserCollections(),
        loadFeaturedCollections(),
      ]

      // Load shared collections
      promises.push(
        scoreService
          .getSharedCollections()
          .then(collections => setSharedCollections(collections))
          .catch(() => setSharedCollections([]))
      )

      // If we have a scoreId, load which collections it belongs to
      if (scoreId) {
        promises.push(
          scoreService
            .getScoreCollections(scoreId)
            .then(collectionIds => {
              const ids = new Set(collectionIds)
              setSelectedCollections(ids)
              setInitialCollectionIds(ids)
            })
            .catch(() => {
              // If loading fails, start with empty selection
              setSelectedCollections(new Set())
              setInitialCollectionIds(new Set())
            })
        )
      }

      await Promise.all(promises)
    } catch (err) {
      console.error('Failed to load collections:', err)
      setError(
        t('scorebook:errors.loadCollections', 'Failed to load collections')
      )
    } finally {
      setIsLoading(false)
    }
  }, [scoreId, loadUserCollections, loadFeaturedCollections, t])

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    setIsCreating(true)
    setError(null)
    try {
      await createCollection(
        newCollectionName.trim(),
        undefined, // description
        newCollectionPublic ? 'public' : 'private'
      )

      // Reset form
      setNewCollectionName('')
      setNewCollectionPublic(false)

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

    setIsSaving(true)
    setError(null)

    try {
      // Determine which collections to add and remove
      const collectionsToAdd = Array.from(selectedCollections).filter(
        id => !initialCollectionIds.has(id)
      )
      const collectionsToRemove = Array.from(initialCollectionIds).filter(
        id => !selectedCollections.has(id)
      )

      // Execute add/remove operations in parallel
      const operations: Promise<void>[] = []

      for (const collectionId of collectionsToAdd) {
        operations.push(
          scoreService.addScoreToCollection(collectionId, scoreId)
        )
      }

      for (const collectionId of collectionsToRemove) {
        operations.push(
          scoreService.removeScoreFromCollection(collectionId, scoreId)
        )
      }

      await Promise.all(operations)

      // Reload user collections to update counts
      await loadUserCollections()

      if (onClose) onClose()
    } catch (err) {
      console.error('Failed to update score collections:', err)
      setError(
        t(
          'scorebook:errors.updateCollections',
          'Failed to update collections. Please try again.'
        )
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Filter collections by tab
  const filteredCollections = (() => {
    if (activeTab === 'my') {
      return userCollections
    } else if (activeTab === 'shared') {
      return sharedCollections
    } else if (activeTab === 'featured') {
      return featuredCollections
    }
    return []
  })()

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-morandi-stone-200">
        <h3 className="text-lg font-medium text-morandi-stone-800">
          {scoreId
            ? t('scorebook:manageCollections', 'Manage Collections')
            : t('scorebook:myCollections', 'My Collections')}
        </h3>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon-md"
            aria-label={t('common:close', 'Close')}
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-morandi-stone-200">
        <Button
          onClick={() => setActiveTab('my')}
          variant="ghost"
          className={cn(
            'flex-1 rounded-none px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'my'
              ? 'text-morandi-sage-600 border-b-2 border-morandi-sage-500'
              : 'text-morandi-stone-600 hover:text-morandi-stone-800'
          )}
        >
          {t('scorebook:myCollections', 'My Collections')}
        </Button>
        <Button
          onClick={() => setActiveTab('shared')}
          variant="ghost"
          className={cn(
            'flex-1 rounded-none px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'shared'
              ? 'text-morandi-sage-600 border-b-2 border-morandi-sage-500'
              : 'text-morandi-stone-600 hover:text-morandi-stone-800'
          )}
        >
          {t('scorebook:sharedWithMe', 'Shared')}
        </Button>
        <Button
          onClick={() => setActiveTab('featured')}
          variant="ghost"
          className={cn(
            'flex-1 rounded-none px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'featured'
              ? 'text-morandi-sage-600 border-b-2 border-morandi-sage-500'
              : 'text-morandi-stone-600 hover:text-morandi-stone-800'
          )}
        >
          {t('scorebook:featured', 'Featured')}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {error && (
          <div className="mb-4 p-3 bg-morandi-rose-50 border border-morandi-rose-200 rounded-lg text-sm text-morandi-rose-700">
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
              <div className="mb-6 space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newCollectionName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewCollectionName(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') handleCreateCollection()
                    }}
                    placeholder={t(
                      'scorebook:newCollectionPlaceholder',
                      'New collection name...'
                    )}
                    className="flex-1"
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

                {/* Public/Private toggle */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCollectionPublic}
                      onChange={e => setNewCollectionPublic(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        newCollectionPublic
                          ? 'bg-morandi-sage-500'
                          : 'bg-morandi-stone-300'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          newCollectionPublic
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        )}
                      />
                    </div>
                    <span className="ml-3 text-sm font-medium text-morandi-stone-700">
                      {newCollectionPublic
                        ? t('scorebook:public', 'Public')
                        : t('scorebook:private', 'Private')}
                    </span>
                  </label>
                  <span className="text-xs text-morandi-stone-500">
                    {newCollectionPublic
                      ? t(
                          'scorebook:publicCollectionHelp',
                          'Others can discover and use this collection'
                        )
                      : t(
                          'scorebook:privateCollectionHelp',
                          'Only you can see this collection'
                        )}
                  </span>
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
                        'No collections have been shared with you'
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
        <div className="p-3 sm:p-4 border-t border-morandi-stone-200">
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
              {t('common:save', 'Save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
