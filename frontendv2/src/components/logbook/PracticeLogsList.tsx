import { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { LogbookEntry } from '@/api/logbook'
import { CompactEntryRow, DateSeparator, PeriodSelector } from '@/components/ui'
import type { PeriodLevel } from '@/components/ui'
import { formatDuration, formatDateSeparator } from '@/utils/dateUtils'

// Using PeriodLevel from PeriodSelector component

interface PracticeLogsListProps {
  entries: LogbookEntry[]
  selectedEntryId?: string
  onEntrySelect: (entry: LogbookEntry) => void
  onEntryEdit?: (entry: LogbookEntry) => void
  onEntryDelete?: (entry: LogbookEntry) => void
  showTimeline?: boolean
  className?: string
  hidePieceInfo?: boolean
}

interface GroupedEntries {
  date: string
  entries: LogbookEntry[]
  totalDuration: number
}

export function PracticeLogsList({
  entries,
  selectedEntryId,
  onEntrySelect,
  onEntryEdit,
  onEntryDelete,
  showTimeline = false,
  className = '',
  hidePieceInfo = false,
}: PracticeLogsListProps) {
  const { t, i18n } = useTranslation(['logbook', 'common'])
  const [selectedLevel, setSelectedLevel] = useState<PeriodLevel>('week')
  const [selectedDate, setSelectedDate] = useState<{
    year: number
    month: number
    week: number
  } | null>(null)

  // Format time for display
  const formatTime = useCallback(
    (timestamp: string) => {
      const date = new Date(timestamp)
      return date.toLocaleTimeString(i18n.language, {
        hour: 'numeric',
        minute: '2-digit',
      })
    },
    [i18n.language]
  )

  // Calculate the current week number of the month
  const getWeekOfMonth = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const dayOfMonth = date.getDate()
    const dayOfWeek = firstDayOfMonth.getDay()
    return Math.ceil((dayOfMonth + dayOfWeek) / 7)
  }

  // Filter entries based on selected timeline level
  const filteredEntries = useMemo(() => {
    if (!showTimeline || !selectedDate) return entries

    return entries.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      const entryYear = entryDate.getFullYear()
      const entryMonth = entryDate.getMonth()
      const entryWeek = getWeekOfMonth(entryDate)

      if (selectedLevel === 'year') {
        return entryYear === selectedDate.year
      } else if (selectedLevel === 'month') {
        return (
          entryYear === selectedDate.year && entryMonth === selectedDate.month
        )
      } else {
        return (
          entryYear === selectedDate.year &&
          entryMonth === selectedDate.month &&
          entryWeek === selectedDate.week
        )
      }
    })
  }, [entries, selectedDate, selectedLevel, showTimeline])

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, GroupedEntries>()

    // Sort entries by timestamp (newest first)
    const sortedEntries = [...filteredEntries].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    sortedEntries.forEach(entry => {
      const date = new Date(entry.timestamp)
      const dateKey = date.toDateString()

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: formatDateSeparator(date, i18n.language),
          entries: [],
          totalDuration: 0,
        })
      }

      const group = groups.get(dateKey)!
      group.entries.push(entry)
      group.totalDuration += entry.duration
    })

    return Array.from(groups.values())
  }, [filteredEntries, i18n.language])

  // Stats for display including unique pieces
  const stats = useMemo(() => {
    const totalDuration = filteredEntries.reduce(
      (sum, entry) => sum + entry.duration,
      0
    )

    // Count unique pieces
    const uniquePieceTitles = new Set<string>()
    filteredEntries.forEach(entry => {
      entry.pieces.forEach(piece => {
        if (piece.title) {
          uniquePieceTitles.add(piece.title.toLowerCase().trim())
        }
      })
    })

    return {
      entries: filteredEntries.length,
      totalDuration,
      uniquePieces: uniquePieceTitles.size,
    }
  }, [filteredEntries])

  // Initialize selected date on mount
  useEffect(() => {
    if (!showTimeline) return

    if (entries.length > 0) {
      const latestEntry = entries.reduce((latest, entry) => {
        const entryDate = new Date(entry.timestamp)
        const latestDate = new Date(latest.timestamp)
        return entryDate > latestDate ? entry : latest
      })
      const date = new Date(latestEntry.timestamp)
      setSelectedDate({
        year: date.getFullYear(),
        month: date.getMonth(),
        week: getWeekOfMonth(date),
      })
    } else {
      const now = new Date()
      setSelectedDate({
        year: now.getFullYear(),
        month: now.getMonth(),
        week: getWeekOfMonth(now),
      })
    }
  }, [entries, showTimeline])

  // Timeline navigation handlers
  const handlePrevious = () => {
    if (!selectedDate) return
    const newDate = new Date(selectedDate.year, selectedDate.month, 1)

    if (selectedLevel === 'week') {
      let targetWeek = selectedDate.week - 1
      let targetMonth = selectedDate.month
      let targetYear = selectedDate.year

      if (targetWeek < 1) {
        targetMonth--
        if (targetMonth < 0) {
          targetMonth = 11
          targetYear--
        }
        const lastDayOfPrevMonth = new Date(targetYear, targetMonth + 1, 0)
        targetWeek = getWeekOfMonth(lastDayOfPrevMonth)
      }

      setSelectedDate({
        year: targetYear,
        month: targetMonth,
        week: targetWeek,
      })
    } else if (selectedLevel === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
      setSelectedDate({
        year: newDate.getFullYear(),
        month: newDate.getMonth(),
        week: getWeekOfMonth(newDate),
      })
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1)
      setSelectedDate({
        year: newDate.getFullYear(),
        month: newDate.getMonth(),
        week: getWeekOfMonth(newDate),
      })
    }
  }

  const handleNext = () => {
    if (!selectedDate) return
    const newDate = new Date(selectedDate.year, selectedDate.month, 1)

    if (selectedLevel === 'week') {
      let targetWeek = selectedDate.week + 1
      let targetMonth = selectedDate.month
      let targetYear = selectedDate.year

      const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0)
      const maxWeek = getWeekOfMonth(lastDayOfMonth)

      if (targetWeek > maxWeek) {
        targetWeek = 1
        targetMonth++
        if (targetMonth > 11) {
          targetMonth = 0
          targetYear++
        }
      }

      setSelectedDate({
        year: targetYear,
        month: targetMonth,
        week: targetWeek,
      })
    } else if (selectedLevel === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
      setSelectedDate({
        year: newDate.getFullYear(),
        month: newDate.getMonth(),
        week: getWeekOfMonth(newDate),
      })
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1)
      setSelectedDate({
        year: newDate.getFullYear(),
        month: newDate.getMonth(),
        week: getWeekOfMonth(newDate),
      })
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Period Selector - Enhanced timeline navigation */}
      {showTimeline && selectedDate && (
        <PeriodSelector
          selectedLevel={selectedLevel}
          selectedDate={selectedDate}
          stats={stats}
          onLevelChange={setSelectedLevel}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      )}

      {/* Entries List */}
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200">
        {groupedEntries.length === 0 ? (
          <div className="p-8 text-center text-morandi-stone-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-morandi-stone-300" />
            <p className="text-lg mb-2">{t('logbook:empty')}</p>
            <p className="text-sm">{t('logbook:emptyDescription')}</p>
          </div>
        ) : (
          groupedEntries.map((group, groupIndex) => (
            <div key={group.date} className={groupIndex > 0 ? 'mt-2' : ''}>
              <DateSeparator
                date={group.date}
                totalDuration={formatDuration(group.totalDuration)}
              />

              {group.entries.map((entry, entryIndex) => (
                <CompactEntryRow
                  key={entry.id}
                  entryId={entry.id}
                  time={formatTime(entry.timestamp)}
                  duration={entry.duration}
                  type={entry.type}
                  instrument={entry.instrument || undefined}
                  pieces={entry.pieces}
                  notes={entry.notes}
                  techniques={entry.techniques}
                  mood={entry.mood}
                  isSelected={selectedEntryId === entry.id}
                  onEdit={onEntryEdit ? () => onEntryEdit(entry) : undefined}
                  onDelete={
                    onEntryDelete ? () => onEntryDelete(entry) : undefined
                  }
                  onClick={() => onEntrySelect(entry)}
                  hidePieceInfo={hidePieceInfo}
                  className={
                    entryIndex < group.entries.length - 1 ? 'mb-1' : ''
                  }
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default PracticeLogsList
