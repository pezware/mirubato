import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, Music, Calendar } from 'lucide-react'
import { SegmentedControl } from './SegmentedControl'
import type { SegmentOption } from './SegmentedControl'
import { cn } from '../utils/cn'
import { formatDuration } from '../utils/dateUtils'

export type PeriodLevel = 'week' | 'month' | 'year'

export interface PeriodDate {
  year: number
  month: number
  week: number
}

export interface PeriodStats {
  entries: number
  totalDuration: number
  uniquePieces: number
}

export interface PeriodSelectorLabels {
  /** Period level labels */
  periodLevels: {
    week: string
    month: string
    year: string
  }
  /** Month names (January through December, 0-indexed array) */
  months: string[]
  /** Navigation button labels */
  navigation: {
    prevWeek: string
    prevMonth: string
    prevYear: string
    nextWeek: string
    nextMonth: string
    nextYear: string
  }
  /** Section header (e.g., "View by") */
  viewBy: string
  /** Stats section labels */
  stats: {
    sessions: string
    totalTime: string
    pieces: string
  }
  /** Segmented control aria label */
  segmentedControlAriaLabel: string
}

export interface PeriodSelectorProps {
  selectedLevel: PeriodLevel
  selectedDate: PeriodDate
  stats: PeriodStats
  onLevelChange: (level: PeriodLevel) => void
  onPrevious: () => void
  onNext: () => void
  className?: string
  /** All text labels - required for i18n support */
  labels: PeriodSelectorLabels
  /** Locale for date formatting (e.g., 'en-US', 'zh-TW') */
  locale?: string
}

export function PeriodSelector({
  selectedLevel,
  selectedDate,
  stats,
  onLevelChange,
  onPrevious,
  onNext,
  className,
  labels,
  locale = 'en-US',
}: PeriodSelectorProps) {
  // Period level options for segmented control
  const periodOptions: SegmentOption[] = useMemo(
    () => [
      {
        value: 'week',
        label: labels.periodLevels.week,
        icon: <Calendar className="w-3.5 h-3.5" />,
      },
      {
        value: 'month',
        label: labels.periodLevels.month,
        icon: <Calendar className="w-3.5 h-3.5" />,
      },
      {
        value: 'year',
        label: labels.periodLevels.year,
        icon: <Calendar className="w-3.5 h-3.5" />,
      },
    ],
    [labels.periodLevels]
  )

  // Format the current period label based on selected level
  const periodLabel = useMemo(() => {
    if (selectedLevel === 'year') {
      return selectedDate.year.toString()
    } else if (selectedLevel === 'month') {
      return `${labels.months[selectedDate.month]} ${selectedDate.year}`
    } else {
      // Week level - show date range
      const firstDayOfMonth = new Date(selectedDate.year, selectedDate.month, 1)
      const dayOfWeek = firstDayOfMonth.getDay()

      // Calculate the start date of the selected week
      const weekStartDay = (selectedDate.week - 1) * 7 - dayOfWeek + 1
      const weekStart = new Date(
        selectedDate.year,
        selectedDate.month,
        weekStartDay
      )
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Format dates using locale
      const formatDate = (date: Date) => {
        return date.toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
        })
      }

      // If week spans two months, show both
      if (weekStart.getMonth() !== weekEnd.getMonth()) {
        return `${formatDate(weekStart)} - ${formatDate(weekEnd)}, ${weekEnd.getFullYear()}`
      }
      return `${formatDate(weekStart)} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    }
  }, [selectedLevel, selectedDate, labels.months, locale])

  // Navigation button labels
  const prevLabel = useMemo(() => {
    if (selectedLevel === 'week') return labels.navigation.prevWeek
    if (selectedLevel === 'month') return labels.navigation.prevMonth
    return labels.navigation.prevYear
  }, [selectedLevel, labels.navigation])

  const nextLabel = useMemo(() => {
    if (selectedLevel === 'week') return labels.navigation.nextWeek
    if (selectedLevel === 'month') return labels.navigation.nextMonth
    return labels.navigation.nextYear
  }, [selectedLevel, labels.navigation])

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-morandi-stone-200 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Row 1: Period Level Selector */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-morandi-stone-600">
            {labels.viewBy}
          </h3>
        </div>
        <SegmentedControl
          options={periodOptions}
          value={selectedLevel}
          onChange={value => onLevelChange(value as PeriodLevel)}
          size="sm"
          className="w-full"
          ariaLabel={labels.segmentedControlAriaLabel}
        />
      </div>

      {/* Row 2: Period Navigator */}
      <div className="px-4 py-3 bg-morandi-stone-50 border-t border-morandi-stone-200">
        <div className="flex items-center justify-between gap-2">
          {/* Previous Button */}
          <button
            onClick={onPrevious}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-morandi-stone-600 hover:text-morandi-stone-800 hover:bg-morandi-stone-100 rounded-lg transition-colors"
            aria-label={prevLabel}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{prevLabel}</span>
          </button>

          {/* Current Period Label */}
          <div className="flex-1 text-center">
            <span className="text-base font-semibold text-morandi-stone-800">
              {periodLabel}
            </span>
          </div>

          {/* Next Button */}
          <button
            onClick={onNext}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-morandi-stone-600 hover:text-morandi-stone-800 hover:bg-morandi-stone-100 rounded-lg transition-colors"
            aria-label={nextLabel}
          >
            <span className="hidden sm:inline">{nextLabel}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 3: Period Summary Stats */}
      <div className="px-4 py-3 border-t border-morandi-stone-200">
        <div className="grid grid-cols-3 gap-3">
          {/* Sessions Count */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-morandi-sage-100 rounded-md">
              <Calendar className="w-4 h-4 text-morandi-sage-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-morandi-stone-800">
                {stats.entries}
              </p>
              <p className="text-xs text-morandi-stone-500">
                {labels.stats.sessions}
              </p>
            </div>
          </div>

          {/* Total Duration */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-morandi-purple-100 rounded-md">
              <Clock className="w-4 h-4 text-morandi-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-morandi-stone-800">
                {formatDuration(stats.totalDuration)}
              </p>
              <p className="text-xs text-morandi-stone-500">
                {labels.stats.totalTime}
              </p>
            </div>
          </div>

          {/* Unique Pieces */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-morandi-rose-100 rounded-md">
              <Music className="w-4 h-4 text-morandi-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-morandi-stone-800">
                {stats.uniquePieces}
              </p>
              <p className="text-xs text-morandi-stone-500">
                {labels.stats.pieces}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PeriodSelector
