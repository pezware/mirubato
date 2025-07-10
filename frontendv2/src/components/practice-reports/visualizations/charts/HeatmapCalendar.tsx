import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../ui/Card'
import {
  format,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
  getWeek,
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

    // Group days by week
    const weeks = new Map<
      number,
      Array<{ date: Date; value: number; intensity: number }>
    >()

    days.forEach(date => {
      const weekNum = getWeek(date)
      const dateStr = format(date, 'yyyy-MM-dd')
      const value = data.get(dateStr) || 0
      const intensity = value > 0 ? Math.ceil((value / maxValue) * 4) : 0

      if (!weeks.has(weekNum)) {
        weeks.set(weekNum, [])
      }

      weeks.get(weekNum)!.push({ date, value, intensity })
    })

    return { weeks: Array.from(weeks.values()), maxValue }
  }, [data, year])

  // Month labels with proper positions
  const monthLabels = useMemo(() => {
    const labels = []
    const startDate = startOfYear(new Date(year, 0, 1))
    const firstDayOfWeek = getDay(startDate) // 0 = Sunday, 6 = Saturday

    for (let i = 0; i < 12; i++) {
      const firstDayOfMonth = new Date(year, i, 1)
      const daysSinceStart = Math.floor(
        (firstDayOfMonth.getTime() - startDate.getTime()) /
          (24 * 60 * 60 * 1000)
      )

      // Calculate the week position accounting for the starting day of the year
      const weekPosition = Math.floor((daysSinceStart + firstDayOfWeek) / 7)

      labels.push({
        month: format(firstDayOfMonth, 'MMM'),
        position: weekPosition * 13 + 8, // 13px per week (12px block + 1px gap) + 8px offset for day labels
      })
    }
    return labels
  }, [year])

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
            {/* Month labels with proper alignment */}
            <div className="relative h-6 mb-2">
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="absolute text-xs text-morandi-stone-600"
                  style={{ left: `${label.position}px` }}
                >
                  {label.month}
                </div>
              ))}
            </div>

            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col mr-2">
                {dayLabels.map((day, i) => (
                  <div
                    key={i}
                    className="text-xs text-morandi-stone-600 h-3 flex items-center justify-end pr-1"
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
                    {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                      const dayData = week.find(
                        d => getDay(d.date) === dayIndex
                      )

                      if (!dayData) {
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

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryStat
            label={t('reports:stats.totalDays')}
            value={data.size}
            testId="heatmap-total-days"
          />
          <SummaryStat
            label={t('reports:stats.totalTime')}
            value={formatDuration(
              Array.from(data.values()).reduce((a, b) => a + b, 0)
            )}
            testId="heatmap-total-time"
          />
          <SummaryStat
            label={t('reports:stats.avgPerDay')}
            value={formatDuration(
              data.size > 0
                ? Array.from(data.values()).reduce((a, b) => a + b, 0) /
                    data.size
                : 0
            )}
            testId="heatmap-avg-per-day"
          />
          <SummaryStat
            label={t('reports:stats.longestDay')}
            value={formatDuration(Math.max(...Array.from(data.values()), 0))}
            testId="heatmap-longest-day"
          />
        </div>
      </div>
    </Card>
  )
}

function SummaryStat({
  label,
  value,
  testId,
}: {
  label: string
  value: string | number
  testId?: string
}) {
  return (
    <div className="bg-morandi-stone-50 rounded-lg p-3" data-testid={testId}>
      <div className="text-xs text-morandi-stone-600">{label}</div>
      <div className="text-lg font-semibold text-morandi-stone-800">
        {value}
      </div>
    </div>
  )
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
