import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import Autocomplete from '../ui/Autocomplete'
import Button from '../ui/Button'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnalyticsData } from '../../hooks/usePracticeAnalytics'

// Type for autocomplete hook return
interface AutocompleteHook {
  query: string
  setQuery: (query: string) => void
  suggestions: Array<{
    value: string
    label: string
    metadata?: {
      composer?: string
      gradeLevel?: number
      instrument?: string
      [key: string]: unknown
    }
  }>
  isLoading: boolean
}

export type TimePeriod = 'all' | 'month' | 'week'
export type SortBy = 'mostRecent' | 'mostPracticed' | 'longestSessions'

interface ReportsFiltersProps {
  timePeriod: TimePeriod
  setTimePeriod: (period: TimePeriod) => void
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  selectedPiece: string | null
  setSelectedPiece: (piece: string | null) => void
  selectedComposer: string | null
  setSelectedComposer: (composer: string | null) => void
  sortBy: SortBy
  setSortBy: (sort: SortBy) => void
  reportView: 'overview' | 'pieces'
  pieceAutocomplete: AutocompleteHook
  composerAutocomplete: AutocompleteHook
  analytics: AnalyticsData
  customDateRange?: { start: Date; end: Date }
  setCustomDateRange?: (range: { start: Date; end: Date } | undefined) => void
  children?: React.ReactNode
}

