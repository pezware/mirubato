import { useMemo, useState } from 'react'
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
} from '@/components/ui'
import type { CreatePlanDraft } from '@/stores/planningStore'

interface PlanEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (draft: CreatePlanDraft) => Promise<void>
  isSubmitting?: boolean
  error?: string | null
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

export function PlanEditorModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
}: PlanEditorModalProps) {
  const { t } = useTranslation(['reports', 'common'])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [startTime, setStartTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('30')
  const [flexibility, setFlexibility] = useState<
    'fixed' | 'same-day' | 'anytime'
  >('anytime')
  const [segments, setSegments] = useState<SegmentState[]>([
    createEmptySegment(),
  ])
  const [prompts, setPrompts] = useState<PromptState[]>([])
  const [formError, setFormError] = useState<string | null>(null)

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

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStartDate(new Date().toISOString().slice(0, 10))
    setStartTime('')
    setDurationMinutes('30')
    setFlexibility('anytime')
    setSegments([createEmptySegment()])
    setPrompts([])
    setFormError(null)
  }

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

    return {
      title: trimmedTitle,
      description: description.trim() || undefined,
      schedule: {
        kind: 'single',
        startDate,
        timeOfDay: startTime || undefined,
        durationMinutes: parsedDuration,
        flexibility,
      },
      segments: parsedSegments,
      reflectionPrompts: preparedPrompts,
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setFormError(null)
    const draft = composeDraft()
    if (!draft) return

    try {
      await onSubmit(draft)
      resetForm()
      onClose()
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : t('reports:planningEditor.genericError', 'Something went wrong')
      setFormError(message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('reports:planningEditor.title', 'New Practice Plan')}
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

        <section className="space-y-3">
          <Typography variant="h3">
            {t('reports:planningEditor.schedule', 'Schedule')}
          </Typography>
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
                className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
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
            <Typography variant="body" className="text-muted-foreground">
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
          <Typography variant="body" className="text-red-600">
            {formError || error}
          </Typography>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
          {t('reports:planningEditor.cancel', 'Cancel')}
        </Button>
        <Button onClick={handleSubmit} loading={isSubmitting}>
          {t('reports:planningEditor.createPlan', 'Create plan')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default PlanEditorModal
