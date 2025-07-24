import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../ui/Card'
import {
  format,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
  isSameDay,
} from 'date-fns'

interface HeatmapCalendarProps {
  data: Map<string, number> // date string -> minutes practiced
  year?: number
  onDayClick?: (date: string) => void
  className?: string
}

export function HeatmapCalendar({
  data,
  year = new Date().getFullYear(),
  onDayClick,
  className,
}: HeatmapCalendarProps) {
  const { t } = useTranslation(['reports'])

  const calendarData = useMemo(() => {
    const startDate = startOfYear(new Date(year, 0, 1))
    const endDate = endOfYear(new Date(year, 0, 1))
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Find max value for intensity calculation
    const maxValue = Math.max(...Array.from(data.values()), 1)

    // Group days by visual columns (not ISO weeks)
    // Each column represents 7 days starting from the first Sunday
    const weeks: Array<
      Array<{ date: Date; value: number; intensity: number }>
    > = []
    let currentWeek: Array<{ date: Date; value: number; intensity: number }> =
      []

    // Add empty days at the beginning if year doesn't start on Sunday
    const firstDayOfYear = getDay(startDate)
    for (let i = 0; i < firstDayOfYear; i++) {
      currentWeek.push({ date: new Date(0), value: 0, intensity: 0 }) // placeholder
    }

    days.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const value = data.get(dateStr) || 0
      const intensity = value > 0 ? Math.ceil((value / maxValue) * 4) : 0

      currentWeek.push({ date, value, intensity })

      // Start new week column after Saturday
      if (getDay(date) === 6) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })

    // Add any remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return { weeks, maxValue }
  }, [data, year])

  // Month labels - find which column each month starts in (first visible day)
  const monthLabels = useMemo(() => {
    const labels: { month: string; columnIndex: number }[] = []

    // For each month, find the column containing the first visible day
    for (let i = 0; i < 12; i++) {
      let found = false

      // Look through each column to find the first occurrence of this month
      for (
        let colIndex = 0;
        colIndex < calendarData.weeks.length && !found;
        colIndex++
      ) {
        const week = calendarData.weeks[colIndex]

        // Check if this column contains any real days (not placeholders) from this month
        const hasMonthDay = week.some(
          d =>
            d.date.getFullYear() === year &&
            d.date.getMonth() === i &&
            d.date.getFullYear() !== 1970 // Not a placeholder
        )

        if (hasMonthDay) {
          labels.push({
            month: format(new Date(year, i, 1), 'MMM'),
            columnIndex: colIndex,
          })
          found = true
        }
      }
    }
    return labels
  }, [year, calendarData.weeks])

  // Day labels
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const getIntensityColor = (intensity: number): string => {
    switch (intensity) {
      case 0:
        return 'bg-morandi-stone-100'
      case 1:
        return 'bg-morandi-sage-200'
      case 2:
        return 'bg-morandi-sage-300'
      case 3:
        return 'bg-morandi-sage-400'
      case 4:
        return 'bg-morandi-sage-500'
      default:
        return 'bg-morandi-stone-100'
    }
  }

  return (
    <Card className={className} data-testid="heatmap-calendar">
      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="inline-block">
            {/* Month labels row */}
            <div className="flex mb-1">
              {/* Empty space for day labels column */}
              <div className="w-8 mr-2"></div>

              {/* Month blocks */}
              <div className="flex gap-1">
                {calendarData.weeks.map((_, weekIndex) => {
                  const monthLabel = monthLabels.find(
                    label => label.columnIndex === weekIndex
                  )
                  return (
                    <div
                      key={weekIndex}
                      className="w-3 h-4 flex items-center justify-center"
                    >
                      {monthLabel && (
                        <span className="text-xs text-morandi-stone-600">
                          {monthLabel.month}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Calendar grid with day labels */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col mr-2">
                {/* Day labels */}
                {dayLabels.map((day, i) => (
                  <div
                    key={i}
                    className="text-xs text-morandi-stone-600 h-3 flex items-center justify-end pr-1 w-8"
                    style={{ marginBottom: '2px' }}
                  >
                    {i % 2 === 1 ? day : ''}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="flex gap-1">
                {calendarData.weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {/* Day cells */}
                    {week.map((dayData, dayIndex) => {
                      // Check if this is a placeholder (date year is 1970)
                      if (dayData.date.getFullYear() === 1970) {
                        return <div key={dayIndex} className="w-3 h-3" />
                      }

                      const dateStr = format(dayData.date, 'yyyy-MM-dd')
                      const isToday = isSameDay(dayData.date, new Date())

                      return (
                        <button
                          key={dayIndex}
                          className={`
                            w-3 h-3 rounded-sm transition-all
                            ${getIntensityColor(dayData.intensity)}
                            ${isToday ? 'ring-2 ring-morandi-stone-800 ring-offset-1' : ''}
                            ${dayData.value > 0 ? 'hover:ring-2 hover:ring-morandi-stone-400' : ''}
                          `}
                          onClick={() =>
                            dayData.value > 0 && onDayClick?.(dateStr)
                          }
                          title={`${format(dayData.date, 'MMM d, yyyy')}: ${formatDuration(dayData.value)}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-morandi-stone-600">
              <span>{t('reports:charts.less')}</span>
              {[0, 1, 2, 3, 4].map(intensity => (
                <div
                  key={intensity}
                  className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity)}`}
                />
              ))}
              <span>{t('reports:charts.more')}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
