import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingSkeleton,
  Typography,
  Tabs,
  DropdownMenu,
} from '@/components/ui'
import type {
  PracticePlan,
  PlanOccurrence,
  TemplateAdoptionCustomization,
} from '@/api/planning'
import PlanEditorModal from './PlanEditorModal'
import PlanCheckInModal from './PlanCheckInModal'
import { TemplateGallery } from './TemplateGallery'
import { TemplatePublisherModal } from './TemplatePublisherModal'
import {
  usePlanningStore,
  useCompletedOccurrences,
  useDueTodayOccurrences,
  useUpcomingOccurrences,
  type CreatePlanDraft,
} from '@/stores/planningStore'
import {
  Calendar,
  Plus,
  MoreVertical,
  BookTemplate,
  Share2,
} from 'lucide-react'
import { type PlanReminderStatus } from './PlanReminderCard'
import PlanProgressRail from './PlanProgressRail'
import PlanningAnalyticsPanel from './PlanningAnalyticsPanel'
import { UndoCheckInBanner } from './UndoCheckInBanner'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { trackPlanningEvent } from '@/lib/analytics/planning'
import { usePlanningAnalytics } from '@/hooks/usePlanningAnalytics'
import { toast } from '@/utils/toastManager'
import { useAuthStore } from '@/stores/authStore'

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

const getSegmentCount = (occurrence?: PlanOccurrence) =>
  occurrence?.segments?.length ?? 0

