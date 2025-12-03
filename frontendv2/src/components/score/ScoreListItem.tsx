import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Score } from '../../services/scoreService'
import type { Collection } from '../../types/collections'
import CollectionBadges from './CollectionBadges'
import { Button, MusicTitle, MusicComposer, cn } from '../ui'
import {
  Star,
  CheckSquare,
  Square,
  ChevronRight,
  FolderPlus,
} from 'lucide-react'

interface ScoreListItemProps {
  score: Score
  onAddToCollection?: (e: React.MouseEvent, score: Score) => void
  onToggleFavorite?: (e: React.MouseEvent, score: Score) => void
  collections?: Collection[]
  isFavorited?: boolean
  showCollections?: boolean
  showTagsInCollapsed?: boolean
  className?: string
  // Selection mode props
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelection?: (scoreId: string) => void
}

export default function ScoreListItem({
  score: propScore,
  onAddToCollection,
  onToggleFavorite,
  collections = [],
  isFavorited = false,
  showCollections = false,
  showTagsInCollapsed = false,
  className,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}: ScoreListItemProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  // Ensure score always has required properties and tags is always an array
  const score = {
    ...propScore,
    tags: Array.isArray(propScore.tags)
      ? propScore.tags
      : typeof propScore.tags === 'string'
        ? [propScore.tags]
        : propScore.tags === null || propScore.tags === undefined
          ? []
          : [],
  }

  const handleScoreSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/scorebook/${score.id}`)
  }

  const toggleExpansion = () => {
    if (!selectionMode) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleSelection) {
      onToggleSelection(score.id)
    }
  }

  const handleRowClick = () => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(score.id)
    } else {
      toggleExpansion()
    }
  }

  return (
    <div
      className={cn(
        'border-b border-morandi-stone-200 last:border-b-0',
        isSelected && 'bg-morandi-sage-50',
        className
      )}
    >
      <div
        className={cn(
          'p-4 cursor-pointer group',
          selectionMode
            ? 'hover:bg-morandi-sage-100'
            : 'hover:bg-morandi-stone-50'
        )}
        onClick={handleRowClick}
      >
        <div className="flex items-start justify-between">
          {/* Selection Checkbox */}
          {selectionMode && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCheckboxClick}
              className="mr-3 mt-0.5 flex-shrink-0 text-morandi-sage-600 hover:text-morandi-sage-800"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </Button>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <MusicTitle as="h3" className="text-morandi-stone-800">
                {score.title}
              </MusicTitle>
              <MusicComposer as="span" className="text-morandi-stone-600">
                {score.composer}
              </MusicComposer>
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
                    {score.tags.slice(0, 2).map((tag, index) => (
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
            {/* Favorite star button */}
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon-md"
                onClick={e => {
                  e.stopPropagation()
                  onToggleFavorite(e, score)
                }}
                className={cn(
                  isFavorited
                    ? 'text-morandi-peach-500 hover:text-morandi-peach-600'
                    : 'text-morandi-stone-400 hover:text-morandi-peach-500 opacity-0 group-hover:opacity-100'
                )}
                title={
                  isFavorited
                    ? t(
                        'scorebook:removeFromFavorites',
                        'Remove from favorites'
                      )
                    : t('scorebook:addToFavorites', 'Add to favorites')
                }
              >
                <Star
                  className="w-5 h-5"
                  fill={isFavorited ? 'currentColor' : 'none'}
                />
              </Button>
            )}
            {onAddToCollection && (
              <Button
                variant="ghost"
                size="icon-md"
                onClick={e => {
                  e.stopPropagation()
                  onAddToCollection(e, score)
                }}
                className="text-morandi-stone-600 hover:text-morandi-stone-800 opacity-0 group-hover:opacity-100"
                title={t('scorebook:addToCollection', 'Add to collection')}
              >
                <FolderPlus className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-md"
              onClick={handleScoreSelect}
              className="text-morandi-sage-600 hover:text-morandi-sage-800"
              title={t('scorebook:viewScore', 'View score')}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
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
                {score.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-morandi-stone-100 text-morandi-stone-600 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button variant="primary" size="sm" onClick={handleScoreSelect}>
              {t('scorebook:viewScore', 'View Score')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
