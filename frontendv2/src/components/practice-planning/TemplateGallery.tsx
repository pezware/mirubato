import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  LoadingSkeleton,
  Typography,
} from '@/components/ui'
import type {
  PlanTemplate,
  TemplateAdoptionCustomization,
  TemplateVisibility,
} from '@/api/planning'
import { Star, Download, Eye } from 'lucide-react'
import { trackPlanningEvent } from '@/lib/analytics/planning'
import { TemplateDetailModal } from './TemplateDetailModal'
import { TemplateAdoptionModal } from './TemplateAdoptionModal'

interface TemplateGalleryProps {
  templates: PlanTemplate[]
  onAdopt: (
    templateId: string,
    customization?: TemplateAdoptionCustomization
  ) => Promise<void> | void
  onDelete?: (templateId: string) => Promise<void> | void
  isLoading: boolean
  currentUserId?: string
  showAuthorControls?: boolean
  defaultInstrument?: string
}

type VisibilityFilter = 'all' | TemplateVisibility

export function TemplateGallery({
  templates,
  onAdopt,
  onDelete,
  isLoading,
  currentUserId,
  showAuthorControls = false,
  defaultInstrument,
}: TemplateGalleryProps) {
  const { t } = useTranslation('common')

  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('all')
  const [tagFilter, setTagFilter] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(
    null
  )
  const [isAdopting, setIsAdopting] = useState(false)
  const [customizingTemplate, setCustomizingTemplate] =
    useState<PlanTemplate | null>(null)

  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Filter by visibility
      if (
        visibilityFilter !== 'all' &&
        template.visibility !== visibilityFilter
      ) {
        return false
      }

      // Filter by tags
      if (tagFilter.trim()) {
        const searchTerm = tagFilter.trim().toLowerCase()
        const hasMatchingTag =
          template.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ??
          false
        if (!hasMatchingTag) {
          return false
        }
      }

      return true
    })
  }, [templates, visibilityFilter, tagFilter])

  const handleClearFilters = () => {
    setVisibilityFilter('all')
    setTagFilter('')
  }

  const hasActiveFilters = visibilityFilter !== 'all' || tagFilter.trim() !== ''

  // Track when templates are viewed
  useEffect(() => {
    if (!isLoading && templates.length > 0) {
      trackPlanningEvent('planning.template.view', {
        templateCount: templates.length,
        publicCount: templates.filter(t => t.visibility === 'public').length,
        privateCount: templates.filter(t => t.visibility === 'private').length,
      })
    }
  }, [isLoading, templates])

  const handleAdopt = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      return
    }

    trackPlanningEvent('planning.template.customize.open', {
      templateId,
      visibility: template.visibility,
    })

    setCustomizingTemplate(template)
    setSelectedTemplate(null)
  }

  const handleCloseCustomization = () => {
    if (isAdopting) {
      return
    }

    if (customizingTemplate) {
      trackPlanningEvent('planning.template.customize.cancel', {
        templateId: customizingTemplate.id,
        visibility: customizingTemplate.visibility,
      })
    }
    setCustomizingTemplate(null)
  }

  const handleCustomizationSubmit = async (
    customization: TemplateAdoptionCustomization
  ) => {
    if (!customizingTemplate) {
      return
    }

    setIsAdopting(true)
    trackPlanningEvent('planning.template.customize.submit', {
      templateId: customizingTemplate.id,
      visibility: customizingTemplate.visibility,
      providedInstrument: customization.tags?.some(tag =>
        tag.startsWith('instrument:')
      ),
      focusCount: customization.focusAreas?.length ?? 0,
    })

    try {
      await onAdopt(customizingTemplate.id, customization)

      trackPlanningEvent('planning.template.adopt', {
        templateId: customizingTemplate.id,
        visibility: customizingTemplate.visibility,
        hasTags: (customizingTemplate.tags?.length ?? 0) > 0,
        adoptionCount: customizingTemplate.adoptionCount,
        customizedTitle:
          customization.title &&
          customization.title.trim() !== customizingTemplate.title,
        hasSchedulePreferences: Boolean(customization.schedule),
      })

      setCustomizingTemplate(null)
    } finally {
      setIsAdopting(false)
    }
  }

  const handleViewDetails = (template: PlanTemplate) => {
    trackPlanningEvent('planning.template.preview', {
      templateId: template.id,
      visibility: template.visibility,
    })
    setSelectedTemplate(template)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-32" data-testid="loading-skeleton" />
        <LoadingSkeleton className="h-32" data-testid="loading-skeleton" />
        <LoadingSkeleton className="h-32" data-testid="loading-skeleton" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <Card className="border-dashed bg-morandi-stone-50/70">
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <Typography variant="h3" className="text-morandi-stone-900">
              {t('templates.emptyState.title', 'No templates found')}
            </Typography>
            <Typography variant="body" className="text-morandi-stone-600">
              {t(
                'templates.emptyState.description',
                'Templates will appear here once they are created.'
              )}
            </Typography>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Visibility Filter */}
            <fieldset>
              <Typography
                as="legend"
                variant="body-sm"
                className="block font-medium text-morandi-stone-700 mb-2"
              >
                {t('templates.filters.visibility', 'Visibility')}
              </Typography>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="visibility-filter"
                    value="all"
                    checked={visibilityFilter === 'all'}
                    onChange={() => setVisibilityFilter('all')}
                    className="mr-2 h-4 w-4 border-morandi-stone-300 text-morandi-sage-600 focus:ring-2 focus:ring-morandi-sage-400 focus:ring-offset-2"
                  />
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900 group-hover:text-morandi-stone-700"
                  >
                    {t('templates.filters.all', 'All')}
                  </Typography>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="visibility-filter"
                    value="public"
                    checked={visibilityFilter === 'public'}
                    onChange={() => setVisibilityFilter('public')}
                    className="mr-2 h-4 w-4 border-morandi-stone-300 text-morandi-sage-600 focus:ring-2 focus:ring-morandi-sage-400 focus:ring-offset-2"
                  />
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900 group-hover:text-morandi-stone-700"
                  >
                    {t('templates.visibility.public', 'Public')}
                  </Typography>
                </label>
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="visibility-filter"
                    value="private"
                    checked={visibilityFilter === 'private'}
                    onChange={() => setVisibilityFilter('private')}
                    className="mr-2 h-4 w-4 border-morandi-stone-300 text-morandi-sage-600 focus:ring-2 focus:ring-morandi-sage-400 focus:ring-offset-2"
                  />
                  <Typography
                    variant="body-sm"
                    className="text-morandi-stone-900 group-hover:text-morandi-stone-700"
                  >
                    {t('templates.visibility.private', 'Private')}
                  </Typography>
                </label>
              </div>
            </fieldset>

            {/* Tag Filter */}
            <div>
              <Typography
                as="label"
                htmlFor="tag-filter"
                variant="body-sm"
                className="block font-medium text-morandi-stone-700 mb-1"
              >
                {t('templates.filters.tags', 'Tags')}
              </Typography>
              <Input
                id="tag-filter"
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                placeholder={t(
                  'templates.filters.tagsPlaceholder',
                  'Filter by tags...'
                )}
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  {t('templates.filters.clear', 'Clear filters')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed bg-morandi-stone-50/70">
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <Typography variant="h3" className="text-morandi-stone-900">
                {t(
                  'templates.emptyState.noMatches',
                  'No templates match your filters'
                )}
              </Typography>
              <Typography variant="body" className="text-morandi-stone-600">
                {t(
                  'templates.emptyState.tryDifferent',
                  'Try adjusting your filters to see more templates.'
                )}
              </Typography>
              <div className="pt-2">
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  {t('templates.filters.clear', 'Clear filters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                    {/* Author badge */}
                    {!showAuthorControls &&
                      currentUserId &&
                      template.authorId === currentUserId && (
                        <div className="mt-2">
                          <Typography
                            as="span"
                            variant="caption"
                            className="inline-flex items-center px-2 py-1 rounded-full font-medium bg-morandi-purple-100 text-morandi-purple-700"
                          >
                            {t('templates.yourTemplate', 'Your Template')}
                          </Typography>
                        </div>
                      )}
                  </div>
                  {template.visibility === 'public' && (
                    <div className="flex-shrink-0">
                      <Typography
                        as="span"
                        variant="caption"
                        className="inline-flex items-center px-2 py-1 rounded-full font-medium bg-morandi-sage-100 text-morandi-sage-700"
                      >
                        {t('templates.visibility.public', 'Public')}
                      </Typography>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map(tag => (
                      <Typography
                        key={tag}
                        as="span"
                        variant="caption"
                        className="inline-block px-2 py-1 rounded bg-morandi-stone-100 text-morandi-stone-700"
                      >
                        {tag}
                      </Typography>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-morandi-stone-600">
                  {template.adoptionCount !== undefined &&
                    template.adoptionCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>
                          {template.adoptionCount}{' '}
                          {t('templates.adoptions', 'adoptions')}
                        </span>
                      </div>
                    )}
                  {template.schedule?.durationMinutes && (
                    <div>
                      {template.schedule.durationMinutes}
                      {t('common.minutes.short', 'm')}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <Button
                    onClick={() => handleViewDetails(template)}
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    leftIcon={<Eye className="h-4 w-4" />}
                  >
                    {t('templates.viewDetails', 'View Details')}
                  </Button>
                  {showAuthorControls ? (
                    <>
                      <Button
                        onClick={() => handleAdopt(template.id)}
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        leftIcon={<Star className="h-4 w-4" />}
                        disabled={isAdopting}
                      >
                        {t('templates.adopt', 'Adopt')}
                      </Button>
                      {onDelete && (
                        <Button
                          onClick={() => onDelete(template.id)}
                          size="sm"
                          variant="danger"
                          className="flex-1"
                        >
                          {t('templates.delete', 'Delete')}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => handleAdopt(template.id)}
                      size="sm"
                      className="flex-1"
                      leftIcon={<Star className="h-4 w-4" />}
                      disabled={isAdopting}
                    >
                      {t('templates.adopt', 'Adopt')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          isOpen={Boolean(selectedTemplate)}
          onClose={() => setSelectedTemplate(null)}
          template={selectedTemplate}
          onAdopt={handleAdopt}
          isAdopting={isAdopting}
        />
      )}

      {customizingTemplate && (
        <TemplateAdoptionModal
          template={customizingTemplate}
          isOpen={Boolean(customizingTemplate)}
          onClose={handleCloseCustomization}
          onSubmit={handleCustomizationSubmit}
          isSubmitting={isAdopting}
          defaultInstrument={defaultInstrument}
        />
      )}
    </div>
  )
}
