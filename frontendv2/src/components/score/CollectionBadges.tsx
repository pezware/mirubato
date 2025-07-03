import Tag from '../ui/Tag'
import { Collection } from '../../types/collections'

interface CollectionBadgesProps {
  collections: Collection[]
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CollectionBadges({
  collections,
  maxDisplay = 3,
  size = 'sm',
  className,
}: CollectionBadgesProps) {
  if (!collections || collections.length === 0) return null

  const displayedCollections = collections.slice(0, maxDisplay)
  const remainingCount = collections.length - maxDisplay

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1.5">
        {displayedCollections.map(collection => (
          <Tag
            key={collection.id}
            size={size}
            variant={collection.featuredAt ? 'primary' : 'default'}
          >
            {collection.name}
          </Tag>
        ))}
        {remainingCount > 0 && (
          <Tag size={size} variant="default">
            +{remainingCount}
          </Tag>
        )}
      </div>
    </div>
  )
}