const buildCountMap = (occurrences: PlanOccurrence[]) => {
  const map = new Map<string, number>()
  occurrences.forEach(occurrence => {
    map.set(occurrence.planId, (map.get(occurrence.planId) ?? 0) + 1)
  })
  return map
}

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
  const loadTemplates = usePlanningStore(state => state.loadTemplates)
  const publishTemplate = usePlanningStore(state => state.publishTemplate)
  const adoptTemplate = usePlanningStore(state => state.adoptTemplate)
  const deleteTemplate = usePlanningStore(state => state.deleteTemplate)
  const templates = usePlanningStore(state => state.templates)
  const isLoadingTemplates = usePlanningStore(state => state.isLoading)
  const user = useAuthStore(state => state.user)

  const dueTodayOccurrences = useDueTodayOccurrences()
  const upcomingOccurrences = useUpcomingOccurrences()
  const completedOccurrences = useCompletedOccurrences()
  const { getPrimaryInstrument } = useUserPreferences()
  const fallbackInstrument = getPrimaryInstrument()

  // Planning analytics
  const planningAnalytics = usePlanningAnalytics({
    completed: completedOccurrences,
    dueToday: dueTodayOccurrences,
    upcoming: upcomingOccurrences,
    allOccurrences: occurrences,
  })

  // Tab state
  const [activeTab, setActiveTab] = useState<'plans' | 'templates'>('plans')
  const [templateSubtab, setTemplateSubtab] = useState<'browse' | 'mine'>(
    'browse'
  )

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editorInitial, setEditorInitial] = useState<{
    plan: PracticePlan
    occurrence?: PlanOccurrence
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)

  // Check-in state
  const [activeCheckIn, setActiveCheckIn] = useState<{
    plan: PracticePlan
    occurrence: PlanOccurrence
  } | null>(null)

  // Template modals state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [planToPublish, setPlanToPublish] = useState<PracticePlan | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  // Track recently completed check-ins for undo banner
  const [recentlyCompletedOccurrenceId, setRecentlyCompletedOccurrenceId] =
    useState<string | null>(null)

  // Load templates when switching to templates tab
  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates()
    }
  }, [activeTab, loadTemplates])

  // Filter templates by authorship
  const myTemplates = useMemo(() => {
    if (!user) return []
    return templates.filter(template => template.authorId === user.id)
  }, [templates, user])

  const browseTemplates = useMemo(() => {
    // Show all public templates plus user's private templates
    if (!user) return templates.filter(t => t.visibility === 'public')
    return templates.filter(
      t => t.visibility === 'public' || t.authorId === user.id
    )
  }, [templates, user])

  // Track which plans have been published as templates
  const publishedPlanIds = useMemo(() => {
    const ids = new Set<string>()
    templates.forEach(template => {
      if (template.sourcePlanId) {
        ids.add(template.sourcePlanId)
      }
    })
    return ids
  }, [templates])

  const planLookup = useMemo(() => {
    const map = new Map<string, PracticePlan>()
    plans.forEach(plan => map.set(plan.id, plan))
    return map
  }, [plans])

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

  const reminderQueue = useMemo(() => {
    const queue: Array<{
      occurrence: PlanOccurrence
      status: PlanReminderStatus
    }> = [
      ...dueTodayOccurrences.map(occurrence => ({
        occurrence,
        status: 'due' as const,
      })),
      ...upcomingOccurrences.map(occurrence => ({
        occurrence,
        status: 'upcoming' as const,
      })),
    ]

    const seen = new Set<string>()
    return queue.filter(item => {
      if (seen.has(item.occurrence.id)) {
        return false
      }
      seen.add(item.occurrence.id)
      return true
    })
  }, [dueTodayOccurrences, upcomingOccurrences])

  const reminderItems = useMemo(
    () =>
      reminderQueue.map(item => ({
        ...item,
        plan: planLookup.get(item.occurrence.planId),
      })),
    [planLookup, reminderQueue]
  )

  const completedCountsByPlan = useMemo(
    () => buildCountMap(completedOccurrences),
    [completedOccurrences]
  )
  const dueCountsByPlan = useMemo(
    () => buildCountMap(dueTodayOccurrences),
    [dueTodayOccurrences]
  )
  const upcomingCountsByPlan = useMemo(
    () => buildCountMap(upcomingOccurrences),
    [upcomingOccurrences]
  )

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
    // Track this occurrence for undo banner
    setRecentlyCompletedOccurrenceId(input.occurrenceId)
    setActiveCheckIn(null)
  }

  const handleUndoComplete = () => {
    setRecentlyCompletedOccurrenceId(null)
    toast.info(
      t('reports:planningUncheckIn.undoSuccess', 'Check-in undone'),
      t(
        'reports:planningUncheckIn.undoSuccessDetail',
        'Your session has been unlinked from the plan'
      )
    )
  }

  // Get the recently completed occurrence object for undo banner
  const recentlyCompletedOccurrence = useMemo(() => {
    if (!recentlyCompletedOccurrenceId) return null
    return occurrences.find(occ => occ.id === recentlyCompletedOccurrenceId)
  }, [recentlyCompletedOccurrenceId, occurrences])

  const openCreateModal = (source: 'hero' | 'header' | 'empty' = 'header') => {
    if (source === 'hero') {
      trackPlanningEvent('planning.hero.create', { source })
      trackPlanningEvent('planning.plan.create', { source })
    } else {
      trackPlanningEvent('planning.plan.create', { source })
    }
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

  const startCheckIn = (
    plan: PracticePlan,
    occurrence: PlanOccurrence,
    source: 'plan-card' | 'reminder'
  ) => {
    const eventName =
      source === 'reminder'
        ? 'planning.plan.reminder.checkIn'
        : 'planning.plan.checkIn'
    trackPlanningEvent(eventName, {
      planId: plan.id,
      occurrenceId: occurrence.id,
      source,
    })
    setActiveCheckIn({ plan, occurrence })
  }

  // Template handlers
  const handlePublishTemplate = async (options: {
    title: string
    description?: string
    visibility: 'public' | 'private'
    tags?: string[]
  }) => {
    if (!planToPublish) return

    try {
      await publishTemplate(planToPublish.id, options)
      setIsPublishModalOpen(false)
      setPlanToPublish(null)

      toast.success(
        t(
          'common:templates.publishSuccess',
          'Template published successfully!'
        ),
        t(
          'common:templates.publishSuccessDetail',
          'Your plan is now available as a template'
        )
      )

      // Switch to Templates → My Templates tab to show the newly published template
      setActiveTab('templates')
      setTemplateSubtab('mine')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(
              'common:templates.errors.publishFailed',
              'Failed to publish template'
            )
      toast.error(message)
      throw err
    }
  }

  const handleAdoptTemplate = async (
    templateId: string,
    customization?: TemplateAdoptionCustomization
  ) => {
    try {
      await adoptTemplate(templateId, customization)

      toast.success(
        t('common:templates.adoptSuccess', 'Template adopted successfully!'),
        t('common:templates.adoptSuccessDetail', 'Find it in your Active Plans')
      )

      // Switch to plans tab to show the newly adopted plan
      setActiveTab('plans')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('common:templates.errors.adoptFailed', 'Failed to adopt template')
      toast.error(message)
      throw err
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId)

      toast.success(
        t('common:templates.deleteSuccess', 'Template deleted successfully!'),
        t(
          'common:templates.deleteSuccessDetail',
          'Your template has been removed'
        )
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(
              'common:templates.errors.deleteFailed',
              'Failed to delete template'
            )
      toast.error(message)
      throw err
    }
  }

  const openPublishModal = (plan: PracticePlan) => {
    setPlanToPublish(plan)
    setIsPublishModalOpen(true)
  }

  const heroReminders = reminderItems.slice(0, 3)

  // Simplified quick stats for compact display
  const quickStats = {
    dueToday: dueTodayOccurrences.length,
    upcoming: upcomingOccurrences.length,
    activePlans: plans.length,
    streak: planningAnalytics.streak.currentStreak,
    adherence: planningAnalytics.adherence.overall,
  }

  // Primary next action - THE thing the user should do
  const primaryReminder = heroReminders[0]
  const hasUrgentAction = primaryReminder && primaryReminder.status === 'due'

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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="p-3 sm:p-4 space-y-4">
        <Card className="border-dashed bg-morandi-stone-50/70">
          <CardHeader>
            <CardTitle>
              {t(
                'reports:planningView.emptyState.title',
                "You don't have any practice plans yet"
              )}
            </CardTitle>
            <CardDescription>
              {t(
                'reports:planningView.emptyState.description',
                'Create a routine and Mirubato will remind you when it is time to play.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => openCreateModal('empty')}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {t('reports:planningView.emptyState.createPlan', 'Create plan')}
            </Button>
          </CardContent>
        </Card>
        {editorModal}
        {checkInModal}
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
      {/* Compact Quick Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${quickStats.dueToday > 0 ? 'bg-morandi-peach-400 animate-pulse' : 'bg-morandi-stone-300'}`}
            />
            <span className="text-morandi-stone-600">
              <span className="font-semibold text-morandi-stone-900">
                {quickStats.dueToday}
              </span>{' '}
              {t('reports:planningView.quickStats.due', 'due')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-morandi-stone-600">
              <span className="font-semibold text-morandi-stone-900">
                {quickStats.upcoming}
              </span>{' '}
              {t('reports:planningView.quickStats.upcoming', 'upcoming')}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-morandi-stone-600">
              <span className="font-semibold text-morandi-stone-900">
                {quickStats.streak}
              </span>{' '}
              {t('reports:planningView.quickStats.streak', 'day streak')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => openCreateModal('hero')}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            {t('reports:planningView.createPlan', 'Create plan')}
          </Button>
        </div>
      </div>

      {/* Focused Hero: Next Up Section */}
      {primaryReminder ? (
        <Card
          className={`border-none shadow-md overflow-hidden ${
            hasUrgentAction
              ? 'bg-gradient-to-br from-morandi-sage-100 via-morandi-sage-50 to-white ring-2 ring-morandi-sage-200'
              : 'bg-gradient-to-br from-morandi-stone-50 via-white to-morandi-sky-50'
          }`}
        >
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              {/* Left: Main Focus Area */}
              <div className="flex-1 p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        hasUrgentAction
                          ? 'bg-morandi-sage-500 text-white'
                          : 'bg-morandi-stone-200 text-morandi-stone-700'
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      {hasUrgentAction
                        ? t('reports:planningView.hero.nextUp', 'Next Up')
                        : t('reports:planningView.hero.comingUp', 'Coming Up')}
                    </div>
                    {quickStats.adherence > 0 && (
                      <span className="text-xs text-morandi-stone-500">
                        {quickStats.adherence}%{' '}
                        {t(
                          'reports:planningView.quickStats.adherence',
                          'adherence'
                        )}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Typography
                      variant="h2"
                      className="text-morandi-stone-900 text-xl sm:text-2xl"
                    >
                      {primaryReminder.plan?.title ??
                        t('reports:planningView.untitledPlan', 'Practice plan')}
                    </Typography>
                    {primaryReminder.plan?.description && (
                      <Typography
                        variant="body"
                        className="text-morandi-stone-600 line-clamp-2"
                      >
                        {primaryReminder.plan.description}
                      </Typography>
                    )}
                  </div>

                  {/* Primary Action */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={() => {
                        if (primaryReminder.plan) {
                          startCheckIn(
                            primaryReminder.plan,
                            primaryReminder.occurrence,
                            'reminder'
                          )
                        }
                      }}
                      disabled={!primaryReminder.plan}
                      className={
                        hasUrgentAction
                          ? 'bg-morandi-sage-600 hover:bg-morandi-sage-500 shadow-lg shadow-morandi-sage-200'
                          : ''
                      }
                    >
                      {t('reports:planningView.checkIn', 'Check In')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (primaryReminder.plan) {
                          trackPlanningEvent('planning.plan.reminder.open', {
                            planId: primaryReminder.plan.id,
                            occurrenceId: primaryReminder.occurrence.id,
                          })
                          openEditModal(
                            primaryReminder.plan,
                            primaryReminder.occurrence
                          )
                        }
                      }}
                      disabled={!primaryReminder.plan}
                    >
                      {t('reports:planningView.viewPlan', 'Open Plan')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab('templates')}
                      leftIcon={<BookTemplate className="h-4 w-4" />}
                    >
                      {t(
                        'common:templates.browseTemplates',
                        'Browse Templates'
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: Quick Info Panel */}
              <div className="lg:w-64 bg-white/60 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-morandi-stone-100 p-4 sm:p-5">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Typography
                      variant="caption"
                      className="text-morandi-stone-500 uppercase tracking-wide text-xs"
                    >
                      {t('reports:planningView.hero.scheduled', 'Scheduled')}
                    </Typography>
                    <Typography
                      variant="body"
                      className="text-morandi-stone-900 font-medium"
                    >
                      {new Intl.DateTimeFormat(i18n.language, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(
                        primaryReminder.occurrence.scheduledStart
                          ? new Date(primaryReminder.occurrence.scheduledStart)
                          : new Date()
                      )}
                    </Typography>
                  </div>
                  {primaryReminder.plan?.schedule?.durationMinutes && (
                    <div className="space-y-1">
                      <Typography
                        variant="caption"
                        className="text-morandi-stone-500 uppercase tracking-wide text-xs"
                      >
                        {t('reports:planningView.durationLabel', 'Duration')}
                      </Typography>
                      <Typography
                        variant="body"
                        className="text-morandi-stone-900 font-medium"
                      >
                        {primaryReminder.plan.schedule.durationMinutes}{' '}
                        {t('reports:planningView.minutes', 'min')}
                      </Typography>
                    </div>
                  )}
                  {(primaryReminder.occurrence.segments?.length ?? 0) > 0 && (
                    <div className="space-y-1">
                      <Typography
                        variant="caption"
                        className="text-morandi-stone-500 uppercase tracking-wide text-xs"
                      >
                        {t('reports:planningView.segmentsLabel', 'Segments')}
                      </Typography>
                      <Typography
                        variant="body"
                        className="text-morandi-stone-900 font-medium"
                      >
                        {primaryReminder.occurrence.segments?.length}
                      </Typography>
                    </div>
                  )}
                </div>

                {/* Upcoming queue preview */}
                {heroReminders.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-morandi-stone-100">
                    <Typography
                      variant="caption"
                      className="text-morandi-stone-500 uppercase tracking-wide text-xs mb-2 block"
                    >
                      {t(
                        'reports:planningView.hero.alsoScheduled',
                        'Also scheduled'
                      )}
                    </Typography>
                    <div className="space-y-2">
                      {heroReminders.slice(1, 3).map(item => (
                        <button
                          key={item.occurrence.id}
                          onClick={() => {
                            if (item.plan) {
                              openEditModal(item.plan, item.occurrence)
                            }
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-morandi-stone-100 transition-colors"
                        >
                          <Typography
                            variant="body-sm"
                            className="text-morandi-stone-900 font-medium truncate"
                          >
                            {item.plan?.title ??
                              t(
                                'reports:planningView.untitledPlan',
                                'Practice plan'
                              )}
                          </Typography>
                          <Typography
                            variant="caption"
                            className="text-morandi-stone-500"
                          >
                            {item.status === 'due'
                              ? t(
                                  'reports:planningView.reminders.dueToday',
                                  'Due today'
                                )
                              : t(
                                  'reports:planningView.reminders.upcoming',
                                  'Upcoming'
                                )}
                          </Typography>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Empty State Hero */
        <Card className="border-none bg-gradient-to-br from-morandi-stone-50 via-white to-morandi-sage-50 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-morandi-sage-100 flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-morandi-sage-600" />
              </div>
              <div className="space-y-2">
                <Typography variant="h3" className="text-morandi-stone-900">
                  {t(
                    'reports:planningView.hero.allCaughtUp',
                    "You're all caught up!"
                  )}
                </Typography>
                <Typography variant="body" className="text-morandi-stone-600">
                  {t(
                    'reports:planningView.reminders.none',
                    "You're all set. We'll surface new reminders once sessions are scheduled."
                  )}
                </Typography>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                  onClick={() => openCreateModal('hero')}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  {t('reports:planningView.createPlan', 'Create plan')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('templates')}
                  leftIcon={<BookTemplate className="h-4 w-4" />}
                >
                  {t('common:templates.browseTemplates', 'Browse Templates')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Undo Check-In Banner - shown after recent check-in */}
      {recentlyCompletedOccurrence && (
        <UndoCheckInBanner
          occurrence={recentlyCompletedOccurrence}
          plan={planLookup.get(recentlyCompletedOccurrence.planId)}
          onUndoComplete={handleUndoComplete}
        />
      )}

      {/* Planning Analytics Panel */}
      <PlanningAnalyticsPanel analytics={planningAnalytics} />

      {/* Tabs Navigation */}
      <Tabs
        tabs={[
          {
            id: 'plans',
            label: t('common:templates.tabs.myPlans', 'My Plans'),
            icon: <Calendar className="h-4 w-4" />,
          },
          {
            id: 'templates',
            label: t('common:templates.tabs.templates', 'Templates'),
            icon: <BookTemplate className="h-4 w-4" />,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId: string) =>
          setActiveTab(tabId as 'plans' | 'templates')
        }
      />

      {/* Plans Tab Content */}
      {activeTab === 'plans' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Typography variant="h3" className="text-morandi-stone-900">
                {t('reports:planningView.activePlans', 'Active plans')}
              </Typography>
              <Typography variant="body-sm" className="text-morandi-stone-600">
                {t(
                  'reports:planningView.headingDescription',
                  'Schedule upcoming sessions and track progress as you go.'
                )}
              </Typography>
            </div>
            <Button
              onClick={() => openCreateModal('header')}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              {t('reports:planningView.createPlan', 'Create plan')}
            </Button>
          </div>
        </>
      )}

      {/* Plans List */}
      {activeTab === 'plans' && (
        <div className="space-y-3">
          {plans.map(plan => {
            const nextOccurrence = getNextOccurrenceForPlan(plan.id)
            const allOccurrences = occurrencesByPlan.get(plan.id) ?? []
            const primaryOccurrence = nextOccurrence ?? allOccurrences[0]
            const segmentCount = getSegmentCount(primaryOccurrence)

            const startTime = formatDateTime(
              primaryOccurrence?.scheduledStart,
              i18n.language
            )

            // Check if this plan has a due occurrence
            const hasDueOccurrence = (dueCountsByPlan.get(plan.id) ?? 0) > 0

            return (
              <Card
                key={plan.id}
                className={
                  hasDueOccurrence
                    ? 'border-morandi-sage-200 shadow-sm'
                    : 'border-morandi-stone-100'
                }
              >
                <CardContent className="p-4 sm:p-5">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base sm:text-lg">
                          {plan.title}
                        </CardTitle>
                        {plan.templateVersion && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-morandi-sage-100 text-morandi-sage-700">
                            <BookTemplate className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {publishedPlanIds.has(plan.id) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-morandi-sky-100 text-morandi-navy-600">
                            <Share2 className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <Typography
                          variant="body-sm"
                          className="text-morandi-stone-500 mt-0.5 line-clamp-1"
                        >
                          {plan.description}
                        </Typography>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button
                        onClick={() => {
                          if (!primaryOccurrence) return
                          startCheckIn(plan, primaryOccurrence, 'plan-card')
                        }}
                        disabled={!primaryOccurrence}
                        size="sm"
                      >
                        {t('reports:planningView.checkIn', 'Check In')}
                      </Button>
                      <DropdownMenu
                        items={[
                          {
                            label: t('reports:planningView.editPlan', 'Edit'),
                            onClick: () => {
                              trackPlanningEvent('planning.plan.edit', {
                                planId: plan.id,
                              })
                              openEditModal(plan, primaryOccurrence)
                              setOpenDropdownId(null)
                            },
                          },
                          {
                            label: t(
                              'common:templates.publishAsTemplate',
                              'Publish as Template'
                            ),
                            icon: <Share2 className="h-4 w-4" />,
                            onClick: () => {
                              openPublishModal(plan)
                              setOpenDropdownId(null)
                            },
                          },
                        ]}
                        isOpen={openDropdownId === plan.id}
                        onToggle={() =>
                          setOpenDropdownId(
                            openDropdownId === plan.id ? null : plan.id
                          )
                        }
                        onClose={() => setOpenDropdownId(null)}
                        icon={<MoreVertical className="h-4 w-4" />}
                        ariaLabel={t('common:more', 'More')}
                      />
                    </div>
                  </div>

                  {/* Progress Rail */}
                  <PlanProgressRail
                    completedCount={completedCountsByPlan.get(plan.id) ?? 0}
                    dueCount={dueCountsByPlan.get(plan.id) ?? 0}
                    upcomingCount={upcomingCountsByPlan.get(plan.id) ?? 0}
                    className="mb-3"
                  />

                  {/* Compact Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-morandi-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {startTime ??
                          t(
                            'reports:planningView.noUpcoming',
                            'No upcoming session'
                          )}
                      </span>
                    </div>
                    {plan.schedule?.durationMinutes && (
                      <div>{plan.schedule.durationMinutes}m</div>
                    )}
                    {segmentCount > 0 && (
                      <div>
                        {t('reports:planningView.segmentCount', {
                          count: segmentCount,
                        })}
                      </div>
                    )}
                    {allOccurrences.length > 1 && (
                      <div>
                        {t('reports:planningView.scheduledSessions', {
                          count: allOccurrences.length,
                        })}
                      </div>
                    )}
                  </div>

                  {/* Expandable Segments - Only show first few on mobile */}
                  {primaryOccurrence &&
                    primaryOccurrence.segments &&
                    primaryOccurrence.segments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-morandi-stone-100">
                        <div className="flex flex-wrap gap-2">
                          {primaryOccurrence.segments
                            .slice(0, 4)
                            .map((segment, idx) => (
                              <div
                                key={segment.id ?? segment.label ?? idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-morandi-stone-50 text-xs"
                              >
                                <span className="font-medium text-morandi-stone-700">
                                  {segment.label}
                                </span>
                                {segment.durationMinutes && (
                                  <span className="text-morandi-stone-400">
                                    {segment.durationMinutes}m
                                  </span>
                                )}
                              </div>
                            ))}
                          {primaryOccurrence.segments.length > 4 && (
                            <button
                              onClick={() =>
                                openEditModal(plan, primaryOccurrence)
                              }
                              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-morandi-stone-50 text-xs text-morandi-stone-500 hover:bg-morandi-stone-100 transition-colors"
                            >
                              +{primaryOccurrence.segments.length - 4}{' '}
                              {t('common:more', 'more')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Templates Tab Content */}
      {activeTab === 'templates' && (
        <>
          {/* Template Subtabs */}
          <Tabs
            tabs={[
              {
                id: 'browse',
                label: t('common:templates.subtabs.browse', 'Browse'),
              },
              {
                id: 'mine',
                label: t(
                  'common:templates.subtabs.myTemplates',
                  'My Templates'
                ),
              },
            ]}
            activeTab={templateSubtab}
            onTabChange={(tabId: string) =>
              setTemplateSubtab(tabId as 'browse' | 'mine')
            }
          />

          {/* Browse Tab */}
          {templateSubtab === 'browse' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Typography variant="h3" className="text-morandi-stone-900">
                  {t('common:templates.browseTemplates', 'Browse Templates')}
                </Typography>
                <Typography
                  variant="body-sm"
                  className="text-morandi-stone-600"
                >
                  {t(
                    'common:templates.galleryDescription',
                    'Discover and adopt practice plan templates created by tutors and the community.'
                  )}
                </Typography>
              </div>

              <TemplateGallery
                templates={browseTemplates}
                onAdopt={handleAdoptTemplate}
                isLoading={isLoadingTemplates}
                currentUserId={user?.id}
                defaultInstrument={fallbackInstrument}
              />
            </div>
          )}

          {/* My Templates Tab */}
          {templateSubtab === 'mine' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Typography variant="h3" className="text-morandi-stone-900">
                  {t('common:templates.myTemplates', 'My Templates')}
                </Typography>
                <Typography
                  variant="body-sm"
                  className="text-morandi-stone-600"
                >
                  {t(
                    'common:templates.myTemplatesDescription',
                    'Manage your published practice plan templates.'
                  )}
                </Typography>
              </div>

              <TemplateGallery
                templates={myTemplates}
                onAdopt={handleAdoptTemplate}
                onDelete={handleDeleteTemplate}
                isLoading={isLoadingTemplates}
                currentUserId={user?.id}
                showAuthorControls
                defaultInstrument={fallbackInstrument}
              />
            </div>
          )}
        </>
      )}

      {editorModal}
      {checkInModal}

      {/* Template Publisher Modal */}
      {planToPublish && (
        <TemplatePublisherModal
          isOpen={isPublishModalOpen}
          onClose={() => {
            setIsPublishModalOpen(false)
            setPlanToPublish(null)
          }}
          onSubmit={handlePublishTemplate}
          defaultTitle={planToPublish.title}
          defaultDescription={planToPublish.description ?? ''}
        />
      )}
    </div>
  )
}

export default PlanningView
