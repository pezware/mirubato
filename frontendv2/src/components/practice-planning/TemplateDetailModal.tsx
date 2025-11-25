import { useTranslation } from 'react-i18next'
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  Typography,
  Tag,
} from '@/components/ui'
import type { PlanTemplate } from '@/api/planning'
import {
  Calendar,
  Clock,
  Target,
  Music,
  BookOpen,
  Repeat,
  Download,
  Star,
  ListChecks,
} from 'lucide-react'

interface TemplateDetailModalProps {
  isOpen: boolean
  onClose: () => void
  template: PlanTemplate
  onAdopt: (templateId: string) => Promise<void> | void
  isAdopting?: boolean
}

type TranslateFunction = (key: string, fallback: string) => string

const formatScheduleKind = (kind: string, t: TranslateFunction): string => {
  switch (kind) {
    case 'single':
      return t('templates.scheduleKind.single', 'Single Session')
    case 'recurring':
      return t('templates.scheduleKind.recurring', 'Recurring')
    default:
      return kind
  }
}

const formatFlexibility = (
  flexibility: string | undefined,
  t: TranslateFunction
): string => {
  if (!flexibility)
    return t('templates.flexibility.notSpecified', 'Not specified')
  switch (flexibility) {
    case 'fixed':
      return t('templates.flexibility.fixed', 'Fixed')
    case 'same-day':
      return t('templates.flexibility.sameDay', 'Same Day')
    case 'anytime':
      return t('templates.flexibility.anytime', 'Anytime')
    default:
      return flexibility
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
  }
}

const formatPlanType = (type: string, t: TranslateFunction): string => {
  switch (type) {
    case 'bootcamp':
      return t('templates.planType.bootcamp', 'Bootcamp')
    case 'course':
      return t('templates.planType.course', 'Course')
    case 'custom':
      return t('templates.planType.custom', 'Custom')
    default:
      return type
  }
}

