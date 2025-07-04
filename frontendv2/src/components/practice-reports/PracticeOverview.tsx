import { useTranslation } from 'react-i18next'
import { AnalyticsData } from '../../hooks/usePracticeAnalytics'
import { LogbookEntry } from '../../types/practice'
import { Card } from '../ui/Card'

interface PracticeOverviewProps {
  analytics: AnalyticsData
  timePeriod: 'all' | 'month' | 'week'
  entries: LogbookEntry[]
  filteredAndSortedEntries: LogbookEntry[]
  formatDuration: (minutes: number) => string
}

export function PracticeOverview({
  analytics,
  timePeriod,
  entries,
  filteredAndSortedEntries,
  formatDuration,
}: PracticeOverviewProps) {
  const { t } = useTranslation(['reports'])

  return (
    <div className="space-y-3">
      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-gradient-to-r from-morandi-sage-50 to-morandi-sage-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-morandi-stone-600 mb-1">
                {t('reports:currentStreak')}
              </p>
              <p className="text-3xl font-bold text-morandi-stone-900">
                {analytics.currentStreak} {t('reports:days')}
              </p>
            </div>
            <span className="text-4xl">🔥</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-morandi-peach-50 to-morandi-rose-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-morandi-stone-600 mb-1">
                {t('reports:todaysPractice')}
              </p>
              <p className="text-3xl font-bold text-morandi-stone-900">
                {formatDuration(analytics.todayTotal)}
              </p>
              <p className="text-xs text-morandi-stone-500">
                {analytics.todayCount} {t('reports:sessions')}
              </p>
            </div>
            <span className="text-4xl">📅</span>
          </div>
        </Card>
      </div>

      {/* Week Overview */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-morandi-stone-700 mb-3">
          {t('reports:weekOverview')}
        </h3>
        <WeekChart analytics={analytics} formatDuration={formatDuration} />
      </Card>
    </div>
  )
}

function WeekChart({
  analytics,
  formatDuration,
}: {
  analytics: AnalyticsData
  formatDuration: (minutes: number) => string
}) {
  const { t } = useTranslation(['reports'])

  // Get last 7 days
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    days.push(date)
  }

  const maxMinutes = Math.max(
    ...days.map(d => analytics.practiceByDay.get(d.toDateString()) || 0)
  )

  return (
    <div className="space-y-2">
      {days.map((date, i) => {
        const dateStr = date.toDateString()
        const minutes = analytics.practiceByDay.get(dateStr) || 0
        const percentage = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0

        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 text-xs text-morandi-stone-600">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="flex-1 relative">
              <div className="h-6 bg-morandi-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-morandi-sage-400 to-morandi-sage-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {minutes > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-morandi-stone-700">
                  {formatDuration(minutes)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
