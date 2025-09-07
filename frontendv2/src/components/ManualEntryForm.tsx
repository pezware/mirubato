import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IconAlertCircle } from '@tabler/icons-react'
import { useLogbookStore } from '../stores/logbookStore'
import { useRepertoireStore } from '../stores/repertoireStore'
import { useUserPreferences } from '../hooks/useUserPreferences'
import { useFormValidation } from '../hooks/useFormValidation'
import { ManualEntryFormSchema } from '../schemas/validation'
import type { LogbookEntry } from '../api/logbook'
import {
  generateNormalizedScoreId,
  isSameScore,
  findSimilarPieces,
  parseScoreId,
  type DuplicateMatch,
} from '../utils/scoreIdNormalizer'
import Button from './ui/Button'
import TimePicker from './ui/TimePicker'
import PieceInput from './PieceInput'
import { TechniqueSelector } from './logbook/TechniqueSelector'
import { InstrumentSelector } from './logbook/InstrumentSelector'
import { AddToRepertoirePrompt } from './repertoire/AddToRepertoirePrompt'
import { Modal } from './ui/Modal'
import { FormError } from './ui/FormError'
import { toLogbookInstrument } from '../utils/instrumentGuards'

interface ManualEntryFormProps {
  onClose: () => void
  onSave: () => void
  entry?: LogbookEntry
  initialDuration?: number
  initialStartTime?: Date
  initialPieces?: Array<{ title: string; composer?: string; scoreId?: string }>
}

