import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { scoreService } from '../../services/scoreService'
import { Collection } from '../../types/collections'
import { Button, Tag, cn } from '../ui'

interface AddToCollectionModalProps {
  scoreId: string
  scoreTitle: string
  onClose: () => void
  onSave: () => void
}

export default function AddToCollectionModal({
  scoreId,
  scoreTitle,
  onClose,
  onSave,
}: AddToCollectionModalProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set()
  )
  const [initialCollections, setInitialCollections] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCollections()
    loadScoreCollections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCollections = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const userCollections = await scoreService.getUserCollections()
      console.log('Loaded collections:', userCollections)
      setCollections(userCollections)
    } catch (err) {
      console.error('Failed to load collections:', err)
      setError(
        t('scorebook:errors.loadCollections', 'Failed to load collections')
      )
    } finally {
      setIsLoading(false)
    }
  }

  const loadScoreCollections = async () => {
    try {
      const collectionIds = await scoreService.getScoreCollections(scoreId)
      console.log('Score is in collections:', collectionIds)
      setSelectedCollections(new Set(collectionIds))
      setInitialCollections(new Set(collectionIds))
    } catch (err) {
      console.error('Failed to load score collections:', err)
      // Don't show error - just start with empty selection
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
    setIsSaving(true)
    setError(null)

    try {
      // Find collections to add and remove based on initial state
      const toAdd = Array.from(selectedCollections).filter(
        id => !initialCollections.has(id)
      )
      const toRemove = Array.from(initialCollections).filter(
        id => !selectedCollections.has(id)
      )

      // Execute add/remove operations with error handling for each
      const operations = [
        ...toAdd.map(async collectionId => {
          try {
            await scoreService.addScoreToCollection(collectionId, scoreId)
            return { success: true, collectionId, operation: 'add' }
          } catch (err) {
            console.warn(`Failed to add to collection ${collectionId}:`, err)
            return {
              success: false,
              collectionId,
              operation: 'add',
              error: err,
            }
          }
        }),
        ...toRemove.map(async collectionId => {
          try {
            await scoreService.removeScoreFromCollection(collectionId, scoreId)
            return { success: true, collectionId, operation: 'remove' }
          } catch (err) {
            console.warn(
              `Failed to remove from collection ${collectionId}:`,
              err
            )
            return {
              success: false,
              collectionId,
              operation: 'remove',
              error: err,
            }
          }
        }),
      ]

      const results = await Promise.all(operations)
      const failures = results.filter(r => !r.success)

      // If some operations succeeded, consider it a partial success
      if (failures.length > 0 && failures.length < results.length) {
        console.warn('Some operations failed:', failures)
        // Don't throw error - partial success is ok
      } else if (failures.length === results.length && results.length > 0) {
        // All operations failed
        throw new Error('All operations failed')
      }

      onSave()
      onClose()
    } catch (err) {
      console.error('Failed to update collections:', err)
      setError(
        t('scorebook:errors.updateCollections', 'Failed to update collections')
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-morandi-stone-200">
          <h3 className="text-lg font-medium text-morandi-stone-800">
            {t('scorebook:addToCollections', 'Add to Collections')}
          </h3>
          <p className="text-sm text-morandi-stone-600 mt-1">{scoreTitle}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-morandi-rose-50 border border-morandi-rose-200 rounded-lg text-sm text-morandi-rose-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-sage-500"></div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8 text-morandi-stone-500">
              <p>{t('scorebook:noCollections', 'No collections yet')}</p>
              <p className="text-sm mt-1">
                {t(
                  'scorebook:createFirstCollection',
                  'Create your first collection'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {collections.map(collection => (
                <label
                  key={collection.id}
                  className={cn(
                    'flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all',
                    selectedCollections.has(collection.id)
                      ? 'border-morandi-sage-500 bg-morandi-sage-50'
                      : 'border-morandi-stone-200 hover:border-morandi-stone-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.has(collection.id)}
                    onChange={() => toggleCollection(collection.id)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-morandi-stone-800">
                      {collection.name}
                    </div>
                    {collection.description && (
                      <div className="text-sm text-morandi-stone-600 mt-0.5">
                        {collection.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {collection.visibility === 'public' && (
                        <Tag size="sm" variant="success">
                          {t('scorebook:public', 'Public')}
                        </Tag>
                      )}
                      {collection.scoreCount !== undefined && (
                        <span className="text-xs text-morandi-stone-500">
                          {collection.scoreCount} scores
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3">
                    {selectedCollections.has(collection.id) && (
                      <svg
                        className="w-5 h-5 text-morandi-sage-600"
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
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-morandi-stone-200">
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={isLoading}
            >
              {t('common:save', 'Save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
