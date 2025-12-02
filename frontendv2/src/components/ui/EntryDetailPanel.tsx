import React, { useState } from 'react'
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
import {
  MusicTitle,
  MusicComposer,
  DropdownMenu,
  type DropdownMenuItem,
} from '@/components/ui'
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
  const { t, i18n } = useTranslation([
    'logbook',
    'common',
    'repertoire',
    'reports',
  ])
  const [showMenu, setShowMenu] = useState(false)

  // Build menu items
  const menuItems: DropdownMenuItem[] = []
  if (entry && onEdit) {
    menuItems.push({
      label: t('common:edit'),
      onClick: () => onEdit(entry),
      icon: <Edit2 className="w-3.5 h-3.5" />,
    })
  }
  if (entry && onDelete) {
    menuItems.push({
      label: t('common:delete'),
      onClick: () => onDelete(entry),
      variant: 'danger',
      icon: <Trash2 className="w-3.5 h-3.5" />,
    })
  }

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

  const reflectionResponses = Array.isArray(entry.metadata?.reflectionResponses)
    ? entry.metadata.reflectionResponses.filter(
        (item): item is { prompt: string; response: string } =>
          Boolean(item) &&
          typeof item.prompt === 'string' &&
          item.prompt.trim().length > 0 &&
          typeof item.response === 'string' &&
          item.response.trim().length > 0
      )
    : []

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
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('prev')}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                  aria-label={t('common:previous')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate('next')}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                  aria-label={t('common:next')}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {/* Display piece title if available, otherwise entry details */}
            {entry?.pieces && entry.pieces.length > 0 ? (
              <div className="truncate">
                <h3 className="text-xl font-semibold text-gray-800 truncate">
                  {toTitleCase(entry.pieces[0].title)}
                </h3>
                {entry.pieces[0].composer && (
                  <p className="text-sm text-gray-600 truncate">
                    {toTitleCase(entry.pieces[0].composer)}
                  </p>
                )}
              </div>
            ) : (
              <h3 className="text-lg font-semibold text-gray-700">
                {t('logbook:entryDetails')}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Actions menu */}
            {menuItems.length > 0 && (
              <DropdownMenu
                items={menuItems}
                isOpen={showMenu}
                onToggle={() => setShowMenu(!showMenu)}
                onClose={() => setShowMenu(false)}
                ariaLabel={t('common:moreOptions')}
              />
            )}
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
        </div>
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

        {reflectionResponses.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {t('reports:planningCheckIn.reflection', 'Reflection')}
            </h4>
            <ul className="space-y-3">
              {reflectionResponses.map(({ prompt, response }, index) => (
                <li key={`${prompt}-${index}`} className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">{prompt}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {response}
                  </p>
                </li>
              ))}
            </ul>
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
    </div>
  )
}

export default EntryDetailPanel
