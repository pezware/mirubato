import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '../../../api/logbook'
import { formatDuration } from '../../../utils/dateUtils'
import { toTitleCase } from '../../../utils/textFormatting'
import { Clock, Eye, ChevronDown } from 'lucide-react'
import {
  IconMoodAngry,
  IconMoodNeutral,
  IconMoodSmile,
  IconMoodHappy,
} from '@tabler/icons-react'

interface EntryCardProps {
  entry: LogbookEntry
  onEdit?: (entry: LogbookEntry) => void
  onDelete?: (entry: LogbookEntry) => void
  showDateHeader?: boolean
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const { t, i18n } = useTranslation(['common', 'ui'])
  const [isExpanded, setIsExpanded] = useState(false)
  const date = new Date(entry.timestamp)

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
      data-testid="logbook-entry"
      data-entry-id={entry.id}
    >
      {/* Title Section - Full Width */}
      <div className="mb-3">
        {entry.pieces && entry.pieces.length > 0 ? (
          <>
            <h3 className="font-serif text-lg sm:text-xl font-medium text-gray-900 leading-tight">
              {toTitleCase(entry.pieces[0].title)}
            </h3>
            {entry.pieces[0].composer && (
              <p className="font-serif text-base text-gray-700 mt-0.5">
                {toTitleCase(entry.pieces[0].composer)}
              </p>
            )}
            {entry.pieces.length > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                +{entry.pieces.length - 1} more{' '}
                {entry.pieces.length === 2 ? 'piece' : 'pieces'}
              </p>
            )}
          </>
        ) : (
          <h3 className="font-serif text-lg sm:text-xl font-medium text-gray-900">
            {t(`logbook:entry.typeOptions.${entry.type.toLowerCase()}`)}
          </h3>
        )}
      </div>

      {/* Metadata Row - Time, Duration, Type */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {date.toLocaleTimeString(i18n.language, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span className="text-gray-400">•</span>
        <span className="font-medium">{formatDuration(entry.duration)}</span>
        <span className="text-gray-400">•</span>
        <span className="capitalize">
          {t(`logbook:entry.typeOptions.${entry.type.toLowerCase()}`)}
        </span>
      </div>

      {/* Tags/Techniques */}
      {entry.techniques && entry.techniques.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.techniques.map((technique, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-morandi-sand-100 text-morandi-sand-500"
            >
              {technique}
            </span>
          ))}
          {entry.autoTracked && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              Auto-tracked
            </span>
          )}
        </div>
      )}

      {/* Actions Row - Bottom with border */}
      <div className="flex justify-between items-center pt-3 mt-auto border-t border-gray-100">
        <div className="flex gap-2">
          {/* View Details Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            aria-label={t('ui:components.entryCard.viewDetails')}
          >
            <Eye className="w-5 h-5" />
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(entry)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
              aria-label={t('ui:components.entryCard.editEntry')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(entry)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              aria-label={t('ui:components.entryCard.deleteEntry')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
        {/* Expand/Collapse Indicator */}
        <div
          className={`transition-transform duration-200 text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}
        >
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Expandable Details Section */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="pt-3 mt-3 border-t border-gray-100 space-y-3">
          {/* Full Notes */}
          {entry.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {t('logbook:entry.notes')}
              </h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {entry.notes}
              </p>
            </div>
          )}

          {/* Mood */}
          {entry.mood && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {t('logbook:entry.mood')}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-morandi-stone-600">
                  {entry.mood === 'frustrated' && (
                    <IconMoodAngry size={24} stroke={1.5} />
                  )}
                  {entry.mood === 'neutral' && (
                    <IconMoodNeutral size={24} stroke={1.5} />
                  )}
                  {entry.mood === 'satisfied' && (
                    <IconMoodSmile size={24} stroke={1.5} />
                  )}
                  {entry.mood === 'excited' && (
                    <IconMoodHappy size={24} stroke={1.5} />
                  )}
                </span>
                <span className="text-sm text-gray-600 capitalize">
                  {t(`logbook:mood.${entry.mood}`)}
                </span>
              </div>
            </div>
          )}

          {/* Instrument */}
          {entry.instrument && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {t('logbook:entry.instrument')}
              </h4>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-morandi-sage-100 text-morandi-sage-600">
                  {entry.instrument}
                </span>
              </div>
            </div>
          )}

          {/* Full Timestamp */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              {t('logbook:entry.practiceDate')}
            </h4>
            <p className="text-sm text-gray-600">
              {date.toLocaleDateString(i18n.language, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' at '}
              {date.toLocaleTimeString(i18n.language, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Additional Pieces (if more than one) */}
          {entry.pieces && entry.pieces.length > 1 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {t('logbook:entry.pieces')}
              </h4>
              <ul className="space-y-1">
                {entry.pieces.map((piece, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    <span className="font-medium">{piece.title}</span>
                    {piece.composer && (
                      <span className="text-gray-500"> - {piece.composer}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
