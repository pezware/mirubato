import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '../../../api/logbook'
import { EntryCard } from './EntryCard'
import { Card } from '../../ui/Card'

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
  const { t } = useTranslation()

  // Sort entries by timestamp (newest first) and limit
  const recentEntries = [...entries]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit)

  if (entries.length === 0) {
    return (
      <Card className={className}>
        <div className="p-8 text-center text-gray-500">
          <p>{t('logbook:empty')}</p>
        </div>
      </Card>
    )
  }

  // Track which dates have been shown
  const shownDates = new Set<string>()

  return (
    <div className={className}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t('reports:recentEntries')}
      </h2>
      <div className="space-y-3">
        {recentEntries.map((entry, index) => {
          const date = new Date(entry.timestamp)
          const entryDate = date.toDateString()
          const isFirstOfDay = !shownDates.has(entryDate)
          if (isFirstOfDay) {
            shownDates.add(entryDate)
          }

          // Format date for separator
          const formattedDate = date.toLocaleDateString('en', {
            month: 'short',
            day: '2-digit',
          })

          return (
            <div key={entry.id}>
              {/* Date Separator */}
              {isFirstOfDay && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-gray-600 whitespace-nowrap">
                    {formattedDate}
                  </span>
                  <div className="flex-1 h-px bg-gray-200"></div>
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
