import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '../../api/logbook'
import { EnhancedAnalyticsData } from '../../types/reporting'

interface SummaryStatsProps {
  filteredAndSortedEntries: LogbookEntry[]
  formatDuration: (minutes: number) => string
  analytics: EnhancedAnalyticsData
}

export function SummaryStats({
  filteredAndSortedEntries,
  formatDuration,
  analytics,
}: SummaryStatsProps) {
  const { t } = useTranslation(['reports'])

  // Calculate time period totals
  const getTimePeriodTotal = () => {
    // Use filtered entries directly as they already contain the correct date range
    return filteredAndSortedEntries.reduce(
      (sum, entry) => sum + entry.duration,
      0
    )
  }

  const getSessionCount = () => {
    // Use filtered entries count directly
    return filteredAndSortedEntries.length
  }

  return (
    <div className="space-y-2" data-testid="summary-stats">
      {/* Summary Stats Grid - Now 5 stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="bg-morandi-stone-50 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900"
            data-testid="today-practice-time"
          >
            {formatDuration(analytics.todayTotal)}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600">
            {t('reports:stats.todaysPractice')}
          </p>
        </div>

        <div className="bg-morandi-stone-100 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900"
            data-testid="week-practice-time"
          >
            {formatDuration(analytics.weekTotal)}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600">
            {t('reports:stats.thisWeek')}
          </p>
        </div>

        <div className="bg-morandi-peach-50 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900"
            data-testid="current-streak"
          >
            {analytics.currentStreak}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600">
            {t('reports:currentStreak')}
          </p>
        </div>

        <div className="bg-morandi-rose-50 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900"
            data-testid="total-practice-time"
          >
            {formatDuration(getTimePeriodTotal())}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600">
            {t('reports:totalPractice')}
          </p>
        </div>

        <div className="bg-morandi-stone-50 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900"
            data-testid="session-count"
          >
            {getSessionCount()}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600">
            {t('reports:sessions')}
          </p>
        </div>
      </div>
    </div>
  )
}
