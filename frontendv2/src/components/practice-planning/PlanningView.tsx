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
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import PlanEditorModal from './PlanEditorModal'
import PlanCheckInModal from './PlanCheckInModal'
import { TemplateGallery } from './TemplateGallery'
import { TemplatePublisherModal } from './TemplatePublisherModal'
import {
  usePlanningStore,
  useCompletedOccurrences,
  useDueTodayOccurrences,
  useUpcomingOccurrences,
  useNextActionableOccurrence,
  type CreatePlanDraft,
} from '@/stores/planningStore'
import {
  Calendar,
  Plus,
  MoreVertical,
  BookTemplate,
  Share2,
} from 'lucide-react'
import PlanReminderCard, { type PlanReminderStatus } from './PlanReminderCard'
import PlanProgressRail from './PlanProgressRail'
import PlanningAnalyticsPanel from './PlanningAnalyticsPanel'
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
  const nextActionableOccurrence = useNextActionableOccurrence()
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
    setActiveCheckIn(null)
  }

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

      // Reload templates to show the newly published one
      await loadTemplates()

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

  const handleAdoptTemplate = async (templateId: string) => {
    try {
      await adoptTemplate(templateId)

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

  const heroStats = [
    {
      label: t('reports:planningView.hero.stats.due', 'Due today'),
      value: dueTodayOccurrences.length,
    },
    {
      label: t('reports:planningView.hero.stats.upcoming', 'Upcoming'),
      value: upcomingOccurrences.length,
    },
    {
      label: t('reports:planningView.hero.stats.plans', 'Active plans'),
      value: plans.length,
    },
  ]

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
    <div className="p-3 sm:p-4 space-y-4">
      <Card className="border-none bg-gradient-to-br from-morandi-sage-50 via-white to-morandi-stone-50 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="space-y-4 lg:max-w-sm">
              <div className="space-y-2">
                <Typography
                  variant="body-sm"
                  className="text-xs uppercase tracking-wide text-morandi-sage-700"
                >
                  {t('reports:planningView.hero.eyebrow', 'Practice planning')}
                </Typography>
                <Typography variant="h2" className="text-morandi-stone-900">
                  {t(
                    'reports:planningView.hero.title',
                    'Stay on track this week'
                  )}
                </Typography>
                <Typography variant="body" className="text-morandi-stone-600">
                  {t(
                    'reports:planningView.hero.description',
                    'Review what is due, log progress, and let Mirubato nudge you when it is time to practice.'
                  )}
                </Typography>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {heroStats.map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-white/80 px-4 py-3 shadow-inner"
                  >
                    <p className="text-xs uppercase text-morandi-stone-500">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-semibold text-morandi-stone-900">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
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
            <div className="flex-1 space-y-3">
              {heroReminders.length > 0 ? (
                heroReminders.map(item => (
                  <PlanReminderCard
                    key={item.occurrence.id}
                    occurrence={item.occurrence}
                    plan={item.plan}
                    status={item.status}
                    isPrimary={Boolean(
                      nextActionableOccurrence &&
                        nextActionableOccurrence.id === item.occurrence.id
                    )}
                    fallbackInstrument={fallbackInstrument}
                    onCheckIn={(plan, occurrence) =>
                      startCheckIn(plan, occurrence, 'reminder')
                    }
                    onOpenPlan={(plan, occurrence) => {
                      trackPlanningEvent('planning.plan.reminder.open', {
                        planId: plan.id,
                        occurrenceId: occurrence.id,
                      })
                      openEditModal(plan, occurrence)
                    }}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-morandi-stone-200 bg-white/60 p-4">
                  <Typography variant="body" className="text-morandi-stone-600">
                    {t(
                      'reports:planningView.reminders.none',
                      "You're all set. We'll surface new reminders once sessions are scheduled."
                    )}
                  </Typography>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {activeTab === 'plans' &&
        plans.map(plan => {
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-morandi-sage-100">
                      <Calendar className="h-5 w-5 text-morandi-sage-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg sm:text-xl">
                            {plan.title}
                          </CardTitle>
                          {plan.templateVersion && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-morandi-sage-100 text-morandi-sage-700">
                              <BookTemplate className="h-3 w-3" />
                              {t(
                                'common:templates.fromTemplate',
                                'From Template'
                              )}
                            </span>
                          )}
                          {publishedPlanIds.has(plan.id) && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-morandi-blue-100 text-morandi-blue-700">
                              <Share2 className="h-3 w-3" />
                              {t(
                                'common:templates.publishedAsTemplate',
                                'Published'
                              )}
                            </span>
                          )}
                        </div>
                        {plan.description && (
                          <CardDescription className="mt-1">
                            {plan.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
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
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            trackPlanningEvent('planning.plan.edit', {
                              planId: plan.id,
                            })
                            openEditModal(plan, primaryOccurrence)
                          }}
                        >
                          {t('reports:planningView.editPlan', 'Edit plan')}
                        </Button>
                        <DropdownMenu
                          items={[
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
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <PlanProgressRail
                  completedCount={completedCountsByPlan.get(plan.id) ?? 0}
                  dueCount={dueCountsByPlan.get(plan.id) ?? 0}
                  upcomingCount={upcomingCountsByPlan.get(plan.id) ?? 0}
                />

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
                        <span className="ml-2 text-sm font-normal text-morandi-stone-500">
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
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                              className="mt-2 text-morandi-stone-600"
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
                  <div className="border-t border-morandi-stone-200 pt-2 text-xs text-morandi-stone-500">
                    {t('reports:planningView.scheduledSessions', {
                      count: allOccurrences.length,
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

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
