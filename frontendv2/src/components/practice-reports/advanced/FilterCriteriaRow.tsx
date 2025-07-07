import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import Button from '../../ui/Button'
import { Select } from '../../ui/Select'
import Input from '../../ui/Input'
import { MultiSelect } from '../../ui/MultiSelect'
import { useReportingStore } from '../../../stores/reportingStore'
import { useLogbookStore } from '../../../stores/logbookStore'
import { useAutocomplete } from '../../../hooks/useAutocomplete'
import {
  FilterCriteria,
  FilterField,
  FilterOperator,
  FilterValue,
  DateRange,
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
  const { t } = useTranslation(['reports'])
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
  }, [dateRange])

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
                onChange={e =>
                  setDateRange({
                    ...dateRange,
                    start: new Date(e.target.value),
                  })
                }
                className="w-32"
              />
              <span className="text-morandi-stone-500">
                {t('reports:filters.to')}
              </span>
              <Input
                type="date"
                value={format(dateRange.end, 'yyyy-MM-dd')}
                onChange={e =>
                  setDateRange({
                    ...dateRange,
                    end: new Date(e.target.value),
                  })
                }
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
              onChange={e => handleValueChange(new Date(e.target.value))}
              className="w-40"
            />
          )
        }

      case 'duration':
        if (filter.operator === 'between') {
          const range = (filter.value as any) || { min: 0, max: 60 }
          return (
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={range.min}
                onChange={e =>
                  handleValueChange({
                    min: parseInt(e.target.value) || 0,
                    max: range.max,
                  })
                }
                placeholder="Min"
                className="w-20"
              />
              <span className="text-morandi-stone-500">
                {t('reports:filters.to')}
              </span>
              <Input
                type="number"
                value={range.max}
                onChange={e =>
                  handleValueChange({
                    min: range.min,
                    max: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Max"
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
                value={filter.value || ''}
                onChange={e => handleValueChange(parseInt(e.target.value) || 0)}
                placeholder="0"
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
              onChange={values => handleValueChange(values)}
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
              onValueChange={value => handleValueChange(value)}
              className="w-64"
            >
              <option value="">{t('reports:filters.selectPiece')}</option>
              {pieceAutocomplete.suggestions.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          )
        }

      case 'composer':
        if (filter.operator === 'in' || filter.operator === 'notIn') {
          return (
            <MultiSelect
              value={(filter.value as string[]) || []}
              onChange={values => handleValueChange(values)}
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
              onValueChange={value => handleValueChange(value)}
              className="w-64"
            >
              <option value="">{t('reports:filters.selectComposer')}</option>
              {composerAutocomplete.suggestions.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          )
        }

      case 'instrument':
      case 'type':
      case 'mood':
        const fieldValues = getFieldValues(filter.field)
        if (filter.operator === 'in' || filter.operator === 'notIn') {
          return (
            <MultiSelect
              value={(filter.value as string[]) || []}
              onChange={values => handleValueChange(values)}
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
              onValueChange={value => handleValueChange(value)}
              className="w-48"
            >
              <option value="">
                {t(
                  `reports:filters.select${filter.field.charAt(0).toUpperCase() + filter.field.slice(1)}`
                )}
              </option>
              {fieldValues.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          )
        }

      case 'techniques':
        return (
          <Input
            value={(filter.value as string) || ''}
            onChange={e => handleValueChange(e.target.value)}
            placeholder={t('reports:filters.enterTechnique')}
            className="w-48"
          />
        )

      case 'autoTracked':
        return (
          <Select
            value={(filter.value as string) || ''}
            onValueChange={value => handleValueChange(value === 'true')}
            className="w-32"
          >
            <option value="">{t('reports:filters.select')}</option>
            <option value="true">{t('reports:filters.yes')}</option>
            <option value="false">{t('reports:filters.no')}</option>
          </Select>
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
          onValueChange={value =>
            updateFilter(filter.id, { logic: value as 'AND' | 'OR' })
          }
          className="w-20"
        >
          <option value="AND">{t('reports:filters.and')}</option>
          <option value="OR">{t('reports:filters.or')}</option>
        </Select>
      )}

      <Select
        value={filter.field}
        onValueChange={value => handleFieldChange(value as FilterField)}
        className="w-40"
      >
        {availableFields.map(field => (
          <option key={field.value} value={field.value}>
            {field.label}
          </option>
        ))}
      </Select>

      <Select
        value={filter.operator}
        onValueChange={value => handleOperatorChange(value as FilterOperator)}
        className="w-40"
      >
        {operators.map(op => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </Select>

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