export default function ManualEntryForm({
  onClose,
  onSave,
  entry,
  initialDuration,
  initialStartTime,
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
  const [duplicateMatches, setDuplicateMatches] = useState<{
    piece: { title: string; composer?: string | null }
    matches: DuplicateMatch[]
  } | null>(null)
  const [duplicateCheckSkipped, setDuplicateCheckSkipped] = useState(false)
  const [pendingEntryData, setPendingEntryData] = useState<{
    [key: string]: unknown
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
    entry?.instrument || toLogbookInstrument(getPrimaryInstrument())
  )
  const [notes, setNotes] = useState(entry?.notes || '')
  const [pieces, setPieces] = useState(
    entry?.pieces && entry.pieces.length > 0
      ? entry.pieces
      : initialPieces || [{ title: '', composer: '' }]
  )
  const [techniques, setTechniques] = useState<string[]>(
    entry?.techniques || []
  )
  const [tags] = useState<string[]>(entry?.tags || [])

  // Date state - use initialStartTime date, existing entry date, or default to today
  const [practiceDate, setPracticeDate] = useState(() => {
    if (entry?.timestamp) {
      // Convert existing timestamp to YYYY-MM-DD format in local timezone
      const date = new Date(entry.timestamp)
      // Use local date components to avoid timezone conversion issues
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    if (initialStartTime) {
      // Use the date from timer start time
      return `${initialStartTime.getFullYear()}-${String(initialStartTime.getMonth() + 1).padStart(2, '0')}-${String(initialStartTime.getDate()).padStart(2, '0')}`
    }
    // Default to today in local timezone
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })

  // Time state - use initialStartTime from timer, existing entry time, or default to current time minus duration
  const [practiceTime, setPracticeTime] = useState(() => {
    if (entry?.timestamp) {
      // Convert existing timestamp to HH:MM format in local timezone
      const date = new Date(entry.timestamp)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
    if (initialStartTime) {
      // Use the actual start time from timer
      return `${String(initialStartTime.getHours()).padStart(2, '0')}:${String(initialStartTime.getMinutes()).padStart(2, '0')}`
    }
    // Default to current time minus duration in local timezone
    const now = new Date()
    const adjustedTime = new Date(now.getTime() - duration * 60 * 1000) // Subtract duration in milliseconds
    return `${String(adjustedTime.getHours()).padStart(2, '0')}:${String(adjustedTime.getMinutes()).padStart(2, '0')}`
  })

  // Form validation
  const { validate, validateField, getFieldError, hasErrors } =
    useFormValidation({
      schema: ManualEntryFormSchema,
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

      // Create the date directly with the correct time to avoid timezone issues
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
        mood: null, // Mood feature removed for better mobile UX
        tags: tags.length > 0 ? tags : [],
        metadata: {
          source: 'manual',
        },
        // If we have a scoreId from initialPieces (from piece detail page), include it
        ...(initialPieces &&
          initialPieces[0]?.scoreId && { scoreId: initialPieces[0].scoreId }),
      }

      // Validate form data before submission
      const validationResult = validate(entryData)
      if (!validationResult.isValid) {
        setIsSubmitting(false)
        return
      }

      if (entry) {
        // When updating, only send the fields that should be updated
        // Don't send createdAt or other fields that shouldn't change
        await updateEntry(entry.id, entryData)
      } else {
        // For new entries, check for duplicates BEFORE creating the entry
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
              // Check for similar pieces in both repertoire and logbook
              const { scoreMetadataCache } = useRepertoireStore.getState()
              const existingRepertoirePieces = Array.from(
                repertoire.values()
              ).map(item => {
                const metadata = scoreMetadataCache.get(item.scoreId)
                const parsed = parseScoreId(item.scoreId)

                return {
                  scoreId: item.scoreId,
                  title: metadata?.title || parsed.title || 'Unknown',
                  composer: metadata?.composer || parsed.composer || '',
                }
              })

              // Also check logbook entries for similar pieces
              const logbookEntries = useLogbookStore.getState()
              const existingLogbookPieces = Array.from(
                logbookEntries.entriesMap.values()
              )
                .flatMap(entry => entry.pieces || [])
                .filter(
                  (piece, index, arr) =>
                    // Remove duplicates by creating a unique key
                    arr.findIndex(
                      p =>
                        generateNormalizedScoreId(p.title, p.composer) ===
                        generateNormalizedScoreId(piece.title, piece.composer)
                    ) === index
                )
                .map(piece => ({
                  scoreId: generateNormalizedScoreId(
                    piece.title,
                    piece.composer
                  ),
                  title: piece.title,
                  composer: piece.composer || '',
                }))

              const allExistingPieces = [
                ...existingRepertoirePieces,
                ...existingLogbookPieces,
              ]

              // Find similar pieces using fuzzy matching (only if user hasn't already handled duplicates)
              if (!duplicateCheckSkipped) {
                const similarPieces = findSimilarPieces(
                  piece.title,
                  piece.composer,
                  allExistingPieces,
                  0.7 // Lower threshold to catch more potential duplicates
                )

                if (similarPieces.length > 0) {
                  // Store entry data to create later and show duplicate confirmation modal
                  setPendingEntryData(entryData)
                  setDuplicateMatches({ piece, matches: similarPieces })
                  return
                }
              }

              // No duplicates found, create entry and show repertoire prompt
              await createEntry(entryData)
              setShowRepertoirePrompt({ piece, scoreId })
              // Exit after showing prompt for first piece not in repertoire
              return
            }
          }
        }

        // No pieces or all pieces already in repertoire - create entry directly
        await createEntry(entryData)
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
      className="sm:max-w-3xl"
      isMobileOptimized
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="logbook-entry-form"
      >
        {/* Basic Info */}
        <div className="space-y-4">
          {/* Date, Time, Duration, and Instrument - One line on desktop, stacked on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-[1.2fr_1fr_1fr_1.2fr] gap-2 sm:gap-4">
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
                  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
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
                  validateField('duration', duration)
                }}
                className={`w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent ${
                  getFieldError('duration')
                    ? 'border-red-500'
                    : 'border-morandi-stone-300'
                }`}
                required
                data-testid="duration-input"
              />
              <FormError error={getFieldError('duration')} />
            </div>

            {/* Instrument */}
            <div>
              <label className="block text-sm font-medium text-morandi-stone-700 mb-1">
                {t('logbook:entry.instrument')}
              </label>
              <InstrumentSelector
                value={instrument}
                onChange={value => setInstrument(toLogbookInstrument(value))}
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
            ].map(option => {
              // Define distinct background colors for each activity type
              const getButtonStyles = () => {
                if (type !== option.value) {
                  // Inactive state - keep consistent
                  return 'bg-white border border-morandi-stone-300 text-morandi-stone-600 hover:bg-morandi-stone-100'
                }
                // Active state - distinct colors for each type
                switch (option.value) {
                  case 'lesson':
                    return 'bg-morandi-purple-500 text-white border-morandi-purple-600'
                  case 'practice':
                    return 'bg-morandi-sage-500 text-white border-morandi-sage-600'
                  case 'technique':
                    return 'bg-morandi-sand-500 text-white border-morandi-sand-600'
                  case 'performance':
                    return 'bg-morandi-blush-500 text-white border-morandi-blush-600'
                  case 'rehearsal':
                    return 'bg-morandi-stone-500 text-white border-morandi-stone-600'
                  default:
                    return 'bg-morandi-sage-500 text-white'
                }
              }

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value as LogbookEntry['type'])}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${getButtonStyles()}`}
                >
                  {option.label}
                </button>
              )
            })}
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
            onBlur={() => validateField('notes', notes)}
            rows={3}
            maxLength={5000}
            className={`w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-morandi-sage-400 focus:border-transparent resize-none ${
              getFieldError('notes')
                ? 'border-red-500'
                : 'border-morandi-stone-300'
            }`}
            placeholder={t('logbook:entry.notesPlaceholder')}
            data-testid="notes-textarea"
          />
          <div className="flex justify-between items-center mt-1">
            <FormError error={getFieldError('notes')} />
            <span className="text-xs text-morandi-stone-500">
              {notes.length}/5000
            </span>
          </div>
        </div>

        {/* Validation Error Summary */}
        {hasErrors() && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <IconAlertCircle size={20} className="text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">
              {t(
                'logbook:validation.fixErrors',
                'Please fix the errors above before saving'
              )}
            </div>
          </div>
        )}

        {/* Actions - Sticky on mobile for better UX */}
        <div className="sticky bottom-0 -mx-4 px-4 pb-2 pt-4 bg-white border-t border-morandi-stone-200 sm:static sm:mx-0 sm:px-0 sm:pb-0">
          <div className="flex justify-end gap-4">
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

      {/* Duplicate Detection Modal */}
      {duplicateMatches && (
        <Modal
          isOpen={true}
          onClose={() => setDuplicateMatches(null)}
          title={t(
            'logbook:entry.duplicateDetection.heading',
            'Similar pieces found'
          )}
          size="md"
          isMobileOptimized
        >
          <div className="space-y-4">
            <p className="text-stone-700 text-sm sm:text-base">
              {t('logbook:entry.duplicateDetection.similarTo', {
                title: duplicateMatches.piece.title,
                composer: duplicateMatches.piece.composer
                  ? ` by ${duplicateMatches.piece.composer}`
                  : '',
              })}
            </p>

            <div className="space-y-2 sm:space-y-3">
              {duplicateMatches.matches.map((match, index) => (
                <div
                  key={index}
                  className="border border-stone-200 rounded-lg p-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-900 text-sm sm:text-base truncate">
                        {match.title}
                      </div>
                      {match.composer && (
                        <div className="text-xs sm:text-sm text-stone-600 truncate">
                          {match.composer}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                      <span
                        className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                          match.confidence === 'high'
                            ? 'bg-red-100 text-red-700'
                            : match.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t('logbook:entry.duplicateDetection.matchPercentage', {
                          percentage: Math.round(match.similarity * 100),
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2"
                        onClick={async () => {
                          // Use the existing piece instead of creating a new one
                          const updatedPieces = pieces.map((piece, idx) =>
                            idx === 0
                              ? { title: match.title, composer: match.composer }
                              : piece
                          )
                          setPieces(updatedPieces)

                          // Update the pending entry data with the selected piece
                          if (pendingEntryData) {
                            const updatedEntryData = {
                              ...pendingEntryData,
                              pieces: updatedPieces
                                .filter(p => p.title)
                                .map(p => ({
                                  title: p.title,
                                  composer: p.composer ? p.composer : null,
                                })),
                            }

                            // Create the entry with the selected piece
                            await createEntry(
                              updatedEntryData as Omit<
                                LogbookEntry,
                                'id' | 'createdAt' | 'updatedAt'
                              >
                            )
                            setPendingEntryData(null)
                          }

                          setDuplicateMatches(null)
                          setDuplicateCheckSkipped(true) // Skip duplicate check for this session
                          onSave() // Close the form
                        }}
                      >
                        {t('logbook:entry.duplicateDetection.useThis')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-4 border-t border-stone-200">
              <Button
                variant="ghost"
                className="w-full sm:w-auto text-sm"
                onClick={async () => {
                  // Create the entry with the original piece data
                  if (pendingEntryData) {
                    await createEntry(
                      pendingEntryData as Omit<
                        LogbookEntry,
                        'id' | 'createdAt' | 'updatedAt'
                      >
                    )
                    setPendingEntryData(null)
                  }
                  setDuplicateMatches(null)
                  onSave() // Close the form
                }}
              >
                {t('logbook:entry.duplicateDetection.createNewAnyway')}
              </Button>
              <Button
                variant="secondary"
                className="w-full sm:w-auto text-sm"
                onClick={() => {
                  setDuplicateMatches(null)
                  // Don't save, let user modify the piece
                }}
              >
                {t('logbook:entry.duplicateDetection.letMeEdit')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
