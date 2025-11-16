import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  ModalBody,
  ModalFooter,
  Typography,
  SegmentedControl,
} from '@/components/ui'
import {
  RECURRENCE_WEEKDAYS,
  type RecurrenceWeekday,
  type RecurrenceFrequency,
  type NormalizedRecurrence,
  buildRecurrenceRuleString,
  generateRecurrenceDates,
  normalizeRecurrenceMetadata,
  parseRecurrenceRule,
  type CreatePlanDraft,
} from '@/stores/planningStore'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'

interface PlanEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (draft: CreatePlanDraft) => Promise<void>
  isSubmitting?: boolean
  error?: string | null
  mode?: 'create' | 'edit'
  initialPlan?: {
    plan: PracticePlan
    occurrence?: PlanOccurrence
  } | null
  onDelete?: () => Promise<void> | void
}

interface SegmentState {
  id: string
  label: string
  durationMinutes: string
  instructions: string
  techniques: string
}

interface PromptState {
  id: string
  value: string
}

const createEmptySegment = (): SegmentState => ({
  id: nanoid(),
  label: '',
  durationMinutes: '',
  instructions: '',
  techniques: '',
})

const createEmptyPrompt = (): PromptState => ({
  id: nanoid(),
  value: '',
})

const toLocalDate = (value?: string | null): string => {
  if (!value) return new Date().toISOString().slice(0, 10)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const toLocalTime = (value?: string | null): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const WEEKDAY_CODES = RECURRENCE_WEEKDAYS

type WeekdayCode = RecurrenceWeekday

const WEEKDAY_FALLBACK_LABELS: Record<WeekdayCode, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
}

const CODE_TO_JS_DAY: Record<WeekdayCode, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

const JS_DAY_TO_CODE: Record<number, WeekdayCode> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
}

