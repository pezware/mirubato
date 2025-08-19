import React from 'react'
import { Edit2, Clock, Music, Guitar, Piano, Mic2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/dateUtils'

interface CompactEntryRowProps {
  time: string
  duration: number // in minutes
  type?: string
  instrument?: string
  isSelected?: boolean
  onEdit?: () => void
  onClick?: () => void
  className?: string
  entryId?: string
  children?: React.ReactNode // For additional content like piece titles
}

export const CompactEntryRow: React.FC<CompactEntryRowProps> = ({
  time,
  duration,
  type,
  instrument,
  isSelected,
  onEdit,
  onClick,
  className,
  entryId,
  children,
}) => {
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
        'border-b border-morandi-stone-200 last:border-b-0',
        isSelected && 'border-l-4 border-l-morandi-purple-600',
        className
      )}
      onClick={onClick}
      data-testid="logbook-entry"
      data-entry-id={entryId}
    >
      <div className="p-2 hover:bg-morandi-stone-50 transition-colors group cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Main content row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-morandi-stone-500">
                <Clock size={14} className="text-morandi-stone-400" />
                <span>{time}</span>
              </div>
              <span className="text-morandi-stone-700 font-medium">
                {formatDuration(duration)}
              </span>
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
            </div>

            {/* Children content (piece titles, etc) - only show if provided */}
            {children && <div className="mt-1">{children}</div>}
          </div>

          {/* Edit button */}
          {onEdit && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={e => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
                aria-label="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompactEntryRow
