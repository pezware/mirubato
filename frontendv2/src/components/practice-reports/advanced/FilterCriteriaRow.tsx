import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import Button from '../../ui/Button'
import { Select } from '../../ui/Select'
import { Input } from '../../ui/Input'
import { MultiSelect } from '../../ui/Select'
import { useReportingStore } from '../../../stores/reportingStore'
import { useLogbookStore } from '../../../stores/logbookStore'
import { useAutocomplete } from '../../../hooks/useAutocomplete'
import {
  FilterCriteria,
  FilterField,
  FilterOperator,
  FilterValue,
  DateRange,
  DurationRange,
} from '../../../types/reporting'
import { format } from 'date-fns'

interface FilterCriteriaRowProps {
  filter: FilterCriteria
  showLogic: boolean
  availableFields: Array<{ value: FilterField; label: string }>
}

export function FilterCriteriaRow({
  filter,
  showLogic,
  availableFields,
}: FilterCriteriaRowProps) {
  const { t } = useTranslation(['reports', 'ui'])
  const { updateFilter, removeFilter } = useReportingStore()
  const { entries } = useLogbookStore()

  // State for date range inputs
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (
      filter.field === 'date' &&
      filter.value &&
      typeof filter.value === 'object'
    ) {
      return filter.value as DateRange
    }
    return { start: new Date(), end: new Date() }
  })

  // Autocomplete for pieces and composers
  const pieceAutocomplete = useAutocomplete({
    type: 'piece',
    minLength: 0,
  })
  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 0,
  })

  // Get available operators for the selected field
  const getOperatorsForField = (
    field: FilterField
  ): Array<{ value: FilterOperator; label: string }> => {
    switch (field) {
      case 'date':
        return [
          { value: 'between', label: t('reports:filters.operators.between') },
          { value: 'greaterThan', label: t('reports:filters.operators.after') },
          { value: 'lessThan', label: t('reports:filters.operators.before') },
          { value: 'equals', label: t('reports:filters.operators.on') },
        ]
      case 'duration':
        return [
          { value: 'equals', label: t('reports:filters.operators.equals') },
          {
            value: 'greaterThan',
            label: t('reports:filters.operators.greaterThan'),
          },
          { value: 'lessThan', label: t('reports:filters.operators.lessThan') },
          { value: 'between', label: t('reports:filters.operators.between') },
        ]
      case 'piece':
      case 'composer':
      case 'instrument':
      case 'type':
      case 'mood':
        return [
          { value: 'equals', label: t('reports:filters.operators.is') },
          { value: 'notEquals', label: t('reports:filters.operators.isNot') },
          { value: 'in', label: t('reports:filters.operators.in') },
          { value: 'notIn', label: t('reports:filters.operators.notIn') },
        ]
      case 'techniques':
        return [
          { value: 'contains', label: t('reports:filters.operators.contains') },
          {
            value: 'notContains',
            label: t('reports:filters.operators.notContains'),
          },
          { value: 'isEmpty', label: t('reports:filters.operators.isEmpty') },
          {
            value: 'isNotEmpty',
            label: t('reports:filters.operators.isNotEmpty'),
          },
        ]
      case 'scoreId':
        return [
          { value: 'isEmpty', label: t('reports:filters.operators.notLinked') },
          { value: 'isNotEmpty', label: t('reports:filters.operators.linked') },
        ]
      case 'autoTracked':
        return [{ value: 'equals', label: t('reports:filters.operators.is') }]
      default:
        return [
          { value: 'equals', label: t('reports:filters.operators.equals') },
        ]
    }
  }

  // Get unique values for select fields
  const getFieldValues = (field: FilterField): string[] => {
    const values = new Set<string>()

    switch (field) {
      case 'instrument':
        entries.forEach(e => values.add(e.instrument))
        break
      case 'type':
        entries.forEach(e => values.add(e.type))
        break
      case 'mood':
        entries.forEach(e => e.mood && values.add(e.mood))
        break
      case 'techniques':
        entries.forEach(e => e.techniques.forEach(t => values.add(t)))
        break
    }

    return Array.from(values).sort()
  }

  // Handle field change
  const handleFieldChange = (newField: FilterField) => {
    const operators = getOperatorsForField(newField)
    updateFilter(filter.id, {
      field: newField,
      operator: operators[0].value,
      value: null,
    })
  }

  // Handle operator change
  const handleOperatorChange = (newOperator: FilterOperator) => {
    updateFilter(filter.id, {
      operator: newOperator,
      value: null,
    })
  }

  // Handle value change
  const handleValueChange = (newValue: FilterValue) => {
    updateFilter(filter.id, { value: newValue })
  }

  // Handle date range change
  useEffect(() => {
    if (filter.field === 'date' && filter.operator === 'between') {
      handleValueChange(dateRange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, filter.field, filter.operator])

  // Render value input based on field and operator
  const renderValueInput = () => {
    // No value input needed for isEmpty/isNotEmpty
    if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
      return null
    }

    switch (filter.field) {
      case 'date':
        if (filter.operator === 'between') {
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={format(dateRange.start, 'yyyy-MM-dd')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  // Parse the date components to avoid timezone issues
                  const [year, month, day] = e.target.value
                    .split('-')
                    .map(Number)
                  setDateRange({
                    ...dateRange,
                    start: new Date(year, month - 1, day),
                  })
                }}
                className="w-32"
              />
              <span className="text-morandi-stone-500">
                {t('reports:filters.to')}
              </span>
              <Input
                type="date"
                value={format(dateRange.end, 'yyyy-MM-dd')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  // Parse the date components to avoid timezone issues
                  const [year, month, day] = e.target.value
                    .split('-')
                    .map(Number)
                  setDateRange({
                    ...dateRange,
                    end: new Date(year, month - 1, day),
                  })
                }}
                className="w-32"
              />
            </div>
          )
        } else {
          return (
            <Input
              type="date"
              value={
                filter.value
                  ? format(new Date(filter.value as string), 'yyyy-MM-dd')
                  : ''
              }
              onChange={e => {
                // Parse the date components to avoid timezone issues
                const [year, month, day] = e.target.value.split('-').map(Number)
                handleValueChange(new Date(year, month - 1, day))
              }}
              className="w-40"
            />
          )
        }

      case 'duration':
        if (filter.operator === 'between') {
          const range =
            filter.value &&
            typeof filter.value === 'object' &&
            'min' in filter.value
              ? (filter.value as DurationRange)
              : { min: 0, max: 60 }
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={range.min}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleValueChange({
                    min: parseInt(e.target.value) || 0,
                    max: range.max,
                  })
                }
                placeholder={t('ui:components.filters.minPlaceholder')}
                className="w-20"
              />
              <span className="text-morandi-stone-500">
                {t('reports:filters.to')}
              </span>
              <Input
                type="number"
                value={range.max}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleValueChange({
                    min: range.min,
                    max: parseInt(e.target.value) || 0,
                  })
                }
                placeholder={t('ui:components.filters.maxPlaceholder')}
                className="w-20"
              />
              <span className="text-morandi-stone-500">
                {t('reports:filters.minutes')}
              </span>
            </div>
          )
        } else {
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={(filter.value as number) || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleValueChange(parseInt(e.target.value) || 0)
                }
                placeholder={t('ui:components.filters.defaultValuePlaceholder')}
                className="w-20"
              />
              <span className="text-morandi-stone-500">
                {t('reports:filters.minutes')}
              </span>
            </div>
          )
        }

      case 'piece':
        if (filter.operator === 'in' || filter.operator === 'notIn') {
          return (
            <MultiSelect
              value={(filter.value as string[]) || []}
              onChange={(values: (string | number)[]) =>
                handleValueChange(values.map(String))
              }
              options={pieceAutocomplete.suggestions.map(s => ({
                value: s.value,
                label: s.label,
              }))}
              placeholder={t('reports:filters.selectPieces')}
              className="w-64"
            />
          )
        } else {
          return (
            <Select
              value={(filter.value as string) || ''}
              onChange={(value: string | number) => handleValueChange(value)}
              options={[
                { value: '', label: t('reports:filters.selectPiece') },
                ...pieceAutocomplete.suggestions.map(s => ({
                  value: s.value,
                  label: s.label,
                })),
              ]}
              className="w-64"
            />
          )
        }

      case 'composer':
        if (filter.operator === 'in' || filter.operator === 'notIn') {
          return (
            <MultiSelect
              value={(filter.value as string[]) || []}
              onChange={(values: (string | number)[]) =>
                handleValueChange(values.map(String))
              }
              options={composerAutocomplete.suggestions.map(s => ({
                value: s.value,
                label: s.label,
              }))}
              placeholder={t('reports:filters.selectComposers')}
              className="w-64"
            />
          )
        } else {
          return (
            <Select
              value={(filter.value as string) || ''}
              onChange={(value: string | number) => handleValueChange(value)}
              options={[
                { value: '', label: t('reports:filters.selectComposer') },
                ...composerAutocomplete.suggestions.map(s => ({
                  value: s.value,
                  label: s.label,
                })),
              ]}
              className="w-64"
            />
          )
        }

      case 'instrument':
      case 'type':
      case 'mood': {
        const fieldValues = getFieldValues(filter.field)
        if (filter.operator === 'in' || filter.operator === 'notIn') {
          return (
            <MultiSelect
              value={(filter.value as string[]) || []}
              onChange={(values: (string | number)[]) =>
                handleValueChange(values.map(String))
              }
              options={fieldValues.map(v => ({ value: v, label: v }))}
              placeholder={t(
                `reports:filters.select${filter.field.charAt(0).toUpperCase() + filter.field.slice(1)}s`
              )}
              className="w-48"
            />
          )
        } else {
          return (
            <Select
              value={(filter.value as string) || ''}
              onChange={(value: string | number) => handleValueChange(value)}
              options={[
                {
                  value: '',
                  label: t(
                    `reports:filters.select${filter.field.charAt(0).toUpperCase() + filter.field.slice(1)}`
                  ),
                },
                ...fieldValues.map(v => ({ value: v, label: v })),
              ]}
              className="w-48"
            />
          )
        }
      }

      case 'techniques':
        return (
          <Input
            value={(filter.value as string) || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleValueChange(e.target.value)
            }
            placeholder={t('reports:filters.enterTechnique')}
            className="w-48"
          />
        )

      case 'autoTracked':
        return (
          <Select
            value={(filter.value as string) || ''}
            onChange={(value: string | number) =>
              handleValueChange(value === 'true')
            }
            options={[
              { value: '', label: t('reports:filters.select') },
              { value: 'true', label: t('reports:filters.yes') },
              { value: 'false', label: t('reports:filters.no') },
            ]}
            className="w-32"
          />
        )

      default:
        return null
    }
  }

  const operators = getOperatorsForField(filter.field)

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-morandi-stone-50 rounded-lg">
      {showLogic && (
        <Select
          value={filter.logic || 'AND'}
          onChange={(value: string | number) =>
            updateFilter(filter.id, { logic: value as 'AND' | 'OR' })
          }
          options={[
            { value: 'AND', label: t('reports:filters.and') },
            { value: 'OR', label: t('reports:filters.or') },
          ]}
          className="w-20"
        />
      )}

      <Select
        value={filter.field}
        onChange={(value: string | number) =>
          handleFieldChange(value as FilterField)
        }
        options={availableFields.map(field => ({
          value: field.value,
          label: field.label,
        }))}
        className="w-40"
      />

      <Select
        value={filter.operator}
        onChange={(value: string | number) =>
          handleOperatorChange(value as FilterOperator)
        }
        options={operators.map(op => ({
          value: op.value,
          label: op.label,
        }))}
        className="w-40"
      />

      {renderValueInput()}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeFilter(filter.id)}
        className="ml-auto"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
