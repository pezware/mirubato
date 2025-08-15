import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useRepertoireStore } from '@/stores/repertoireStore'
import { useScoreStore } from '@/stores/scoreStore'
import { useLogbookStore } from '@/stores/logbookStore'
import { EnhancedAnalyticsData } from '@/types/reporting'
import { RepertoireItem } from '@/api/repertoire'
import { Goal } from '@/api/goals'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Select } from '@/components/ui/Select'
import { RepertoireCard } from './RepertoireCard'
import { FocusedRepertoireItem } from './FocusedRepertoireItem'
import { RepertoireCalendarView } from './RepertoireCalendarView'
import { PieceDetailView } from './PieceDetailView'
import { AddToRepertoireModal } from './AddToRepertoireModal'
import { CreateGoalModal } from './CreateGoalModal'
import { EditNotesModal } from './EditNotesModal'
import ManualEntryForm from '@/components/ManualEntryForm'
import { RepertoireStats } from '@/components/practice-reports/RepertoireStats'
import { toTitleCase } from '@/utils/textFormatting'
import {
  generateNormalizedScoreId,
  isSameScore,
} from '@/utils/scoreIdNormalizer'
import { Music } from 'lucide-react'
import { useSubmissionProtection } from '@/hooks/useSubmissionProtection'

interface RecentPractice {
  id: string
  timestamp: number
  duration: number
  notes?: string
}

interface EnrichedRepertoireItem extends RepertoireItem {
  scoreTitle: string
  scoreComposer: string
  catalogNumber?: string
  activeGoals?: Goal[]
  recentPractice?: RecentPractice[]
  relatedSessions?: number
  isLogbookPiece?: boolean
}

interface RepertoireViewProps {
  analytics: EnhancedAnalyticsData
}

