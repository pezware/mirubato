import { Collection } from '../../types/collections'
import { cn } from '../../utils/cn'
import { useNavigate } from 'react-router-dom'

interface CollectionBadgesProps {
  collections: Collection[]
  maxDisplay?: number
  size?: 'sm' | 'md'
  className?: string
  onClick?: (collection: Collection) => void
}

export default function CollectionBadges({
  collections,
  maxDisplay = 2,
  size = 'sm',
  className,
  onClick,
}: CollectionBadgesProps) {
  const navigate = useNavigate()
  const displayCollections = collections.slice(0, maxDisplay)
  const remainingCount = collections.length - maxDisplay

  const handleClick = (e: React.MouseEvent, collection: Collection) => {
    e.stopPropagation()
    if (onClick) {
      onClick(collection)
    } else {
      // Default behavior: navigate to collection
      // For private/user collections, use ID; for public collections, use slug
      if (collection.visibility === 'private') {
        navigate(`/scorebook/collection/user/${collection.id}`)
      } else {
        navigate(`/scorebook/collection/${collection.slug}`)
      }
    }
  }

  if (collections.length === 0) return null

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {displayCollections.map(collection => (
        <button
          key={collection.id}
          onClick={e => handleClick(e, collection)}
          className={cn(
            'inline-flex items-center rounded-full transition-colors',
            'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-morandi-sage-400',
            size === 'sm' && 'px-2 py-0.5 text-xs',
            size === 'md' && 'px-3 py-1 text-sm',
            collection.visibility === 'public'
              ? 'bg-morandi-sage-100 text-morandi-sage-700 hover:bg-morandi-sage-200'
              : 'bg-morandi-stone-100 text-morandi-stone-600 hover:bg-morandi-stone-200',
            collection.featuredAt &&
              'bg-morandi-sand-100 text-morandi-sand-700 hover:bg-morandi-sand-200'
          )}
        >
          {collection.name}
        </button>
      ))}
      {remainingCount > 0 && (
        <span
          className={cn(
            'text-morandi-stone-500',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm'
          )}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  )
}
