import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '../../../api/logbook'
import { EntryCard } from './EntryCard'
import { formatDuration } from '../../../utils/dateUtils'

interface RecentEntriesProps {
  entries: LogbookEntry[]
  limit?: number
  onEdit?: (entry: LogbookEntry) => void
  onDelete?: (entry: LogbookEntry) => void
  className?: string
}

export function RecentEntries({
  entries,
  limit = 10,
  onEdit,
  onDelete,
  className = '',
}: RecentEntriesProps) {
  const { t, i18n } = useTranslation()

  // Sort entries by timestamp (newest first) and limit
  const recentEntries = [...entries]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit)

  if (entries.length === 0) {
    return (
      <div className={className}>
        <div className="p-8 text-center text-gray-500">
          <p>{t('logbook:empty')}</p>
        </div>
      </div>
    )
  }

  // Track which dates have been shown and calculate daily totals
  const shownDates = new Set<string>()
  const dailyTotals = new Map<string, number>()

  // Calculate daily totals first
  recentEntries.forEach(entry => {
    const date = new Date(entry.timestamp)
    const entryDate = date.toDateString()
    const currentTotal = dailyTotals.get(entryDate) || 0
    dailyTotals.set(entryDate, currentTotal + entry.duration)
  })

  return (
    <div className={className}>
      <h3 className="text-base sm:text-lg font-semibold text-morandi-stone-700 mb-3 sm:mb-4">
        {t('reports:recentEntries')}
      </h3>
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200">
        {recentEntries.map(entry => {
          const date = new Date(entry.timestamp)
          const entryDate = date.toDateString()
          const isFirstOfDay = !shownDates.has(entryDate)
          if (isFirstOfDay) {
            shownDates.add(entryDate)
          }

          // Format date for separator
          const formattedDate = date.toLocaleDateString(i18n.language, {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })

          // Get the daily total for this date
          const dayTotal = dailyTotals.get(entryDate) || 0

          return (
            <div key={entry.id}>
              {/* Date Separator */}
              {isFirstOfDay && (
                <div className="px-4 py-2 bg-gray-50 border-b border-morandi-stone-200">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-600 whitespace-nowrap">
                      {formattedDate}
                    </span>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {formatDuration(dayTotal)}
                    </span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>
                </div>
              )}

              {/* Entry Card */}
              <EntryCard
                entry={entry}
                onEdit={onEdit}
                onDelete={onDelete}
                showDateHeader={false}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
