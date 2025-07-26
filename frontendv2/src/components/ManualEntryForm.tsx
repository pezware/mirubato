import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconMoodAngry,
  IconMoodNeutral,
  IconMoodSmile,
  IconMoodHappy,
} from '@tabler/icons-react'
import { useLogbookStore } from '../stores/logbookStore'
import { useRepertoireStore } from '../stores/repertoireStore'
import { useUserPreferences } from '../hooks/useUserPreferences'
import type { LogbookEntry } from '../api/logbook'
import {
  generateNormalizedScoreId,
  isSameScore,
} from '../utils/scoreIdNormalizer'
import Button from './ui/Button'
import TimePicker from './ui/TimePicker'
import PieceInput from './PieceInput'
import { TechniqueSelector } from './logbook/TechniqueSelector'
import { InstrumentSelector } from './logbook/InstrumentSelector'
import { AddToRepertoirePrompt } from './repertoire/AddToRepertoirePrompt'
import { Modal } from './ui/Modal'

interface ManualEntryFormProps {
  onClose: () => void
  onSave: () => void
  entry?: LogbookEntry
  initialDuration?: number
  initialPieces?: Array<{ title: string; composer?: string; scoreId?: string }>
}

export default function ManualEntryForm({
  onClose,
  onSave,
  entry,
  initialDuration,
  initialPieces,
}: ManualEntryFormProps) {
  const { t } = useTranslation(['logbook', 'common'])
  const { createEntry, updateEntry } = useLogbookStore()
  const { repertoire, loadRepertoire } = useRepertoireStore()
  const { getPrimaryInstrument } = useUserPreferences()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRepertoirePrompt, setShowRepertoirePrompt] = useState<{
    piece: { title: string; composer?: string | null }
    scoreId: string
  } | null>(null)

  // Load repertoire on mount
  useEffect(() => {
    loadRepertoire()
  }, [loadRepertoire])

  // Form state
  const [duration, setDuration] = useState<number>(
    entry?.duration || initialDuration || 30
  )
  const [type, setType] = useState<LogbookEntry['type']>(
    entry?.type || 'practice'
  )
  const [instrument, setInstrument] = useState<LogbookEntry['instrument']>(
    entry?.instrument ||
      (getPrimaryInstrument() as LogbookEntry['instrument']) ||
      'piano'
  )
  const [notes, setNotes] = useState(entry?.notes || '')
  const [mood, setMood] = useState<LogbookEntry['mood'] | undefined>(
    entry?.mood
  )
  const [pieces, setPieces] = useState(
    entry?.pieces && entry.pieces.length > 0
      ? entry.pieces
      : initialPieces || [{ title: '', composer: '' }]
  )
  const [techniques, setTechniques] = useState<string[]>(
    entry?.techniques || []
  )
  const [tags] = useState<string[]>(entry?.tags || [])

  // Date state - default to today or existing entry date
  const [practiceDate, setPracticeDate] = useState(() => {
    if (entry?.timestamp) {
      // Convert existing timestamp to YYYY-MM-DD format in local timezone
      const date = new Date(entry.timestamp)
      return (
        date.getFullYear() +
        '-' +
        String(date.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date.getDate()).padStart(2, '0')
      )
    }
    // Default to today in local timezone
    const today = new Date()
    return (
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    )
  })

  // Time state - default to current time minus duration or existing entry time
  const [practiceTime, setPracticeTime] = useState(() => {
    if (entry?.timestamp) {
      // Convert existing timestamp to HH:MM format in local timezone
      const date = new Date(entry.timestamp)
      return (
        String(date.getHours()).padStart(2, '0') +
        ':' +
        String(date.getMinutes()).padStart(2, '0')
      )
    }
    // Default to current time minus duration in local timezone
    const now = new Date()
    const adjustedTime = new Date(now.getTime() - duration * 60 * 1000) // Subtract duration in milliseconds
    return (
      String(adjustedTime.getHours()).padStart(2, '0') +
      ':' +
      String(adjustedTime.getMinutes()).padStart(2, '0')
    )
  })

  // Auto-adjust practice time when duration changes (only for new entries)
  // Commented out per issue #330 - users don't want time to auto-adjust
  // useEffect(() => {
  //   if (!entry) {
  //     // Only auto-adjust for new entries, not when editing existing ones
  //     const now = new Date()
  //     const adjustedTime = new Date(now.getTime() - duration * 60 * 1000)
  //     const newTime =
  //       String(adjustedTime.getHours()).padStart(2, '0') +
  //       ':' +
  //       String(adjustedTime.getMinutes()).padStart(2, '0')
  //     setPracticeTime(newTime)
  //   }
  // }, [duration, entry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Create a date object from the selected date and time in local timezone
      const [year, month, day] = practiceDate.split('-').map(Number)
      const [hours, minutes] = practiceTime.split(':').map(Number)
      const selectedDate = new Date(year, month - 1, day, hours, minutes, 0, 0)

      const entryData = {
        timestamp: selectedDate.toISOString(),
        duration: Math.max(1, duration), // Ensure minimum duration of 1
        type,
        instrument,
        pieces: pieces
          .filter(p => p.title) // Only include pieces with titles
          .map(p => ({
            title: p.title,
            composer: p.composer ? p.composer : null, // Convert empty string to null
          })),
        techniques: techniques.length > 0 ? techniques : [],
        goalIds: [],
        notes: notes ? notes : null, // Convert empty string to null for D1 compatibility
        mood: mood || null, // Convert undefined to null for D1 compatibility
        tags: tags.length > 0 ? tags : [],
        metadata: {
          source: 'manual',
        },
        // If we have a scoreId from initialPieces (from piece detail page), include it
        ...(initialPieces &&
          initialPieces[0]?.scoreId && { scoreId: initialPieces[0].scoreId }),
      }

      if (entry) {
        // When updating, only send the fields that should be updated
        // Don't send createdAt or other fields that shouldn't change
        await updateEntry(entry.id, entryData)
      } else {
        await createEntry(entryData)

        // Check if any piece should be added to repertoire
        // Skip the prompt if we have initialPieces (coming from piece detail page)
        if (!initialPieces) {
          for (const piece of entryData.pieces) {
            const scoreId = generateNormalizedScoreId(
              piece.title,
              piece.composer
            )

            // Check if this piece is already in repertoire
            const isInRepertoire = Array.from(repertoire.values()).some(item =>
              isSameScore(item.scoreId, scoreId)
            )

            if (!isInRepertoire) {
              // Show prompt for this piece
              setShowRepertoirePrompt({ piece, scoreId })
              // Exit after showing prompt for first piece not in repertoire
              return
            }
          }
        }
      }

      onSave()
    } catch (error) {
      console.error('Failed to save entry:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // addPiece and removePiece functions kept for backward compatibility but not used in UI
  // const addPiece = () => {
  //   if (pieces.length < 3) {
  //     setPieces([...pieces, { title: '', composer: '' }])
  //   }
  // }

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

  // const removePiece = (index: number) => {
  //   setPieces(pieces.filter((_, i) => i !== index))
  // }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={entry ? t('logbook:entry.editEntry') : t('logbook:entry.addEntry')}
      size="lg"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="logbook-entry-form"
      >
        {/* Basic Info */}
        <div className="space-y-4">
          {/* Date, Time, Duration, and Instrument - One line on desktop, stacked on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_0.9fr_1fr_1.3fr] gap-2 sm:gap-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
                {t('logbook:entry.practiceDate', 'Practice Date')}
              </label>
              <input
                type="date"
                value={practiceDate}
                onChange={e => setPracticeDate(e.target.value)}
                max={(() => {
                  const today = new Date()
                  return (
                    today.getFullYear() +
                    '-' +
                    String(today.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(today.getDate()).padStart(2, '0')
                  )
                })()} // Don't allow future dates
                className="w-full px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent text-morandi-stone-700 [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                required
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
                {t('logbook:entry.time', 'Time')}
              </label>
              <TimePicker
                value={practiceTime}
                onChange={setPracticeTime}
                className="w-full"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
                {t('logbook:entry.duration')}
              </label>
              <input
                type="number"
                min="1"
                value={duration === 0 ? '' : duration}
                onChange={e => {
                  const inputValue = e.target.value
                  // Allow empty string for clearing the field
                  if (inputValue === '') {
                    setDuration(0)
                  } else {
                    const value = parseInt(inputValue)
                    setDuration(isNaN(value) ? 0 : Math.max(1, value))
                  }
                }}
                onBlur={() => {
                  // Ensure minimum value of 1 when user leaves the field
                  if (duration < 1) {
                    setDuration(1)
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-morandi-stone-300 rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent"
                required
                data-testid="duration-input"
              />
            </div>

            {/* Instrument */}
            <div>
              <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
                {t('logbook:entry.instrument')}
              </label>
              <InstrumentSelector
                value={instrument}
                onChange={value =>
                  setInstrument(
                    (value as LogbookEntry['instrument']) || 'piano'
                  )
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              {
                value: 'practice',
                label: t('logbook:entry.typeOptions.practice'),
              },
              { value: 'lesson', label: t('logbook:entry.typeOptions.lesson') },
              {
                value: 'performance',
                label: t('logbook:entry.typeOptions.performance'),
              },
              {
                value: 'rehearsal',
                label: t('logbook:entry.typeOptions.rehearsal'),
              },
              {
                value: 'technique',
                label: t('logbook:entry.typeOptions.technique'),
              },
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value as LogbookEntry['type'])}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  type === option.value
                    ? 'bg-morandi-sage-500 text-white'
                    : 'bg-white border border-morandi-stone-300 text-morandi-stone-600 hover:bg-morandi-stone-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pieces */}
        <div>
          <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
            {t('logbook:entry.pieces')}
          </label>
          {/* Only show the first piece for new UI, but support multiple pieces for existing entries */}
          {pieces.slice(0, 1).map((piece, index) => (
            <PieceInput
              key={index}
              piece={piece}
              index={index}
              onUpdate={updatePiece}
              onRemove={undefined} // No remove button for single piece
            />
          ))}
        </div>

        {/* Technique Selection - Only show when type is technique */}
        {type === 'technique' && (
          <TechniqueSelector
            selectedTechniques={techniques}
            onTechniquesChange={setTechniques}
            className="mt-4"
          />
        )}

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
            data-testid="notes-textarea"
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
                value: 'frustrated',
                icon: <IconMoodAngry size={20} stroke={1.5} />,
                fullLabel: t('logbook:mood.frustrated'),
              },
              {
                value: 'neutral',
                icon: <IconMoodNeutral size={20} stroke={1.5} />,
                fullLabel: t('logbook:mood.neutral'),
              },
              {
                value: 'satisfied',
                icon: <IconMoodSmile size={20} stroke={1.5} />,
                fullLabel: t('logbook:mood.satisfied'),
              },
              {
                value: 'excited',
                icon: <IconMoodHappy size={20} stroke={1.5} />,
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
                  data-testid={`mood-button-${option.value.toLowerCase()}`}
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
                  <span
                    className={
                      isActive ? 'text-white' : 'text-morandi-stone-600'
                    }
                  >
                    {option.icon}
                  </span>
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
            data-testid="save-entry-button"
          >
            {entry
              ? t('logbook:entry.updateEntry')
              : t('logbook:entry.saveEntry')}
          </Button>
        </div>
      </form>

      {/* Add to Repertoire Prompt */}
      {showRepertoirePrompt && (
        <AddToRepertoirePrompt
          pieceTitle={showRepertoirePrompt.piece.title}
          composer={showRepertoirePrompt.piece.composer}
          onClose={() => {
            setShowRepertoirePrompt(null)
            onSave()
          }}
          onAdded={() => {
            setShowRepertoirePrompt(null)
            onSave()
          }}
        />
      )}
    </Modal>
  )
}
