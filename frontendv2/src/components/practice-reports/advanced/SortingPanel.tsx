import { useTranslation } from 'react-i18next'
import { Plus, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import Button from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Select } from '../../ui/Select'
import { useReportingStore } from '../../../stores/reportingStore'
import { SortConfig, SortField } from '../../../types/reporting'

export function SortingPanel() {
  const { t } = useTranslation(['reports'])
  const { sortBy, addSortField, removeSortField, updateSortField } =
    useReportingStore()

  // Available sort fields
  const sortFields: Array<{ value: SortField; label: string }> = [
    { value: 'date', label: t('reports:sorting.fields.date') },
    { value: 'duration', label: t('reports:sorting.fields.duration') },
    { value: 'piece', label: t('reports:sorting.fields.piece') },
    { value: 'composer', label: t('reports:sorting.fields.composer') },
    {
      value: 'practiceCount',
      label: t('reports:sorting.fields.practiceCount'),
    },
    {
      value: 'totalDuration',
      label: t('reports:sorting.fields.totalDuration'),
    },
    {
      value: 'lastPracticed',
      label: t('reports:sorting.fields.lastPracticed'),
    },
  ]

  const handleAddSortField = () => {
    // Find first unused field
    const usedFields = new Set(sortBy.map(s => s.field))
    const availableField = sortFields.find(f => !usedFields.has(f.value))

    if (availableField) {
      addSortField({
        field: availableField.value,
        direction: 'desc',
        priority: sortBy.length,
      })
    }
  }

  const canAddMore = sortBy.length < 3 && sortBy.length < sortFields.length

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-morandi-stone-800">
            {t('reports:sorting.title')}
          </h3>
          {canAddMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddSortField}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('reports:sorting.addField')}
            </Button>
          )}
        </div>

        {/* Sort Fields */}
        {sortBy.length > 0 ? (
          <div className="space-y-3">
            {sortBy.map((sort, index) => (
              <SortFieldRow
                key={index}
                sort={sort}
                index={index}
                availableFields={sortFields}
                usedFields={new Set(sortBy.map(s => s.field))}
                onUpdate={updates => updateSortField(index, updates)}
                onRemove={() => removeSortField(index)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-morandi-stone-500">
            <p>{t('reports:sorting.noSorting')}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddSortField}
              className="mt-2"
            >
              {t('reports:sorting.addFirstField')}
            </Button>
          </div>
        )}

        {/* Help Text */}
        {sortBy.length > 1 && (
          <div className="text-sm text-morandi-stone-600 bg-morandi-stone-50 rounded-lg p-3">
            <p>{t('reports:sorting.helpText')}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

interface SortFieldRowProps {
  sort: SortConfig
  index: number
  availableFields: Array<{ value: SortField; label: string }>
  usedFields: Set<SortField>
  onUpdate: (updates: Partial<SortConfig>) => void
  onRemove: () => void
}

function SortFieldRow({
  sort,
  index,
  availableFields,
  usedFields,
  onUpdate,
  onRemove,
}: SortFieldRowProps) {
  const { t } = useTranslation(['reports'])

  // Filter out already used fields except the current one
  const selectableFields = availableFields.filter(
    f => f.value === sort.field || !usedFields.has(f.value)
  )

  return (
    <div className="flex items-center gap-3 p-3 bg-morandi-stone-50 rounded-lg">
      <div className="cursor-move">
        <GripVertical className="w-4 h-4 text-morandi-stone-400" />
      </div>

      <span className="text-sm font-medium text-morandi-stone-700 w-20">
        {index === 0
          ? t('reports:sorting.primary')
          : t('reports:sorting.secondary')}
      </span>

      <Select
        value={sort.field}
        onChange={(value: string | number) =>
          onUpdate({ field: value as SortField })
        }
        options={selectableFields.map(field => ({
          value: field.value,
          label: field.label,
        }))}
        className="flex-1"
      />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onUpdate({ direction: sort.direction === 'asc' ? 'desc' : 'asc' })
          }
          className="flex items-center gap-1"
        >
          {sort.direction === 'asc' ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span className="text-xs">{t('reports:sorting.ascending')}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span className="text-xs">{t('reports:sorting.descending')}</span>
            </>
          )}
        </Button>

        <Button variant="ghost" size="sm" onClick={onRemove}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
