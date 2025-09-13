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

  return (
    <div className="space-y-2" data-testid="summary-stats">
      {/* Summary Stats Grid - 3 stats for better single-line layout */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-morandi-stone-50 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900 text-center"
            data-testid="today-practice-time"
          >
            {formatDuration(analytics.todayTotal)}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
            <span className="block sm:hidden">{t('reports:stats.today')}</span>
            <span className="hidden sm:block">
              {t('reports:stats.todaysPractice')}
            </span>
          </p>
        </div>

        <div className="bg-morandi-stone-100 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900 text-center"
            data-testid="week-practice-time"
          >
            {formatDuration(analytics.weekTotal)}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
            <span className="block sm:hidden">{t('reports:stats.week')}</span>
            <span className="hidden sm:block">
              {t('reports:stats.thisWeek')}
            </span>
          </p>
        </div>

        <div className="bg-morandi-rose-50 rounded-lg p-2 sm:p-3">
          <p
            className="text-lg font-bold text-morandi-stone-900 text-center"
            data-testid="total-practice-time"
          >
            {formatDuration(getTimePeriodTotal())}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
            <span className="block sm:hidden">{t('reports:stats.total')}</span>
            <span className="hidden sm:block">
              {t('reports:totalPractice')}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
