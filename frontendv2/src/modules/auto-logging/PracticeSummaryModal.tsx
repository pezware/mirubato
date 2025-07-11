import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Button, Textarea, Card } from '../../components/ui'
import { Clock, Music, Hash, FileText, Save, X } from 'lucide-react'
import type { PracticeMetadata } from './types'

interface PracticeSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (notes?: string) => void
  onDiscard: () => void
  duration: number // in milliseconds
  metadata: PracticeMetadata
  title?: string
}

export const PracticeSummaryModal: React.FC<PracticeSummaryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  duration,
  metadata,
  title = 'Practice Summary',
}) => {
  const { t } = useTranslation(['common', 'logbook'])
  const [notes, setNotes] = useState('')

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return t('common:duration.hms', {
        hours,
        minutes,
        seconds,
        defaultValue: '{{hours}}h {{minutes}}m {{seconds}}s',
      })
    } else if (minutes > 0) {
      return t('common:duration.ms', {
        minutes,
        seconds,
        defaultValue: '{{minutes}}m {{seconds}}s',
      })
    }
    return t('common:duration.s', {
      seconds,
      defaultValue: '{{seconds}}s',
    })
  }

  const handleSave = () => {
    onSave(notes)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {/* Duration */}
        <Card variant="ghost" className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-morandi-sage-600" />
            <div>
              <p className="text-sm text-morandi-stone-600">
                {t('common:practice.duration', 'Practice Duration')}
              </p>
              <p className="text-lg font-semibold text-morandi-stone-900">
                {formatDuration(duration)}
              </p>
            </div>
          </div>
        </Card>

        {/* Piece Info */}
        {(metadata.title || metadata.scoreTitle) && (
          <Card variant="ghost" className="p-4">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-morandi-sage-600" />
              <div className="flex-1">
                <p className="text-sm text-morandi-stone-600">
                  {t('logbook:entry.pieceTitle', 'Piece')}
                </p>
                <p className="text-base font-medium text-morandi-stone-900">
                  {metadata.scoreTitle || metadata.title}
                  {(metadata.scoreComposer || metadata.composer) && (
                    <span className="text-morandi-stone-600">
                      {' '}
                      by {metadata.scoreComposer || metadata.composer}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Metronome Info */}
        {metadata.averageTempo && (
          <Card variant="ghost" className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-morandi-sage-600" />
              <div>
                <p className="text-sm text-morandi-stone-600">
                  {t('common:metronome.averageTempo', 'Average Tempo')}
                </p>
                <p className="text-base font-medium text-morandi-stone-900">
                  {metadata.averageTempo} BPM
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Repetitions Info */}
        {metadata.totalReps && (
          <Card variant="ghost" className="p-4">
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-morandi-sage-600" />
              <div>
                <p className="text-sm text-morandi-stone-600">
                  {t('common:practice.repetitions', 'Repetitions')}
                </p>
                <p className="text-base font-medium text-morandi-stone-900">
                  {metadata.totalReps}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Notes */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-morandi-stone-700 mb-2">
            <FileText className="w-4 h-4" />
            {t('logbook:entry.notes', 'Notes (optional)')}
          </label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t(
              'logbook:entry.notesPlaceholder',
              'Add any notes about this practice session...'
            )}
            rows={3}
            className="w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-morandi-stone-200">
          <Button
            variant="ghost"
            onClick={onDiscard}
            leftIcon={<X size={16} />}
          >
            {t('common:discard', 'Discard')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            leftIcon={<Save size={16} />}
          >
            {t('common:saveToLogbook', 'Save to Logbook')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default PracticeSummaryModal
