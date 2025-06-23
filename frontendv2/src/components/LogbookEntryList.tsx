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
          className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-morandi-stone-600">
                  📅 {formatDate(entry.timestamp)}
                </span>
                <span className="text-sm text-morandi-stone-600">
                  🕐 {formatTime(entry.timestamp)}
                </span>
                <span className="px-3 py-1 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full font-medium">
                  {entry.type}
                </span>
                <span className="px-3 py-1 bg-morandi-sand-200 text-morandi-stone-700 text-xs rounded-full">
                  {entry.instrument === 'PIANO' ? '🎹' : '🎸'}{' '}
                  {entry.instrument}
                </span>
                {entry.mood && (
                  <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-lg font-light text-morandi-stone-700">
                ⏱️ {entry.duration} minutes
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingEntry(entry)}
                className="p-2 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
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
                className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
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
              <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
                🎵 Pieces:
              </h4>
              <div className="flex flex-wrap gap-2">
                {entry.pieces.map((piece, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-morandi-sky-100 text-morandi-stone-700 rounded-full text-sm border border-morandi-sky-300"
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
      ))}
    </div>
  )
}