const ensureTimeFormat = (time?: string) => {
  if (!time) return '00:00:00'
  const trimmed = time.trim()
  if (!trimmed) return '00:00:00'
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`
  }
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed
  }
  return '00:00:00'
}

const combineDateAndTimeLocal = (date: string, time?: string): Date | null => {
  if (!date) return null
  const normalizedTime = ensureTimeFormat(time)
  const candidate = new Date(`${date}T${normalizedTime}`)
  if (Number.isNaN(candidate.getTime())) {
    return null
  }
  return candidate
}

const PREVIEW_OCCURRENCES_LIMIT = 10

export function PlanEditorModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
  mode = 'create',
  initialPlan = null,
  onDelete,
}: PlanEditorModalProps) {
  const { t, i18n } = useTranslation(['reports', 'common'])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [startTime, setStartTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('30')
  const [flexibility, setFlexibility] = useState<
    'fixed' | 'same-day' | 'anytime'
  >('anytime')
  const [scheduleKind, setScheduleKind] = useState<'single' | 'recurring'>(
    'single'
  )
  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState<RecurrenceFrequency>('WEEKLY')
  const [recurrenceInterval, setRecurrenceInterval] = useState('1')
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<WeekdayCode[]>(
    []
  )
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<
    'never' | 'onDate' | 'afterCount'
  >('never')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceCount, setRecurrenceCount] = useState('10')
  const [segments, setSegments] = useState<SegmentState[]>([
    createEmptySegment(),
  ])
  const [prompts, setPrompts] = useState<PromptState[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [editingIds, setEditingIds] = useState<{
    planId?: string
    occurrenceId?: string
  } | null>(null)

  const flexibilityOptions = useMemo(
    () => [
      {
        value: 'fixed',
        label: t(
          'reports:planningEditor.flexibilityOptions.fixed',
          'Fixed time'
        ),
      },
      {
        value: 'same-day',
        label: t(
          'reports:planningEditor.flexibilityOptions.sameDay',
          'Same day'
        ),
      },
      {
        value: 'anytime',
        label: t(
          'reports:planningEditor.flexibilityOptions.anytime',
          'Anytime'
        ),
      },
    ],
    [t]
  )

  const scheduleKindOptions = useMemo(
    () => [
      {
        value: 'single',
        label: t('reports:planningEditor.schedule.single', 'Single session'),
      },
      {
        value: 'recurring',
        label: t(
          'reports:planningEditor.schedule.recurring',
          'Recurring schedule'
        ),
      },
    ],
    [t]
  )

  const recurrenceFrequencyOptions = useMemo(
    () => [
      {
        value: 'DAILY',
        label: t('reports:planningEditor.recurrence.frequency.daily', 'Daily'),
      },
      {
        value: 'WEEKLY',
        label: t(
          'reports:planningEditor.recurrence.frequency.weekly',
          'Weekly'
        ),
      },
      {
        value: 'MONTHLY',
        label: t(
          'reports:planningEditor.recurrence.frequency.monthly',
          'Monthly'
        ),
      },
    ],
    [t]
  )

  const recurrenceEndModeOptions = useMemo(
    () => [
      {
        value: 'never',
        label: t('reports:planningEditor.recurrence.end.never', 'No end date'),
      },
      {
        value: 'onDate',
        label: t('reports:planningEditor.recurrence.end.onDate', 'End on date'),
      },
      {
        value: 'afterCount',
        label: t(
          'reports:planningEditor.recurrence.end.afterCount',
          'End after count'
        ),
      },
    ],
    [t]
  )

  const weekdayOptions = useMemo(
    () =>
      WEEKDAY_CODES.map(code => ({
        code,
        label: t(
          `reports:planningEditor.weekdays.${code.toLowerCase()}`,
          WEEKDAY_FALLBACK_LABELS[code]
        ),
      })),
    [t]
  )

  const previewFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [i18n.language]
  )

  const recurrencePreviewDates = useMemo(() => {
    if (scheduleKind !== 'recurring') {
      return [] as Date[]
    }

    const startDateTime = combineDateAndTimeLocal(
      startDate,
      startTime || undefined
    )
    if (!startDateTime) {
      return [] as Date[]
    }

    const intervalValue = Number.parseInt(recurrenceInterval, 10)
    if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
      return [] as Date[]
    }

    const weekdaysForRecurrence =
      recurrenceFrequency === 'WEEKLY'
        ? recurrenceWeekdays.length > 0
          ? recurrenceWeekdays
          : [JS_DAY_TO_CODE[startDateTime.getDay()]]
        : undefined

    let countValue: number | undefined
    if (recurrenceEndMode === 'afterCount') {
      const parsedCount = Number.parseInt(recurrenceCount, 10)
      if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
        return [] as Date[]
      }
      countValue = parsedCount
    }

    let untilDate: Date | null = null
    if (recurrenceEndMode === 'onDate') {
      if (!recurrenceEndDate) {
        return [] as Date[]
      }
      untilDate = combineDateAndTimeLocal(recurrenceEndDate, '23:59:59')
      if (!untilDate) {
        return [] as Date[]
      }
    }

    try {
      return generateRecurrenceDates(
        {
          start: startDateTime,
          frequency: recurrenceFrequency,
          interval: intervalValue,
          weekdays: weekdaysForRecurrence,
          count: countValue,
          until: untilDate,
        },
        {
          maxOccurrences:
            countValue && countValue > 0
              ? Math.min(countValue, PREVIEW_OCCURRENCES_LIMIT)
              : PREVIEW_OCCURRENCES_LIMIT,
          horizonDays: 365,
        }
      )
    } catch (error) {
      console.warn('[PlanEditor] Failed to preview recurrence', error)
      return [] as Date[]
    }
  }, [
    scheduleKind,
    startDate,
    startTime,
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceWeekdays,
    recurrenceEndMode,
    recurrenceEndDate,
    recurrenceCount,
  ])

  const recurrencePreviewStrings = useMemo(
    () => recurrencePreviewDates.map(date => previewFormatter.format(date)),
    [recurrencePreviewDates, previewFormatter]
  )

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStartDate(new Date().toISOString().slice(0, 10))
    setStartTime('')
    setDurationMinutes('30')
    setFlexibility('anytime')
    setScheduleKind('single')
    setRecurrenceFrequency('WEEKLY')
    setRecurrenceInterval('1')
    setRecurrenceWeekdays([])
    setRecurrenceEndMode('never')
    setRecurrenceEndDate('')
    setRecurrenceCount('10')
    setSegments([createEmptySegment()])
    setPrompts([])
    setFormError(null)
    setEditingIds(null)
  }

  const hydrateFromPlan = (plan: PracticePlan, occurrence?: PlanOccurrence) => {
    setEditingIds({ planId: plan.id, occurrenceId: occurrence?.id })
    setTitle(plan.title)
    setDescription(plan.description ?? '')

    const nextScheduleKind = plan.schedule.kind ?? 'single'
    setScheduleKind(nextScheduleKind)

    let nextRecurrenceFrequency: RecurrenceFrequency = 'WEEKLY'
    let nextRecurrenceInterval = 1
    let nextRecurrenceWeekdays: WeekdayCode[] = []
    let nextEndMode: 'never' | 'onDate' | 'afterCount' = 'never'
    let nextEndDate = ''
    let nextCount = '10'

    if (nextScheduleKind === 'recurring') {
      const recurrenceMetadata = normalizeRecurrenceMetadata(
        (plan.schedule.metadata as { recurrence?: unknown })?.recurrence
      )

      const recurrenceFromRule =
        plan.schedule.rule && !recurrenceMetadata
          ? parseRecurrenceRule(plan.schedule.rule)
          : null

      const normalizedRecurrence = recurrenceMetadata || recurrenceFromRule

      if (normalizedRecurrence) {
        nextRecurrenceFrequency = normalizedRecurrence.frequency
        nextRecurrenceInterval = normalizedRecurrence.interval

        if (
          normalizedRecurrence.frequency === 'WEEKLY' &&
          normalizedRecurrence.weekdays?.length
        ) {
          nextRecurrenceWeekdays = normalizedRecurrence.weekdays
        }

        if (
          typeof normalizedRecurrence.count === 'number' &&
          normalizedRecurrence.count > 0
        ) {
          nextEndMode = 'afterCount'
          nextCount = String(normalizedRecurrence.count)
        } else if (normalizedRecurrence.until) {
          nextEndMode = 'onDate'
          nextEndDate = normalizedRecurrence.until
        }
      }

      if (
        nextRecurrenceFrequency === 'WEEKLY' &&
        nextRecurrenceWeekdays.length === 0
      ) {
        let baseDate: Date | null = null
        if (occurrence?.scheduledStart) {
          const parsed = new Date(occurrence.scheduledStart)
          if (!Number.isNaN(parsed.getTime())) {
            baseDate = parsed
          }
        }
        if (!baseDate) {
          baseDate = combineDateAndTimeLocal(
            plan.schedule.startDate ?? '',
            plan.schedule.timeOfDay ?? undefined
          )
        }
        if (!baseDate) {
          baseDate = new Date()
        }
        nextRecurrenceWeekdays = [JS_DAY_TO_CODE[baseDate.getDay()]]
      }

      if (!nextEndDate && plan.schedule.endDate) {
        nextEndMode = 'onDate'
        nextEndDate = plan.schedule.endDate.slice(0, 10)
      }
    }

    if (nextScheduleKind === 'recurring') {
      setRecurrenceFrequency(nextRecurrenceFrequency)
      setRecurrenceInterval(String(nextRecurrenceInterval))
      setRecurrenceWeekdays(nextRecurrenceWeekdays)
      setRecurrenceEndMode(nextEndMode)
      setRecurrenceEndDate(nextEndDate)
      setRecurrenceCount(nextCount)
    } else {
      setRecurrenceFrequency('WEEKLY')
      setRecurrenceInterval('1')
      setRecurrenceWeekdays([])
      setRecurrenceEndMode('never')
      setRecurrenceEndDate('')
      setRecurrenceCount('10')
    }

    if (occurrence?.scheduledStart) {
      setStartDate(toLocalDate(occurrence.scheduledStart))
      setStartTime(toLocalTime(occurrence.scheduledStart))
    } else {
      setStartDate(
        plan.schedule.startDate ?? new Date().toISOString().slice(0, 10)
      )
      setStartTime(plan.schedule.timeOfDay ?? '')
    }

    const durationValue =
      plan.schedule.durationMinutes ??
      occurrence?.segments?.reduce(
        (sum, segment) => sum + (segment.durationMinutes ?? 0),
        0
      )

    setDurationMinutes(durationValue ? String(durationValue) : '')
    setFlexibility(plan.schedule.flexibility ?? 'anytime')

    const segmentStates = occurrence?.segments?.map(segment => ({
      id: segment.id ?? nanoid(),
      label: segment.label,
      durationMinutes: segment.durationMinutes
        ? String(segment.durationMinutes)
        : '',
      instructions: segment.instructions ?? '',
      techniques: (segment.techniques ?? []).join(', '),
    }))

    setSegments(
      segmentStates && segmentStates.length > 0
        ? segmentStates
        : [createEmptySegment()]
    )

    const promptStates = occurrence?.reflectionPrompts?.map(prompt => ({
      id: nanoid(),
      value: prompt,
    }))
    setPrompts(promptStates ?? [])
    setFormError(null)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    if (mode === 'edit' && initialPlan) {
      hydrateFromPlan(initialPlan.plan, initialPlan.occurrence)
    } else if (mode === 'create') {
      resetForm()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, initialPlan?.plan.id, initialPlan?.occurrence?.id])

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const handleAddSegment = () => {
    setSegments(prev => [...prev, createEmptySegment()])
  }

  const handleRemoveSegment = (id: string) => {
    setSegments(prev =>
      prev.length > 1 ? prev.filter(seg => seg.id !== id) : prev
    )
  }

  const handleSegmentChange = (
    id: string,
    field: keyof SegmentState,
    value: string
  ) => {
    setSegments(prev =>
      prev.map(segment =>
        segment.id === id
          ? {
              ...segment,
              [field]: value,
            }
          : segment
      )
    )
  }

  const handleAddPrompt = () => {
    setPrompts(prev => [...prev, createEmptyPrompt()])
  }

  const handlePromptChange = (id: string, value: string) => {
    setPrompts(prev =>
      prev.map(prompt => (prompt.id === id ? { ...prompt, value } : prompt))
    )
  }

  const handleRemovePrompt = (id: string) => {
    setPrompts(prev => prev.filter(prompt => prompt.id !== id))
  }

  const handleToggleWeekday = (code: WeekdayCode) => {
    setRecurrenceWeekdays(prev => {
      if (prev.includes(code)) {
        return prev.filter(value => value !== code)
      }
      const next = [...prev, code]
      next.sort((a, b) => CODE_TO_JS_DAY[a] - CODE_TO_JS_DAY[b])
      return next
    })
  }

  const composeDraft = (): CreatePlanDraft | null => {
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setFormError(
        t(
          'reports:planningEditor.validation.titleRequired',
          'Plan title is required'
        )
      )
      return null
    }

    if (!startDate) {
      setFormError(
        t(
          'reports:planningEditor.validation.dateRequired',
          'Start date is required'
        )
      )
      return null
    }

    const preparedSegments = segments
      .map(segment => ({
        ...segment,
        label: segment.label.trim(),
      }))
      .filter(segment => segment.label.length > 0)

    if (preparedSegments.length === 0) {
      setFormError(
        t(
          'reports:planningEditor.validation.segmentRequired',
          'Each segment needs a name'
        )
      )
      return null
    }

    const parsedSegments = preparedSegments.map(segment => ({
      id: segment.id,
      label: segment.label,
      durationMinutes: segment.durationMinutes
        ? Number.parseInt(segment.durationMinutes, 10) || undefined
        : undefined,
      instructions: segment.instructions.trim() || undefined,
      techniques: segment.techniques
        .split(',')
        .map(tech => tech.trim())
        .filter(Boolean),
    }))

    const preparedPrompts = prompts
      .map(prompt => prompt.value.trim())
      .filter(Boolean)

    const parsedDuration = durationMinutes.trim()
      ? Number.parseInt(durationMinutes, 10) || undefined
      : undefined

    const effectiveScheduleKind = scheduleKind
    const baseEndDate =
      mode === 'edit' ? (initialPlan?.plan.schedule.endDate ?? null) : null

    let recurrenceRule: string | undefined
    let recurrenceConfig: CreatePlanDraft['schedule']['recurrence']
    let scheduleEndDate: string | null | undefined =
      effectiveScheduleKind === 'recurring' ? null : baseEndDate

    if (effectiveScheduleKind === 'recurring') {
      const startDateTime = combineDateAndTimeLocal(
        startDate,
        startTime || undefined
      )

      if (!startDateTime) {
        setFormError(
          t(
            'reports:planningEditor.validation.recurrenceStartInvalid',
            'Recurring plans require a valid start date'
          )
        )
        return null
      }

      const intervalValue = Number.parseInt(recurrenceInterval, 10)
      if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
        setFormError(
          t(
            'reports:planningEditor.validation.recurrenceInterval',
            'Recurrence interval must be at least 1'
          )
        )
        return null
      }

      const weekdaysForRecurrence =
        recurrenceFrequency === 'WEEKLY'
          ? recurrenceWeekdays.length > 0
            ? recurrenceWeekdays
            : [JS_DAY_TO_CODE[startDateTime.getDay()]]
          : undefined

      const normalizedRecurrence: NormalizedRecurrence = {
        frequency: recurrenceFrequency,
        interval: intervalValue,
        weekdays: weekdaysForRecurrence,
      }

      if (recurrenceEndMode === 'afterCount') {
        const parsedCount = Number.parseInt(recurrenceCount, 10)
        if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
          setFormError(
            t(
              'reports:planningEditor.validation.recurrenceCount',
              'Number of occurrences must be at least 1'
            )
          )
          return null
        }
        normalizedRecurrence.count = parsedCount
        scheduleEndDate = null
      } else if (recurrenceEndMode === 'onDate') {
        if (!recurrenceEndDate) {
          setFormError(
            t(
              'reports:planningEditor.validation.recurrenceEndDateRequired',
              'Select an end date for the recurring plan'
            )
          )
          return null
        }
        const untilDate = combineDateAndTimeLocal(recurrenceEndDate, '23:59:59')
        if (!untilDate) {
          setFormError(
            t(
              'reports:planningEditor.validation.recurrenceEndDateInvalid',
              'End date must be a valid date'
            )
          )
          return null
        }
        normalizedRecurrence.until = recurrenceEndDate
        scheduleEndDate = recurrenceEndDate
      } else {
        scheduleEndDate = null
      }

      recurrenceRule = buildRecurrenceRuleString(normalizedRecurrence)

      recurrenceConfig = {
        frequency: normalizedRecurrence.frequency,
        interval: normalizedRecurrence.interval,
        weekdays: normalizedRecurrence.weekdays,
        count: normalizedRecurrence.count,
        until: normalizedRecurrence.until ?? undefined,
      }
    }

    return {
      planId: editingIds?.planId,
      occurrenceId: editingIds?.occurrenceId,
      title: trimmedTitle,
      description: description.trim() || undefined,
      schedule: {
        kind: effectiveScheduleKind,
        startDate,
        timeOfDay: startTime || undefined,
        durationMinutes: parsedDuration,
        flexibility,
        endDate:
          effectiveScheduleKind === 'recurring'
            ? (scheduleEndDate ?? null)
            : baseEndDate,
        rule: recurrenceRule,
        recurrence: recurrenceConfig,
      },
      segments: parsedSegments,
      reflectionPrompts: preparedPrompts,
      focusAreas: mode === 'edit' ? initialPlan?.plan.focusAreas : undefined,
      techniques: mode === 'edit' ? initialPlan?.plan.techniques : undefined,
      type: mode === 'edit' ? initialPlan?.plan.type : undefined,
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setFormError(null)
    const draft = composeDraft()
    if (!draft) return

    try {
      await onSubmit(draft)
      if (mode === 'create') {
        resetForm()
      }
      onClose()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t('reports:planningEditor.genericError', 'Something went wrong')
      setFormError(message)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !editingIds?.planId || isSubmitting) {
      return
    }
    const confirmed = window.confirm(
      t(
        'reports:planningEditor.deleteConfirmation',
        'Are you sure you want to delete this plan?'
      )
    )
    if (!confirmed) return

    try {
      await onDelete()
      resetForm()
      onClose()
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : t('reports:planningEditor.genericError', 'Something went wrong')
      setFormError(message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === 'edit'
          ? t('reports:planningEditor.editTitle', 'Edit practice plan')
          : t('reports:planningEditor.title', 'New Practice Plan')
      }
      size="xl"
      isMobileOptimized
    >
      <ModalBody className="space-y-6">
        <section className="space-y-3">
          <Typography variant="h3">
            {t('reports:planningEditor.basicInfo', 'Basic details')}
          </Typography>
          <Input
            id="plan-title"
            label={t('reports:planningEditor.planTitle', 'Plan title')}
            value={title}
            onChange={event => setTitle(event.target.value)}
            required
            fullWidth
          />
          <Textarea
            id="plan-description"
            label={t('reports:planningEditor.description', 'Description')}
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder={t(
              'reports:planningEditor.descriptionPlaceholder',
              'What is the goal of this plan?'
            )}
            fullWidth
          />
        </section>

        <section className="space-y-4">
          <div className="space-y-3">
            <Typography variant="h3">
              {t('reports:planningEditor.schedule', 'Schedule')}
            </Typography>
            <SegmentedControl
              options={scheduleKindOptions}
              value={scheduleKind}
              onChange={value =>
                setScheduleKind(value as 'single' | 'recurring')
              }
              fullWidth
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="plan-start-date"
              label={t('reports:planningEditor.startDate', 'Start date')}
              type="date"
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
              required
            />
            <Input
              id="plan-start-time"
              label={t('reports:planningEditor.startTime', 'Start time')}
              type="time"
              value={startTime}
              onChange={event => setStartTime(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="plan-duration"
              label={t('reports:planningEditor.duration', 'Duration (minutes)')}
              type="number"
              min={1}
              value={durationMinutes}
              onChange={event => setDurationMinutes(event.target.value)}
            />
            <Select
              value={flexibility}
              onChange={value =>
                setFlexibility(value as 'fixed' | 'same-day' | 'anytime')
              }
              options={flexibilityOptions}
              label={t('reports:planningEditor.flexibility', 'Flexibility')}
              placeholder={t(
                'reports:planningEditor.flexibilityPlaceholder',
                'Choose flexibility'
              )}
            />
          </div>
          {scheduleKind === 'recurring' && (
            <div className="space-y-4 rounded-xl border border-morandi-stone-200 bg-morandi-stone-50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  value={recurrenceFrequency}
                  onChange={value =>
                    setRecurrenceFrequency(value as RecurrenceFrequency)
                  }
                  options={recurrenceFrequencyOptions}
                  label={t(
                    'reports:planningEditor.recurrence.frequencyLabel',
                    'Frequency'
                  )}
                  placeholder={t(
                    'reports:planningEditor.recurrence.frequencyPlaceholder',
                    'Choose frequency'
                  )}
                />
                <Input
                  id="plan-recurrence-interval"
                  label={t(
                    'reports:planningEditor.recurrence.intervalLabel',
                    'Interval'
                  )}
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  onChange={event => setRecurrenceInterval(event.target.value)}
                />
              </div>
              {recurrenceFrequency === 'WEEKLY' && (
                <div className="space-y-2">
                  <Typography
                    variant="body-sm"
                    className="font-medium text-morandi-stone-700"
                  >
                    {t(
                      'reports:planningEditor.recurrence.weekdaysLabel',
                      'Repeat on'
                    )}
                  </Typography>
                  <div className="flex flex-wrap gap-2">
                    {weekdayOptions.map(day => {
                      const isActive = recurrenceWeekdays.includes(day.code)
                      return (
                        <Button
                          key={day.code}
                          variant={isActive ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleWeekday(day.code)}
                        >
                          {day.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  value={recurrenceEndMode}
                  onChange={value =>
                    setRecurrenceEndMode(
                      value as 'never' | 'onDate' | 'afterCount'
                    )
                  }
                  options={recurrenceEndModeOptions}
                  label={t(
                    'reports:planningEditor.recurrence.endModeLabel',
                    'Ends'
                  )}
                  placeholder={t(
                    'reports:planningEditor.recurrence.endModePlaceholder',
                    'Choose ending'
                  )}
                />
                {recurrenceEndMode === 'onDate' && (
                  <Input
                    id="plan-recurrence-end-date"
                    label={t(
                      'reports:planningEditor.recurrence.endDateLabel',
                      'End date'
                    )}
                    type="date"
                    value={recurrenceEndDate}
                    onChange={event => setRecurrenceEndDate(event.target.value)}
                  />
                )}
                {recurrenceEndMode === 'afterCount' && (
                  <Input
                    id="plan-recurrence-count"
                    label={t(
                      'reports:planningEditor.recurrence.countLabel',
                      'Number of occurrences'
                    )}
                    type="number"
                    min={1}
                    value={recurrenceCount}
                    onChange={event => setRecurrenceCount(event.target.value)}
                  />
                )}
              </div>
              {recurrencePreviewStrings.length > 0 && (
                <div className="space-y-2 rounded-lg bg-morandi-stone-100 p-3">
                  <Typography
                    variant="body-sm"
                    className="font-medium text-morandi-stone-700"
                  >
                    {t(
                      'reports:planningEditor.recurrence.previewLabel',
                      'Upcoming occurrences'
                    )}
                  </Typography>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-morandi-stone-600">
                    {recurrencePreviewStrings.map(value => (
                      <li key={value}>{value}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="h3">
              {t('reports:planningEditor.segments', 'Segments')}
            </Typography>
            <Button variant="secondary" onClick={handleAddSegment}>
              {t('reports:planningEditor.addSegment', 'Add segment')}
            </Button>
          </div>
          <div className="space-y-4">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                className="rounded-xl border border-morandi-stone-200 bg-morandi-stone-50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Typography variant="h4">
                    {t(
                      'reports:planningEditor.segmentLabel',
                      'Segment {{index}}',
                      {
                        index: index + 1,
                      }
                    )}
                  </Typography>
                  {segments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSegment(segment.id)}
                    >
                      {t('reports:planningEditor.removeSegment', 'Remove')}
                    </Button>
                  )}
                </div>
                <Input
                  id={`segment-label-${segment.id}`}
                  label={t('reports:planningEditor.segmentName', 'Name')}
                  value={segment.label}
                  onChange={event =>
                    handleSegmentChange(segment.id, 'label', event.target.value)
                  }
                  required
                  fullWidth
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    id={`segment-duration-${segment.id}`}
                    label={t(
                      'reports:planningEditor.segmentDuration',
                      'Duration (minutes)'
                    )}
                    type="number"
                    min={1}
                    value={segment.durationMinutes}
                    onChange={event =>
                      handleSegmentChange(
                        segment.id,
                        'durationMinutes',
                        event.target.value
                      )
                    }
                  />
                  <Input
                    id={`segment-techniques-${segment.id}`}
                    label={t(
                      'reports:planningEditor.segmentTechniques',
                      'Techniques (comma separated)'
                    )}
                    value={segment.techniques}
                    onChange={event =>
                      handleSegmentChange(
                        segment.id,
                        'techniques',
                        event.target.value
                      )
                    }
                    placeholder={t(
                      'reports:planningEditor.techniquesPlaceholder',
                      'e.g. slow practice, rhythm accents'
                    )}
                  />
                </div>
                <Textarea
                  id={`segment-instructions-${segment.id}`}
                  label={t(
                    'reports:planningEditor.segmentInstructions',
                    'Instructions'
                  )}
                  value={segment.instructions}
                  onChange={event =>
                    handleSegmentChange(
                      segment.id,
                      'instructions',
                      event.target.value
                    )
                  }
                  placeholder={t(
                    'reports:planningEditor.segmentInstructionsPlaceholder',
                    'Describe what to focus on during this segment'
                  )}
                  fullWidth
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="h3">
              {t(
                'reports:planningEditor.reflectionPrompts',
                'Reflection prompts'
              )}
            </Typography>
            <Button variant="secondary" onClick={handleAddPrompt}>
              {t('reports:planningEditor.addPrompt', 'Add prompt')}
            </Button>
          </div>
          {prompts.length === 0 ? (
            <Typography variant="body" className="text-morandi-stone-600">
              {t(
                'reports:planningEditor.promptHelper',
                'Use prompts to guide post-practice reflections.'
              )}
            </Typography>
          ) : (
            <div className="space-y-3">
              {prompts.map(prompt => (
                <div key={prompt.id} className="flex items-center gap-3">
                  <Input
                    id={`prompt-${prompt.id}`}
                    value={prompt.value}
                    onChange={event =>
                      handlePromptChange(prompt.id, event.target.value)
                    }
                    fullWidth
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePrompt(prompt.id)}
                  >
                    {t('reports:planningEditor.removePrompt', 'Remove')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {(formError || error) && (
          <Typography variant="body" className="text-morandi-rose-500">
            {formError || error}
          </Typography>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
          {t('reports:planningEditor.cancel', 'Cancel')}
        </Button>
        {mode === 'edit' && onDelete && (
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {t('reports:planningEditor.deletePlan', 'Delete plan')}
          </Button>
        )}
        <Button onClick={handleSubmit} loading={isSubmitting}>
          {mode === 'edit'
            ? t('reports:planningEditor.updatePlan', 'Save changes')
            : t('reports:planningEditor.createPlan', 'Create plan')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default PlanEditorModal
