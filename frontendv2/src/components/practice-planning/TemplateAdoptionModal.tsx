import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
  Typography,
} from '@/components/ui'
import type {
  PlanTemplate,
  PracticePlanSchedule,
  TemplateAdoptionCustomization,
} from '@/api/planning'

const INSTRUMENT_TAG_PREFIX = 'instrument:'
const DEFAULT_INSTRUMENTS = [
  'piano',
  'guitar',
  'violin',
  'viola',
  'cello',
  'double-bass',
  'flute',
  'oboe',
  'clarinet',
  'bassoon',
  'french-horn',
  'trumpet',
  'trombone',
  'tuba',
  'percussion',
  'harp',
  'saxophone',
  'voice',
  'organ',
  'accordion',
] as const

const toDateInputValue = (value?: string): string => {
  if (!value) {
    return new Date().toISOString().slice(0, 10)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return parsed.toISOString().slice(0, 10)
}

const toTimeInputValue = (value?: string | null): string => {
  if (!value) {
    return ''
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.slice(0, 5)
  }

  return ''
}

const getInstrumentFromTags = (tags?: string[]): string | undefined => {
  if (!tags || tags.length === 0) {
    return undefined
  }

  const tag = tags.find(value => value.startsWith(INSTRUMENT_TAG_PREFIX))
  if (!tag) {
    return undefined
  }

  return tag.slice(INSTRUMENT_TAG_PREFIX.length)
}

interface TemplateAdoptionModalProps {
  template: PlanTemplate
  isOpen: boolean
  isSubmitting?: boolean
  defaultInstrument?: string
  onClose: () => void
  onSubmit: (customization: TemplateAdoptionCustomization) => void
}

export function TemplateAdoptionModal({
  template,
  isOpen,
  isSubmitting = false,
  defaultInstrument,
  onClose,
  onSubmit,
}: TemplateAdoptionModalProps) {
  const { t } = useTranslation(['common', 'reports'])
  const normalizedDefaultInstrument = defaultInstrument
    ? defaultInstrument.toLowerCase()
    : undefined

  const [title, setTitle] = useState(template.title)
  const [instrument, setInstrument] = useState<string | undefined>(
    getInstrumentFromTags(template.tags) ?? normalizedDefaultInstrument
  )
  const [focusTagsInput, setFocusTagsInput] = useState(
    template.focusAreas?.join(', ') ?? ''
  )
  const [startDate, setStartDate] = useState(
    toDateInputValue(template.schedule?.startDate)
  )
  const [startTime, setStartTime] = useState(
    toTimeInputValue(template.schedule?.timeOfDay)
  )
  const [durationMinutes, setDurationMinutes] = useState(
    template.schedule?.durationMinutes?.toString() ?? ''
  )
  const [flexibility, setFlexibility] = useState<
    NonNullable<PracticePlanSchedule['flexibility']>
  >(template.schedule?.flexibility ?? 'anytime')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setTitle(template.title)
    setInstrument(
      getInstrumentFromTags(template.tags) ?? normalizedDefaultInstrument
    )
    setFocusTagsInput(template.focusAreas?.join(', ') ?? '')
    setStartDate(toDateInputValue(template.schedule?.startDate))
    setStartTime(toTimeInputValue(template.schedule?.timeOfDay))
    setDurationMinutes(template.schedule?.durationMinutes?.toString() ?? '')
    setFlexibility(template.schedule?.flexibility ?? 'anytime')
    setErrors({})
  }, [template, normalizedDefaultInstrument])

  const instrumentOptions = useMemo(
    () => [
      {
        value: '',
        label: t('common:templates.adoptModal.instrumentNone', 'No instrument'),
      },
      ...DEFAULT_INSTRUMENTS.map(value => ({
        value,
        label: t(`common:instruments.${value}`, { defaultValue: value }),
      })),
    ],
    [t]
  )

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (!title.trim()) {
      nextErrors.title = t(
        'common:templates.errors.titleRequired',
        'Title is required'
      )
    }

    if (!startDate) {
      nextErrors.startDate = t(
        'common:templates.errors.startDateRequired',
        'Start date is required'
      )
    }

    if (durationMinutes) {
      const parsed = Number(durationMinutes)
      if (Number.isNaN(parsed) || parsed <= 0) {
        nextErrors.duration = t(
          'common:templates.errors.durationPositive',
          'Duration must be greater than zero'
        )
      }
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const cleanTitle = title.trim()
    const focusTags = focusTagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)

    const tags: string[] = []
    if (instrument) {
      tags.push(`${INSTRUMENT_TAG_PREFIX}${instrument}`)
    }
    if (focusTags.length > 0) {
      tags.push(...focusTags)
    }

    const customization: TemplateAdoptionCustomization = {
      title: cleanTitle,
      focusAreas: focusTags.length > 0 ? focusTags : undefined,
      tags: tags.length > 0 ? tags : undefined,
      schedule: {
        startDate,
        timeOfDay: startTime || undefined,
        durationMinutes: durationMinutes
          ? Math.round(Number(durationMinutes))
          : undefined,
        flexibility,
      },
    }

    onSubmit(customization)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common:templates.adoptModal.title', 'Make it yours')}
      size="lg"
    >
      <ModalBody>
        <div className="space-y-5">
          <Typography variant="body">
            {t(
              'common:templates.adoptModal.description',
              'Adjust the core details so this plan fits your schedule before adopting it.'
            )}
          </Typography>

          <form
            id="template-adoption-form"
            className="space-y-4"
            onSubmit={handleSubmit}
          >
            <Input
              id="adoption-title"
              label={t(
                'common:templates.adoptModal.fields.title',
                'Plan title'
              )}
              value={title}
              onChange={event => setTitle(event.target.value)}
              required
              disabled={isSubmitting}
              error={errors.title}
            />

            <Select
              value={instrument ?? ''}
              onChange={value =>
                setInstrument(
                  typeof value === 'string' && value ? value : undefined
                )
              }
              options={instrumentOptions}
              label={t(
                'common:templates.adoptModal.fields.instrument',
                'Instrument'
              )}
              placeholder={t(
                'common:templates.adoptModal.instrumentPlaceholder',
                'Choose an instrument'
              )}
              disabled={isSubmitting}
            />

            <Input
              id="adoption-focus-tags"
              label={t(
                'common:templates.adoptModal.fields.focus',
                'Focus tags'
              )}
              value={focusTagsInput}
              onChange={event => setFocusTagsInput(event.target.value)}
              placeholder={t(
                'common:templates.adoptModal.placeholders.focus',
                'e.g. tone, rhythm, sight-reading'
              )}
              helperText={t(
                'common:templates.adoptModal.focusHint',
                'Separate multiple tags with commas'
              )}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="adoption-start-date"
                type="date"
                label={t(
                  'common:templates.adoptModal.fields.startDate',
                  'Start date'
                )}
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
                required
                disabled={isSubmitting}
                error={errors.startDate}
              />
              <Input
                id="adoption-start-time"
                type="time"
                label={t(
                  'common:templates.adoptModal.fields.startTime',
                  'Preferred time'
                )}
                value={startTime}
                onChange={event => setStartTime(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="adoption-duration"
                type="number"
                min={1}
                label={t(
                  'common:templates.adoptModal.fields.duration',
                  'Session length (minutes)'
                )}
                value={durationMinutes}
                onChange={event => setDurationMinutes(event.target.value)}
                disabled={isSubmitting}
                error={errors.duration}
              />
              <Select
                value={flexibility}
                onChange={value =>
                  setFlexibility(value as PracticePlanSchedule['flexibility'])
                }
                options={flexibilityOptions}
                label={t(
                  'common:templates.adoptModal.fields.flexibility',
                  'Flexibility'
                )}
                placeholder={t(
                  'reports:planningEditor.flexibilityPlaceholder',
                  'Choose flexibility'
                )}
                disabled={isSubmitting}
              />
            </div>
          </form>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          {t('common:templates.adoptModal.actions.cancel', 'Cancel')}
        </Button>
        <Button
          type="submit"
          form="template-adoption-form"
          loading={isSubmitting}
        >
          {t('common:templates.adoptModal.actions.confirm', 'Adopt plan')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
