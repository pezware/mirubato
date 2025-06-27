import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLogbookStore } from '../stores/logbookStore'
import type { LogbookEntry } from '../api/logbook'
import Button from './ui/Button'
import SplitButton from './ui/SplitButton'
import PieceInput from './PieceInput'

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
  const { t } = useTranslation(['logbook', 'common'])
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

  // Date state - default to today or existing entry date
  const [practiceDate, setPracticeDate] = useState(() => {
    if (entry?.timestamp) {
      // Convert existing timestamp to YYYY-MM-DD format
      return new Date(entry.timestamp).toISOString().split('T')[0]
    }
    // Default to today
    return new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Create a date object from the selected date and current time
      const selectedDate = new Date(practiceDate)
      const now = new Date()
      selectedDate.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      )

      const entryData = {
        timestamp: selectedDate.toISOString(),
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
    setPieces(prevPieces => {
      const updated = [...prevPieces]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removePiece = (index: number) => {
    setPieces(pieces.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="text-2xl font-light mb-6 text-morandi-stone-700 flex items-center gap-2">
        {entry
          ? `📝 ${t('logbook:entry.editEntry')}`
          : `✨ ${t('logbook:entry.addEntry')}`}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
                {t('logbook:entry.practiceDate', 'Practice Date')}
              </label>
              <input
                type="date"
                value={practiceDate}
                onChange={e => setPracticeDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]} // Don't allow future dates
                className="w-full px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
                required
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
                {t('logbook:entry.duration')}
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

            <div className="flex gap-4">
              <SplitButton<LogbookEntry['instrument']>
                options={[
                  {
                    value: 'PIANO',
                    label: `🎹 ${t('common:instruments.piano')}`,
                  },
                  {
                    value: 'GUITAR',
                    label: `🎸 ${t('common:instruments.guitar')}`,
                  },
                ]}
                value={instrument}
                onChange={value => value && setInstrument(value)}
                orientation="horizontal"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
              {t('logbook:entry.type')}
            </label>
            <SplitButton<LogbookEntry['type']>
              options={[
                { value: 'PRACTICE', label: t('common:music.practice') },
                { value: 'LESSON', label: t('common:music.lesson') },
                { value: 'PERFORMANCE', label: t('common:music.performance') },
                { value: 'REHEARSAL', label: t('common:music.rehearsal') },
              ]}
              value={type}
              onChange={value => value && setType(value)}
              orientation="horizontal"
            />
          </div>
        </div>

        {/* Pieces */}
        <div>
          <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
            {t('logbook:entry.pieces')}
          </label>
          {pieces.map((piece, index) => (
            <PieceInput
              key={index}
              piece={piece}
              index={index}
              onUpdate={updatePiece}
              onRemove={removePiece}
            />
          ))}
          <Button
            type="button"
            onClick={addPiece}
            variant="ghost"
            size="sm"
            leftIcon={<span>+</span>}
          >
            {t('logbook:entry.addPiece')}
          </Button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
            {t('logbook:entry.notes')}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent resize-none"
            placeholder={t('logbook:entry.notesPlaceholder')}
          />
        </div>

        {/* Mood */}
        <div>
          <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
            {t('logbook:entry.mood')}
          </label>
          <div className="flex gap-px flex-wrap sm:flex-nowrap">
            {[
              {
                value: 'FRUSTRATED',
                label: '😤',
                fullLabel: t('logbook:mood.frustrated'),
              },
              {
                value: 'NEUTRAL',
                label: '😐',
                fullLabel: t('logbook:mood.neutral'),
              },
              {
                value: 'SATISFIED',
                label: '😊',
                fullLabel: t('logbook:mood.satisfied'),
              },
              {
                value: 'EXCITED',
                label: '🎉',
                fullLabel: t('logbook:mood.excited'),
              },
            ].map((option, index) => {
              const isFirst = index === 0
              const isLast = index === 3
              const isActive = mood === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setMood(
                      isActive
                        ? undefined
                        : (option.value as LogbookEntry['mood'])
                    )
                  }
                  className={`
                    flex items-center gap-1 px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer
                    border border-morandi-stone-300 flex-1 sm:flex-initial
                    ${
                      isActive
                        ? 'bg-morandi-sage-500 text-white border-morandi-sage-500 shadow-sm'
                        : 'bg-white text-morandi-stone-600 hover:bg-morandi-stone-100'
                    }
                    ${isFirst ? 'rounded-l-lg' : ''}
                    ${isLast ? 'rounded-r-lg' : ''}
                    ${!isFirst && !isLast ? '-ml-px' : ''}
                    ${!isFirst ? 'sm:border-l-0' : ''}
                  `}
                >
                  <span>{option.label}</span>
                  <span className="hidden sm:inline">{option.fullLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-morandi-stone-200">
          <Button type="button" onClick={onClose} variant="secondary">
            {t('common:cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
            leftIcon={!isSubmitting && <span>{entry ? '💾' : '💾'}</span>}
          >
            {entry
              ? t('logbook:entry.updateEntry')
              : t('logbook:entry.saveEntry')}
          </Button>
        </div>
      </form>
    </div>
  )
}
