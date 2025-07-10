import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '../../../api/logbook'
import Button from '../../ui/Button'
import { formatDuration } from '../../../utils/dateUtils'

interface EntryCardProps {
  entry: LogbookEntry
  onEdit?: (entry: LogbookEntry) => void
  onDelete?: (entry: LogbookEntry) => void
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const { t } = useTranslation()
  const date = new Date(entry.timestamp)

  // Extract date parts
  const month = date.toLocaleDateString('en', { month: 'short' })
  const day = date.getDate()
  // Removed unused time variable

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Date Badge */}
      <div className="flex-shrink-0 text-center">
        <div className="w-16 h-16 bg-stone-100 rounded-lg flex flex-col items-center justify-center">
          <div className="text-xs text-stone-600 uppercase">{month}</div>
          <div className="text-xl font-semibold text-stone-900">{day}</div>
        </div>
        <div className="text-xs text-stone-500 mt-1">
          {formatDuration(entry.duration)}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title and Composer */}
        <div className="mb-2">
          {entry.pieces && entry.pieces.length > 0 ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {entry.pieces[0].title}
              </h3>
              {entry.pieces[0].composer && (
                <p className="text-sm text-gray-600">
                  {entry.pieces[0].composer}
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
            <h3 className="text-lg font-medium text-gray-900">
              {t(`logbook:entry.typeOptions.${entry.type.toLowerCase()}`)}
            </h3>
          )}
        </div>

        {/* Tags/Labels */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sage-100 text-sage-800">
            {t(`logbook:entry.typeOptions.${entry.type.toLowerCase()}`)}
          </span>
          {entry.techniques &&
            entry.techniques.length > 0 &&
            entry.techniques.map((technique, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sand-100 text-sand-800"
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

        {/* Notes preview */}
        {entry.notes && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-1">
            {entry.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {onEdit && (
          <Button
            variant="icon"
            size="sm"
            onClick={() => onEdit(entry)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-4 h-4"
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
          </Button>
        )}
        {onDelete && (
          <Button
            variant="icon"
            size="sm"
            onClick={() => onDelete(entry)}
            className="text-gray-400 hover:text-red-600"
          >
            <svg
              className="w-4 h-4"
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
          </Button>
        )}
      </div>
    </div>
  )
}
