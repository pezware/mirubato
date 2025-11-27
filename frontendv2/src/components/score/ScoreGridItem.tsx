import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Score } from '../../services/scoreService'
import type { Collection } from '../../types/collections'
import { MusicTitle, MusicComposer } from '../ui'
import { cn } from '../../utils/cn'
import { scoreService } from '../../services/scoreService'
import { FolderPlus, Music, Star } from 'lucide-react'

interface ScoreGridItemProps {
  score: Score
  onAddToCollection?: (e: React.MouseEvent, score: Score) => void
  onToggleFavorite?: (e: React.MouseEvent, score: Score) => void
  collections?: Collection[]
  isFavorited?: boolean
}

export default function ScoreGridItem({
  score: propScore,
  onAddToCollection,
  onToggleFavorite,
  collections = [],
  isFavorited = false,
}: ScoreGridItemProps) {
  const { t } = useTranslation(['scorebook', 'common'])
  const navigate = useNavigate()
  const [thumbnailError, setThumbnailError] = useState(false)
  const [_isHovered, setIsHovered] = useState(false)

  // Ensure score always has required properties
  const score = {
    ...propScore,
    tags: Array.isArray(propScore.tags)
      ? propScore.tags
      : typeof propScore.tags === 'string'
        ? [propScore.tags]
        : [],
  }

  // Get optimized thumbnail URL (pre-generated, smaller size)
  const thumbnailUrl = scoreService.getThumbnailUrl(score.id)

  const handleClick = () => {
    navigate(`/scorebook/${score.id}`)
  }

  const handleAddToCollection = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAddToCollection) {
      onAddToCollection(e, score)
    }
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleFavorite) {
      onToggleFavorite(e, score)
    }
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-morandi-stone-200 overflow-hidden cursor-pointer',
        'transition-all duration-200 hover:shadow-md hover:border-morandi-sage-300',
        'group relative'
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="aspect-[3/4] bg-morandi-stone-100 relative overflow-hidden">
        {!thumbnailError ? (
          <img
            src={thumbnailUrl}
            alt={score.title}
            className="w-full h-full object-cover object-top"
            onError={() => setThumbnailError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-12 h-12 text-morandi-stone-300" />
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-black/40 flex items-center justify-center gap-2',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          )}
        >
          {onToggleFavorite && (
            <button
              onClick={handleToggleFavorite}
              className={cn(
                'p-2 rounded-full transition-colors',
                isFavorited
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-white/90 text-morandi-stone-700 hover:bg-white'
              )}
              title={
                isFavorited
                  ? t('scorebook:removeFromFavorites', 'Remove from favorites')
                  : t('scorebook:addToFavorites', 'Add to favorites')
              }
            >
              <Star
                className="w-5 h-5"
                fill={isFavorited ? 'currentColor' : 'none'}
              />
            </button>
          )}
          {onAddToCollection && (
            <button
              onClick={handleAddToCollection}
              className="p-2 bg-white/90 rounded-full text-morandi-stone-700 hover:bg-white transition-colors"
              title={t('scorebook:addToCollection', 'Add to collection')}
            >
              <FolderPlus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Persistent favorite indicator */}
        {isFavorited && (
          <div className="absolute top-2 left-2">
            <Star
              className="w-5 h-5 text-amber-500 drop-shadow-md"
              fill="currentColor"
            />
          </div>
        )}

        {/* Difficulty badge */}
        <div className="absolute top-2 right-2">
          <span
            className={cn(
              'px-2 py-0.5 text-xs rounded-full font-medium',
              score.difficulty === 'beginner' && 'bg-green-100 text-green-700',
              score.difficulty === 'intermediate' &&
                'bg-amber-100 text-amber-700',
              score.difficulty === 'advanced' && 'bg-red-100 text-red-700'
            )}
          >
            {score.difficulty}
          </span>
        </div>

        {/* Page count */}
        {score.page_count && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded">
              {score.page_count} {t('scorebook:pages', 'pages')}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <MusicTitle
          as="h3"
          className="text-morandi-stone-800 line-clamp-1 text-sm"
        >
          {score.title}
        </MusicTitle>
        <MusicComposer
          as="span"
          className="text-morandi-stone-500 line-clamp-1 text-xs mt-0.5"
        >
          {score.composer}
        </MusicComposer>

        {/* Instrument badge */}
        <div className="flex items-center gap-1 mt-2">
          <span className="px-1.5 py-0.5 bg-morandi-sand-100 text-morandi-stone-600 text-xs rounded">
            {score.instrument}
          </span>
          {collections.length > 0 && (
            <span className="text-xs text-morandi-stone-400">
              {t('scorebook:inCollections', 'in {{count}} collections', {
                count: collections.length,
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
