import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { AnalyticsData } from '../../hooks/usePracticeAnalytics'
import { LogbookEntry } from '../../types/practice'

interface SummaryStatsProps {
  analytics: AnalyticsData
  timePeriod: 'all' | 'month' | 'week'
  entries: LogbookEntry[]
  filteredAndSortedEntries: LogbookEntry[]
  formatDuration: (minutes: number) => string
}

export function SummaryStats({
  analytics,
  timePeriod,
  entries,
  filteredAndSortedEntries,
  formatDuration,
}: SummaryStatsProps) {
  const { t } = useTranslation(['reports'])

  // Calculate time period totals
  const getTimePeriodTotal = () => {
    if (timePeriod === 'week') {
      return analytics.weekTotal
    } else if (timePeriod === 'month') {
      return Array.from(analytics.practiceByDay.entries())
        .filter(([date]) => {
          const d = new Date(date)
          const now = new Date()
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          )
        })
        .reduce((sum, [, mins]) => sum + mins, 0)
    } else {
      return Array.from(analytics.practiceByDay.values()).reduce(
        (sum, mins) => sum + mins,
        0
      )
    }
  }

  const getSessionCount = () => {
    if (timePeriod === 'week') {
      return analytics.weekCount
    } else if (timePeriod === 'month') {
      return filteredAndSortedEntries.filter(e => {
        const d = new Date(e.timestamp)
        const now = new Date()
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        )
      }).length
    } else {
      return entries.length
    }
  }

  return (
    <div className="space-y-3">
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-morandi-stone-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {formatDuration(getTimePeriodTotal())}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:totalPractice')}
          </p>
        </div>

        <div className="bg-morandi-stone-100 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {getSessionCount()}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:sessions')}
          </p>
        </div>

        <div className="bg-morandi-peach-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {analytics.uniquePieces}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:pieces')} {t('reports:practiced')}
          </p>
        </div>

        <div className="bg-morandi-rose-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {analytics.uniqueComposers}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:composers')}
          </p>
        </div>
      </div>
    </div>
  )
}
