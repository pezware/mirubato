import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Textarea,
  Typography,
} from '@/components/ui'
import type { PracticePlan, PlanOccurrence } from '@/api/planning'
import { useLogbookStore } from '@/stores/logbookStore'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { toLogbookInstrument } from '@/utils/instrumentGuards'

interface PlanCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  plan: PracticePlan
  occurrence: PlanOccurrence
  onComplete: (input: {
    occurrenceId: string
    logEntryId: string
    responses: Record<string, string>
    metrics?: Record<string, unknown>
  }) => Promise<void>
}

const sumSegmentDuration = (occurrence: PlanOccurrence): number => {
  return (occurrence.segments ?? []).reduce((total, segment) => {
    const minutes = segment?.durationMinutes ?? 0
    return total + minutes
  }, 0)
}

export function PlanCheckInModal({
  isOpen,
  onClose,
  plan,
  occurrence,
  onComplete,
}: PlanCheckInModalProps) {
  const { t } = useTranslation(['reports'])
  const createEntry = useLogbookStore(state => state.createEntry)
  const { getPrimaryInstrument } = useUserPreferences()

  const defaultDuration = useMemo(() => {
    if (plan.schedule.durationMinutes && plan.schedule.durationMinutes > 0) {
      return plan.schedule.durationMinutes
    }
    const segmentTotal = sumSegmentDuration(occurrence)
    return segmentTotal > 0 ? segmentTotal : 30
  }, [plan.schedule.durationMinutes, occurrence])

  const [actualDuration, setActualDuration] = useState<string>(
    String(defaultDuration)
  )
  const [notes, setNotes] = useState('')
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setActualDuration(String(defaultDuration))
      setNotes('')
      setResponses({})
      setSubmitError(null)
    }
  }, [isOpen, defaultDuration])

  const handlePromptChange = (prompt: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [prompt]: value,
    }))
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setSubmitError(null)

    const parsedDuration = Number.parseInt(actualDuration, 10)
    const duration =
      Number.isNaN(parsedDuration) || parsedDuration <= 0 ? 1 : parsedDuration

    const instrument = toLogbookInstrument(getPrimaryInstrument())

    const aggregatedTechniques = Array.from(
      new Set(
        (occurrence.segments ?? [])
          .flatMap(segment => segment.techniques ?? [])
          .map(tech => tech.trim())
          .filter(Boolean)
      )
    )

    const timestamp = new Date().toISOString()

    const summaryNotes =
      notes.trim() ||
      `${plan.title} · ${t('reports:planningCheckIn.defaultNote', 'Logged from practice plan')}`

    const entryPayload = {
      timestamp,
      duration,
      type: 'practice' as const,
      instrument,
      pieces: [],
      techniques: aggregatedTechniques,
      goalIds: [],
      notes: summaryNotes,
      mood: null,
      tags: [],
      metadata: {
        source: 'practice_plan',
        planId: plan.id,
        planOccurrenceId: occurrence.id,
      },
    }

    setIsSubmitting(true)
    try {
      const entry = await createEntry(entryPayload)

      await onComplete({
        occurrenceId: occurrence.id,
        logEntryId: entry.id,
        responses,
        metrics: {
          actualDuration: duration,
        },
      })

      setResponses({})
      setNotes('')
      setIsSubmitting(false)
      onClose()
    } catch (error) {
      setIsSubmitting(false)
      const message =
        error instanceof Error
          ? error.message
          : t(
              'reports:planningCheckIn.genericError',
              'Unable to complete check-in'
            )
      setSubmitError(message)
    }
  }

  const segmentSummary = useMemo(() => {
    return (occurrence.segments ?? []).map(segment => ({
      id: segment.id ?? segment.label,
      label: segment.label,
      duration: segment.durationMinutes,
      instructions: segment.instructions,
      techniques: segment.techniques ?? [],
    }))
  }, [occurrence.segments])

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (isSubmitting) return
        setSubmitError(null)
        onClose()
      }}
      title={t('reports:planningCheckIn.title', 'Check in and log practice')}
      size="lg"
      isMobileOptimized
    >
      <ModalBody className="space-y-5">
        <section className="space-y-2">
          <Typography variant="h3">{plan.title}</Typography>
          <Typography variant="body" className="text-muted-foreground">
            {t(
              'reports:planningCheckIn.upcomingSession',
              'Next session details'
            )}
          </Typography>
          <div className="space-y-3">
            {segmentSummary.map(segment => (
              <div
                key={segment.id}
                className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Typography variant="h4">{segment.label}</Typography>
                  {segment.duration ? (
                    <Typography
                      variant="body"
                      className="text-muted-foreground"
                    >
                      {segment.duration}m
                    </Typography>
                  ) : null}
                </div>
                {segment.instructions && (
                  <Typography variant="body" className="text-muted-foreground">
                    {segment.instructions}
                  </Typography>
                )}
                {segment.techniques.length > 0 && (
                  <Typography variant="body" className="text-muted-foreground">
                    {segment.techniques.join(' · ')}
                  </Typography>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="checkin-duration"
            label={t(
              'reports:planningCheckIn.actualDuration',
              'Actual duration (minutes)'
            )}
            type="number"
            min={1}
            value={actualDuration}
            onChange={event => setActualDuration(event.target.value)}
          />
          <Input
            id="checkin-notes"
            label={t('reports:planningCheckIn.notes', 'Notes')}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder={t(
              'reports:planningCheckIn.notesPlaceholder',
              'What stood out about this session?'
            )}
          />
        </section>

        <section className="space-y-3">
          <Typography variant="h3">
            {t('reports:planningCheckIn.reflection', 'Reflection')}
          </Typography>
          {(occurrence.reflectionPrompts ?? []).length === 0 ? (
            <Typography variant="body" className="text-muted-foreground">
              {t(
                'reports:planningCheckIn.noPrompts',
                'No prompts configured for this session.'
              )}
            </Typography>
          ) : (
            <div className="space-y-3">
              {(occurrence.reflectionPrompts ?? []).map(prompt => (
                <Textarea
                  key={prompt}
                  id={`prompt-${prompt}`}
                  label={prompt}
                  value={responses[prompt] ?? ''}
                  onChange={event =>
                    handlePromptChange(prompt, event.target.value)
                  }
                  placeholder={t(
                    'reports:planningCheckIn.promptPlaceholder',
                    'Add your thoughts here'
                  )}
                  fullWidth
                />
              ))}
            </div>
          )}
        </section>

        {submitError && (
          <Typography variant="body" className="text-red-600">
            {submitError}
          </Typography>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          {t('reports:planningCheckIn.cancel', 'Cancel')}
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          {t('reports:planningCheckIn.complete', 'Check off')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default PlanCheckInModal
