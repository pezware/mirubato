import { useTranslation } from 'react-i18next'
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react'
import Button from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Select } from '../../ui/Select'
import { useReportingStore } from '../../../stores/reportingStore'
import { GroupingConfig, GroupField } from '../../../types/reporting'

export function GroupingPanel() {
  const { t } = useTranslation(['reports'])
  const { groupBy, addGroupLevel, removeGroupLevel, updateGroupLevel } =
    useReportingStore()

  // Available grouping fields
  const groupFields: Array<{ value: GroupField; label: string }> = [
    { value: 'date:day', label: t('reports:grouping.fields.dateDay') },
    { value: 'date:week', label: t('reports:grouping.fields.dateWeek') },
    { value: 'date:month', label: t('reports:grouping.fields.dateMonth') },
    { value: 'date:year', label: t('reports:grouping.fields.dateYear') },
    { value: 'piece', label: t('reports:grouping.fields.piece') },
    { value: 'composer', label: t('reports:grouping.fields.composer') },
    { value: 'instrument', label: t('reports:grouping.fields.instrument') },
    { value: 'type', label: t('reports:grouping.fields.type') },
    { value: 'mood', label: t('reports:grouping.fields.mood') },
    {
      value: 'duration:range',
      label: t('reports:grouping.fields.durationRange'),
    },
  ]

  const handleAddGroupLevel = () => {
    // Find first unused field
    const usedFields = new Set(groupBy.map(g => g.field))
    const availableField = groupFields.find(f => !usedFields.has(f.value))

    if (availableField) {
      addGroupLevel({
        field: availableField.value,
        order: 'desc',
        showAggregates: true,
      })
    }
  }

  const canAddMore = groupBy.length < 3 && groupBy.length < groupFields.length

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-morandi-stone-800">
            {t('reports:grouping.title')}
          </h3>
          {canAddMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddGroupLevel}
              leftIcon={<Plus className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              {t('reports:grouping.addLevel')}
            </Button>
          )}
        </div>

        {/* Group Levels */}
        {groupBy.length > 0 ? (
          <div className="space-y-3">
            {groupBy.map((group, index) => (
              <GroupLevelRow
                key={index}
                group={group}
                index={index}
                availableFields={groupFields}
                usedFields={new Set(groupBy.map(g => g.field))}
                onUpdate={updates => updateGroupLevel(index, updates)}
                onRemove={() => removeGroupLevel(index)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-morandi-stone-500">
            <p>{t('reports:grouping.noGrouping')}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddGroupLevel}
              className="mt-2"
            >
              {t('reports:grouping.addFirstLevel')}
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-sm text-morandi-stone-600 bg-morandi-stone-50 rounded-lg p-3">
          <p>{t('reports:grouping.helpText')}</p>
        </div>
      </div>
    </Card>
  )
}

interface GroupLevelRowProps {
  group: GroupingConfig
  index: number
  availableFields: Array<{ value: GroupField; label: string }>
  usedFields: Set<GroupField>
  onUpdate: (updates: Partial<GroupingConfig>) => void
  onRemove: () => void
}

function GroupLevelRow({
  group,
  index,
  availableFields,
  usedFields,
  onUpdate,
  onRemove,
}: GroupLevelRowProps) {
  const { t } = useTranslation(['reports'])

  // Filter out already used fields except the current one
  const selectableFields = availableFields.filter(
    f => f.value === group.field || !usedFields.has(f.value)
  )

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 bg-morandi-stone-50 rounded-lg">
      <span className="text-sm font-medium text-morandi-stone-700 sm:w-16">
        {t('reports:grouping.level', { level: index + 1 })}
      </span>

      <Select
        value={group.field}
        onChange={(value: string | number) =>
          onUpdate({ field: value as GroupField })
        }
        options={selectableFields.map(field => ({
          value: field.value,
          label: field.label,
        }))}
        className="w-full sm:flex-1"
      />

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onUpdate({ order: group.order === 'asc' ? 'desc' : 'asc' })
          }
          title={
            group.order === 'asc'
              ? t('reports:grouping.sortAscending')
              : t('reports:grouping.sortDescending')
          }
        >
          {group.order === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        <label className="flex items-center gap-1 sm:gap-2 text-sm flex-1 sm:flex-initial">
          <input
            type="checkbox"
            checked={group.showAggregates !== false}
            onChange={e => onUpdate({ showAggregates: e.target.checked })}
            className="rounded border-morandi-stone-300 text-morandi-sage-500 focus:ring-morandi-sage-500 flex-shrink-0"
          />
          <span className="text-morandi-stone-600 whitespace-nowrap">
            {t('reports:grouping.showTotals')}
          </span>
        </label>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="ml-auto sm:ml-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
