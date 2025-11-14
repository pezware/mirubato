import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconPiano,
  IconGuitarPick,
  IconMusic,
  IconMicrophone,
  IconLayoutGrid,
  IconCircle,
} from '@tabler/icons-react'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import { Button, Tag, Typography } from '@/components/ui'
import { cn } from '@/utils/cn'

export type PlanReminderStatus = 'due' | 'upcoming'

interface PlanReminderCardProps {
  occurrence: PlanOccurrence
  plan?: PracticePlan
  status: PlanReminderStatus
  isPrimary?: boolean
  fallbackInstrument?: string
  onCheckIn?: (plan: PracticePlan, occurrence: PlanOccurrence) => void
  onOpenPlan?: (plan: PracticePlan, occurrence: PlanOccurrence) => void
}

const instrumentIcons: Record<string, JSX.Element> = {
  piano: <IconPiano size={20} stroke={1.6} />,
  guitar: <IconGuitarPick size={20} stroke={1.6} />,
  violin: <IconMusic size={20} stroke={1.6} />,
  viola: <IconMusic size={20} stroke={1.6} />,
  cello: <IconMusic size={20} stroke={1.6} />,
  'double-bass': <IconMusic size={20} stroke={1.6} />,
  flute: <IconMusic size={20} stroke={1.6} />,
  clarinet: <IconMusic size={20} stroke={1.6} />,
  saxophone: <IconMusic size={20} stroke={1.6} />,
  trumpet: <IconMusic size={20} stroke={1.6} />,
  trombone: <IconMusic size={20} stroke={1.6} />,
  tuba: <IconMusic size={20} stroke={1.6} />,
  voice: <IconMicrophone size={20} stroke={1.6} />,
  organ: <IconPiano size={20} stroke={1.6} />,
  accordion: <IconLayoutGrid size={20} stroke={1.6} />,
  percussion: <IconCircle size={20} stroke={1.6} />,
}

const parseDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getOccurrenceEnd = (occurrence: PlanOccurrence) => {
  const start = parseDate(occurrence.scheduledStart)
  const end = parseDate(occurrence.scheduledEnd)

  if (!start && !end) {
    return null
  }

  if (end && start && end.getTime() < start.getTime()) {
    return start
  }

  return end ?? start
}

const resolveInstrument = (
  plan?: PracticePlan,
  fallback?: string
): string | undefined => {
  if (!plan) return fallback
  const metadata =
    plan.metadata && typeof plan.metadata === 'object' ? plan.metadata : null
  if (
    metadata &&
    typeof (metadata as Record<string, unknown>).instrument === 'string'
  ) {
    return (
      (metadata as Record<string, unknown>).instrument as string
    ).toLowerCase()
  }

  if (
    metadata &&
    Array.isArray((metadata as Record<string, unknown>).instruments)
  ) {
    const instruments = (metadata as Record<string, unknown>)
      .instruments as unknown[]
    const first = instruments.find(value => typeof value === 'string') as
      | string
      | undefined
    if (first) {
      return first.toLowerCase()
    }
  }

  const tagInstrument = plan.tags?.find(tag => tag.startsWith('instrument:'))
  if (tagInstrument) {
    return tagInstrument.replace('instrument:', '').toLowerCase()
  }

  return fallback
}

const formatDateTime = (
  value?: string | null,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
) => {
  const date = parseDate(value)
  if (!date) return null
  return new Intl.DateTimeFormat(locale, options).format(date)
}

const formatOccurrenceTime = (
  occurrence: PlanOccurrence,
  locale?: string
): { dayLabel: string; timeLabel: string | null } => {
  const dayLabel = formatDateTime(occurrence.scheduledStart, locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const timeLabel = formatDateTime(occurrence.scheduledStart, locale, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return {
    dayLabel: dayLabel ?? '',
    timeLabel,
  }
}

const PlanReminderCard = ({
  occurrence,
  plan,
  status,
  isPrimary = false,
  fallbackInstrument = 'piano',
  onCheckIn,
  onOpenPlan,
}: PlanReminderCardProps) => {
  const { t, i18n } = useTranslation(['reports', 'common'])
  const { dayLabel, timeLabel } = formatOccurrenceTime(
    occurrence,
    i18n.language
  )
  const segmentsCount = occurrence.segments?.length ?? 0

  const instrument = useMemo(
    () => resolveInstrument(plan, fallbackInstrument),
    [plan, fallbackInstrument]
  )
  const instrumentIcon = instrument ? (
    (instrumentIcons[instrument] ?? <IconMusic size={20} stroke={1.6} />)
  ) : (
    <IconMusic size={20} stroke={1.6} />
  )

  const instrumentLabel = instrument
    ? t(`common:instruments.${instrument}`, { defaultValue: instrument })
    : t('common:instruments.none', 'No instrument')

  const isOverdue = useMemo(() => {
    if (status !== 'due') return false
    const end = getOccurrenceEnd(occurrence)
    if (!end) return false
    return end.getTime() < Date.now()
  }, [occurrence, status])

  const badgeLabel = isOverdue
    ? t('reports:planningView.reminders.overdue', 'Overdue')
    : status === 'due'
      ? t('reports:planningView.reminders.dueToday', 'Due today')
      : t('reports:planningView.reminders.upcoming', 'Upcoming')

  const badgeVariant = isOverdue
    ? 'danger'
    : status === 'due'
      ? 'warning'
      : 'primary'

  const handleCheckIn = () => {
    if (plan && onCheckIn) {
      onCheckIn(plan, occurrence)
    }
  }

  const handleOpenPlan = () => {
    if (plan && onOpenPlan) {
      onOpenPlan(plan, occurrence)
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white/90 p-4 shadow-sm backdrop-blur-sm transition-shadow',
        isPrimary
          ? 'border-morandi-sage-200 shadow-morandi-sage-200/40'
          : 'border-morandi-stone-100'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-morandi-sage-50 text-morandi-sage-700">
            {instrumentIcon}
          </div>
          <div className="space-y-1">
            <Typography variant="h5" className="text-morandi-stone-900">
              {plan?.title ??
                t('reports:planningView.untitledPlan', 'Practice plan')}
            </Typography>
            <p className="text-sm text-morandi-stone-600">
              {[dayLabel, timeLabel].filter(Boolean).join(' · ')}
            </p>
            <p className="text-xs text-morandi-stone-500">
              {instrumentLabel}
              {segmentsCount > 0 && (
                <span className="ml-2">
                  {t('reports:planningView.segmentCount', {
                    count: segmentsCount,
                  })}
                </span>
              )}
            </p>
          </div>
        </div>
        <Tag variant={badgeVariant} size="sm">
          {badgeLabel}
        </Tag>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={handleCheckIn} disabled={!plan}>
          {t('reports:planningView.checkIn', 'Check In')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenPlan}
          disabled={!plan}
        >
          {t('reports:planningView.viewPlan', 'Open Plan')}
        </Button>
      </div>
    </div>
  )
}

export default PlanReminderCard
