import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import { DEFAULT_TECHNIQUES } from '../../constants/techniques'
import { X } from 'lucide-react'

interface TechniqueSelectorProps {
  selectedTechniques: string[]
  onTechniquesChange: (techniques: string[]) => void
  className?: string
}

export function TechniqueSelector({
  selectedTechniques,
  onTechniquesChange,
  className = '',
}: TechniqueSelectorProps) {
  const { t } = useTranslation()
  const [customTechnique, setCustomTechnique] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleToggleTechnique = (technique: string) => {
    if (selectedTechniques.includes(technique)) {
      onTechniquesChange(selectedTechniques.filter(t => t !== technique))
    } else {
      onTechniquesChange([...selectedTechniques, technique])
    }
  }

  const handleAddCustom = () => {
    if (
      customTechnique.trim() &&
      !selectedTechniques.includes(customTechnique.trim())
    ) {
      onTechniquesChange([...selectedTechniques, customTechnique.trim()])
      setCustomTechnique('')
      setShowCustomInput(false)
    }
  }

  const handleRemoveTechnique = (technique: string) => {
    onTechniquesChange(selectedTechniques.filter(t => t !== technique))
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('logbook:entry.techniqueOptions.selectTechniques')}
      </label>

      {/* Default Techniques */}
      <div className="space-y-2 mb-4">
        {DEFAULT_TECHNIQUES.map(technique => (
          <label
            key={technique}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedTechniques.includes(technique)}
              onChange={() => handleToggleTechnique(technique)}
              className="rounded border-gray-300 text-sage-600 focus:ring-sage-500"
            />
            <span className="text-sm text-gray-700">
              {t(`logbook:entry.techniqueOptions.${technique}`)}
            </span>
          </label>
        ))}
      </div>

      {/* Custom Technique Input */}
      {showCustomInput ? (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={customTechnique}
            onChange={e => setCustomTechnique(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddCustom()}
            placeholder={t('logbook:entry.techniqueOptions.customPlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-sage-500 focus:border-sage-500"
            autoFocus
          />
          <Button variant="secondary" size="sm" onClick={handleAddCustom}>
            Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustomInput(false)
              setCustomTechnique('')
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCustomInput(true)}
          className="mb-4"
        >
          + {t('logbook:entry.techniqueOptions.addCustom')}
        </Button>
      )}

      {/* Selected Techniques Tags */}
      {selectedTechniques.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">Selected techniques:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTechniques.map(technique => (
              <span
                key={technique}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-sand-100 text-sand-800"
              >
                {DEFAULT_TECHNIQUES.includes(
                  technique as (typeof DEFAULT_TECHNIQUES)[number]
                )
                  ? t(`logbook:entry.techniqueOptions.${technique}`)
                  : technique}
                <button
                  onClick={() => handleRemoveTechnique(technique)}
                  className="ml-1 text-sand-600 hover:text-sand-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
