import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Score } from '../../services/scoreService'
import type { Collection } from '../../types/collections'
import CollectionBadges from './CollectionBadges'
import { cn } from '../../utils/cn'

interface ScoreListItemProps {
  score: Score
  onAddToCollection?: (e: React.MouseEvent, score: Score) => void
  collections?: Collection[]
  showCollections?: boolean
  showTagsInCollapsed?: boolean
  className?: string
}

export default function ScoreListItem({
  score: propScore,
  onAddToCollection,
  collections = [],
  showCollections = false,
  showTagsInCollapsed = false,
  className,
}: ScoreListItemProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  // Ensure score always has required properties
  const score = {
    ...propScore,
    tags: propScore.tags || [],
  }

  const handleScoreSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/scorebook/${score.id}`)
  }

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      className={cn(
        'border-b border-morandi-stone-200 last:border-b-0',
        className
      )}
    >
      <div
        className="p-4 hover:bg-morandi-stone-50 cursor-pointer group"
        onClick={toggleExpansion}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-medium text-morandi-stone-800">
                {score.title}
              </h3>
              <span className="text-sm text-morandi-stone-600">
                {score.composer}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-morandi-sand-100 text-morandi-stone-700 text-xs rounded-full">
                {score.instrument}
              </span>
              <span className="px-2 py-0.5 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                {score.difficulty}
              </span>
              {score.difficulty_level && (
                <span className="text-xs text-morandi-stone-500">
                  Level {score.difficulty_level}
                </span>
              )}

              {/* Show collections in collapsed view if enabled */}
              {!isExpanded && showCollections && collections.length > 0 && (
                <CollectionBadges
                  collections={collections}
                  maxDisplay={2}
                  size="sm"
                />
              )}

              {/* Show tags in collapsed view if enabled */}
              {!isExpanded &&
                showTagsInCollapsed &&
                score.tags &&
                score.tags.length > 0 && (
                  <div className="flex gap-1">
                    {score.tags?.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-morandi-stone-100 text-morandi-stone-600 rounded-full text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                    {score.tags && score.tags.length > 2 && (
                      <span className="text-xs text-morandi-stone-500">
                        +{score.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {onAddToCollection && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  onAddToCollection(e, score)
                }}
                className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('scorebook:addToCollection', 'Add to collection')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={handleScoreSelect}
              className="p-2 text-morandi-sage-600 hover:text-morandi-sage-800 transition-colors"
              title={t('scorebook:viewScore', 'View score')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-morandi-stone-50 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              {score.opus && (
                <p className="text-morandi-stone-600 mb-1">
                  <span className="font-medium">Opus:</span> {score.opus}
                </p>
              )}
              {score.time_signature && (
                <p className="text-morandi-stone-600 mb-1">
                  <span className="font-medium">Time:</span>{' '}
                  {score.time_signature}
                </p>
              )}
              {score.key_signature && (
                <p className="text-morandi-stone-600 mb-1">
                  <span className="font-medium">Key:</span>{' '}
                  {score.key_signature}
                </p>
              )}
            </div>
            <div>
              {score.style_period && (
                <p className="text-morandi-stone-600 mb-1">
                  <span className="font-medium">Period:</span>{' '}
                  {score.style_period}
                </p>
              )}
              {score.source && (
                <p className="text-morandi-stone-600 mb-1">
                  <span className="font-medium">Source:</span> {score.source}
                </p>
              )}
            </div>
          </div>

          {/* Show collections in expanded view if enabled */}
          {showCollections && collections.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-morandi-stone-700 mb-2">
                {t('scorebook:collections', 'Collections')}:
              </p>
              <CollectionBadges
                collections={collections}
                maxDisplay={10}
                size="md"
              />
            </div>
          )}

          {/* Always show tags in expanded view */}
          {score.tags && score.tags.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-morandi-stone-700 mb-2">
                {t('scorebook:tags', 'Tags')}:
              </p>
              <div className="flex flex-wrap gap-1">
                {score.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-600 rounded text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleScoreSelect}
              className="px-4 py-2 bg-morandi-sage-500 text-white rounded-lg hover:bg-morandi-sage-600 transition-colors text-sm"
            >
              {t('scorebook:viewScore', 'View Score')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