export default function RepertoireView({ analytics }: RepertoireViewProps) {
  const { t } = useTranslation(['repertoire', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [selectedScoreId, setSelectedScoreId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedPiece, setSelectedPiece] =
    useState<EnrichedRepertoireItem | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualEntryPiece, setManualEntryPiece] = useState<{
    title: string
    composer: string
    scoreId?: string
  } | null>(null)
  const [searchQuery] = useState('') // TODO: Add search input
  const [editingPieceNotes, setEditingPieceNotes] =
    useState<EnrichedRepertoireItem | null>(null)

  // Track when user was viewing piece detail (for click handlers)
  const wasOnPieceDetailRef = useRef(false)

  const {
    repertoireLoading,
    loadRepertoire,
    loadGoals,
    getFilteredRepertoire,
    getGoalsForScore,
    cacheScoreMetadata,
    getScoreMetadata,
    updateRepertoireStatus,
    updateRepertoire,
    repertoire,
    sortBy,
    setSortBy,
  } = useRepertoireStore()

  const { userLibrary: scores, loadUserLibrary } = useScoreStore()

  const { entries, loadEntries } = useLogbookStore()

  // Submission protection for "Log Practice" actions
  const { handleSubmission } = useSubmissionProtection({
    debounceMs: 300, // Prevent rapid clicking
    maxSubmissionsPerMinute: 5, // Reasonable limit for practice logging
  })

  // Load data on mount
  useEffect(() => {
    loadRepertoire()
    loadGoals()
    loadEntries()
    // Try to load user library but don't block if it fails
    loadUserLibrary().catch(() => {
      // Ignore errors from scores service - not critical for repertoire
      console.log('Scores service not available, continuing without scores')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // useEffect will be moved after sortedRepertoire calculation

  // Get filtered repertoire items
  const filteredItems = getFilteredRepertoire()

  // Merge repertoire data with score metadata and apply search filter
  const enrichedRepertoire = useMemo(() => {
    const enriched = filteredItems.map(item => {
      const score = scores.find(s => s.id === item.scoreId)
      const scoreGoals = getGoalsForScore(item.scoreId).filter(
        g => g.status === 'active'
      )

      // Get practice data from analytics
      // First try to match by scoreId, then fall back to matching by piece title/composer
      const practiceSessions = analytics.filteredEntries.filter(entry => {
        // Direct scoreId match using normalized comparison
        if (entry.scoreId && isSameScore(entry.scoreId, item.scoreId)) {
          return true
        }

        // For logbook pieces without scoreId, match by title and composer from pieces array
        if (!entry.scoreId && entry.pieces && entry.pieces.length > 0) {
          // Check if any piece in the entry matches
          return entry.pieces.some(piece => {
            // Generate normalized scoreId for the piece and compare
            const pieceScoreId = generateNormalizedScoreId(
              piece.title || '',
              piece.composer || ''
            )
            return isSameScore(pieceScoreId, item.scoreId)
          })
        }

        return false
      })

      // For logbook pieces, the scoreId is in format "title-composer"
      // We need to extract the title and composer from the scoreId
      let scoreTitle = score?.title || 'Unknown Score'
      let scoreComposer = score?.composer || ''
      let isLogbookPiece = false

      // First try to get from cache
      const cachedMetadata = getScoreMetadata(item.scoreId)
      if (cachedMetadata) {
        scoreTitle = cachedMetadata.title
        scoreComposer = cachedMetadata.composer
      } else if (!score && item.scoreId.includes('-')) {
        // This is likely a logbook piece
        const parts = item.scoreId.split('-')
        if (parts.length >= 2) {
          scoreTitle = toTitleCase(parts[0])
          scoreComposer = toTitleCase(parts.slice(1).join('-')) // Handle composers with hyphens
          isLogbookPiece = true

          // Cache this metadata for future use
          cacheScoreMetadata(item.scoreId, {
            id: item.scoreId,
            title: scoreTitle,
            composer: scoreComposer,
          })
        }
      } else if (score) {
        // Cache the score metadata from scoreStore
        cacheScoreMetadata(item.scoreId, {
          id: item.scoreId,
          title: score.title,
          composer: score.composer,
        })
      }

      // Count sessions linked to goals
      const relatedSessions = scoreGoals.reduce((count, goal) => {
        return count + (goal.relatedSessions || 0)
      }, 0)

      // Calculate total practice time and count from matched sessions
      const totalPracticeTime = practiceSessions.reduce(
        (total, session) => total + session.duration,
        0
      )
      const practiceCount = practiceSessions.length
      const lastPracticed =
        practiceSessions.length > 0
          ? new Date(practiceSessions[0].timestamp).getTime()
          : item.lastPracticed

      return {
        ...item,
        scoreTitle,
        scoreComposer,
        isLogbookPiece,
        activeGoals: scoreGoals,
        relatedSessions,
        totalPracticeTime,
        practiceCount,
        lastPracticed,
        recentPractice: practiceSessions.map(session => ({
          id: session.id,
          timestamp: new Date(session.timestamp).getTime(),
          duration: session.duration,
          notes: session.notes || undefined,
        })),
      }
    })

    // Apply search filter after enrichment
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      return enriched.filter(item => {
        const titleMatch = item.scoreTitle.toLowerCase().includes(search)
        const composerMatch = item.scoreComposer.toLowerCase().includes(search)
        const notesMatch =
          item.personalNotes?.toLowerCase().includes(search) || false

        return titleMatch || composerMatch || notesMatch
      })
    }

    return enriched
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, scores, analytics, searchQuery])

  // Apply sorting to the enriched repertoire
  const sortedRepertoire = useMemo(() => {
    const items = [...enrichedRepertoire]

    items.sort((a, b) => {
      switch (sortBy) {
        case 'status-learning-first': {
          // Define status order: learning first, then planned, polished, dropped
          const statusOrder = {
            learning: 0,
            planned: 1,
            working: 2,
            polished: 3,
            'performance-ready': 4,
            dropped: 5,
          }
          const orderA = statusOrder[a.status] ?? 999
          const orderB = statusOrder[b.status] ?? 999
          if (orderA !== orderB) return orderA - orderB
          // If same status, sort by title
          return a.scoreTitle.localeCompare(b.scoreTitle)
        }

        case 'last-practiced': {
          // Most recent first
          const dateA = a.lastPracticed || 0
          const dateB = b.lastPracticed || 0
          return dateB - dateA
        }

        case 'most-practiced':
          // Most practiced first
          return (b.practiceCount || 0) - (a.practiceCount || 0)

        case 'title-asc':
          return a.scoreTitle.localeCompare(b.scoreTitle)

        case 'composer-asc': {
          // Sort by composer, then by title
          const composerCompare = a.scoreComposer.localeCompare(b.scoreComposer)
          if (composerCompare !== 0) return composerCompare
          return a.scoreTitle.localeCompare(b.scoreTitle)
        }

        default:
          return 0
      }
    })

    return items
  }, [enrichedRepertoire, sortBy])

  // Sync selectedPiece state with URL pieceId parameter
  useEffect(() => {
    const pieceId = searchParams.get('pieceId')

    if (pieceId) {
      // Find the piece with the matching scoreId
      const piece = sortedRepertoire.find(p => p.scoreId === pieceId)
      if (piece && piece.scoreId !== selectedPiece?.scoreId) {
        console.log('Setting selectedPiece from URL pieceId:', pieceId)
        setSelectedPiece(piece)
        wasOnPieceDetailRef.current = true
      } else if (!piece && sortedRepertoire.length > 0) {
        // If piece not found and we have data, remove invalid pieceId from URL
        console.log(
          'Piece not found for pieceId:',
          pieceId,
          'removing from URL'
        )
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('pieceId')
        setSearchParams(newParams, { replace: true })
      }
    } else {
      // No pieceId in URL, show list view
      if (selectedPiece !== null) {
        console.log('No pieceId in URL, clearing selectedPiece')
        setSelectedPiece(null)
        wasOnPieceDetailRef.current = false
      }
    }
  }, [searchParams, sortedRepertoire, setSearchParams, selectedPiece])

  // Find the entry being edited
  const editingEntry = editingSessionId
    ? Array.from(entries.values()).find(entry => entry.id === editingSessionId)
    : null

  // If editing an entry, show the ManualEntryForm
  if (editingEntry) {
    return (
      <ManualEntryForm
        entry={editingEntry}
        onClose={() => setEditingSessionId(null)}
        onSave={() => {
          setEditingSessionId(null)
          loadEntries() // Refresh the entries
        }}
      />
    )
  }

  // If viewing a piece detail
  if (selectedPiece) {
    // Get all practice sessions for this piece
    const pieceEntries = analytics.filteredEntries.filter(entry => {
      // Direct scoreId match using normalized comparison
      if (entry.scoreId && isSameScore(entry.scoreId, selectedPiece.scoreId)) {
        return true
      }

      // For logbook pieces without scoreId, match by title and composer
      if (!entry.scoreId && entry.pieces && entry.pieces.length > 0) {
        return entry.pieces.some(piece => {
          // Generate normalized scoreId for the piece and compare
          const pieceScoreId = generateNormalizedScoreId(
            piece.title || '',
            piece.composer || ''
          )
          return isSameScore(pieceScoreId, selectedPiece.scoreId)
        })
      }

      return false
    })

    // Convert LogbookEntry to PracticeSession format
    const practiceSessions = pieceEntries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      duration: entry.duration,
      type: entry.type,
      notes: entry.notes || undefined,
      mood: entry.mood || undefined,
      tempo: undefined, // Not available in LogbookEntry
      instrument: entry.instrument,
    }))

    return (
      <>
        <PieceDetailView
          item={selectedPiece}
          sessions={practiceSessions}
          onLogPractice={() => {
            handleSubmission(async () => {
              setManualEntryPiece({
                title: selectedPiece.scoreTitle,
                composer: selectedPiece.scoreComposer,
                scoreId: selectedPiece.scoreId,
              })
              // Clear piece selection by removing pieceId from URL
              const newParams = new URLSearchParams(searchParams)
              newParams.delete('pieceId')
              setSearchParams(newParams)
              setShowManualEntry(true)
              return true
            }).catch(error => {
              console.error(
                '[RepertoireView] Failed to open practice form:',
                error
              )
            })
          }}
          onEditNotes={() => {
            setEditingPieceNotes(selectedPiece)
          }}
          onEditSession={sessionId => {
            setEditingSessionId(sessionId)
          }}
          onStatusChange={async newStatus => {
            await updateRepertoireStatus(selectedPiece.scoreId, newStatus)
            // Refresh the selected piece data
            const updatedItem = repertoire.get(selectedPiece.scoreId)
            if (updatedItem) {
              setSelectedPiece({
                ...selectedPiece,
                ...updatedItem,
                status: newStatus,
              })
            }
          }}
          onPieceUpdated={updatedPiece => {
            // Update the selected piece with new title and composer
            setSelectedPiece({
              ...selectedPiece,
              scoreTitle: updatedPiece.title,
              scoreComposer: updatedPiece.composer,
            })
            // The loadRepertoire() call in PieceDetailView will refresh the data
          }}
        />

        {/* Edit Notes Modal - Available in piece detail view */}
        {editingPieceNotes && (
          <EditNotesModal
            isOpen={true}
            onClose={() => setEditingPieceNotes(null)}
            pieceTitle={editingPieceNotes.scoreTitle}
            currentNotes={editingPieceNotes.personalNotes || ''}
            currentLinks={editingPieceNotes.referenceLinks || []}
            onSave={async (notes, links) => {
              await updateRepertoire(editingPieceNotes.scoreId, {
                personalNotes: notes,
                referenceLinks: links,
              })
              setEditingPieceNotes(null)
              // Update the selected piece with new notes
              if (
                selectedPiece &&
                selectedPiece.scoreId === editingPieceNotes.scoreId
              ) {
                setSelectedPiece({
                  ...selectedPiece,
                  personalNotes: notes,
                  referenceLinks: links,
                })
              }
            }}
          />
        )}
      </>
    )
  }

  if (repertoireLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Repertoire Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 w-full">
        <div className="p-3 sm:p-4">
          <RepertoireStats repertoireItems={filteredItems} />
        </div>
      </div>

      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="bg-stone-100 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('common:view.list')}
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('common:view.grid')}
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('common:view.calendar')}
            </button>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="sm:ml-0"
          >
            <Music className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex justify-start sm:justify-end">
          <Select
            value={sortBy}
            onChange={value =>
              setSortBy(value as Parameters<typeof setSortBy>[0])
            }
            options={[
              {
                value: 'status-learning-first',
                label: t('repertoire:sort.statusLearningFirst'),
              },
              {
                value: 'last-practiced',
                label: t('repertoire:sort.lastPracticed'),
              },
              {
                value: 'most-practiced',
                label: t('repertoire:sort.mostPracticed'),
              },
              {
                value: 'title-asc',
                label: t('repertoire:sort.titleAsc'),
              },
              {
                value: 'composer-asc',
                label: t('repertoire:sort.composerAsc'),
              },
            ]}
            className="w-full sm:w-56"
          />
        </div>
      </div>

      {/* Repertoire Items */}
      <div className="space-y-4">
        {sortedRepertoire.length === 0 ? (
          <Card className="p-8 text-center">
            <Music className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-600 mb-4">
              {t('repertoire:emptyRepertoire')}
            </p>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              {t('repertoire:addFirstPiece')}
            </Button>
          </Card>
        ) : viewMode === 'list' ? (
          sortedRepertoire.map(item => (
            <div
              key={item.scoreId}
              onClick={() => {
                // Update URL to include pieceId instead of directly setting state
                console.log(
                  'Clicking piece, updating URL with pieceId:',
                  item.scoreId
                )
                const newParams = new URLSearchParams(searchParams)
                newParams.set('pieceId', item.scoreId)
                setSearchParams(newParams)
              }}
              className="cursor-pointer"
            >
              <FocusedRepertoireItem item={item} />
            </div>
          ))
        ) : viewMode === 'grid' ? (
          // Grid view - use existing RepertoireCard
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrichedRepertoire.map(item => (
              <RepertoireCard
                key={item.scoreId}
                item={item}
                onEditSession={sessionId => {
                  setEditingSessionId(sessionId)
                }}
              />
            ))}
          </div>
        ) : (
          // Calendar view
          <RepertoireCalendarView
            enrichedRepertoire={sortedRepertoire}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddToRepertoireModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showGoalModal && selectedScoreId && (
        <CreateGoalModal
          isOpen={showGoalModal}
          onClose={() => {
            setShowGoalModal(false)
            setSelectedScoreId(null)
          }}
          scoreId={selectedScoreId}
        />
      )}

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualEntryForm
          onClose={() => {
            setShowManualEntry(false)
            setManualEntryPiece(null)
          }}
          onSave={() => {
            setShowManualEntry(false)
            setManualEntryPiece(null)
            loadEntries() // Refresh the entries
          }}
          initialPieces={manualEntryPiece ? [manualEntryPiece] : undefined}
        />
      )}
      {/* Edit Notes Modal */}
      {editingPieceNotes &&
        (() => {
          // Capture the values to avoid TypeScript narrowing issues
          const currentPiece = editingPieceNotes
          return (
            <EditNotesModal
              isOpen={true}
              onClose={() => setEditingPieceNotes(null)}
              pieceTitle={currentPiece.scoreTitle}
              currentNotes={currentPiece.personalNotes || ''}
              currentLinks={currentPiece.referenceLinks || []}
              onSave={async (notes, links) => {
                await updateRepertoire(currentPiece.scoreId, {
                  personalNotes: notes,
                  referenceLinks: links,
                })
                setEditingPieceNotes(null)
                // The repertoire will be refreshed from the store automatically
              }}
            />
          )
        })()}
    </div>
  )
}
