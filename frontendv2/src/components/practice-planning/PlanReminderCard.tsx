import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Piano,
  Guitar,
  Music,
  MicVocal,
  LayoutGrid,
  Drum,
  type LucideIcon,
} from 'lucide-react'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import { Button, Tag, Typography, cn } from '@/components/ui'

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

const ICON_STROKE_WIDTH = 1.6

const instrumentIcons: Record<string, LucideIcon> = {
  piano: Piano,
  organ: Piano,
  guitar: Guitar,
  violin: Music,
  viola: Music,
  cello: Music,
  'double-bass': Music,
  flute: Music,
  clarinet: Music,
  saxophone: Music,
  trumpet: Music,
  trombone: Music,
  tuba: Music,
  voice: MicVocal,
  accordion: LayoutGrid,
  percussion: Drum,
}

const renderInstrumentIcon = (instrument?: string) => {
  const IconComponent =
    (instrument ? instrumentIcons[instrument] : undefined) ?? Music

  return (
    <IconComponent
      aria-hidden="true"
      className="h-5 w-5 text-current"
      data-testid="instrument-icon"
      strokeWidth={ICON_STROKE_WIDTH}
    />
  )
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
  const instrumentIcon = useMemo(
    () => renderInstrumentIcon(instrument),
    [instrument]
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
          <div
            data-testid="instrument-icon-wrapper"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-morandi-sage-50 text-morandi-sage-700"
          >
            {instrumentIcon}
          </div>
          <div className="space-y-1">
            <Typography variant="h5" className="text-morandi-stone-900">
              {plan?.title ??
                t('reports:planningView.untitledPlan', 'Practice plan')}
            </Typography>
            <Typography variant="body-sm" className="text-morandi-stone-600">
              {[dayLabel, timeLabel].filter(Boolean).join(' · ')}
            </Typography>
            <Typography variant="caption" className="text-morandi-stone-500">
              {instrumentLabel}
              {segmentsCount > 0 && (
                <span className="ml-2">
                  {t('reports:planningView.segmentCount', {
                    count: segmentsCount,
                  })}
                </span>
              )}
            </Typography>
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
