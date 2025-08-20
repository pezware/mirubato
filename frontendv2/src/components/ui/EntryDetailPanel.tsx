import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Music,
} from 'lucide-react'
import {
  IconMoodAngry,
  IconMoodNeutral,
  IconMoodSmile,
  IconMoodHappy,
} from '@tabler/icons-react'
import { LogbookEntry } from '@/api/logbook'
import { MusicTitle, MusicComposer } from '@/components/ui'
import Button from '@/components/ui/Button'
import { formatDuration, formatDateSeparator } from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import { cn } from '@/utils/cn'

interface EntryDetailPanelProps {
  entry: LogbookEntry | null
  onClose?: () => void
  onEdit?: (entry: LogbookEntry) => void
  onDelete?: (entry: LogbookEntry) => void
  onNavigate?: (direction: 'prev' | 'next') => void
  className?: string
}

export const EntryDetailPanel: React.FC<EntryDetailPanelProps> = ({
  entry,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
  className,
}) => {
  const { t, i18n } = useTranslation(['logbook', 'common', 'repertoire'])

  // Get mood icon
  const getMoodIcon = (mood?: string) => {
    const iconProps = {
      size: 24,
      className: 'text-morandi-stone-600',
      stroke: 1.5,
    }

    switch (mood) {
      case 'frustrated':
        return <IconMoodAngry {...iconProps} />
      case 'neutral':
        return <IconMoodNeutral {...iconProps} />
      case 'satisfied':
        return <IconMoodSmile {...iconProps} />
      case 'excited':
        return <IconMoodHappy {...iconProps} />
      default:
        return null
    }
  }

  // Empty state
  if (!entry) {
    return (
      <div
        className={cn(
          'h-full bg-gray-50 flex items-center justify-center p-8',
          className
        )}
      >
        <div className="text-center">
          <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {t('logbook:selectEntryToView')}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {t('logbook:clickEntryInList')}
          </p>
        </div>
      </div>
    )
  }

  const entryDate = new Date(entry.timestamp)

  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  return (
    <div
      className={cn(
        'bg-white flex flex-col overflow-hidden rounded-lg shadow-sm border border-gray-200',
        !isMobile && 'h-[calc(100vh-2rem)] sticky top-4',
        isMobile && 'h-auto',
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('prev')}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={t('common:previous')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => onNavigate('next')}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={t('common:next')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <h3 className="font-semibold text-gray-700">
            {t('logbook:entryDetails')}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={t('common:close')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content - scrollable with tighter spacing */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {/* Piece Information */}
        {entry.pieces && entry.pieces.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:pieces')}
            </h4>
            <div className="space-y-2">
              {entry.pieces.map((piece, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <MusicTitle className="text-lg">
                    {toTitleCase(piece.title)}
                  </MusicTitle>
                  {piece.composer && (
                    <MusicComposer className="text-sm mt-1">
                      {toTitleCase(piece.composer)}
                    </MusicComposer>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Date and Time */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            {t('logbook:dateAndTime')}
          </h4>
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{formatDateSeparator(entryDate, i18n.language)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 mt-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span>
              {entryDate.toLocaleTimeString(i18n.language, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Duration and Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:duration')}
            </h4>
            <p className="text-lg font-semibold text-gray-700">
              {formatDuration(entry.duration)}
            </p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:type')}
            </h4>
            <span className="inline-flex px-3 py-1 bg-morandi-sage-100 text-morandi-stone-700 text-sm rounded-full">
              {t(`common:music.${entry.type.toLowerCase()}`)}
            </span>
          </div>
        </div>

        {/* Mood */}
        {entry.mood && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:entry.mood')}
            </h4>
            <div className="flex items-center gap-2">
              {getMoodIcon(entry.mood)}
              <span className="text-gray-700 capitalize">
                {t(`logbook:mood.${entry.mood}`)}
              </span>
            </div>
          </div>
        )}

        {/* Instrument */}
        {entry.instrument && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:instrument')}
            </h4>
            <span className="inline-flex px-3 py-1 bg-morandi-sand-100 text-morandi-stone-700 text-sm rounded-full">
              {entry.instrument}
            </span>
          </div>
        )}

        {/* Techniques */}
        {entry.techniques && entry.techniques.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:techniques')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {entry.techniques.map((technique, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-morandi-blush-100 text-morandi-stone-700 rounded-full text-sm"
                >
                  {technique}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:notes')}
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {entry.notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('logbook:tags')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Auto-tracked indicator */}
        {entry.autoTracked && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">{t('logbook:autoTracked')}</p>
          </div>
        )}
      </div>

      {/* Actions - directly at bottom without extra spacing */}
      {(onEdit || onDelete) && (
        <div className="flex-shrink-0 p-3 pt-2 border-t border-gray-200">
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(entry)}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {t('common:edit')}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(entry)}
                className="flex-1 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('common:delete')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EntryDetailPanel
