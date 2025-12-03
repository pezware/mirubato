import React, { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
} from 'date-fns'
import { formatDuration } from '@/utils/dateUtils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { RepertoireItem } from '@/api/repertoire'

interface RecentPractice {
  timestamp: number
  duration: number
}

interface EnrichedRepertoireItem extends RepertoireItem {
  scoreTitle: string
  scoreComposer: string
  recentPractice?: RecentPractice[]
}

interface RepertoireCalendarViewProps {
  enrichedRepertoire: EnrichedRepertoireItem[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
}

export const RepertoireCalendarView: React.FC<RepertoireCalendarViewProps> = ({
  enrichedRepertoire,
  currentMonth,
  onMonthChange,
}) => {
  const { t } = useTranslation(['repertoire', 'common'])

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate practice data for the current month
  const calendarData = useMemo(() => {
    const startDate = startOfMonth(currentMonth)
    const endDate = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Aggregate practice data by day
    const practiceByDay = new Map<
      string,
      { minutes: number; pieces: Set<string> }
    >()

    enrichedRepertoire.forEach(item => {
      // Use recentPractice which contains the practice session data
      item.recentPractice?.forEach((session: RecentPractice) => {
        const dateStr = format(new Date(session.timestamp), 'yyyy-MM-dd')
        const existing = practiceByDay.get(dateStr) || {
          minutes: 0,
          pieces: new Set(),
        }
        existing.minutes += session.duration
        existing.pieces.add(item.scoreTitle)
        practiceByDay.set(dateStr, existing)
      })
    })

    // Find max value for intensity calculation
    const maxMinutes = Math.max(
      ...Array.from(practiceByDay.values()).map(d => d.minutes),
      1
    )

    // Create calendar grid
    const firstDayOfMonth = getDay(startDate)
    const calendarDays: Array<{
      date: Date | null
      dateStr: string
      minutes: number
      pieces: string[]
      intensity: number
      isCurrentMonth: boolean
    }> = []

    // Add empty days at the beginning
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push({
        date: null,
        dateStr: '',
        minutes: 0,
        pieces: [],
        intensity: 0,
        isCurrentMonth: false,
      })
    }

    // Add days of the month
    days.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const data = practiceByDay.get(dateStr) || {
        minutes: 0,
        pieces: new Set(),
      }
      const intensity =
        data.minutes > 0 ? Math.ceil((data.minutes / maxMinutes) * 4) : 0

      calendarDays.push({
        date,
        dateStr,
        minutes: data.minutes,
        pieces: Array.from(data.pieces),
        intensity,
        isCurrentMonth: true,
      })
    })

    return { calendarDays, maxMinutes }
  }, [enrichedRepertoire, currentMonth])

  const getIntensityColor = (intensity: number): string => {
    switch (intensity) {
      case 0:
        return 'bg-stone-100'
      case 1:
        return 'bg-morandi-sage-100'
      case 2:
        return 'bg-morandi-sage-200'
      case 3:
        return 'bg-morandi-sage-300'
      case 4:
        return 'bg-morandi-sage-400'
      default:
        return 'bg-stone-100'
    }
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    onMonthChange(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    onMonthChange(newDate)
  }

  // Day labels
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-6 max-w-2xl mx-auto">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-stone-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousMonth}
            className="p-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="p-1"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayLabels.map((day, i) => (
          <div
            key={i}
            className="text-center text-sm font-medium text-stone-600 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.calendarDays.map((dayData, index) => {
          if (!dayData.date || !dayData.isCurrentMonth) {
            return <div key={index} className="aspect-[4/3]" />
          }

          const isToday = isSameDay(dayData.date, new Date())
          const dayNumber = dayData.date.getDate()

          return (
            <div
              key={index}
              className={`
                aspect-[4/3] p-2 rounded-lg border transition-all cursor-pointer
                ${getIntensityColor(dayData.intensity)}
                ${isToday ? 'ring-2 ring-stone-800 ring-offset-1' : 'border-transparent'}
                ${dayData.minutes > 0 ? 'hover:border-stone-400' : 'hover:border-stone-200'}
              `}
              title={
                dayData.minutes > 0
                  ? `${format(dayData.date, 'MMM d')}: ${formatDuration(dayData.minutes)}\n${dayData.pieces.join(', ')}`
                  : format(dayData.date, 'MMM d')
              }
            >
              <div className="h-full flex flex-col justify-between">
                <div className="text-sm font-medium text-stone-700">
                  {dayNumber}
                </div>
                {dayData.minutes > 0 && !isMobile && (
                  <div className="text-xs text-stone-600">
                    {formatDuration(dayData.minutes)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <span>{t('common:less')}</span>
          {[0, 1, 2, 3, 4].map(intensity => (
            <div
              key={intensity}
              className={`w-4 h-4 rounded ${getIntensityColor(intensity)}`}
            />
          ))}
          <span>{t('common:more')}</span>
        </div>
        <div className="text-xs text-stone-600">
          {t('repertoire:totalSessions')}:{' '}
          {calendarData.calendarDays.filter(d => d.minutes > 0).length}
        </div>
      </div>
    </div>
  )
}
