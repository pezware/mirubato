import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  LoadingSkeleton,
  Typography,
} from '@/components/ui'
import type {
  PracticePlan,
  PlanOccurrence,
} from '@/api/planning'

interface PlanningViewProps {
  plans: PracticePlan[]
  occurrences: PlanOccurrence[]
  isLoading: boolean
  error: string | null
  onReload: () => Promise<void> | void
  getNextOccurrenceForPlan: (
    planId: string
  ) => PlanOccurrence | undefined
}

const formatDateTime = (value?: string | null, locale?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const formatTimeOnly = (value?: string | null, locale?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const getSegmentCount = (
  _plan: PracticePlan,
  nextOccurrence?: PlanOccurrence
) => nextOccurrence?.segments?.length ?? 0

const PlanningView = ({
  plans,
  occurrences,
  isLoading,
  error,
  onReload,
  getNextOccurrenceForPlan,
}: PlanningViewProps) => {
  const { t, i18n } = useTranslation(['reports', 'common'])

  const occurrencesByPlan = useMemo(() => {
    const map = new Map<string, PlanOccurrence[]>()
    occurrences.forEach(occurrence => {
      if (!map.has(occurrence.planId)) {
        map.set(occurrence.planId, [])
      }
      map.get(occurrence.planId)!.push(occurrence)
    })

    map.forEach(list => {
      list.sort((a, b) => {
        const aTime = a.scheduledStart
          ? new Date(a.scheduledStart).getTime()
          : Number.MAX_SAFE_INTEGER
        const bTime = b.scheduledStart
          ? new Date(b.scheduledStart).getTime()
          : Number.MAX_SAFE_INTEGER
        return aTime - bTime
      })
    })

    return map
  }, [occurrences])

  if (isLoading && plans.length === 0) {
    return (
      <div className="p-3 sm:p-4 space-y-4">
        <LoadingSkeleton className="h-24" />
        <LoadingSkeleton className="h-24" />
        <LoadingSkeleton className="h-24" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 sm:p-4">
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <Typography variant="h3">
                  {t('reports:planningView.error')}
                </Typography>
                <Typography variant="body" className="text-muted-foreground">
                  {error}
                </Typography>
              </div>
              <Button onClick={onReload}>
                {t('reports:planningView.retry', 'Retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isLoading && plans.length === 0) {
    return (
      <div className="p-3 sm:p-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>{t('reports:planningView.emptyState.title')}</CardTitle>
            <CardDescription>
              {t('reports:planningView.emptyState.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>
              {t('reports:planningView.emptyState.createPlan')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 space-y-4">
      {plans.map(plan => {
        const nextOccurrence = getNextOccurrenceForPlan(plan.id)
        const allOccurrences = occurrencesByPlan.get(plan.id) ?? []
        const segmentCount = getSegmentCount(plan, nextOccurrence)

        const startTime = formatDateTime(
          nextOccurrence?.scheduledStart,
          i18n.language
        )
        const timeOfDay = formatTimeOnly(
          nextOccurrence?.scheduledStart,
          i18n.language
        )

        return (
          <Card key={plan.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">
                    {plan.title}
                  </CardTitle>
                  {plan.description && (
                    <CardDescription className="mt-1">
                      {plan.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled>
                    {t('reports:planningView.viewPlan', 'Open Plan')}
                  </Button>
                  <Button disabled>
                    {t('reports:planningView.checkIn', 'Check In')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">
                    {t('reports:planningView.upcoming')}
                  </span>{' '}
                  {startTime ??
                    t('reports:planningView.noUpcoming', 'No upcoming session')}
                </div>
                {segmentCount > 0 && (
                  <div>
                    <span className="font-medium text-foreground">
                      {t('reports:planningView.segmentsLabel', 'Segments')}
                    </span>{' '}
                    {t('reports:planningView.segmentCount', {
                      count: segmentCount,
                    })}
                  </div>
                )}
                {plan.schedule?.durationMinutes && (
                  <div>
                    <span className="font-medium text-foreground">
                      {t('reports:planningView.durationLabel', 'Duration')}
                    </span>{' '}
                    {plan.schedule.durationMinutes}m
                  </div>
                )}
                {plan.schedule?.flexibility && (
                  <div>
                    <span className="font-medium text-foreground">
                      {t('reports:planningView.flexibilityLabel', 'Flexibility')}
                    </span>{' '}
                    {plan.schedule.flexibility}
                  </div>
                )}
              </div>

              {nextOccurrence && nextOccurrence.segments && (
                <div className="space-y-2">
                  <Typography variant="h4">
                    {t('reports:planningView.nextSession')}
                    {timeOfDay ? ` · ${timeOfDay}` : ''}
                  </Typography>
                  <ul className="space-y-2">
                    {nextOccurrence.segments.map(segment => (
                      <li
                        key={segment.id ?? segment.label}
                        className="rounded-md border border-border bg-muted/30 p-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <Typography variant="h5">
                            {segment.label}
                          </Typography>
                          {segment.durationMinutes && (
                            <Typography
                              variant="body"
                              className="text-muted-foreground"
                            >
                              {segment.durationMinutes}m
                            </Typography>
                          )}
                        </div>
                        {segment.instructions && (
                          <Typography
                            variant="body"
                            className="text-muted-foreground mt-1"
                          >
                            {segment.instructions}
                          </Typography>
                        )}
                        {segment.techniques && segment.techniques.length > 0 && (
                          <Typography
                            variant="body"
                            className="text-muted-foreground mt-1"
                          >
                            {segment.techniques.join(' · ')}
                          </Typography>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {allOccurrences.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {t('reports:planningView.scheduledSessions', {
                    count: allOccurrences.length,
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default PlanningView
