import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Trash2, FolderPlus, CheckSquare, Square } from 'lucide-react'
import Button from '../ui/Button'
import { Select } from '../ui'
import type { Collection } from '../../types/collections'

interface SelectionToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDelete: () => void
  onAddToCollection: (collectionId: string) => void
  collections: Collection[]
  isDeleting?: boolean
  isAddingToCollection?: boolean
}

export default function SelectionToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onAddToCollection,
  collections,
  isDeleting = false,
  isAddingToCollection = false,
}: SelectionToolbarProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')

  const collectionOptions = [
    {
      value: '',
      label: t('scorebook:selectCollection', 'Select collection...'),
    },
    ...collections.map(col => ({
      value: col.id,
      label: col.name,
    })),
  ]

  const handleAddToCollection = () => {
    if (selectedCollectionId) {
      onAddToCollection(selectedCollectionId)
      setSelectedCollectionId('')
    }
  }

  const allSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div className="bg-morandi-sage-50 border-b border-morandi-sage-200 px-4 py-3 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Selection info and toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-2 text-sm text-morandi-sage-700 hover:text-morandi-sage-900 transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span>
              {allSelected
                ? t('scorebook:deselectAll', 'Deselect all')
                : t('scorebook:selectAll', 'Select all')}
            </span>
          </button>

          <span className="text-sm font-medium text-morandi-sage-800">
            {t('scorebook:selectedCount', '{{count}} selected', {
              count: selectedCount,
            })}
          </span>

          <button
            onClick={onDeselectAll}
            className="p-1 text-morandi-sage-600 hover:text-morandi-sage-800 hover:bg-morandi-sage-100 rounded transition-colors"
            title={t('scorebook:clearSelection', 'Clear selection')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add to Collection */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedCollectionId}
              onChange={setSelectedCollectionId}
              options={collectionOptions}
              className="min-w-[180px]"
            />
            <Button
              onClick={handleAddToCollection}
              disabled={
                !selectedCollectionId ||
                isAddingToCollection ||
                selectedCount === 0
              }
              size="sm"
              variant="secondary"
              className="flex items-center gap-1"
            >
              {isAddingToCollection ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
              ) : (
                <FolderPlus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {t('scorebook:addToCollection', 'Add')}
              </span>
            </Button>
          </div>

          {/* Delete */}
          <Button
            onClick={onDelete}
            disabled={isDeleting || selectedCount === 0}
            size="sm"
            variant="danger"
            className="flex items-center gap-1"
          >
            {isDeleting ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {t('scorebook:delete', 'Delete')}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
