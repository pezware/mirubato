import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  IconMoodAngry,
  IconMoodNeutral,
  IconMoodSmile,
  IconMoodHappy,
} from '@tabler/icons-react'
import { useLogbookStore } from '../stores/logbookStore'
import type { LogbookEntry } from '../api/logbook'
import ManualEntryForm from './ManualEntryForm'
import TimelineNav, { type TimelineLevel } from './ui/TimelineNav'
import { MusicTitle, MusicComposer } from './ui'
import { cn } from '../utils/cn'
import { toTitleCase } from '../utils/textFormatting'

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
  const navigate = useNavigate()
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedLevel, setSelectedLevel] = useState('week')
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<{
    year: number
    month: number
    week: number
  } | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm(t('logbook:entry.confirmDelete'))) {
      return
    }

    setDeletingId(id)
    try {
      await deleteEntry(id)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete entry:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(i18n.language, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(i18n.language, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getMoodIcon = (mood?: LogbookEntry['mood']) => {
    const iconProps = {
      size: 18,
      className: 'text-morandi-stone-600',
      stroke: 1.5,
    }

    switch (mood) {
      case 'frustrated':
        return <IconMoodAngry {...iconProps} />
      case 'neutral':
        return <IconMoodNeutral {...iconProps} />
      case 'satisfied':
        return <IconMoodSmile {...iconProps} />
      case 'excited':
        return <IconMoodHappy {...iconProps} />
      default:
        return null
    }
  }

  const toggleEntryExpansion = (id: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedEntries(newExpanded)
  }

  const handleScoreClick = (entry: LogbookEntry) => {
    if (entry.scoreId) {
      navigate(`/scorebook/${entry.scoreId}`)
    } else if (entry.scoreTitle) {
      // If no scoreId but has title, navigate to search
      navigate(`/scorebook/browse?q=${encodeURIComponent(entry.scoreTitle)}`)
    }
  }

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

  return (
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
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
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
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Entry List */}
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 overflow-hidden">
        {filteredEntries.map((entry, index) => {
          const isExpanded = expandedEntries.has(entry.id)
          const entryDate = new Date(entry.timestamp)

          // Check if this is the first entry of a new day
          const prevEntry = index > 0 ? filteredEntries[index - 1] : null
          const prevDate = prevEntry ? new Date(prevEntry.timestamp) : null
          const isNewDay =
            !prevDate || entryDate.toDateString() !== prevDate.toDateString()

          // Format date for separator
          const formattedDate = entryDate.toLocaleDateString(i18n.language, {
            month: 'short',
            day: '2-digit',
          })

          return (
            <div key={entry.id}>
              {/* Date Separator */}
              {isNewDay && (
                <div className="px-4 py-2 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-600 whitespace-nowrap">
                      {formattedDate}
                    </span>
                    <div className="flex-1 h-px bg-gray-300"></div>
                  </div>
                </div>
              )}

              {/* Entry */}
              <div
                className={cn(
                  'transition-all duration-200',
                  !isNewDay && 'border-t border-morandi-stone-200'
                )}
              >
                <div
                  className="p-4 hover:bg-morandi-stone-50 cursor-pointer group"
                  onClick={() => toggleEntryExpansion(entry.id)}
                  data-testid="logbook-entry"
                  data-entry-id={entry.id}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-morandi-stone-700 font-medium">
                          {formatDate(entry.timestamp)}
                        </span>
                        <span className="text-sm text-morandi-stone-500">
                          {formatTime(entry.timestamp)}
                        </span>
                        <span className="px-2 py-0.5 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                          {entry.type}
                        </span>
                        <span className="px-2 py-0.5 bg-morandi-sand-100 text-morandi-stone-700 text-xs rounded-full">
                          {entry.instrument}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-morandi-stone-700">
                          {t('common:time.minute', { count: entry.duration })}
                        </span>
                        {entry.mood && getMoodIcon(entry.mood)}
                        {entry.scoreId && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleScoreClick(entry)
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 bg-morandi-sky-100 text-morandi-stone-700 text-xs rounded-full hover:bg-morandi-sky-200 transition-colors"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                              />
                            </svg>
                            {entry.scoreTitle || t('logbook:viewScore')}
                          </button>
                        )}
                        {entry.notes && !isExpanded && (
                          <span className="text-sm text-morandi-stone-500 truncate max-w-md">
                            {entry.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-center gap-2 transition-opacity duration-200',
                        isExpanded
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      )}
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setEditingEntry(entry)
                        }}
                        className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
                        aria-label={t('logbook:entry.editEntry')}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(entry.id)
                        }}
                        disabled={deletingId === entry.id}
                        className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                        aria-label={t('logbook:entry.deleteEntry')}
                      >
                        {deletingId === entry.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-fade-in">
                    {/* Score Information */}
                    {entry.scoreId && (
                      <div className="mb-3 p-3 bg-morandi-sky-50 rounded-lg border border-morandi-sky-200">
                        <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
                          📄 {t('logbook:linkedScore')}:
                        </h4>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleScoreClick(entry)
                          }}
                          className="flex items-center gap-2 text-morandi-stone-700 hover:text-morandi-stone-900 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                          </svg>
                          <span className="font-medium">
                            {entry.scoreTitle || 'View Score'}
                          </span>
                          {entry.scoreComposer && (
                            <span className="text-sm text-morandi-stone-600">
                              by {entry.scoreComposer}
                            </span>
                          )}
                        </button>
                        {entry.autoTracked && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                            {t('logbook:autoTracked')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Pieces */}
                    {entry.pieces.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
                          🎵 {t('logbook:entry.pieces')}:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.pieces.map((piece, index) => (
                            <div
                              key={index}
                              className="px-3 py-1 bg-morandi-sky-100 rounded-full text-sm border border-morandi-sky-200 flex items-center gap-1"
                            >
                              <MusicTitle
                                as="span"
                                className="text-morandi-stone-700 text-sm font-normal"
                              >
                                {toTitleCase(piece.title)}
                              </MusicTitle>
                              {piece.composer && (
                                <>
                                  <span className="text-morandi-stone-600">
                                    -
                                  </span>
                                  <MusicComposer
                                    as="span"
                                    className="text-morandi-stone-600 text-sm"
                                  >
                                    {toTitleCase(piece.composer)}
                                  </MusicComposer>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Techniques */}
                    {entry.techniques.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
                          🎯 {t('logbook:entry.techniques')}:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {entry.techniques.map((technique, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-morandi-blush-100 text-morandi-stone-700 rounded-full text-sm"
                            >
                              {technique}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="mt-3">
                        <p className="text-morandi-stone-700 whitespace-pre-wrap leading-relaxed">
                          {entry.notes}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-600 rounded text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
