import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Input,
  Textarea,
  Modal,
  ModalBody,
  ModalFooter,
  Typography,
} from '@/components/ui'
import type { TemplateVisibility } from '@/api/planning'
import { trackPlanningEvent } from '@/lib/analytics/planning'

interface TemplatePublisherModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (options: {
    title: string
    description?: string
    visibility: TemplateVisibility
    tags?: string[]
  }) => Promise<void>
  defaultTitle?: string
  defaultDescription?: string
}

export function TemplatePublisherModal({
  isOpen,
  onClose,
  onSubmit,
  defaultTitle = '',
  defaultDescription = '',
}: TemplatePublisherModalProps) {
  const { t } = useTranslation('common')

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [visibility, setVisibility] = useState<TemplateVisibility>('private')
  const [tagsInput, setTagsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError(t('templates.errors.titleRequired', 'Title is required'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)

      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        tags: tags.length > 0 ? tags : undefined,
      })

      // Track publish event
      trackPlanningEvent('planning.template.publish', {
        visibility,
        hasTags: tags.length > 0,
        hasDescription: !!description.trim(),
      })

      // Reset form
      setTitle('')
      setDescription('')
      setVisibility('private')
      setTagsInput('')
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('templates.errors.publishFailed', 'Failed to publish template')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setTitle(defaultTitle)
    setDescription(defaultDescription)
    setVisibility('private')
    setTagsInput('')
    setError(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('templates.publishTitle', 'Publish as Template')}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Typography
                as="label"
                htmlFor="template-title"
                variant="body-sm"
                className="block font-medium text-morandi-stone-700 mb-1"
              >
                {t('templates.fields.title', 'Template Title')}
                <span className="text-morandi-rose-500 ml-1">*</span>
              </Typography>
              <Input
                id="template-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t(
                  'templates.placeholders.title',
                  'Enter template title'
                )}
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div>
              <Typography
                as="label"
                htmlFor="template-description"
                variant="body-sm"
                className="block font-medium text-morandi-stone-700 mb-1"
              >
                {t('templates.fields.description', 'Description')}
              </Typography>
              <Textarea
                id="template-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t(
                  'templates.placeholders.description',
                  'Describe what this template is for and how to use it'
                )}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Visibility */}
            <fieldset>
              <Typography
                as="legend"
                variant="body-sm"
                className="block font-medium text-morandi-stone-700 mb-2"
              >
                {t('templates.fields.visibility', 'Visibility')}
              </Typography>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={() => setVisibility('private')}
                    disabled={isSubmitting}
                    className="mr-2 h-4 w-4 border-morandi-stone-300 text-morandi-sage-600 focus:ring-2 focus:ring-morandi-sage-400 focus:ring-offset-2 disabled:opacity-50"
                  />
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900 group-hover:text-morandi-stone-700"
                  >
                    {t('templates.visibility.private', 'Private')}
                    <Typography
                      as="span"
                      variant="caption"
                      className="text-morandi-stone-500 ml-2"
                    >
                      {t(
                        'templates.visibility.privateDesc',
                        'Only visible to you'
                      )}
                    </Typography>
                  </Typography>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={() => setVisibility('public')}
                    disabled={isSubmitting}
                    className="mr-2 h-4 w-4 border-morandi-stone-300 text-morandi-sage-600 focus:ring-2 focus:ring-morandi-sage-400 focus:ring-offset-2 disabled:opacity-50"
                  />
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900 group-hover:text-morandi-stone-700"
                  >
                    {t('templates.visibility.public', 'Public')}
                    <Typography
                      as="span"
                      variant="caption"
                      className="text-morandi-stone-500 ml-2"
                    >
                      {t(
                        'templates.visibility.publicDesc',
                        'Visible to all users'
                      )}
                    </Typography>
                  </Typography>
                </label>
              </div>
            </fieldset>

            {/* Tags */}
            <div>
              <Typography
                as="label"
                htmlFor="template-tags"
                variant="body-sm"
                className="block font-medium text-morandi-stone-700 mb-1"
              >
                {t('templates.fields.tags', 'Tags')}
              </Typography>
              <Input
                id="template-tags"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder={t(
                  'templates.placeholders.tags',
                  'e.g. beginner, scales, technique (comma-separated)'
                )}
                disabled={isSubmitting}
              />
              <Typography
                variant="caption"
                className="text-morandi-stone-500 mt-1"
              >
                {t(
                  'templates.hints.tags',
                  'Separate multiple tags with commas'
                )}
              </Typography>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md bg-morandi-rose-50 p-3">
                <Typography
                  variant="body"
                  className="text-morandi-rose-500 text-sm"
                >
                  {error}
                </Typography>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting
              ? t('templates.publishing', 'Publishing...')
              : t('templates.publish', 'Publish Template')}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
