import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

interface PlanProgressRailProps {
  completedCount: number
  dueCount: number
  upcomingCount: number
  className?: string
}

const clampPositive = (value: number) =>
  Number.isFinite(value) && value > 0 ? value : 0

const getSectionColor = (key: 'completed' | 'due' | 'upcoming') => {
  switch (key) {
    case 'completed':
      return 'bg-morandi-sage-500'
    case 'due':
      return 'bg-morandi-saffron-500'
    case 'upcoming':
    default:
      return 'bg-morandi-stone-300'
  }
}

const formatPercentage = (value: number, total: number) => {
  if (total <= 0) return 0
  const ratio = (value / total) * 100
  return Number.isFinite(ratio) ? Math.max(ratio, 0.001) : 0
}

const PlanProgressRail = ({
  completedCount,
  dueCount,
  upcomingCount,
  className,
}: PlanProgressRailProps) => {
  const { t } = useTranslation('reports')
  const summaryId = useId()
  const legendLabelId = useId()

  const normalizedCompleted = clampPositive(completedCount)
  const normalizedDue = clampPositive(dueCount)
  const normalizedUpcoming = clampPositive(upcomingCount)
  const total = normalizedCompleted + normalizedDue + normalizedUpcoming

  const sections: Array<{
    key: 'completed' | 'due' | 'upcoming'
    value: number
    label: string
  }> = [
    {
      key: 'completed' as const,
      value: normalizedCompleted,
      label: t('planningView.progress.completed', 'Logged'),
    },
    {
      key: 'due' as const,
      value: normalizedDue,
      label: t('planningView.progress.due', 'Due soon'),
    },
    {
      key: 'upcoming' as const,
      value: normalizedUpcoming,
      label: t('planningView.progress.upcoming', 'Upcoming'),
    },
  ].filter(section => section.value > 0)

  const legendItems: Array<{
    key: 'completed' | 'due' | 'upcoming'
    value: number
    label: string
  }> = [
    {
      key: 'completed' as const,
      value: normalizedCompleted,
      label: t('planningView.progress.completed', 'Logged'),
    },
    {
      key: 'due' as const,
      value: normalizedDue,
      label: t('planningView.progress.due', 'Due soon'),
    },
    {
      key: 'upcoming' as const,
      value: normalizedUpcoming,
      label: t('planningView.progress.upcoming', 'Upcoming'),
    },
  ]

  return (
    <div className={cn('space-y-3', className)}>
      <p id={summaryId} className="sr-only">
        {t('planningView.progress.summary', {
          defaultValue:
            'Plan progress: {{completed}} completed, {{due}} due, {{upcoming}} upcoming',
          completed: normalizedCompleted,
          due: normalizedDue,
          upcoming: normalizedUpcoming,
        })}
      </p>
      <div
        role="group"
        aria-labelledby={summaryId}
        className="flex flex-col gap-1 sm:flex-row sm:items-center"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:w-full sm:gap-2">
          {sections.length === 0 ? (
            <div
              className="h-2 sm:h-3 rounded-full bg-morandi-stone-100 w-full"
              aria-hidden="true"
            />
          ) : (
            sections.map(section => (
              <div
                key={section.key}
                className={cn(
                  'rounded-full h-2 sm:h-3 transition-all duration-300',
                  getSectionColor(section.key)
                )}
                style={{
                  flexBasis: `${formatPercentage(section.value, total)}%`,
                }}
                aria-label={`${section.label}: ${section.value}`}
              />
            ))
          )}
        </div>
      </div>
      <p id={legendLabelId} className="sr-only">
        {t('planningView.progress.legend', 'Plan progress legend')}
      </p>
      <dl
        aria-labelledby={legendLabelId}
        className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-morandi-stone-600"
      >
        {legendItems.map(item => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-lg bg-morandi-stone-50 px-3 py-2"
          >
            <dt className="font-medium text-morandi-stone-700">{item.label}</dt>
            <dd className="text-morandi-stone-900 font-semibold">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default PlanProgressRail
