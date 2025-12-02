import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp,
  Calendar,
  Target,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react'
import type { PlanningAnalyticsData } from '@/hooks/usePlanningAnalytics'
import { Card, Typography, Tag, cn } from '@/components/ui'
import { format, parseISO } from 'date-fns'

interface PlanningAnalyticsPanelProps {
  analytics: PlanningAnalyticsData
  className?: string
  defaultExpanded?: boolean
}

const PlanningAnalyticsPanel = ({
  analytics,
  className,
  defaultExpanded = false,
}: PlanningAnalyticsPanelProps) => {
  const { t } = useTranslation('reports')
  const panelId = useId()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const { adherence, streak, missed, forecast } = analytics

  // Determine adherence status
  const getAdherenceStatus = (percentage: number) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 50) return 'warning'
    return 'danger'
  }

  const adherenceStatus = getAdherenceStatus(adherence.overall)

  // Check if there's meaningful data to show
  const hasData =
    forecast.totalOccurrences > 0 ||
    missed.overdueCount > 0 ||
    streak.currentStreak > 0 ||
    adherence.overall > 0

  if (!hasData) {
    return null // Don't render if no data
  }

  return (
    <div className={cn('', className)} aria-labelledby={`${panelId}-title`}>
      {/* Collapsible Header */}
      <Card className="border-morandi-stone-200 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
          aria-expanded={isExpanded}
          aria-controls={`${panelId}-content`}
        >
          <div className="flex items-center justify-between p-4 hover:bg-morandi-stone-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-morandi-sage-100">
                <BarChart3 className="h-4 w-4 text-morandi-sage-600" />
              </div>
              <div>
                <Typography
                  variant="h5"
                  className="text-morandi-stone-900"
                  id={`${panelId}-title`}
                >
                  {t('planningView.analytics.title', 'Practice Analytics')}
                </Typography>
              </div>
            </div>

            {/* Compact Summary (always visible) */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Target size={14} className="text-morandi-sage-600" />
                  <span className="text-morandi-stone-600">
                    <span className="font-semibold text-morandi-stone-900">
                      {adherence.overall}%
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-morandi-sage-600" />
                  <span className="text-morandi-stone-600">
                    <span className="font-semibold text-morandi-stone-900">
                      {streak.currentStreak}
                    </span>{' '}
                    {t('planningView.analytics.days', {
                      count: streak.currentStreak,
                    })}
                  </span>
                </div>
                {missed.overdueCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle
                      size={14}
                      className="text-morandi-peach-500"
                    />
                    <span className="text-morandi-peach-500 font-semibold">
                      {missed.overdueCount}{' '}
                      {t('planningView.analytics.missed', 'missed')}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-morandi-stone-100 transition-colors">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-morandi-stone-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-morandi-stone-500" />
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Expanded Content */}
        <div
          id={`${panelId}-content`}
          className={cn(
            'transition-all duration-300 ease-in-out overflow-hidden',
            isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="border-t border-morandi-stone-100 p-4 space-y-4">
            {/* Compact Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Adherence */}
              <div className="rounded-xl bg-morandi-stone-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-morandi-sage-600" />
                  <Typography
                    variant="caption"
                    className="text-morandi-stone-600 uppercase tracking-wide text-xs"
                  >
                    {t('planningView.analytics.adherence', 'Adherence')}
                  </Typography>
                </div>
                <div className="flex items-baseline gap-2">
                  <Typography variant="h3" className="text-morandi-stone-900">
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
                <div className="text-xs text-morandi-stone-500 mt-1">
                  {t('planningView.analytics.thisWeek', 'This week')}:{' '}
                  {adherence.thisWeek}%
                </div>
              </div>

              {/* Streak */}
              <div className="rounded-xl bg-morandi-stone-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-morandi-sage-600" />
                  <Typography
                    variant="caption"
                    className="text-morandi-stone-600 uppercase tracking-wide text-xs"
                  >
                    {t('planningView.analytics.streak', 'Streak')}
                  </Typography>
                </div>
                <Typography variant="h3" className="text-morandi-stone-900">
                  {streak.currentStreak}
                  <span className="text-sm font-normal text-morandi-stone-600 ml-1">
                    {t('planningView.analytics.days', {
                      count: streak.currentStreak,
                    })}
                  </span>
                </Typography>
                <div className="text-xs text-morandi-stone-500 mt-1">
                  {t('planningView.analytics.longestStreak', 'Best')}:{' '}
                  {streak.longestStreak}{' '}
                  {t('planningView.analytics.days', {
                    count: streak.longestStreak,
                  })}
                </div>
              </div>

              {/* Missed */}
              <div
                className={cn(
                  'rounded-xl p-3',
                  missed.overdueCount > 0
                    ? 'bg-morandi-peach-50'
                    : 'bg-morandi-stone-50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle
                    size={14}
                    className={
                      missed.overdueCount > 0
                        ? 'text-morandi-peach-500'
                        : 'text-morandi-stone-400'
                    }
                  />
                  <Typography
                    variant="caption"
                    className="text-morandi-stone-600 uppercase tracking-wide text-xs"
                  >
                    {t('planningView.analytics.missed', 'Missed')}
                  </Typography>
                </div>
                <Typography
                  variant="h3"
                  className={
                    missed.overdueCount > 0
                      ? 'text-morandi-peach-500'
                      : 'text-morandi-stone-900'
                  }
                >
                  {missed.overdueCount}
                </Typography>
                <div className="text-xs text-morandi-stone-500 mt-1">
                  {t('planningView.analytics.thisWeek', 'This week')}:{' '}
                  {missed.missedThisWeek}
                </div>
              </div>

              {/* Forecast */}
              <div className="rounded-xl bg-morandi-stone-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-morandi-sage-600" />
                  <Typography
                    variant="caption"
                    className="text-morandi-stone-600 uppercase tracking-wide text-xs"
                  >
                    {t('planningView.analytics.forecast', '7-Day')}
                  </Typography>
                </div>
                <Typography variant="h3" className="text-morandi-stone-900">
                  {forecast.totalOccurrences}
                  <span className="text-sm font-normal text-morandi-stone-600 ml-1">
                    {t('planningView.analytics.sessions', {
                      count: forecast.totalOccurrences,
                    })}
                  </span>
                </Typography>
                <div className="text-xs text-morandi-stone-500 mt-1 flex items-center gap-1">
                  <Clock size={10} />
                  {forecast.totalMinutes}{' '}
                  {t('planningView.analytics.minutes', 'min')}
                </div>
              </div>
            </div>

            {/* Upcoming Schedule (Compact Timeline) */}
            {forecast.totalOccurrences > 0 && (
              <div className="pt-2">
                <Typography
                  variant="caption"
                  className="text-morandi-stone-600 uppercase tracking-wide text-xs mb-3 block"
                >
                  {t(
                    'planningView.analytics.upcomingSchedule',
                    'Upcoming Schedule'
                  )}
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {forecast.days.map(day => {
                    if (day.count === 0) return null

                    const dayDate = parseISO(day.date)
                    const isToday =
                      format(new Date(), 'yyyy-MM-dd') === day.date

                    return (
                      <div
                        key={day.date}
                        className={cn(
                          'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                          isToday
                            ? 'bg-morandi-sage-100 border border-morandi-sage-200'
                            : 'bg-morandi-stone-100'
                        )}
                      >
                        <div
                          className={cn(
                            'font-medium',
                            isToday
                              ? 'text-morandi-sage-900'
                              : 'text-morandi-stone-900'
                          )}
                        >
                          {format(dayDate, 'EEE')}
                        </div>
                        <div className="text-morandi-stone-500 text-xs">
                          {day.count} ×
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PlanningAnalyticsPanel
