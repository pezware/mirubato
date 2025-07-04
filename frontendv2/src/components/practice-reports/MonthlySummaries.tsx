import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { LogbookEntry } from '../../api/logbook'
import Button from '../ui/Button'
import { Card } from '../ui/Card'

interface MonthlySummariesProps {
  entries: LogbookEntry[]
  recentEntriesCount: number
  formatDuration: (minutes: number) => string
  onDeleteEntry: (id: string) => void
  onEditEntry: (entryId: string) => void
}

interface MonthlyData {
  monthKey: string
  displayName: string
  totalDuration: number
  sessionCount: number
  uniquePieces: number
  entries: LogbookEntry[]
}

export function MonthlySummaries({
  entries,
  recentEntriesCount,
  formatDuration,
  onDeleteEntry,
  onEditEntry,
}: MonthlySummariesProps) {
  const { t } = useTranslation(['reports', 'common'])
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  // Group entries by month, excluding the most recent entries already shown
  const monthlyData = entries
    .slice(recentEntriesCount)
    .reduce<Map<string, MonthlyData>>((acc, entry) => {
      const entryDate = new Date(entry.timestamp)
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]

      const displayName = `${monthNames[entryDate.getMonth()]} ${entryDate.getFullYear()}`

      if (!acc.has(monthKey)) {
        acc.set(monthKey, {
          monthKey,
          displayName,
          totalDuration: 0,
          sessionCount: 0,
          uniquePieces: 0,
          entries: [],
        })
      }

      const monthData = acc.get(monthKey)!
      monthData.totalDuration += entry.duration
      monthData.sessionCount += 1
      monthData.entries.push(entry)

      // Calculate unique pieces for this month
      const pieces = new Set<string>()
      monthData.entries.forEach(e => {
        e.pieces.forEach(p => {
          if (p.title) pieces.add(p.title.toLowerCase())
        })
      })
      monthData.uniquePieces = pieces.size

      return acc
    }, new Map())

  // Convert to sorted array (most recent first)
  const sortedMonths = Array.from(monthlyData.values()).sort((a, b) =>
    b.monthKey.localeCompare(a.monthKey)
  )

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths)
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey)
    } else {
      newExpanded.add(monthKey)
    }
    setExpandedMonths(newExpanded)
  }

  if (sortedMonths.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mt-8 mb-4">
        <Calendar className="w-5 h-5 text-morandi-stone-600" />
        <h3 className="text-lg font-medium text-morandi-stone-700">
          {t('reports:monthlyHistory')}
        </h3>
      </div>

      {sortedMonths.map(month => (
        <Card key={month.monthKey} variant="bordered">
          <div
            className="cursor-pointer"
            onClick={() => toggleMonth(month.monthKey)}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {expandedMonths.has(month.monthKey) ? (
                  <ChevronDown className="w-4 h-4 text-morandi-stone-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-morandi-stone-600" />
                )}
                <h4 className="font-medium text-morandi-stone-700">
                  {month.displayName}
                </h4>
              </div>
              <div className="flex items-center gap-6 text-sm text-morandi-stone-600">
                <span>{formatDuration(month.totalDuration)}</span>
                <span>
                  {month.sessionCount} {t('reports:sessions')}
                </span>
                <span>
                  {month.uniquePieces} {t('reports:pieces')}
                </span>
              </div>
            </div>
          </div>

          {expandedMonths.has(month.monthKey) && (
            <div className="border-t border-morandi-stone-200 p-4">
              <div className="space-y-2">
                {month.entries
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )
                  .map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-morandi-stone-50 rounded-lg hover:bg-morandi-stone-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-morandi-stone-700">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-morandi-stone-500">
                            {formatDuration(entry.duration)}
                          </span>
                          <span className="text-xs text-morandi-stone-500">
                            {entry.instrument === 'PIANO' ? '🎹' : '🎸'}
                          </span>
                        </div>
                        {entry.pieces.length > 0 && (
                          <div className="text-sm text-morandi-stone-600">
                            {entry.pieces.map((piece, index) => (
                              <span key={index}>
                                {piece.title}
                                {piece.composer && ` by ${piece.composer}`}
                                {index < entry.pieces.length - 1 && ', '}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="text-xs text-morandi-stone-500 mt-1">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            onEditEntry(entry.id)
                          }}
                        >
                          {t('common:edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            onDeleteEntry(entry.id)
                          }}
                        >
                          {t('common:delete')}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
