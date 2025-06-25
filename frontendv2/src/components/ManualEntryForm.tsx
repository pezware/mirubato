import { useState } from 'react'
import { useLogbookStore } from '../stores/logbookStore'
import type { LogbookEntry } from '../api/logbook'
import Button from './ui/Button'
import SplitButton from './ui/SplitButton'

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
  const [techniques] = useState<string[]>(entry?.techniques || [])
  const [tags] = useState<string[]>(entry?.tags || [])

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
    <div>
      <h2 className="text-2xl font-light mb-6 text-morandi-stone-700 flex items-center gap-2">
        {entry ? '📝 Edit Entry' : '✨ New Practice Entry'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={e => setDuration(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
              Type
            </label>
            <SplitButton<LogbookEntry['type']>
              options={[
                { value: 'PRACTICE', label: 'Practice' },
                { value: 'LESSON', label: 'Lesson' },
                { value: 'PERFORMANCE', label: 'Performance' },
                { value: 'REHEARSAL', label: 'Rehearsal' },
              ]}
              value={type}
              onChange={setType}
              orientation="horizontal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
              Instrument
            </label>
            <SplitButton<LogbookEntry['instrument']>
              options={[
                { value: 'PIANO', label: '🎹 Piano' },
                { value: 'GUITAR', label: '🎸 Guitar' },
              ]}
              value={instrument}
              onChange={setInstrument}
              orientation="vertical"
            />
          </div>
        </div>

        {/* Pieces */}
        <div>
          <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
            Pieces
          </label>
          {pieces.map((piece, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Piece title"
                value={piece.title}
                onChange={e => updatePiece(index, 'title', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Composer"
                value={piece.composer || ''}
                onChange={e => updatePiece(index, 'composer', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
              />
              <Button
                type="button"
                onClick={() => removePiece(index)}
                variant="secondary"
                size="sm"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={addPiece}
            variant="ghost"
            size="sm"
            leftIcon={<span>+</span>}
          >
            Add Piece
          </Button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent resize-none"
            placeholder="What did you work on? Any observations?"
          />
        </div>

        {/* Mood */}
        <div>
          <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
            How did it go?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'FRUSTRATED', label: 'Frustrated', emoji: '😤' },
              { value: 'NEUTRAL', label: 'Neutral', emoji: '😐' },
              { value: 'SATISFIED', label: 'Satisfied', emoji: '😊' },
              { value: 'EXCITED', label: 'Excited', emoji: '🎉' },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMood(option.value as LogbookEntry['mood'])}
                className={`px-4 py-3 rounded-lg transition-all duration-200 text-center ${
                  mood === option.value
                    ? 'bg-morandi-sage-500 text-white shadow-md border-2 border-morandi-sage-500'
                    : 'bg-white border-2 border-morandi-stone-300 text-morandi-stone-700 hover:bg-morandi-stone-100'
                }`}
              >
                <div className="text-xl mb-1">{option.emoji}</div>
                <div className="text-sm">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-morandi-stone-200">
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
            leftIcon={!isSubmitting && <span>{entry ? '💾' : '💾'}</span>}
          >
            {entry ? 'Update Entry' : 'Save Entry'}
          </Button>
        </div>
      </form>
    </div>
  )
}
