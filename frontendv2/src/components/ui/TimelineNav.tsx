import { useState } from 'react'
import { cn } from '../../utils/cn'

export interface TimelineLevel {
  label: string
  value: string
  level: 'year' | 'month' | 'week'
}

interface TimelineNavProps {
  levels: TimelineLevel[]
  selectedLevel: string
  onLevelChange: (level: TimelineLevel) => void
  summary?: string
  className?: string
}

export default function TimelineNav({
  levels,
  selectedLevel,
  onLevelChange,
  summary,
  className,
}: TimelineNavProps) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!levels || levels.length === 0) return 0
    const index = levels.findIndex(l => l.value === selectedLevel)
    return index >= 0 ? index : 0
  })

  const handleClick = (level: TimelineLevel, index: number) => {
    setActiveIndex(index)
    onLevelChange(level)
  }

  if (!levels || levels.length === 0) {
    return null
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div className="flex mr-auto bg-white rounded-lg border border-morandi-stone-300 overflow-hidden">
          {levels.map((level, index) => {
            const isActive = index <= activeIndex
            const isFirst = index === 0

            return (
              <button
                key={level.value}
                onClick={() => handleClick(level, index)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-morandi-stone-100 text-morandi-stone-700'
                    : 'bg-white text-morandi-stone-500 hover:bg-morandi-stone-50',
                  !isFirst && 'border-l border-morandi-stone-300',
                  'focus:outline-none focus:ring-2 focus:ring-morandi-sage-400 focus:ring-inset'
                )}
              >
                <span className="relative z-10">{level.label}</span>
                {isActive && index === activeIndex && (
                  <div className="absolute inset-0 bg-morandi-sage-100" />
                )}
              </button>
            )
          })}
        </div>

        {summary && (
          <div className="text-sm text-morandi-stone-600 sm:ml-6">
            {summary}
          </div>
        )}
      </div>
    </div>
  )
}
