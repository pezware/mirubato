import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { formatDuration } from '@/utils/dateUtils'
import { toTitleCase } from '@/utils/textFormatting'
import {
  generateNormalizedScoreId,
  isSameScore,
} from '@/utils/scoreIdNormalizer'
import { Music } from 'lucide-react'

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

  // Get filtered repertoire items
  const filteredItems = getFilteredRepertoire()

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Practice today
    const practiceToday = analytics.filteredEntries
      .filter(entry => new Date(entry.timestamp).getTime() >= today.getTime())
      .reduce((sum, entry) => sum + entry.duration, 0)

    // Practice this week
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const practiceThisWeek = analytics.filteredEntries
      .filter(entry => new Date(entry.timestamp).getTime() > oneWeekAgo)
      .reduce((sum, entry) => sum + entry.duration, 0)

    // Active pieces count - only count pieces with 'learning' status
    const activePieces = filteredItems.filter(
      item => item.status === 'learning'
    ).length

    // Calculate current streak
    const streak = analytics.currentStreak || 0

    return {
      practiceToday,
      practiceThisWeek,
      activePieces,
      streak,
    }
  }, [filteredItems, analytics])

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
        recentPractice: practiceSessions.slice(0, 5).map(session => ({
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
          onBack={() => setSelectedPiece(null)}
          onLogPractice={() => {
            setManualEntryPiece({
              title: selectedPiece.scoreTitle,
              composer: selectedPiece.scoreComposer,
              scoreId: selectedPiece.scoreId,
            })
            setSelectedPiece(null)
            setShowManualEntry(true)
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
      {/* Summary Bar */}
      <div className="bg-white rounded-lg border border-stone-200 p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-semibold text-stone-800">
              {formatDuration(stats.practiceToday)}
            </div>
            <div className="text-sm text-stone-500">
              {t('common:time.today')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-stone-800">
              {formatDuration(stats.practiceThisWeek)}
            </div>
            <div className="text-sm text-stone-500">
              {t('common:time.thisWeek')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-stone-800">
              {stats.activePieces}
            </div>
            <div className="text-sm text-stone-500">
              {t('repertoire:activePieces')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-stone-800">
              {stats.streak} {t('common:time.day_plural')}
            </div>
            <div className="text-sm text-stone-500">
              {t('common:statistics.streak')}
            </div>
          </div>
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
              onClick={() => setSelectedPiece(item)}
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

      {/* Edit Session Modal */}
      {editingSessionId && (
        <ManualEntryForm
          entry={entries.find(e => e.id === editingSessionId)}
          onClose={() => {
            setEditingSessionId(null)
          }}
          onSave={() => {
            setEditingSessionId(null)
            loadEntries() // Refresh the entries
          }}
        />
      )}
    </div>
  )
}
