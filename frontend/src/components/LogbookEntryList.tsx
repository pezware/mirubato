import React from 'react'
import type { LogbookEntry } from '../modules/logger/types'
import { Instrument } from '../modules/logger/types'

interface LogbookEntryListProps {
  entries: LogbookEntry[]
  onEdit?: (entry: LogbookEntry) => void
  onDelete?: (entryId: string) => void
  searchQuery?: string
  filters?: {
    type?: LogbookEntry['type']
    mood?: LogbookEntry['mood']
    dateRange?: { start: Date; end: Date }
  }
}

const LogbookEntryList: React.FC<LogbookEntryListProps> = ({
  entries,
  onEdit,
  onDelete,
  searchQuery = '',
  filters,
}) => {
  // Filter entries based on search and filters
  const filteredEntries = entries.filter(entry => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        (entry.notes || '').toLowerCase().includes(searchLower) ||
        (entry.pieces || []).some(piece =>
          piece.title.toLowerCase().includes(searchLower)
        ) ||
        (entry.techniques || []).some(technique =>
          technique.toLowerCase().includes(searchLower)
        ) ||
        (entry.tags || []).some(tag => tag.toLowerCase().includes(searchLower))

      if (!matchesSearch) return false
    }

    // Type filter
    if (filters?.type && entry.type !== filters.type) {
      return false
    }

    // Mood filter
    if (filters?.mood && entry.mood !== filters.mood) {
      return false
    }

    // Date range filter
    if (filters?.dateRange) {
      const entryDate = new Date(entry.timestamp)
      if (
        entryDate < filters.dateRange.start ||
        entryDate > filters.dateRange.end
      ) {
        return false
      }
    }

    return true
  })

  // Group entries by date
  const groupedEntries = filteredEntries.reduce(
    (groups, entry) => {
      const date = new Date(entry.timestamp)
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(entry)
      return groups
    },
    {} as Record<string, LogbookEntry[]>
  )

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedEntries).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 0) {
      return `${hours}h ${minutes}min`
    }
    return `${minutes} min`
  }

  // Get instrument icon
  const getInstrumentIcon = (instrument: Instrument): string => {
    return instrument === Instrument.GUITAR ? '🎸' : '🎹'
  }

  // Get entry type icon
  const getEntryTypeIcon = (type: LogbookEntry['type']): string => {
    switch (type) {
      case 'practice':
        return '🎵'
      case 'performance':
        return '🎭'
      case 'lesson':
        return '📚'
      case 'rehearsal':
        return '🎤'
      default:
        return '🎼'
    }
  }

  // Get mood emoji
  const getMoodEmoji = (mood?: LogbookEntry['mood']): string => {
    switch (mood) {
      case 'frustrated':
        return '😤'
      case 'neutral':
        return '😐'
      case 'satisfied':
        return '😊'
      case 'excited':
        return '😃'
      default:
        return ''
    }
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {searchQuery || filters
            ? 'No entries match your search criteria'
            : 'No entries to display'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="bg-white rounded-lg shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-medium text-gray-900">{dateKey}</h3>
          </div>
          <div className="divide-y">
            {groupedEntries[dateKey].map(entry => (
              <div
                key={entry.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {getEntryTypeIcon(entry.type)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getInstrumentIcon(entry.instrument)}
                        </span>
                        <span className="font-medium capitalize">
                          {entry.type} Session
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">
                          {formatDuration(entry.duration)}
                        </span>
                        {entry.mood && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="text-xl">
                              {getMoodEmoji(entry.mood)}
                            </span>
                            <span className="text-gray-600 capitalize">
                              {entry.mood}
                            </span>
                          </>
                        )}
                      </div>
                      {entry.metadata?.source === 'automatic' && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Auto-logged
                        </span>
                      )}
                    </div>

                    {entry.pieces && entry.pieces.length > 0 && (
                      <div className="mb-2">
                        <span className="font-medium text-gray-700">
                          Pieces:{' '}
                        </span>
                        <span className="text-gray-600">
                          {entry.pieces.map(piece => piece.title).join(', ')}
                        </span>
                      </div>
                    )}

                    {entry.techniques && entry.techniques.length > 0 && (
                      <div className="mb-2">
                        <span className="font-medium text-gray-700">
                          Techniques:{' '}
                        </span>
                        <span className="text-gray-600">
                          {entry.techniques.join(', ')}
                        </span>
                      </div>
                    )}

                    {entry.notes && (
                      <div className="mb-2">
                        <p className="text-gray-600 italic">"{entry.notes}"</p>
                      </div>
                    )}

                    {entry.goals && entry.goals.length > 0 && (
                      <div className="mb-2">
                        <span className="font-medium text-gray-700">
                          Goals:{' '}
                        </span>
                        <span className="text-green-600">
                          {entry.goals.length} linked
                        </span>
                      </div>
                    )}

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(entry)}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                        aria-label={`Edit ${entry.type} entry`}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="text-gray-600 hover:text-red-600 transition-colors"
                        aria-label={`Delete ${entry.type} entry`}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default LogbookEntryList
