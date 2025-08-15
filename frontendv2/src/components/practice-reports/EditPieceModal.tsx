import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import Button from '../ui/Button'
import { Input } from '../ui/Input'
import Autocomplete from '../ui/Autocomplete'
import { useAutocomplete } from '../../hooks/useAutocomplete'
import { formatComposerName } from '../../utils/textFormatting'
import { useLogbookStore } from '../../stores/logbookStore'

interface EditPieceModalProps {
  isOpen: boolean
  onClose: () => void
  piece: {
    title: string
    composer?: string
  }
  onSave: (
    oldPiece: { title: string; composer?: string },
    newPiece: { title: string; composer?: string }
  ) => void
}

export const EditPieceModal: React.FC<EditPieceModalProps> = ({
  isOpen,
  onClose,
  piece,
  onSave,
}) => {
  const { t } = useTranslation(['reports', 'common'])
  const { entries } = useLogbookStore()

  const [title, setTitle] = useState(piece.title)
  const [composer, setComposer] = useState(piece.composer || '')
  const [error, setError] = useState('')
  const [affectedCount, setAffectedCount] = useState(0)

  // Autocomplete for composer
  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 0, // Show suggestions immediately
  })

  // Calculate how many entries will be affected
  useEffect(() => {
    const count = entries.filter(entry =>
      entry.pieces.some(
        p =>
          p.title === piece.title &&
          (p.composer || '') === (piece.composer || '')
      )
    ).length
    setAffectedCount(count)
  }, [entries, piece])

  // Reset form when modal opens with new piece
  useEffect(() => {
    setTitle(piece.title)
    setComposer(piece.composer || '')
    setError('')
  }, [piece, isOpen])

  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      setError(t('reports:pieceEdit.titleRequired'))
      return
    }

    // Check for duplicates
    const isDuplicate = entries.some(entry =>
      entry.pieces.some(p => {
        // Skip if this is the same piece we're editing
        if (
          p.title === piece.title &&
          (p.composer || '') === (piece.composer || '')
        ) {
          return false
        }
        // Check if another piece has the same title and composer
        return (
          p.title === title.trim() && (p.composer || '') === composer.trim()
        )
      })
    )

    if (isDuplicate) {
      setError(t('reports:pieceEdit.duplicatePiece'))
      return
    }

    // Save changes
    onSave(piece, {
      title: title.trim(),
      composer: composer.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('reports:pieceEdit.title')}
      size="md"
    >
      <div className="space-y-4">
        {/* Warning about affected entries */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">
                {t('reports:pieceEdit.warningTitle')}
              </p>
              <p>
                {t('reports:pieceEdit.warningMessage', {
                  count: affectedCount,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('reports:pieceEdit.pieceTitle')}
          </label>
          <Input
            type="text"
            value={title}
            onChange={e => {
              setTitle(e.target.value)
              setError('')
            }}
            placeholder={t('reports:pieceEdit.pieceTitlePlaceholder')}
            className="w-full"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('reports:pieceEdit.composer')}
          </label>
          <Autocomplete
            value={composer}
            onChange={value => {
              setComposer(value)
              composerAutocomplete.setQuery(value)
              setError('')
            }}
            onBlur={() => {
              // Auto-capitalize composer name on blur
              if (composer && composer.trim()) {
                const formatted = formatComposerName(composer.trim())
                if (formatted !== composer) {
                  setComposer(formatted)
                }
              }
            }}
            onSelect={() => {
              // Selection is already handled by onChange in Autocomplete component
            }}
            options={composerAutocomplete.suggestions}
            placeholder={t('reports:pieceEdit.composerPlaceholder')}
            isLoading={composerAutocomplete.isLoading}
            className="w-full"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={
              !title.trim() ||
              (title === piece.title && composer === (piece.composer || ''))
            }
          >
            {t('common:save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
