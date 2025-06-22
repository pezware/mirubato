import { useState } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import type { LogbookEntry } from '../api/logbook'

interface ManualEntryFormProps {
  onClose: () => void
  onSave: () => void
  entry?: LogbookEntry
}

export default function ManualEntryForm({
  onClose,
  onSave,
  entry,
}: ManualEntryFormProps) {
  const { createEntry, updateEntry } = useLogbookStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [duration, setDuration] = useState(entry?.duration || 30)
  const [type, setType] = useState<LogbookEntry['type']>(
    entry?.type || 'PRACTICE'
  )
  const [instrument, setInstrument] = useState<LogbookEntry['instrument']>(
    entry?.instrument || 'PIANO'
  )
  const [notes, setNotes] = useState(entry?.notes || '')
  const [mood, setMood] = useState<LogbookEntry['mood'] | undefined>(
    entry?.mood
  )
  const [pieces, setPieces] = useState(
    entry?.pieces || [{ title: '', composer: '' }]
  )
  const [techniques, setTechniques] = useState<string[]>(
    entry?.techniques || []
  )
  const [tags, setTags] = useState<string[]>(entry?.tags || [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const entryData = {
        timestamp: new Date().toISOString(),
        duration,
        type,
        instrument,
        pieces: pieces.filter(p => p.title),
        techniques,
        goalIds: [],
        notes,
        mood,
        tags,
        metadata: {
          source: 'manual',
        },
      }

      if (entry) {
        await updateEntry(entry.id, entryData)
      } else {
        await createEntry(entryData)
      }

      onSave()
    } catch (error) {
      console.error('Failed to save entry:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addPiece = () => {
    setPieces([...pieces, { title: '', composer: '' }])
  }

  const updatePiece = (
    index: number,
    field: 'title' | 'composer',
    value: string
  ) => {
    const updated = [...pieces]
    updated[index] = { ...updated[index], [field]: value }
    setPieces(updated)
  }

  const removePiece = (index: number) => {
    setPieces(pieces.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        {entry ? 'Edit Entry' : 'New Practice Entry'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as LogbookEntry['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="PRACTICE">Practice</option>
              <option value="PERFORMANCE">Performance</option>
              <option value="LESSON">Lesson</option>
              <option value="REHEARSAL">Rehearsal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Instrument
            </label>
            <select
              value={instrument}
              onChange={e =>
                setInstrument(e.target.value as LogbookEntry['instrument'])
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="PIANO">Piano</option>
              <option value="GUITAR">Guitar</option>
            </select>
          </div>
        </div>

        {/* Pieces */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pieces
          </label>
          {pieces.map((piece, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Piece title"
                value={piece.title}
                onChange={e => updatePiece(index, 'title', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <input
                type="text"
                placeholder="Composer"
                value={piece.composer || ''}
                onChange={e => updatePiece(index, 'composer', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                type="button"
                onClick={() => removePiece(index)}
                className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPiece}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
          >
            + Add Piece
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="What did you work on? Any observations?"
          />
        </div>

        {/* Mood */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            How did it go?
          </label>
          <div className="flex gap-2">
            {['FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'EXCITED'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m as LogbookEntry['mood'])}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mood === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}
