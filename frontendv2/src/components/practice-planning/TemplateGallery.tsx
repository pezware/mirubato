import { useMemo, useState } from 'react'
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
import type { PlanTemplate, TemplateVisibility } from '@/api/planning'
import { Star, Download } from 'lucide-react'

interface TemplateGalleryProps {
  templates: PlanTemplate[]
  onAdopt: (templateId: string) => Promise<void> | void
  isLoading: boolean
}

type VisibilityFilter = 'all' | TemplateVisibility

export function TemplateGallery({
  templates,
  onAdopt,
  isLoading,
}: TemplateGalleryProps) {
  const { t } = useTranslation('common')

  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('all')
  const [tagFilter, setTagFilter] = useState('')

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('templates.filters.visibility', 'Visibility')}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility-filter"
                    value="all"
                    checked={visibilityFilter === 'all'}
                    onChange={() => setVisibilityFilter('all')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {t('templates.filters.all', 'All')}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility-filter"
                    value="public"
                    checked={visibilityFilter === 'public'}
                    onChange={() => setVisibilityFilter('public')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {t('templates.visibility.public', 'Public')}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility-filter"
                    value="private"
                    checked={visibilityFilter === 'private'}
                    onChange={() => setVisibilityFilter('private')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {t('templates.visibility.private', 'Private')}
                  </span>
                </label>
              </div>
            </div>

            {/* Tag Filter */}
            <div>
              <label
                htmlFor="tag-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('templates.filters.tags', 'Tags')}
              </label>
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
                  </div>
                  {template.visibility === 'public' && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-morandi-sage-100 text-morandi-sage-700">
                        {t('templates.visibility.public', 'Public')}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-1 rounded text-xs bg-morandi-stone-100 text-morandi-stone-700"
                      >
                        {tag}
                      </span>
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

                {/* Adopt Button */}
                <div className="pt-2">
                  <Button
                    onClick={() => onAdopt(template.id)}
                    size="sm"
                    className="w-full"
                    leftIcon={<Star className="h-4 w-4" />}
                  >
                    {t('templates.adopt', 'Adopt')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
