import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp,
  Calendar,
  Target,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import type { PlanningAnalyticsData } from '@/hooks/usePlanningAnalytics'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Typography,
  Tag,
} from '@/components/ui'
import { cn } from '@/utils/cn'
import { format, parseISO } from 'date-fns'

interface PlanningAnalyticsPanelProps {
  analytics: PlanningAnalyticsData
  className?: string
}

const PlanningAnalyticsPanel = ({
  analytics,
  className,
}: PlanningAnalyticsPanelProps) => {
  const { t } = useTranslation('reports')
  const panelId = useId()

  const { adherence, streak, missed, forecast } = analytics

  // Determine adherence status
  const getAdherenceStatus = (percentage: number) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 50) return 'warning'
    return 'danger'
  }

  const adherenceStatus = getAdherenceStatus(adherence.overall)

  // Format forecast peak day
  const formattedPeakDay = forecast.peakDay
    ? format(parseISO(forecast.peakDay.date), 'EEEE, MMM d')
    : null

  return (
    <div
      className={cn('space-y-4', className)}
      aria-labelledby={`${panelId}-title`}
    >
      {/* Panel Title */}
      <div id={`${panelId}-title`}>
        <Typography variant="h4" className="text-morandi-stone-900">
          {t('planningView.analytics.title', 'Practice Analytics')}
        </Typography>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Adherence Card */}
        <Card className="border-morandi-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target size={16} className="text-morandi-sage-600" />
              {t('planningView.analytics.adherence', 'Adherence')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <Typography variant="h2" className="text-morandi-stone-900">
                  {adherence.overall}%
                </Typography>
                <Tag variant={adherenceStatus} size="sm" className="text-xs">
                  {adherenceStatus === 'success' &&
                    t('planningView.analytics.excellent', 'Excellent')}
                  {adherenceStatus === 'warning' &&
                    t('planningView.analytics.good', 'Good')}
                  {adherenceStatus === 'danger' &&
                    t('planningView.analytics.needsWork', 'Needs Work')}
                </Tag>
              </div>
              <div className="text-xs text-morandi-stone-600 space-y-1">
                <p>
                  {t('planningView.analytics.thisWeek', 'This week')}:{' '}
                  <span className="font-medium">{adherence.thisWeek}%</span>
                </p>
                <p>
                  {t('planningView.analytics.thisMonth', 'This month')}:{' '}
                  <span className="font-medium">{adherence.thisMonth}%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="border-morandi-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-morandi-sage-600" />
              {t('planningView.analytics.streak', 'Streak')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Typography variant="h2" className="text-morandi-stone-900">
                {streak.currentStreak}
                <span className="text-base font-normal text-morandi-stone-600 ml-2">
                  {t('planningView.analytics.days', {
                    count: streak.currentStreak,
                  })}
                </span>
              </Typography>
              <div className="text-xs text-morandi-stone-600 space-y-1">
                <p>
                  {t('planningView.analytics.longestStreak', 'Longest')}:{' '}
                  <span className="font-medium">
                    {streak.longestStreak}{' '}
                    {t('planningView.analytics.days', {
                      count: streak.longestStreak,
                    })}
                  </span>
                </p>
                {streak.lastCompletedDate && (
                  <p className="text-morandi-stone-500">
                    {t(
                      'planningView.analytics.lastCompleted',
                      'Last completed'
                    )}
                    : {format(parseISO(streak.lastCompletedDate), 'MMM d')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Missed Occurrences Card */}
        <Card
          className={cn(
            'border-morandi-stone-200',
            missed.overdueCount > 0 && 'border-morandi-saffron-300'
          )}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle
                size={16}
                className={cn(
                  missed.overdueCount > 0
                    ? 'text-morandi-saffron-600'
                    : 'text-morandi-stone-400'
                )}
              />
              {t('planningView.analytics.missed', 'Missed')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Typography
                variant="h2"
                className={cn(
                  missed.overdueCount > 0
                    ? 'text-morandi-saffron-700'
                    : 'text-morandi-stone-900'
                )}
              >
                {missed.overdueCount}
              </Typography>
              <div className="text-xs text-morandi-stone-600 space-y-1">
                <p>
                  {t('planningView.analytics.missedThisWeek', 'This week')}:{' '}
                  <span className="font-medium">{missed.missedThisWeek}</span>
                </p>
                <p>
                  {t('planningView.analytics.missedThisMonth', 'This month')}:{' '}
                  <span className="font-medium">{missed.missedThisMonth}</span>
                </p>
              </div>
              {missed.overdueCount > 0 && (
                <p className="text-xs text-morandi-saffron-700 font-medium mt-2">
                  {t('planningView.analytics.catchUp', 'Time to catch up!')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Forecast Card */}
        <Card className="border-morandi-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-morandi-sage-600" />
              {t('planningView.analytics.forecast', '7-Day Forecast')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Typography variant="h2" className="text-morandi-stone-900">
                {forecast.totalOccurrences}
                <span className="text-base font-normal text-morandi-stone-600 ml-2">
                  {t('planningView.analytics.sessions', {
                    count: forecast.totalOccurrences,
                  })}
                </span>
              </Typography>
              <div className="text-xs text-morandi-stone-600 space-y-1">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>
                    {forecast.totalMinutes}{' '}
                    {t('planningView.analytics.minutes', 'min')}
                  </span>
                </div>
                {formattedPeakDay && (
                  <p className="text-morandi-stone-700 font-medium">
                    {t('planningView.analytics.peakDay', 'Peak')}:{' '}
                    {formattedPeakDay}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Details */}
      {forecast.totalOccurrences > 0 && (
        <Card className="border-morandi-stone-200">
          <CardHeader>
            <CardTitle className="text-sm">
              {t(
                'planningView.analytics.upcomingSchedule',
                'Upcoming Schedule'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {forecast.days.map(day => {
                if (day.count === 0) return null

                const dayDate = parseISO(day.date)
                const isToday = format(new Date(), 'yyyy-MM-dd') === day.date

                return (
                  <div
                    key={day.date}
                    className={cn(
                      'flex items-center justify-between py-2 px-3 rounded-lg',
                      isToday
                        ? 'bg-morandi-sage-50 border border-morandi-sage-200'
                        : 'bg-morandi-stone-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <p
                          className={cn(
                            'font-medium',
                            isToday
                              ? 'text-morandi-sage-900'
                              : 'text-morandi-stone-900'
                          )}
                        >
                          {format(dayDate, 'EEEE')}
                        </p>
                        <p className="text-xs text-morandi-stone-600">
                          {format(dayDate, 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-morandi-stone-700">
                        <span className="font-medium">{day.count}</span>
                        <span className="text-xs text-morandi-stone-600">
                          {t('planningView.analytics.sessions', {
                            count: day.count,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-morandi-stone-600">
                        <Clock size={14} />
                        <span className="text-xs">{day.totalMinutes} min</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {forecast.totalOccurrences === 0 &&
        missed.overdueCount === 0 &&
        streak.currentStreak === 0 && (
          <Card className="border-morandi-stone-200">
            <CardContent className="py-8">
              <div className="text-center space-y-2">
                <Typography variant="body" className="text-morandi-stone-600">
                  {t(
                    'planningView.analytics.noData',
                    'No practice sessions scheduled yet'
                  )}
                </Typography>
                <Typography
                  variant="body-sm"
                  className="text-morandi-stone-500"
                >
                  {t(
                    'planningView.analytics.createPlan',
                    'Create a practice plan to get started'
                  )}
                </Typography>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}

export default PlanningAnalyticsPanel
