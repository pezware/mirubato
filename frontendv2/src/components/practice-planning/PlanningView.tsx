import { useMemo, useState } from 'react'
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
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import PlanEditorModal from './PlanEditorModal'
import PlanCheckInModal from './PlanCheckInModal'
import { usePlanningStore, type CreatePlanDraft } from '@/stores/planningStore'
import { Calendar, Plus } from 'lucide-react'

interface PlanningViewProps {
  plans: PracticePlan[]
  occurrences: PlanOccurrence[]
  isLoading: boolean
  error: string | null
  onReload: () => Promise<void> | void
  getNextOccurrenceForPlan: (planId: string) => PlanOccurrence | undefined
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

const getSegmentCount = (occurrence?: PlanOccurrence) =>
  occurrence?.segments?.length ?? 0

const PlanningView = ({
  plans,
  occurrences,
  isLoading,
  error,
  onReload,
  getNextOccurrenceForPlan,
}: PlanningViewProps) => {
  const { t, i18n } = useTranslation(['reports', 'common'])
  const createPlan = usePlanningStore(state => state.createPlan)
  const updatePlan = usePlanningStore(state => state.updatePlan)
  const deletePlan = usePlanningStore(state => state.deletePlan)
  const completeOccurrence = usePlanningStore(state => state.completeOccurrence)

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editorInitial, setEditorInitial] = useState<{
    plan: PracticePlan
    occurrence?: PlanOccurrence
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [activeCheckIn, setActiveCheckIn] = useState<{
    plan: PracticePlan
    occurrence: PlanOccurrence
  } | null>(null)

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

  const handleModalClose = () => {
    if (isSaving) return
    setIsEditorOpen(false)
    setEditorMode('create')
    setEditorInitial(null)
    setEditorError(null)
  }

  const handleSubmitPlan = async (draft: CreatePlanDraft) => {
    setEditorError(null)
    setIsSaving(true)
    try {
      if (editorMode === 'edit') {
        await updatePlan(draft)
      } else {
        await createPlan(draft)
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('reports:planningEditor.genericError', 'Something went wrong')
      setEditorError(message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!editorInitial) return
    setEditorError(null)
    setIsSaving(true)
    try {
      await deletePlan(editorInitial.plan.id)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('reports:planningEditor.genericError', 'Something went wrong')
      setEditorError(message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const handleCheckInComplete = async (input: {
    occurrenceId: string
    logEntryId: string
    responses: Record<string, string>
    metrics?: Record<string, unknown>
  }) => {
    await completeOccurrence(input.occurrenceId, {
      logEntryId: input.logEntryId,
      responses: input.responses,
      metrics: input.metrics,
    })
    setActiveCheckIn(null)
  }

  const openCreateModal = () => {
    setEditorMode('create')
    setEditorInitial(null)
    setEditorError(null)
    setIsEditorOpen(true)
  }

  const openEditModal = (plan: PracticePlan, occurrence?: PlanOccurrence) => {
    setEditorMode('edit')
    setEditorInitial({ plan, occurrence })
    setEditorError(null)
    setIsEditorOpen(true)
  }

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
                <Typography variant="h3" className="text-morandi-stone-900">
                  {t('reports:planningView.error')}
                </Typography>
                <Typography variant="body" className="text-morandi-stone-600">
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

  const editorModal = (
    <PlanEditorModal
      isOpen={isEditorOpen}
      onClose={handleModalClose}
      onSubmit={handleSubmitPlan}
      isSubmitting={isSaving}
      error={editorError}
      mode={editorMode}
      initialPlan={editorInitial}
      onDelete={editorMode === 'edit' ? handleDeletePlan : undefined}
    />
  )

  const checkInModal = activeCheckIn ? (
    <PlanCheckInModal
      isOpen={Boolean(activeCheckIn)}
      onClose={() => setActiveCheckIn(null)}
      plan={activeCheckIn.plan}
      occurrence={activeCheckIn.occurrence}
      onComplete={handleCheckInComplete}
    />
  ) : null

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
            <Button
              onClick={openCreateModal}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('reports:planningView.emptyState.createPlan')}
            </Button>
          </CardContent>
        </Card>
        {editorModal}
        {checkInModal}
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Typography variant="h2">
            {t('reports:planningView.heading', 'Practice planning')}
          </Typography>
          <Typography variant="body" className="text-morandi-stone-600">
            {t(
              'reports:planningView.headingDescription',
              'Schedule upcoming sessions and track progress as you go.'
            )}
          </Typography>
        </div>
        <Button
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {t('reports:planningView.createPlan', 'Create plan')}
        </Button>
      </div>

      {plans.map(plan => {
        const nextOccurrence = getNextOccurrenceForPlan(plan.id)
        const allOccurrences = occurrencesByPlan.get(plan.id) ?? []
        const primaryOccurrence = nextOccurrence ?? allOccurrences[0]
        const segmentCount = getSegmentCount(primaryOccurrence)

        const startTime = formatDateTime(
          primaryOccurrence?.scheduledStart,
          i18n.language
        )
        const timeOfDay = formatTimeOnly(
          primaryOccurrence?.scheduledStart,
          i18n.language
        )

        return (
          <Card key={plan.id}>
            <CardHeader className="pb-3">
              <div className="flex gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-morandi-sage-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-morandi-sage-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl mb-1">
                        {plan.title}
                      </CardTitle>
                      {plan.description && (
                        <CardDescription className="mt-1">
                          {plan.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <Button
                        onClick={() => {
                          if (!primaryOccurrence) return
                          setActiveCheckIn({
                            plan,
                            occurrence: primaryOccurrence,
                          })
                        }}
                        disabled={!primaryOccurrence}
                        size="sm"
                      >
                        {t('reports:planningView.checkIn', 'Check In')}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(plan, primaryOccurrence)}
                      >
                        {t('reports:planningView.editPlan', 'Edit plan')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metadata section */}
              <div className="flex flex-wrap gap-3 text-sm text-morandi-stone-600">
                <div>
                  <span className="font-medium text-morandi-stone-900">
                    {t('reports:planningView.nextSession', 'Next session')}
                  </span>
                  {' · '}
                  <span>
                    {startTime ??
                      t(
                        'reports:planningView.noUpcoming',
                        'No upcoming session'
                      )}
                  </span>
                </div>
              </div>

              {/* Plan details */}
              <div className="flex flex-wrap gap-4 text-sm text-morandi-stone-600">
                {plan.schedule?.durationMinutes && (
                  <div>
                    <span className="font-medium text-morandi-stone-900">
                      {t('reports:planningView.durationLabel', 'Duration')}
                    </span>
                    {' · '}
                    <span>{plan.schedule.durationMinutes}m</span>
                  </div>
                )}
                {plan.schedule?.flexibility && (
                  <div>
                    <span className="font-medium text-morandi-stone-900">
                      {t(
                        'reports:planningView.flexibilityLabel',
                        'Flexibility'
                      )}
                    </span>
                    {' · '}
                    <span className="capitalize">
                      {plan.schedule.flexibility.replace('-', ' ')}
                    </span>
                  </div>
                )}
                {segmentCount > 0 && (
                  <div>
                    <span className="font-medium text-morandi-stone-900">
                      {t('reports:planningView.segmentsLabel', 'Segments')}
                    </span>
                    {' · '}
                    <span>
                      {t('reports:planningView.segmentCount', {
                        count: segmentCount,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {primaryOccurrence && primaryOccurrence.segments && (
                <div className="space-y-3 pt-2">
                  <Typography variant="h5" className="text-morandi-stone-700">
                    {t('reports:planningView.segmentsLabel', 'Segments')}
                    {timeOfDay && (
                      <span className="text-morandi-stone-500 font-normal text-sm ml-2">
                        {timeOfDay}
                      </span>
                    )}
                  </Typography>
                  <ul className="space-y-2">
                    {primaryOccurrence.segments.map(segment => (
                      <li
                        key={segment.id ?? segment.label}
                        className="rounded-lg border border-morandi-stone-200 bg-morandi-stone-50/50 p-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <Typography
                            variant="h6"
                            className="text-morandi-stone-900"
                          >
                            {segment.label}
                          </Typography>
                          {segment.durationMinutes && (
                            <Typography
                              variant="body-sm"
                              className="text-morandi-stone-600"
                            >
                              {segment.durationMinutes}m
                            </Typography>
                          )}
                        </div>
                        {segment.instructions && (
                          <Typography
                            variant="body-sm"
                            className="text-morandi-stone-600 mt-2"
                          >
                            {segment.instructions}
                          </Typography>
                        )}
                        {segment.techniques &&
                          segment.techniques.length > 0 && (
                            <div className="mt-2 text-xs text-morandi-stone-500">
                              {segment.techniques.join(' · ')}
                            </div>
                          )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {allOccurrences.length > 0 && (
                <div className="text-xs text-morandi-stone-500 pt-2 border-t border-morandi-stone-200">
                  {t('reports:planningView.scheduledSessions', {
                    count: allOccurrences.length,
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {editorModal}
      {checkInModal}
    </div>
  )
}

export default PlanningView
