import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Save, X } from 'lucide-react'
import Button from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Select } from '../../ui/Select'
import { Modal } from '../../ui/Modal'
import { Input } from '../../ui/Input'
import { useReportingStore } from '../../../stores/reportingStore'
import { FilterField } from '../../../types/reporting'
import { FilterCriteriaRow } from './FilterCriteriaRow'

export function FilterBuilder() {
  const { t } = useTranslation(['reports'])
  const {
    filters,
    filterPresets,
    activePresetId,
    addFilter,
    clearFilters,
    saveFilterPreset,
    loadFilterPreset,
    deleteFilterPreset,
  } = useReportingStore()

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')

  // Available fields for filtering
  const filterFields: Array<{ value: FilterField; label: string }> = [
    { value: 'date', label: t('reports:filters.fields.date') },
    { value: 'duration', label: t('reports:filters.fields.duration') },
    { value: 'piece', label: t('reports:filters.fields.piece') },
    { value: 'composer', label: t('reports:filters.fields.composer') },
    { value: 'instrument', label: t('reports:filters.fields.instrument') },
    { value: 'type', label: t('reports:filters.fields.type') },
    { value: 'mood', label: t('reports:filters.fields.mood') },
    { value: 'techniques', label: t('reports:filters.fields.techniques') },
    { value: 'scoreId', label: t('reports:filters.fields.scoreId') },
    { value: 'autoTracked', label: t('reports:filters.fields.autoTracked') },
  ]

  const handleAddFilter = () => {
    addFilter({
      field: 'date',
      operator: 'between',
      value: null,
      logic: 'AND',
    })
  }

  const handleSavePreset = () => {
    if (presetName.trim()) {
      saveFilterPreset(presetName.trim(), presetDescription.trim())
      setShowSaveModal(false)
      setPresetName('')
      setPresetDescription('')
    }
  }

  const handlePresetChange = (presetId: string | number) => {
    if (String(presetId) === 'none') {
      clearFilters()
    } else {
      loadFilterPreset(String(presetId))
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-morandi-stone-800">
            {t('reports:filters.title')}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddFilter}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('reports:filters.addFilter')}
            </Button>
            {filters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                leftIcon={<X className="w-4 h-4" />}
              >
                {t('reports:filters.clearAll')}
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {filters.length > 0 ? (
          <div className="space-y-2">
            {filters.map((filter, index) => (
              <FilterCriteriaRow
                key={filter.id}
                filter={filter}
                showLogic={index > 0}
                availableFields={filterFields}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-morandi-stone-500">
            <p>{t('reports:filters.noFilters')}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddFilter}
              className="mt-2"
            >
              {t('reports:filters.addFirstFilter')}
            </Button>
          </div>
        )}

        {/* Preset Management */}
        {(filters.length > 0 || filterPresets.length > 0) && (
          <div className="border-t border-morandi-stone-200 pt-4">
            <div className="flex items-center gap-4">
              <Select
                value={activePresetId || 'none'}
                onChange={handlePresetChange}
                options={[
                  { value: 'none', label: t('reports:filters.noPreset') },
                  ...filterPresets.map(preset => ({
                    value: preset.id,
                    label: preset.name,
                  })),
                ]}
                className="flex-1"
              />
              {filters.length > 0 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowSaveModal(true)}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    {t('reports:filters.savePreset')}
                  </Button>
                  {activePresetId && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteFilterPreset(activePresetId)}
                    >
                      {t('reports:filters.deletePreset')}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Preset Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title={t('reports:filters.savePresetModal.title')}
      >
        <div className="space-y-4">
          <Input
            label={t('reports:filters.savePresetModal.name')}
            value={presetName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPresetName(e.target.value)
            }
            placeholder={t('reports:filters.savePresetModal.namePlaceholder')}
            autoFocus
          />
          <Input
            label={t('reports:filters.savePresetModal.description')}
            value={presetDescription}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPresetDescription(e.target.value)
            }
            placeholder={t(
              'reports:filters.savePresetModal.descriptionPlaceholder'
            )}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
            >
              {t('common:save')}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
