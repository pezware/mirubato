import { useState, useEffect, useCallback, useRef } from 'react'
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
import { useSyncTriggers } from '../hooks/useSyncTriggers'
import { createLogbookEntrySignature } from '../utils/contentSignature'
import type { LogbookEntry } from '../api/logbook'
import {
  generateNormalizedScoreId,
  isSameScore,
} from '../utils/scoreIdNormalizer'
import Button from './ui/Button'
import { SubmitButton } from './ui/ProtectedButtonFactory'
import type { ProtectedButtonRef } from './ui/ProtectedButton'
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
  const { setFormSubmitting, getSyncStatus } = useSyncTriggers()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitProgress, setSubmitProgress] = useState<string | null>(null)

  // Button ref for state management
  const submitButtonRef = useRef<ProtectedButtonRef>(null)

  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)

  // Track recent submissions for UI-level duplicate prevention
  const recentSubmissions = useRef<
    Map<string, { timestamp: number; pending: boolean }>
  >(new Map())
  const lastSubmissionId = useRef<string | null>(null)

  const [showRepertoirePrompt, setShowRepertoirePrompt] = useState<{
    piece: { title: string; composer?: string | null }
    scoreId: string
  } | null>(null)

  // Form state - declared early so they can be used in callbacks
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

  // Calculate the practice start time by subtracting duration from current time
  // This handles midnight rollover correctly
  const calculatePracticeStartTime = (
    currentTime: Date,
    durationMinutes: number
  ) => {
    const practiceStartTime = new Date(
      currentTime.getTime() - durationMinutes * 60 * 1000
    )
    return practiceStartTime
  }

  // Date state - use initialStartTime date, existing entry date, or calculated practice date
  const [practiceDate, setPracticeDate] = useState(() => {
    if (entry?.timestamp) {
      // Convert existing timestamp to YYYY-MM-DD format in local timezone
      const date = new Date(entry.timestamp)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    if (initialStartTime) {
      // Use the date from timer start time
      return `${initialStartTime.getFullYear()}-${String(initialStartTime.getMonth() + 1).padStart(2, '0')}-${String(initialStartTime.getDate()).padStart(2, '0')}`
    }

    // Calculate the practice start time by subtracting duration from now
    const now = new Date()
    const practiceStartTime = calculatePracticeStartTime(
      now,
      initialDuration || 30
    )

    // Use the calculated practice start time for the date
    return `${practiceStartTime.getFullYear()}-${String(practiceStartTime.getMonth() + 1).padStart(2, '0')}-${String(practiceStartTime.getDate()).padStart(2, '0')}`
  })

  // Time state - use initialStartTime from timer, existing entry time, or calculated practice time
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

    // Calculate the practice start time by subtracting duration from now
    const now = new Date()
    const practiceStartTime = calculatePracticeStartTime(
      now,
      initialDuration || 30
    )

    // Use the calculated practice start time for the time
    return `${String(practiceStartTime.getHours()).padStart(2, '0')}:${String(practiceStartTime.getMinutes()).padStart(2, '0')}`
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

  // Create a UI-level submission signature based on current form state
  const createFormSignature = useCallback(() => {
    // Create signature from current form values (not entry data)
    const formData = {
      duration,
      type,
      instrument,
      practiceDate,
      practiceTime,
      pieces: pieces
        .filter(p => p.title)
        .map(p => ({
          title: p.title.trim(),
          composer: (p.composer || '').trim(),
        })),
      techniques: techniques.sort(),
      notes: notes.trim(),
      mood: mood || '',
    }

    // Simple hash of form data for UI-level deduplication
    const str = JSON.stringify(formData)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }, [
    duration,
    type,
    instrument,
    practiceDate,
    practiceTime,
    pieces,
    techniques,
    notes,
    mood,
  ])

  // Check if this exact form submission is already in progress
  const checkUILevelDuplicate = useCallback((): boolean => {
    const signature = createFormSignature()
    const now = Date.now()

    // Clean old submissions (older than 2 minutes)
    const twoMinutesAgo = now - 120000
    for (const [sig, data] of recentSubmissions.current.entries()) {
      if (data.timestamp < twoMinutesAgo) {
        recentSubmissions.current.delete(sig)
      }
    }

    // Check if this exact form data is already being submitted
    const existing = recentSubmissions.current.get(signature)
    if (existing && existing.pending) {
      console.log(
        '[ManualEntryForm] Blocked UI-level duplicate - same form data already being submitted'
      )
      return true
    }

    // Record this submission as pending
    recentSubmissions.current.set(signature, { timestamp: now, pending: true })
    lastSubmissionId.current = signature
    console.log(
      `[ManualEntryForm] Recorded UI submission: ${signature.substring(0, 8)}...`
    )
    return false
  }, [createFormSignature])

  // Mark current submission as completed
  const markSubmissionCompleted = useCallback(() => {
    if (lastSubmissionId.current) {
      const existing = recentSubmissions.current.get(lastSubmissionId.current)
      if (existing) {
        recentSubmissions.current.set(lastSubmissionId.current, {
          ...existing,
          pending: false,
        })
      }
      lastSubmissionId.current = null
    }
  }, [])

  // Load repertoire on mount
  useEffect(() => {
    loadRepertoire()
  }, [loadRepertoire])

  // Cleanup on unmount - ensure sync queue is cleared and form submission state is reset
  useEffect(() => {
    // Capture ref values to avoid stale closure warning
    const submissions = recentSubmissions.current

    return () => {
      // Abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort('Component unmounting')
        abortControllerRef.current = null
      }

      // Reset form submission state to prevent lingering sync blocks
      setFormSubmitting(false)
      markSubmissionCompleted()

      // Clear any pending submissions
      submissions.clear()

      // Check if sync queue is growing and log status for debugging
      const syncStatus = getSyncStatus()
      if (syncStatus?.queueStatus && syncStatus.queueStatus.queueSize > 5) {
        console.warn(
          '[ManualEntryForm] Large sync queue detected on unmount:',
          syncStatus.queueStatus
        )
      }

      console.log('[ManualEntryForm] Cleanup completed on unmount')
    }
  }, [setFormSubmitting, getSyncStatus, markSubmissionCompleted])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('[ManualEntryForm] Submission already in progress')
      return
    }

    // Helper function to reset all loading states
    const resetLoadingStates = () => {
      setIsSubmitting(false)
      setFormSubmitting(false)
      setSubmitProgress(null)
      markSubmissionCompleted()
      // Also reset the button's internal state
      submitButtonRef.current?.resetState()
    }

    // Prepare entry data for content-based duplicate detection
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

    // Create new AbortController for this submission
    abortControllerRef.current = new AbortController()

    // UI-level duplicate prevention (check before setting loading states)
    if (!entry && checkUILevelDuplicate()) {
      setSubmitError('This entry is already being submitted. Please wait.')
      return
    }

    // Set loading states AFTER duplicate check
    setIsSubmitting(true)
    setFormSubmitting(true) // Prevent focus sync during form submission

    try {
      console.log('[ManualEntryForm] Starting entry operation:', {
        isEditing: !!entry,
      })

      // Perform the operation with progress tracking
      if (entry) {
        setSubmitProgress('Updating entry...')
        console.log('[ManualEntryForm] Updating entry:', entry.id)
        await updateEntry(entry.id, entryData)
        console.log('[ManualEntryForm] Entry updated successfully')
        setSubmitProgress('Entry updated successfully!')
      } else {
        setSubmitProgress('Saving practice entry...')
        console.log('[ManualEntryForm] Creating new entry')
        await createEntry(entryData)
        console.log('[ManualEntryForm] Entry created successfully')
        setSubmitProgress('Entry saved successfully!')

        // Check if any piece should be added to repertoire
        // Skip the prompt if we have initialPieces (coming from piece detail page)
        if (!initialPieces) {
          console.log(
            '[ManualEntryForm] Checking repertoire for pieces:',
            entryData.pieces
          )
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
              console.log(
                '[ManualEntryForm] Showing repertoire prompt for piece:',
                piece
              )
              setSubmitProgress('Checking repertoire...')
              // Show prompt for this piece
              setShowRepertoirePrompt({ piece, scoreId })
              // Clear error state and ensure UI states are reset
              setSubmitError(null)
              // Mark submission as completed since the entry was created successfully
              markSubmissionCompleted()
              // Note: onSave() will be called from the repertoire prompt handlers
              // Reset loading states immediately to prevent stuck UI
              resetLoadingStates()
              return
            }
          }
        }
      }

      console.log('[ManualEntryForm] Operation completed, calling onSave')
      setSubmitError(null) // Clear any previous errors
      markSubmissionCompleted() // Mark this submission as successful
      onSave()
    } catch (error) {
      // Handle AbortError (component unmounted)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(
          '[ManualEntryForm] Operation aborted due to component unmount'
        )
        return
      }

      console.error('[ManualEntryForm] Failed to save entry:', {
        error,
        entryData: {
          timestamp: entryData.timestamp,
          duration: entryData.duration,
          type: entryData.type,
          instrument: entryData.instrument,
          pieces: entryData.pieces,
          mood: entryData.mood,
        },
        isEditing: !!entry,
        stack: error instanceof Error ? error.stack : 'No stack trace',
      })

      // Set user-friendly error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to save entry. Please try again.'

      setSubmitError(errorMessage)

      // Reset loading states on error
      resetLoadingStates()
      // Don't call onSave if there was an error
      return
    } finally {
      // Clean up AbortController
      abortControllerRef.current = null
      // Always reset states in finally block to prevent stuck states (defensive programming)
      resetLoadingStates() // Re-enable focus sync
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
    >
      <form
        onSubmit={e => {
          e.preventDefault() // Prevent default form submission
          // Form submission now handled by SubmitButton onClick
        }}
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

        {/* Error Display */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{submitError}</span>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-morandi-stone-200">
          <Button type="button" onClick={onClose} variant="secondary">
            {t('common:cancel')}
          </Button>
          <SubmitButton
            ref={submitButtonRef}
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            externalLoading={isSubmitting}
            debounceMs={500}
            loadingText={
              submitProgress ||
              (entry
                ? t('logbook:entry.updating', 'Updating...')
                : t('logbook:entry.saving', 'Saving...'))
            }
            showLoadingState={true}
            data-testid="save-entry-button"
          >
            {!isSubmitting && <span>{entry ? '💾' : '💾'}</span>}
            {entry
              ? t('logbook:entry.updateEntry')
              : t('logbook:entry.saveEntry')}
          </SubmitButton>
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