export function TemplateDetailModal({
  isOpen,
  onClose,
  template,
  onAdopt,
  isAdopting = false,
}: TemplateDetailModalProps) {
  const { t } = useTranslation('common')

  const handleAdopt = () => {
    onAdopt(template.id)
  }

  const previewMetadata = template.metadata?.preview
  const segments = previewMetadata?.segments ?? []
  const pieceRefs =
    previewMetadata?.pieces && previewMetadata.pieces.length > 0
      ? previewMetadata.pieces
      : (template.pieceRefs ?? [])
  const focusAreas =
    previewMetadata?.focusAreas && previewMetadata.focusAreas.length > 0
      ? previewMetadata.focusAreas
      : (template.focusAreas ?? [])
  const techniques =
    previewMetadata?.techniques && previewMetadata.techniques.length > 0
      ? previewMetadata.techniques
      : (template.techniques ?? [])

  const scheduleMetadata =
    template.schedule?.metadata &&
    typeof template.schedule.metadata === 'object'
      ? template.schedule.metadata
      : null

  const fallbackSegmentsCount =
    scheduleMetadata && typeof scheduleMetadata.segmentsCount === 'number'
      ? scheduleMetadata.segmentsCount
      : undefined

  const workloadSummary = previewMetadata?.workload
  const sessionMinutes =
    typeof workloadSummary?.sessionMinutes === 'number'
      ? workloadSummary.sessionMinutes
      : typeof template.schedule.durationMinutes === 'number'
        ? template.schedule.durationMinutes
        : typeof workloadSummary?.totalSegmentMinutes === 'number'
          ? workloadSummary.totalSegmentMinutes
          : undefined

  const segmentsCount =
    typeof workloadSummary?.segmentsCount === 'number'
      ? workloadSummary.segmentsCount
      : segments.length > 0
        ? segments.length
        : fallbackSegmentsCount

  const showWorkloadSummary =
    (typeof sessionMinutes === 'number' && sessionMinutes > 0) ||
    (typeof segmentsCount === 'number' && segmentsCount > 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template.title}
      size="lg"
      data-testid="template-detail-modal"
    >
      <ModalBody>
        <div className="space-y-6">
          {/* Header badges */}
          <div className="flex flex-wrap gap-2">
            <Tag variant="primary" size="sm">
              {formatPlanType(template.type, t)}
            </Tag>
            {template.visibility === 'public' && (
              <Tag variant="success" size="sm">
                {t('templates.visibility.public', 'Public')}
              </Tag>
            )}
            {template.adoptionCount !== undefined &&
              template.adoptionCount > 0 && (
                <Tag variant="default" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  {template.adoptionCount}{' '}
                  {t('templates.adoptions', 'adoptions')}
                </Tag>
              )}
          </div>

          {/* Description */}
          {template.description && (
            <div>
              <Typography
                variant="body-sm"
                className="font-medium text-morandi-stone-700 mb-2"
              >
                {t('templates.details.description', 'Description')}
              </Typography>
              <Typography variant="body" className="text-morandi-stone-600">
                {template.description}
              </Typography>
            </div>
          )}

          {/* Schedule Information */}
          <div className="bg-morandi-stone-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-morandi-sage-600" />
              <Typography
                variant="body-sm"
                className="font-medium text-morandi-stone-900"
              >
                {t('templates.details.schedule', 'Schedule')}
              </Typography>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <Typography
                  variant="caption"
                  className="text-morandi-stone-500"
                >
                  {t('templates.details.scheduleType', 'Type')}
                </Typography>
                <Typography
                  variant="body-sm"
                  className="text-morandi-stone-900"
                >
                  {formatScheduleKind(template.schedule.kind, t)}
                </Typography>
              </div>
              {template.schedule.durationMinutes && (
                <div>
                  <Typography
                    variant="caption"
                    className="text-morandi-stone-500"
                  >
                    {t('templates.details.duration', 'Duration')}
                  </Typography>
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900"
                  >
                    {template.schedule.durationMinutes}{' '}
                    {t('common.minutes', 'minutes')}
                  </Typography>
                </div>
              )}
              {template.schedule.timeOfDay && (
                <div>
                  <Typography
                    variant="caption"
                    className="text-morandi-stone-500"
                  >
                    {t('templates.details.timeOfDay', 'Time of Day')}
                  </Typography>
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900"
                  >
                    {template.schedule.timeOfDay}
                  </Typography>
                </div>
              )}
              {template.schedule.flexibility && (
                <div>
                  <Typography
                    variant="caption"
                    className="text-morandi-stone-500"
                  >
                    {t('templates.details.flexibility', 'Flexibility')}
                  </Typography>
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900"
                  >
                    {formatFlexibility(template.schedule.flexibility, t)}
                  </Typography>
                </div>
              )}
              {template.schedule.kind === 'recurring' &&
                template.schedule.rule && (
                  <div className="sm:col-span-2">
                    <Typography
                      variant="caption"
                      className="text-morandi-stone-500"
                    >
                      {t('templates.details.recurrence', 'Recurrence')}
                    </Typography>
                    <div className="flex items-center gap-1">
                      <Repeat className="h-3 w-3 text-morandi-stone-600" />
                      <Typography
                        variant="body-sm"
                        className="text-morandi-stone-900"
                      >
                        {template.schedule.rule}
                      </Typography>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Focus Areas */}
          {focusAreas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-morandi-sage-600" />
                <Typography
                  variant="body-sm"
                  className="font-medium text-morandi-stone-900"
                >
                  {t('templates.details.focusAreas', 'Focus Areas')}
                </Typography>
              </div>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map(area => (
                  <Tag key={area} variant="default" size="sm">
                    {area}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Techniques */}
          {techniques.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-morandi-sage-600" />
                <Typography
                  variant="body-sm"
                  className="font-medium text-morandi-stone-900"
                >
                  {t('templates.details.techniques', 'Techniques')}
                </Typography>
              </div>
              <div className="flex flex-wrap gap-2">
                {techniques.map(technique => (
                  <Tag key={technique} variant="primary" size="sm">
                    {technique}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* Piece References */}
          {pieceRefs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Music className="h-4 w-4 text-morandi-sage-600" />
                <Typography
                  variant="body-sm"
                  className="font-medium text-morandi-stone-900"
                >
                  {t('templates.details.pieces', 'Pieces')}
                </Typography>
              </div>
              <ul className="space-y-2">
                {pieceRefs.map((piece, index) => (
                  <li
                    key={piece.scoreId || index}
                    className="text-sm text-morandi-stone-700"
                  >
                    <Typography variant="body-sm">
                      {piece.title || 'Untitled'}
                      {piece.composer && (
                        <span className="text-morandi-stone-500">
                          {' '}
                          - {piece.composer}
                        </span>
                      )}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showWorkloadSummary && (
            <div className="bg-morandi-sage-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-morandi-sage-600" />
                <Typography
                  variant="body-sm"
                  className="font-medium text-morandi-stone-900"
                >
                  {t('templates.details.workloadSummary', 'Workload Summary')}
                </Typography>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {typeof sessionMinutes === 'number' && sessionMinutes > 0 && (
                  <div>
                    <Typography
                      variant="caption"
                      className="text-morandi-stone-500"
                    >
                      {t('templates.details.sessionLength', 'Session Length')}
                    </Typography>
                    <Typography
                      variant="body-sm"
                      className="text-morandi-stone-900"
                    >
                      {sessionMinutes} {t('common.minutes', 'minutes')}
                    </Typography>
                  </div>
                )}
                {typeof segmentsCount === 'number' && segmentsCount > 0 && (
                  <div>
                    <Typography
                      variant="caption"
                      className="text-morandi-stone-500"
                    >
                      {t('templates.details.segmentCount', 'Segments')}
                    </Typography>
                    <Typography
                      variant="body-sm"
                      className="text-morandi-stone-900"
                    >
                      {segmentsCount}
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Segments */}
          {segments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks className="h-4 w-4 text-morandi-sage-600" />
                <Typography
                  variant="body-sm"
                  className="font-medium text-morandi-stone-900"
                >
                  {t('templates.details.segments', 'Session Segments')}
                </Typography>
              </div>
              <div className="space-y-3">
                {segments.map((segment, index) => (
                  <div
                    key={index}
                    className="border border-morandi-stone-200 rounded-lg p-3 bg-white"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Typography
                        variant="body-sm"
                        className="font-medium text-morandi-stone-900"
                      >
                        {segment.label || `Segment ${index + 1}`}
                      </Typography>
                      {segment.durationMinutes && (
                        <Typography
                          variant="caption"
                          className="text-morandi-stone-600"
                        >
                          {segment.durationMinutes} min
                        </Typography>
                      )}
                    </div>
                    {segment.instructions && (
                      <Typography
                        variant="caption"
                        className="text-morandi-stone-600 mb-2 block"
                      >
                        {segment.instructions}
                      </Typography>
                    )}
                    {segment.techniques && segment.techniques.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {segment.techniques.map(tech => (
                          <span
                            key={tech}
                            className="text-xs px-2 py-0.5 rounded bg-morandi-sage-50 text-morandi-sage-700"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div>
              <Typography
                variant="body-sm"
                className="font-medium text-morandi-stone-700 mb-2"
              >
                {t('templates.details.tags', 'Tags')}
              </Typography>
              <div className="flex flex-wrap gap-2">
                {template.tags.map(tag => (
                  <Tag key={tag} variant="default" size="sm">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isAdopting}>
          {t('common.close', 'Close')}
        </Button>
        <Button
          onClick={handleAdopt}
          loading={isAdopting}
          leftIcon={<Star className="h-4 w-4" />}
        >
          {t('templates.adopt', 'Adopt Template')}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default TemplateDetailModal
