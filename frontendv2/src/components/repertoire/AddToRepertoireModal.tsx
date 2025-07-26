import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { useScoreStore } from '@/stores/scoreStore'
import { useLogbookStore } from '@/stores/logbookStore'
import { Modal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input, Textarea } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import Autocomplete from '@/components/ui/Autocomplete'
import { useAutocomplete } from '@/hooks/useAutocomplete'
import { showToast } from '@/utils/toastManager'
import { RepertoireStatus } from '@/api/repertoire'
import { generateNormalizedScoreId } from '@/utils/scoreIdNormalizer'
import { toTitleCase } from '@/utils/textFormatting'
import { Search, Music, Plus, Clock, PlusCircle } from 'lucide-react'

interface AddToRepertoireModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddToRepertoireModal({
  isOpen,
  onClose,
}: AddToRepertoireModalProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const [selectedItem, setSelectedItem] = useState<{
    id: string
    type: 'score' | 'logbook'
  } | null>(null)
  const [selectedStatus, setSelectedStatus] =
    useState<keyof RepertoireStatus>('planned')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomEntry, setShowCustomEntry] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customComposer, setCustomComposer] = useState('')
  const [notes, setNotes] = useState('')

  const { addToRepertoire, repertoire, cacheScoreMetadata, updateRepertoire } =
    useRepertoireStore()
  const {
    userLibrary: scores,
    loadUserLibrary,
    isLoading: scoresLoading,
  } = useScoreStore()
  const { entries } = useLogbookStore()

  // Autocomplete for composer
  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 2,
  })

  useEffect(() => {
    if (isOpen && scores.length === 0) {
      loadUserLibrary()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Extract unique pieces from logbook entries
  const logbookPieces = useMemo(() => {
    const piecesMap = new Map<
      string,
      {
        title: string
        composer?: string
        practiceCount: number
        lastPracticed: string
        totalDuration: number
      }
    >()

    entries.forEach(entry => {
      entry.pieces.forEach(piece => {
        const key = `${piece.title}-${piece.composer || 'Unknown'}`
        const existing = piecesMap.get(key)

        if (existing) {
          existing.practiceCount++
          existing.totalDuration += entry.duration
          if (new Date(entry.timestamp) > new Date(existing.lastPracticed)) {
            existing.lastPracticed = entry.timestamp
          }
        } else {
          piecesMap.set(key, {
            title: piece.title,
            composer: piece.composer || undefined,
            practiceCount: 1,
            lastPracticed: entry.timestamp,
            totalDuration: entry.duration,
          })
        }
      })
    })

    return Array.from(piecesMap.entries())
      .map(([key, data]) => ({
        id: key, // Use title-composer as ID for logbook pieces
        ...data,
      }))
      .sort((a, b) => b.practiceCount - a.practiceCount) // Sort by most practiced
  }, [entries])

  // Combine and filter available items
  const availableItems = useMemo(() => {
    const items: Array<{
      id: string
      title: string
      composer?: string
      type: 'score' | 'logbook'
      practiceCount?: number
      lastPracticed?: string
      difficulty?: string
    }> = []

    // Add scores from scorebook
    scores.forEach(score => {
      if (!repertoire.has(score.id)) {
        items.push({
          id: score.id,
          title: score.title,
          composer: score.composer,
          type: 'score',
          difficulty: score.difficulty,
        })
      }
    })

    // Add pieces from logbook that aren't already in repertoire as scores
    logbookPieces.forEach(piece => {
      // Check if this piece already exists in repertoire (by title/composer)
      const alreadyInRepertoire = Array.from(repertoire.values()).some(item => {
        const score = scores.find(s => s.id === item.scoreId)
        return (
          score &&
          score.title === piece.title &&
          score.composer === piece.composer
        )
      })

      if (!alreadyInRepertoire) {
        items.push({
          ...piece,
          type: 'logbook',
        })
      }
    })

    // Filter by search query
    return items.filter(
      item =>
        searchQuery === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.composer &&
          item.composer.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [scores, logbookPieces, repertoire, searchQuery])

  const handleAdd = async () => {
    if (!selectedItem && !showCustomEntry) {
      showToast(t('repertoire:selectScore'), 'error')
      return
    }

    if (showCustomEntry && !customTitle.trim()) {
      showToast(t('repertoire:titleRequired'), 'error')
      return
    }

    setIsLoading(true)
    try {
      if (showCustomEntry) {
        // For custom entries, generate a normalized ID
        const customId = generateNormalizedScoreId(
          customTitle,
          customComposer || null
        )

        // Cache the metadata for the custom piece
        cacheScoreMetadata(customId, {
          id: customId,
          title: customTitle,
          composer: customComposer || '',
        })

        await addToRepertoire(customId, selectedStatus)

        // Add notes if provided
        if (notes.trim()) {
          await updateRepertoire(customId, { personalNotes: notes })
        }
      } else if (selectedItem) {
        // For logbook pieces, we'll use the piece identifier as the scoreId
        // This allows tracking even without a formal score entry
        await addToRepertoire(selectedItem.id, selectedStatus)

        // Add notes if provided
        if (notes.trim()) {
          await updateRepertoire(selectedItem.id, { personalNotes: notes })
        }
      }
      onClose()

      // Reset custom entry fields
      setCustomTitle('')
      setCustomComposer('')
      setShowCustomEntry(false)
      setNotes('')
    } catch (_error) {
      // Error handled in store
    } finally {
      setIsLoading(false)
    }
  }

  const statusOptions: Array<{ value: keyof RepertoireStatus; label: string }> =
    [
      { value: 'planned', label: t('repertoire:status.planned') },
      { value: 'learning', label: t('repertoire:status.learning') },
      { value: 'polished', label: t('repertoire:status.polished') },
      { value: 'dropped', label: t('repertoire:status.dropped') },
    ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('repertoire:addToRepertoire')}
      size="md"
    >
      <div className="space-y-4">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-4 h-4" />
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('repertoire:searchScores')}
              className="pl-10"
            />
          </div>

          {/* Score Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('repertoire:selectPiece')}
            </label>

            {scoresLoading ? (
              <div className="flex justify-center py-8">
                <Loading />
              </div>
            ) : availableItems.length === 0 ? (
              <Card className="p-8 text-center">
                <Music className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-600">
                  {searchQuery
                    ? t('repertoire:noScoresMatchSearch')
                    : t('repertoire:allScoresInRepertoire')}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Custom entry option */}
                <Card
                  variant={showCustomEntry ? 'bordered' : 'ghost'}
                  className={`p-3 cursor-pointer transition-colors ${
                    showCustomEntry
                      ? 'border-sage-500 bg-sage-50'
                      : 'hover:bg-stone-50'
                  }`}
                  onClick={() => {
                    setShowCustomEntry(!showCustomEntry)
                    setSelectedItem(null)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <PlusCircle className="w-5 h-5 text-sage-600" />
                    <div>
                      <h4 className="font-medium text-stone-800">
                        {t('repertoire:addCustomPiece')}
                      </h4>
                      <p className="text-sm text-stone-600">
                        {t('repertoire:addCustomPieceDescription')}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Custom entry form */}
                {showCustomEntry && (
                  <Card className="p-3 sm:p-4 space-y-3 bg-sage-50 border-sage-200">
                    {/* Offline indicator - only show when offline */}
                    {composerAutocomplete.isOffline && (
                      <div className="text-xs text-amber-600 flex items-center gap-1 mb-2">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                          />
                        </svg>
                        <span>
                          {t(
                            'repertoire:autocomplete.offline',
                            'Offline - showing your history'
                          )}
                        </span>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        {t('repertoire:pieceTitle')} *
                      </label>
                      <Input
                        type="text"
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                        placeholder={t('repertoire:pieceTitlePlaceholder')}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        {t('repertoire:composer')}
                      </label>
                      <Autocomplete
                        value={customComposer}
                        onChange={value => {
                          setCustomComposer(value)
                          composerAutocomplete.setQuery(value)
                        }}
                        onSelect={() => {
                          // Selection is already handled by onChange in Autocomplete component
                        }}
                        onBlur={() => {
                          // Auto-capitalize composer name on blur
                          if (customComposer && customComposer.trim()) {
                            const formatted = toTitleCase(customComposer.trim())
                            if (formatted !== customComposer) {
                              setCustomComposer(formatted)
                            }
                          }
                        }}
                        options={composerAutocomplete.suggestions}
                        placeholder={t('repertoire:composerPlaceholder')}
                        isLoading={composerAutocomplete.isLoading}
                        className="w-full"
                        emptyMessage={t(
                          'repertoire:noComposersFound',
                          'No composers found'
                        )}
                      />
                    </div>
                  </Card>
                )}

                {/* Existing items list - hide when custom entry is selected */}
                {!showCustomEntry && (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {availableItems.map(item => (
                      <Card
                        key={item.id}
                        variant={
                          selectedItem?.id === item.id ? 'bordered' : 'ghost'
                        }
                        className={`p-3 cursor-pointer transition-colors ${
                          selectedItem?.id === item.id
                            ? 'border-sage-500 bg-sage-50'
                            : 'hover:bg-stone-50'
                        }`}
                        onClick={() => {
                          setSelectedItem({ id: item.id, type: item.type })
                          setShowCustomEntry(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-stone-800">
                                {item.title}
                              </h4>
                              {item.type === 'logbook' && (
                                <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  {t('repertoire:fromLogbook')}
                                </span>
                              )}
                            </div>
                            {item.composer && (
                              <p className="text-sm text-stone-600">
                                {item.composer}
                              </p>
                            )}
                            {item.type === 'logbook' && item.practiceCount && (
                              <p className="text-xs text-stone-500 mt-1">
                                {t('repertoire:practicedTimes', {
                                  count: item.practiceCount,
                                })}
                              </p>
                            )}
                          </div>
                          {item.difficulty && (
                            <span className="text-sm text-stone-500">
                              {t(`common:difficulty.${item.difficulty}`)}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Initial Status */}
          <div className="relative pb-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('repertoire:initialStatus')}
            </label>
            <Select
              value={selectedStatus}
              onChange={value =>
                setSelectedStatus(value as keyof RepertoireStatus)
              }
              options={statusOptions}
              className="w-32 sm:w-full"
            />
          </div>

          {/* Notes */}
          <div className="pb-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              {t('repertoire:personalNotes')}
            </label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('repertoire:notesPlaceholder')}
              rows={3}
              className="w-full"
            />
            <p className="mt-1 text-xs text-stone-500">
              {t('repertoire:notesHelpText')}
            </p>
          </div>
        </div>

        {/* Actions - Outside scrollable area */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={
              (!selectedItem && !showCustomEntry) ||
              isLoading ||
              (showCustomEntry && !customTitle.trim())
            }
          >
            {isLoading ? (
              <Loading />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('repertoire:addToRepertoire')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
