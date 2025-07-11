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
        {recentEntries.map(entry => {
          const entryDate = new Date(entry.timestamp).toDateString()
          const isFirstOfDay = !shownDates.has(entryDate)
          if (isFirstOfDay) {
            shownDates.add(entryDate)
          }

          return (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
              showDateHeader={isFirstOfDay}
            />
          )
        })}
      </div>
    </div>
  )
}
