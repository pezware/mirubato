import { useState, useMemo } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import type { LogbookEntry } from '../api/logbook'
import ManualEntryForm from './ManualEntryForm'
import TimelineNav, { type TimelineLevel } from './ui/TimelineNav'
import Button from './ui/Button'
import { cn } from '../utils/cn'

interface LogbookEntryListProps {
  entries: LogbookEntry[]
  onUpdate: () => void
}

type ViewMode = 'month' | 'week'

export default function LogbookEntryList({
  entries,
  onUpdate,
}: LogbookEntryListProps) {
  const { deleteEntry } = useLogbookStore()
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedLevel, setSelectedLevel] = useState('week')
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
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
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getMoodEmoji = (mood?: LogbookEntry['mood']) => {
    switch (mood) {
      case 'FRUSTRATED':
        return '😤'
      case 'NEUTRAL':
        return '😐'
      case 'SATISFIED':
        return '😊'
      case 'EXCITED':
        return '🎉'
      default:
        return ''
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

  // Calculate statistics for current view
  const stats = useMemo(() => {
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return {
      entries: entries.length,
      totalTime:
        minutes > 0 ? `${hours}.${Math.round(minutes / 6)}h` : `${hours}h`,
    }
  }, [entries])

  // Get current date for timeline navigation
  const currentDate = new Date()

  // Calculate the current week number of the month
  const getWeekOfMonth = (date: Date) => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const dayOfMonth = date.getDate()
    const dayOfWeek = firstDayOfMonth.getDay()
    return Math.ceil((dayOfMonth + dayOfWeek) / 7)
  }

  // Generate timeline levels based on entries
  const timelineLevels: TimelineLevel[] = useMemo(() => {
    if (entries.length === 0) {
      const year = currentDate.getFullYear()
      const month = currentDate.toLocaleDateString('en-US', { month: 'long' })
      const week = getWeekOfMonth(currentDate)
      return [
        { label: year.toString(), value: 'year', level: 'year' },
        { label: month, value: 'month', level: 'month' },
        { label: `Week ${week}`, value: 'week', level: 'week' },
      ]
    }

    // Get the most recent entry date
    const mostRecentEntry = entries[0] // Already sorted by timestamp
    const entryDate = new Date(mostRecentEntry.timestamp)
    const year = entryDate.getFullYear()
    const month = entryDate.toLocaleDateString('en-US', { month: 'long' })
    const week = getWeekOfMonth(entryDate)

    return [
      { label: year.toString(), value: 'year', level: 'year' },
      { label: month, value: 'month', level: 'month' },
      { label: `Week ${week}`, value: 'week', level: 'week' },
    ]
  }, [entries, currentDate])

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-morandi-stone-600 uppercase tracking-wide">
            Found {stats.entries} entries
          </h2>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'month' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              By Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              By Week
            </Button>
          </div>
        </div>

        <TimelineNav
          levels={timelineLevels}
          selectedLevel={selectedLevel}
          onLevelChange={level => setSelectedLevel(level.value)}
          summary={`${stats.entries} entries · ${stats.totalTime}`}
        />
      </div>

      {/* Entry List */}
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 overflow-hidden">
        {entries.map((entry, index) => {
          const isExpanded = expandedEntries.has(entry.id)
          const isFirst = index === 0

          return (
            <div
              key={entry.id}
              className={cn(
                'transition-all duration-200',
                !isFirst && 'border-t border-morandi-stone-200'
              )}
            >
              <div
                className="p-4 hover:bg-morandi-stone-50 cursor-pointer group"
                onClick={() => toggleEntryExpansion(entry.id)}
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
                        {entry.instrument === 'PIANO' ? '🎹' : '🎸'}{' '}
                        {entry.instrument}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-morandi-stone-700">
                        {entry.duration} minutes
                      </span>
                      {entry.mood && (
                        <span className="text-lg">
                          {getMoodEmoji(entry.mood)}
                        </span>
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
                      aria-label="Edit entry"
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
                      aria-label="Delete entry"
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
                  {/* Pieces */}
                  {entry.pieces.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
                        🎵 Pieces:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.pieces.map((piece, index) => (
                          <div
                            key={index}
                            className="px-3 py-1 bg-morandi-sky-100 text-morandi-stone-700 rounded-full text-sm border border-morandi-sky-200"
                          >
                            {piece.title}
                            {piece.composer && (
                              <span className="text-morandi-stone-600">
                                {' '}
                                - {piece.composer}
                              </span>
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
                        🎯 Techniques:
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
          )
        })}
      </div>
    </div>
  )
}
