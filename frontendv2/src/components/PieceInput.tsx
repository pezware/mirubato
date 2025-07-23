import { useTranslation } from 'react-i18next'
import Autocomplete from './ui/Autocomplete'
import Button from './ui/Button'
import { useAutocomplete } from '../hooks/useAutocomplete'
import { formatComposerName } from '../utils/textFormatting'

interface PieceInputProps {
  piece: {
    title: string
    composer?: string | null
  }
  index: number
  onUpdate: (index: number, field: 'title' | 'composer', value: string) => void
  onRemove: (index: number) => void
}

export default function PieceInput({
  piece,
  index,
  onUpdate,
  onRemove,
}: PieceInputProps) {
  const { t } = useTranslation(['logbook', 'common'])

  // Autocomplete for piece title
  const pieceAutocomplete = useAutocomplete({
    type: 'piece',
    composer: piece.composer || undefined, // Filter by composer if already selected, convert null to undefined
    minLength: 0, // Show suggestions immediately
  })

  // Autocomplete for composer
  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 0, // Show suggestions immediately
  })

  return (
    <div className="space-y-2">
      {/* Offline indicator - only show when offline */}
      {(pieceAutocomplete.isOffline || composerAutocomplete.isOffline) && (
        <div className="text-xs text-amber-600 flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
          <span>
            {t(
              'logbook:autocomplete.offline',
              'Offline - showing your history'
            )}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <Autocomplete
          value={piece.title}
          onChange={value => {
            onUpdate(index, 'title', value)
            pieceAutocomplete.setQuery(value)
          }}
          onSelect={option => {
            // The Autocomplete component already calls onChange with the value
            // so the title is already updated. We just need to handle the composer
            if (option.metadata?.composer) {
              onUpdate(index, 'composer', option.metadata.composer)
            }
          }}
          options={pieceAutocomplete.suggestions}
          placeholder={t('logbook:entry.pieceTitle')}
          isLoading={pieceAutocomplete.isLoading}
          className="flex-1"
          data-testid="piece-title-input"
        />

        <Autocomplete
          value={piece.composer || ''}
          onChange={value => {
            onUpdate(index, 'composer', value)
            composerAutocomplete.setQuery(value)
          }}
          onBlur={() => {
            // Auto-capitalize composer name on blur
            const currentValue = piece.composer || ''
            if (currentValue && currentValue.trim()) {
              const formatted = formatComposerName(currentValue.trim())
              if (formatted !== currentValue) {
                onUpdate(index, 'composer', formatted)
              }
            }
          }}
          onSelect={() => {
            // Selection is already handled by onChange in Autocomplete component
          }}
          options={composerAutocomplete.suggestions}
          placeholder={t('logbook:entry.composer')}
          isLoading={composerAutocomplete.isLoading}
          className="flex-1"
          data-testid="composer-input"
        />

        <Button
          type="button"
          onClick={() => onRemove(index)}
          variant="secondary"
          size="sm"
        >
          {t('common:remove')}
        </Button>
      </div>
    </div>
  )
}