export function ReportsFilters({
  timePeriod,
  setTimePeriod,
  selectedDate,
  setSelectedDate,
  selectedPiece,
  setSelectedPiece,
  selectedComposer,
  setSelectedComposer,
  sortBy: _sortBy,
  setSortBy: _setSortBy,
  reportView,
  pieceAutocomplete,
  composerAutocomplete,
  analytics,
  customDateRange,
  setCustomDateRange,
  children,
}: ReportsFiltersProps) {
  const { t } = useTranslation(['reports', 'common'])

  // State for managing the current viewing period
  const [currentViewDate, setCurrentViewDate] = useState(new Date())

  // Reset currentViewDate when time period changes
  useEffect(() => {
    setCurrentViewDate(new Date())
    // Also clear the selected date when switching time periods
    setSelectedDate(null)
  }, [timePeriod, setSelectedDate])

  // Update view date when custom range changes
  useEffect(() => {
    if (customDateRange) {
      setCurrentViewDate(customDateRange.start)
    }
  }, [customDateRange])

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentViewDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }

    setCurrentViewDate(newDate)

    // Update custom date range for the new month
    if (setCustomDateRange) {
      const start = new Date(newDate.getFullYear(), newDate.getMonth(), 1)
      const end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0)
      setCustomDateRange({ start, end })
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentViewDate)
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }

    setCurrentViewDate(newDate)

    // Update custom date range for the new week
    if (setCustomDateRange) {
      const start = new Date(newDate)
      start.setDate(start.getDate() - start.getDay()) // Start of week
      const end = new Date(start)
      end.setDate(end.getDate() + 6) // End of week
      setCustomDateRange({ start, end })
    }
  }

  return (
    <>
      {/* Time Period Filter */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={() => setTimePeriod('all')}
          variant={timePeriod === 'all' ? 'primary' : 'secondary'}
          size="sm"
          className="text-xs md:text-sm"
        >
          {t('reports:filters.allTime')}
        </Button>
        <Button
          onClick={() => setTimePeriod('month')}
          variant={timePeriod === 'month' ? 'primary' : 'secondary'}
          size="sm"
          className="text-xs md:text-sm"
        >
          {t('reports:filters.thisMonth')}
        </Button>
        <Button
          onClick={() => setTimePeriod('week')}
          variant={timePeriod === 'week' ? 'primary' : 'secondary'}
          size="sm"
          className="text-xs md:text-sm"
        >
          {t('reports:filters.last7Days')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left: Calendar and Filters */}
        <div>
          {/* Calendar Heat Map */}
          <div className="mb-4">
            <div className="flex items-center justify-end mb-3">
              {timePeriod !== 'all' && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      timePeriod === 'month'
                        ? navigateMonth('prev')
                        : navigateWeek('prev')
                    }
                    variant="ghost"
                    size="icon-sm"
                    className="w-6 h-6"
                    data-testid="calendar-nav-left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-morandi-stone-600 min-w-[120px] text-center">
                    {timePeriod === 'month'
                      ? currentViewDate.toLocaleDateString(undefined, {
                          month: 'long',
                          year: 'numeric',
                        })
                      : `${new Date(currentViewDate.getTime() - currentViewDate.getDay() * 86400000).toLocaleDateString()} - ${new Date(currentViewDate.getTime() + (6 - currentViewDate.getDay()) * 86400000).toLocaleDateString()}`}
                  </span>
                  <Button
                    onClick={() =>
                      timePeriod === 'month'
                        ? navigateMonth('next')
                        : navigateWeek('next')
                    }
                    variant="ghost"
                    size="icon-sm"
                    className="w-6 h-6"
                    data-testid="calendar-nav-right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            {timePeriod === 'week' && (
              <CalendarWeekView
                analytics={analytics}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                currentViewDate={currentViewDate}
              />
            )}
            {timePeriod === 'month' && (
              <CalendarMonthView
                analytics={analytics}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                currentViewDate={currentViewDate}
              />
            )}
          </div>

          {selectedDate && (
            <div className="text-sm text-morandi-stone-600 mb-3">
              {t('reports:showingDataFor')}{' '}
              {new Date(selectedDate).toLocaleDateString()}
              <Button
                onClick={() => setSelectedDate(null)}
                variant="ghost"
                size="sm"
                className="ml-2 text-morandi-sage-600 hover:text-morandi-sage-700"
              >
                {t('common:clear')}
              </Button>
            </div>
          )}

          {/* Filters for pieces view */}
          {reportView === 'pieces' && (
            <div className="space-y-3">
              <div className="relative">
                <Autocomplete
                  placeholder={t('reports:searchPieces')}
                  value={selectedPiece || ''}
                  onChange={value => {
                    setSelectedPiece(value)
                    pieceAutocomplete.setQuery(value)
                    if (!value) {
                      setSelectedComposer(null)
                    }
                  }}
                  onSelect={option => {
                    setSelectedPiece(option.label)
                    if (option.metadata?.composer) {
                      setSelectedComposer(option.metadata.composer)
                    }
                  }}
                  options={pieceAutocomplete.suggestions}
                  isLoading={pieceAutocomplete.isLoading}
                />
                {selectedPiece && (
                  <Button
                    onClick={() => {
                      setSelectedPiece(null)
                      setSelectedComposer(null)
                      pieceAutocomplete.setQuery('')
                    }}
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="relative">
                <Autocomplete
                  placeholder={t('reports:searchComposers')}
                  value={selectedComposer || ''}
                  onChange={value => {
                    setSelectedComposer(value)
                    composerAutocomplete.setQuery(value)
                    if (!value) {
                      setSelectedPiece(null)
                    }
                  }}
                  onSelect={option => {
                    setSelectedComposer(option.value)
                    setSelectedPiece(null)
                  }}
                  options={composerAutocomplete.suggestions}
                  isLoading={composerAutocomplete.isLoading}
                />
                {selectedComposer && (
                  <Button
                    onClick={() => {
                      setSelectedComposer(null)
                      composerAutocomplete.setQuery('')
                    }}
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary Stats */}
        <div>{children}</div>
      </div>
    </>
  )
}

// Calendar components
function CalendarWeekView({
  analytics,
  selectedDate,
  setSelectedDate,
  currentViewDate,
}: {
  analytics: AnalyticsData
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  currentViewDate: Date
}) {
  const startOfWeek = new Date(currentViewDate)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const weekDates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    weekDates.push(date)
  }

  return (
    <div className="max-w-sm">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDates.map((date, i) => (
          <div
            key={`header-${i}`}
            className="text-center text-xs text-morandi-stone-500 font-medium py-1"
          >
            {date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, i) => {
          const dateStr = date.toDateString()
          const practiceMinutes = analytics.practiceByDay.get(dateStr) || 0
          const intensity =
            practiceMinutes > 0 ? Math.min(practiceMinutes / 60, 1) : 0
          const isSelected =
            selectedDate && new Date(selectedDate).toDateString() === dateStr
          const isToday = new Date().toDateString() === dateStr

          return (
            <Button
              key={`day-${i}-${date.getDate()}`}
              onClick={() => {
                if (isSelected) {
                  setSelectedDate(null)
                } else {
                  setSelectedDate(date.toISOString())
                }
              }}
              variant="ghost"
              className={`aspect-square rounded transition-all text-sm relative flex flex-col items-center justify-center ${
                isSelected ? 'ring-2 ring-morandi-sage-500 ring-offset-2' : ''
              } ${
                practiceMinutes > 0
                  ? intensity > 0.75
                    ? 'bg-morandi-sage-700'
                    : intensity > 0.5
                      ? 'bg-morandi-sage-600'
                      : intensity > 0.25
                        ? 'bg-morandi-sage-500'
                        : 'bg-morandi-sage-400'
                  : 'bg-morandi-stone-100'
              } ${isToday ? 'font-bold' : ''}`}
            >
              <span
                className={
                  practiceMinutes > 0 && intensity > 0.5 ? 'text-white' : ''
                }
              >
                {date.getDate()}
              </span>
              {practiceMinutes > 0 && (
                <div className="text-xs mt-0.5">
                  {practiceMinutes < 60
                    ? `${practiceMinutes}m`
                    : `${Math.round(practiceMinutes / 60)}h`}
                </div>
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function CalendarMonthView({
  analytics,
  selectedDate,
  setSelectedDate,
  currentViewDate,
}: {
  analytics: AnalyticsData
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  currentViewDate: Date
}) {
  const currentMonth = currentViewDate.getMonth()
  const currentYear = currentViewDate.getFullYear()

  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const monthDates: (Date | null)[] = []

  // Add padding for start of month
  for (let i = 0; i < startPadding; i++) {
    monthDates.push(null)
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    monthDates.push(new Date(currentYear, currentMonth, day))
  }

  return (
    <div className="max-w-sm">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div
            key={`header-${i}`}
            className="text-center text-xs text-morandi-stone-500 font-medium py-1"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthDates.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} />
          }

          const dateStr = date.toDateString()
          const practiceMinutes = analytics.practiceByDay.get(dateStr) || 0
          const intensity =
            practiceMinutes > 0 ? Math.min(practiceMinutes / 60, 1) : 0
          const isSelected =
            selectedDate && new Date(selectedDate).toDateString() === dateStr
          const isToday = new Date().toDateString() === dateStr

          return (
            <Button
              key={`day-${date.getDate()}`}
              onClick={() => {
                if (isSelected) {
                  setSelectedDate(null)
                } else {
                  setSelectedDate(date.toISOString())
                }
              }}
              variant="ghost"
              className={`aspect-square rounded transition-all text-xs relative ${
                isSelected ? 'ring-2 ring-morandi-sage-500 ring-offset-1' : ''
              } ${
                practiceMinutes > 0
                  ? intensity > 0.75
                    ? 'bg-morandi-sage-700'
                    : intensity > 0.5
                      ? 'bg-morandi-sage-600'
                      : intensity > 0.25
                        ? 'bg-morandi-sage-500'
                        : 'bg-morandi-sage-400'
                  : 'bg-morandi-stone-100'
              } ${isToday ? 'font-bold' : ''}`}
            >
              <span
                className={
                  practiceMinutes > 0 && intensity > 0.5 ? 'text-white' : ''
                }
              >
                {date.getDate()}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
