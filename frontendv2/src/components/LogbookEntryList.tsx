import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Music } from 'lucide-react'
import type { LogbookEntry } from '../api/logbook'
import { useLogbookStore } from '../stores/logbookStore'
import { useLayoutPreferences } from '../hooks/useLayoutPreferences'
import ManualEntryForm from './ManualEntryForm'
import {
  ResizableSplitView,
  EntryDetailPanel,
  DateSeparator,
  CompactEntryRow,
} from './ui'
import TimelineNav, { TimelineLevel } from './ui/TimelineNav'
import { formatDuration, formatDateSeparator } from '../utils/dateUtils'

interface LogbookEntryListProps {
  entries: LogbookEntry[]
  onUpdate: () => void
}

export default function LogbookEntryList({
  entries,
  onUpdate,
}: LogbookEntryListProps) {
  const { t, i18n } = useTranslation(['logbook', 'common'])
  const { deleteEntry } = useLogbookStore()
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null)
  const [selectedLevel, setSelectedLevel] = useState('week')
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null)
  const [selectedDate, setSelectedDate] = useState<{
    year: number
    month: number
    week: number
  } | null>(null)

  // Layout preferences
  const { splitRatio, setSplitRatio, setLastSelectedId } =
    useLayoutPreferences('logbook')

  const handleDelete = useCallback(
    async (entry: LogbookEntry) => {
      if (!confirm(t('logbook:entry.confirmDelete'))) {
        return
      }

      try {
        await deleteEntry(entry.id)
        if (selectedEntry?.id === entry.id) {
          setSelectedEntry(null)
        }
        onUpdate()
      } catch (error) {
        console.error('Failed to delete entry:', error)
      }
    },
    [deleteEntry, onUpdate, selectedEntry, t]
  )

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(i18n.language, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Handle entry selection
  const handleEntryClick = useCallback(
    (entry: LogbookEntry) => {
      setSelectedEntry(entry)
      setLastSelectedId(entry.id)
    },
    [setLastSelectedId]
  )

  // Handle edit
  const handleEdit = useCallback((entry: LogbookEntry) => {
    setEditingEntry(entry)
  }, [])

  // Calculate the current week number of the month
  const getWeekOfMonth = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const dayOfMonth = date.getDate()
    const dayOfWeek = firstDayOfMonth.getDay()
    return Math.ceil((dayOfMonth + dayOfWeek) / 7)
  }

  // Filter entries based on selected timeline level
  const filteredEntries = useMemo(() => {
    if (!selectedDate) return entries

    return entries.filter(entry => {
      const entryDate = new Date(entry.timestamp)
      const entryYear = entryDate.getFullYear()
      const entryMonth = entryDate.getMonth()

      // Filter by year
      if (selectedDate.year !== entryYear) return false

      // If viewing by year, show all entries from that year
      if (selectedLevel === 'year') return true

      // Filter by month
      if (selectedDate.month !== entryMonth) return false

      // If viewing by month, show all entries from that month
      if (selectedLevel === 'month') return true

      // Filter by week
      if (selectedLevel === 'week') {
        // Calculate which week of the month the entry falls in
        const entryWeek = getWeekOfMonth(entryDate)
        return entryWeek === selectedDate.week
      }

      return false
    })
  }, [entries, selectedDate, selectedLevel])

  // Calculate statistics for current view
  const stats = useMemo(() => {
    const totalMinutes = filteredEntries.reduce(
      (sum, entry) => sum + entry.duration,
      0
    )
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return {
      entries: filteredEntries.length,
      totalTime:
        minutes > 0 ? `${hours}.${Math.round(minutes / 6)}h` : `${hours}h`,
    }
  }, [filteredEntries])

  // Navigate between entries
  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedEntry) return
      const currentIndex = filteredEntries.findIndex(
        e => e.id === selectedEntry.id
      )
      if (currentIndex === -1) return

      const newIndex =
        direction === 'prev' ? currentIndex - 1 : currentIndex + 1
      if (newIndex >= 0 && newIndex < filteredEntries.length) {
        handleEntryClick(filteredEntries[newIndex])
      }
    },
    [selectedEntry, filteredEntries, handleEntryClick]
  )

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Record<string, LogbookEntry[]> = {}

    filteredEntries.forEach(entry => {
      const dateKey = formatDateSeparator(entry.timestamp, i18n.language)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(entry)
    })

    return Object.entries(groups).map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime()
        const bTime = new Date(b.timestamp).getTime()
        return bTime - aTime
      }),
    }))
  }, [filteredEntries, i18n.language])

  // Initialize selectedDate based on entries
  useEffect(() => {
    const currentDate = new Date()
    if (!selectedDate && entries.length > 0) {
      const mostRecentEntry = entries[0]
      const entryDate = new Date(mostRecentEntry.timestamp)
      setSelectedDate({
        year: entryDate.getFullYear(),
        month: entryDate.getMonth(),
        week: getWeekOfMonth(entryDate),
      })
    } else if (!selectedDate) {
      setSelectedDate({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth(),
        week: getWeekOfMonth(currentDate),
      })
    }
  }, [entries, selectedDate])

  // Generate timeline levels based on entries
  const timelineLevels: TimelineLevel[] = useMemo(() => {
    if (!selectedDate) return []

    const monthNames = [
      t('common:months.january'),
      t('common:months.february'),
      t('common:months.march'),
      t('common:months.april'),
      t('common:months.may'),
      t('common:months.june'),
      t('common:months.july'),
      t('common:months.august'),
      t('common:months.september'),
      t('common:months.october'),
      t('common:months.november'),
      t('common:months.december'),
    ]

    return [
      { label: selectedDate.year.toString(), value: 'year', level: 'year' },
      { label: monthNames[selectedDate.month], value: 'month', level: 'month' },
      {
        label: t('logbook:timeline.week', { number: selectedDate.week }),
        value: 'week',
        level: 'week',
      },
    ]
  }, [selectedDate, t])

  if (editingEntry) {
    return (
      <ManualEntryForm
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={() => {
          setEditingEntry(null)
          onUpdate()
        }}
      />
    )
  }

  // Check if we're on mobile/tablet
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024

  // Main content (left panel)
  const mainContent = (
    <div className="space-y-6">
      {/* Timeline Navigation */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-morandi-stone-200">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-morandi-stone-600 uppercase tracking-wide">
            {t('logbook:entry.foundEntries', { count: stats.entries })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!selectedDate) return
              const newDate = new Date(selectedDate.year, selectedDate.month, 1)

              if (selectedLevel === 'week') {
                // Go to previous week
                let targetWeek = selectedDate.week - 1
                let targetMonth = selectedDate.month
                let targetYear = selectedDate.year

                if (targetWeek < 1) {
                  // Go to previous month
                  targetMonth--
                  if (targetMonth < 0) {
                    targetMonth = 11
                    targetYear--
                  }
                  // Get last week of previous month
                  const lastDayOfPrevMonth = new Date(
                    targetYear,
                    targetMonth + 1,
                    0
                  )
                  targetWeek = getWeekOfMonth(lastDayOfPrevMonth)
                }

                setSelectedDate({
                  year: targetYear,
                  month: targetMonth,
                  week: targetWeek,
                })
              } else if (selectedLevel === 'month') {
                // Go to previous month
                newDate.setMonth(newDate.getMonth() - 1)
                setSelectedDate({
                  year: newDate.getFullYear(),
                  month: newDate.getMonth(),
                  week: getWeekOfMonth(newDate),
                })
              } else {
                // Go to previous year
                newDate.setFullYear(newDate.getFullYear() - 1)
                setSelectedDate({
                  year: newDate.getFullYear(),
                  month: newDate.getMonth(),
                  week: getWeekOfMonth(newDate),
                })
              }
            }}
            className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
            aria-label={t('common:previous')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <TimelineNav
            levels={timelineLevels}
            selectedLevel={selectedLevel}
            onLevelChange={level => {
              setSelectedLevel(level.value)
            }}
            summary={`${stats.entries} entries · ${stats.totalTime}`}
          />

          <button
            onClick={() => {
              if (!selectedDate) return
              const newDate = new Date(selectedDate.year, selectedDate.month, 1)

              if (selectedLevel === 'week') {
                // Go to next week
                let targetWeek = selectedDate.week + 1
                let targetMonth = selectedDate.month
                let targetYear = selectedDate.year

                // Check if we exceed the number of weeks in current month
                const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0)
                const maxWeeks = getWeekOfMonth(lastDayOfMonth)

                if (targetWeek > maxWeeks) {
                  // Go to next month
                  targetMonth++
                  if (targetMonth > 11) {
                    targetMonth = 0
                    targetYear++
                  }
                  targetWeek = 1
                }

                setSelectedDate({
                  year: targetYear,
                  month: targetMonth,
                  week: targetWeek,
                })
              } else if (selectedLevel === 'month') {
                // Go to next month
                newDate.setMonth(newDate.getMonth() + 1)
                setSelectedDate({
                  year: newDate.getFullYear(),
                  month: newDate.getMonth(),
                  week: 1, // Reset to first week of new month
                })
              } else {
                // Go to next year
                newDate.setFullYear(newDate.getFullYear() + 1)
                setSelectedDate({
                  year: newDate.getFullYear(),
                  month: newDate.getMonth(),
                  week: getWeekOfMonth(newDate),
                })
              }
            }}
            className="p-1 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
            aria-label={t('common:next')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Entry List - using new compact design */}
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 overflow-hidden">
        {groupedEntries.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              {t('logbook:empty')}
            </h3>
            <p className="text-stone-600">{t('logbook:emptyDescription')}</p>
          </div>
        ) : (
          groupedEntries.map(group => (
            <div key={group.date}>
              {/* Use shared DateSeparator component */}
              <DateSeparator
                date={group.date}
                totalDuration={formatDuration(
                  group.entries.reduce((sum, e) => sum + e.duration, 0)
                )}
              />

              {/* Use CompactEntryRow for consistent design */}
              {group.entries.map(entry => (
                <CompactEntryRow
                  key={entry.id}
                  entryId={entry.id}
                  time={formatTime(entry.timestamp)}
                  duration={entry.duration}
                  type={t(`common:music.${entry.type.toLowerCase()}`)}
                  instrument={entry.instrument || undefined}
                  isSelected={selectedEntry?.id === entry.id}
                  onEdit={() => handleEdit(entry)}
                  onClick={() => handleEntryClick(entry)}
                >
                  {/* Don't show piece details in the list - they'll be in the detail panel */}
                </CompactEntryRow>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )

  // Detail panel (right panel)
  const detailPanel = (
    <EntryDetailPanel
      entry={selectedEntry}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onNavigate={handleNavigate}
      onClose={() => setSelectedEntry(null)}
    />
  )

  // Render with or without split view based on screen size
  if (isMobile) {
    return mainContent
  }

  return (
    <ResizableSplitView
      defaultRatio={splitRatio}
      onRatioChange={setSplitRatio}
      storageKey="logbook-split"
      minSizes={[500, 350]}
      maxSizes={[Infinity, 600]}
    >
      {mainContent}
      {detailPanel}
    </ResizableSplitView>
  )
}
