import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/components/ui'

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
      return 'bg-morandi-peach-400'
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
    <div className={cn('space-y-2', className)}>
      <p id={summaryId} className="sr-only">
        {t('planningView.progress.summary', {
          defaultValue:
            'Plan progress: {{completed}} completed, {{due}} due, {{upcoming}} upcoming',
          completed: normalizedCompleted,
          due: normalizedDue,
          upcoming: normalizedUpcoming,
        })}
      </p>
      {/* Progress Bar */}
      <div
        role="group"
        aria-labelledby={summaryId}
        className="flex items-center gap-1 h-2 rounded-full overflow-hidden bg-morandi-stone-100"
      >
        {sections.length === 0 ? (
          <div className="w-full h-full" aria-hidden="true" />
        ) : (
          sections.map(section => (
            <div
              key={section.key}
              className={cn(
                'h-full transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full',
                getSectionColor(section.key)
              )}
              style={{
                width: `${formatPercentage(section.value, total)}%`,
              }}
              aria-label={`${section.label}: ${section.value}`}
            />
          ))
        )}
      </div>
      {/* Compact Legend */}
      <p id={legendLabelId} className="sr-only">
        {t('planningView.progress.legend', 'Plan progress legend')}
      </p>
      <dl
        aria-labelledby={legendLabelId}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-morandi-stone-600"
      >
        {legendItems.map(item => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div
              className={cn('w-2 h-2 rounded-full', getSectionColor(item.key))}
            />
            <dt className="text-morandi-stone-500">{item.label}</dt>
            <dd className="font-semibold text-morandi-stone-700">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default PlanProgressRail
