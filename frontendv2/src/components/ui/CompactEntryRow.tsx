import React, { useState } from 'react'
import {
  Edit2,
  Trash2,
  Music,
  Guitar,
  Piano,
  Mic2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import { MusicTitle, MusicComposer } from './Typography'

interface CompactEntryRowProps {
  time: string
  duration: number // in minutes
  type?: string
  instrument?: string
  pieces?: Array<{
    title: string
    composer?: string | null
  }>
  notes?: string | null
  techniques?: string[]
  mood?: string | null
  isSelected?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
  className?: string
  entryId?: string
  hidePieceInfo?: boolean // Hide piece title/composer
  children?: React.ReactNode // For additional content like piece titles
}

export const CompactEntryRow: React.FC<CompactEntryRowProps> = ({
  time,
  duration,
  type,
  instrument,
  pieces,
  notes,
  techniques,
  mood: _mood, // Currently unused but kept for future implementation
  isSelected,
  onEdit,
  onDelete,
  onClick,
  className,
  entryId,
  hidePieceInfo = false,
  children,
}) => {
  const [showNotes, setShowNotes] = useState(false)
  // Get instrument icon
  const getInstrumentIcon = (instrument?: string) => {
    const iconProps = {
      size: 14,
      className: 'text-morandi-stone-600',
    }

    const lowerInstrument = instrument?.toLowerCase()
    if (lowerInstrument?.includes('guitar')) {
      return <Guitar {...iconProps} />
    } else if (
      lowerInstrument?.includes('piano') ||
      lowerInstrument?.includes('keyboard')
    ) {
      return <Piano {...iconProps} />
    } else if (
      lowerInstrument?.includes('voice') ||
      lowerInstrument?.includes('vocal') ||
      lowerInstrument?.includes('sing')
    ) {
      return <Mic2 {...iconProps} />
    } else if (instrument) {
      return <Music {...iconProps} />
    }
    return null
  }

  return (
    <div
      className={cn(
        'border-b border-morandi-stone-200 last:border-b-0 relative',
        className
      )}
      data-testid="logbook-entry"
      data-entry-id={entryId}
    >
      {/* Highlight bar that doesn't shift content */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-morandi-purple-600" />
      )}
      <div
        className="py-3 px-4 hover:bg-morandi-stone-50 transition-colors group cursor-pointer"
        onClick={e => {
          // Only toggle notes if clicking on the main area, not buttons
          if (notes && !(e.target as HTMLElement).closest('button')) {
            setShowNotes(!showNotes)
          }
          if (onClick) {
            onClick()
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            {/* First row: Piece name | Composer name (if available) */}
            {!hidePieceInfo && pieces && pieces.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                {pieces.map((piece, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:gap-2"
                  >
                    <MusicTitle>{toTitleCase(piece.title)}</MusicTitle>
                    {piece.composer && (
                      <>
                        <span className="hidden sm:inline text-morandi-stone-400">
                          |
                        </span>
                        <MusicComposer className="text-morandi-stone-600">
                          {toTitleCase(piece.composer)}
                        </MusicComposer>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Second row: Time | Duration | Tags - allow wrapping on mobile */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-sm text-morandi-stone-700 font-medium">
                {time}
              </span>
              {/* Hide duration for status change entries */}
              {type?.toLowerCase() !== 'status_change' && (
                <>
                  <span className="text-sm text-morandi-stone-400 hidden sm:inline">
                    •
                  </span>
                  <span className="text-sm text-morandi-stone-700 font-medium">
                    {formatDuration(duration)}
                  </span>
                </>
              )}
              {type && (
                <span className="px-2 py-0.5 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                  {type}
                </span>
              )}
              {instrument && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-morandi-sand-100 text-morandi-stone-700 text-xs rounded-full">
                  {getInstrumentIcon(instrument)}
                  <span>{instrument}</span>
                </span>
              )}
              {techniques && techniques.length > 0 && (
                <div className="flex gap-1">
                  {techniques.map((technique, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-morandi-blush-100 text-morandi-stone-700 text-xs rounded-full"
                    >
                      {technique}
                    </span>
                  ))}
                </div>
              )}
              {notes && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setShowNotes(!showNotes)
                  }}
                  className="p-0.5 text-morandi-stone-500 hover:text-morandi-stone-700"
                  aria-label={showNotes ? 'Collapse notes' : 'Expand notes'}
                >
                  {showNotes ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              )}
            </div>

            {/* Notes section (collapsed by default) */}
            {notes && showNotes && (
              <div className="mt-2 -mx-0 -mr-10 pr-4 pl-0 py-2">
                <p className="text-sm text-morandi-stone-700 whitespace-pre-wrap">
                  {notes}
                </p>
              </div>
            )}

            {/* Children content (if provided for backward compatibility) */}
            {children && <div className="mt-1">{children}</div>}
          </div>

          {/* Action buttons */}
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {onEdit && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="p-1.5 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
                  aria-label="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="p-1.5 text-red-600 hover:text-red-800 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompactEntryRow
