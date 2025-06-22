import { useState } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import type { LogbookEntry } from '../api/logbook'
import ManualEntryForm from './ManualEntryForm'

interface LogbookEntryListProps {
  entries: LogbookEntry[]
  onUpdate: () => void
}

export default function LogbookEntryList({
  entries,
  onUpdate,
}: LogbookEntryListProps) {
  const { deleteEntry } = useLogbookStore()
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    <div className="space-y-4">
      {entries.map(entry => (
        <div
          key={entry.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(entry.timestamp)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full">
                  {entry.type}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-full">
                  {entry.instrument}
                </span>
                {entry.mood && (
                  <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                {entry.duration} minutes
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingEntry(entry)}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                aria-label="Edit entry"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                aria-label="Delete entry"
              >
                {deletingId === entry.id ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                ) : (
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Pieces */}
          {entry.pieces.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pieces:
              </h4>
              <div className="flex flex-wrap gap-2">
                {entry.pieces.map((piece, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full text-sm"
                  >
                    {piece.title}
                    {piece.composer && (
                      <span className="text-purple-600 dark:text-purple-400">
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
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Techniques:
              </h4>
              <div className="flex flex-wrap gap-2">
                {entry.techniques.map((technique, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full text-sm"
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
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
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
                  className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
