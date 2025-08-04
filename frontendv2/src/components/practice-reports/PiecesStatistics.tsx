import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2 } from 'lucide-react'
import { EnhancedAnalyticsData } from '../../types/reporting'
import { EditPieceModal } from './EditPieceModal'
import Button from '../ui/Button'
import { useLogbookStore } from '../../stores/logbookStore'
import { toast } from '../../utils/toast'
import { reportsCache } from '../../utils/reportsCacheManager'

interface PiecesStatisticsProps {
  analytics: EnhancedAnalyticsData
  selectedPiece: string | null
  selectedComposer: string | null
  formatDuration: (minutes: number) => string
  setSelectedPiece?: (piece: string) => void
}

export function PiecesStatistics({
  analytics,
  selectedPiece,
  selectedComposer,
  formatDuration,
  setSelectedPiece,
}: PiecesStatisticsProps) {
  const { t } = useTranslation('ui')
  const [editingPiece, setEditingPiece] = useState<{
    title: string
    composer?: string
  } | null>(null)

  // Get piece stats - either for selected piece/composer or top pieces
  const getPieceStats = () => {
    if (selectedPiece) {
      const stats = analytics.pieceStats.get(selectedPiece)
      if (stats) {
        return [
          {
            key: selectedPiece,
            ...stats,
          },
        ]
      }
    }

    if (selectedComposer) {
      // Get all pieces by this composer
      const composerPieces = Array.from(analytics.pieceStats.entries())
        .filter(([key]) => key.startsWith(selectedComposer + ' - '))
        .map(([key, stats]) => ({ key, ...stats }))
        .sort((a, b) => b.totalDuration - a.totalDuration)

      return composerPieces
    }

    // Get top 10 pieces by practice time
    return Array.from(analytics.pieceStats.entries())
      .map(([key, stats]) => ({ key, ...stats }))
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 10)
  }

  const pieceStats = getPieceStats()

  const handleEditPiece = (key: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click

    // Find the actual piece data from log entries
    let actualPiece: { title: string; composer?: string } | null = null

    // Search through all entries to find the first occurrence of this piece
    for (const entry of analytics.filteredEntries) {
      for (const piece of entry.pieces) {
        const pieceKey = piece.composer
          ? `${piece.composer} - ${piece.title}`
          : piece.title

        if (pieceKey === key) {
          actualPiece = {
            title: piece.title,
            composer: piece.composer || undefined,
          }
          break
        }
      }
      if (actualPiece) break
    }

    // If we found the actual piece data, use it; otherwise fall back to parsing the key
    if (actualPiece) {
      setEditingPiece(actualPiece)
    } else {
      // Fallback: parse the key to extract composer and title
      const parts = key.split(' - ')
      if (parts.length > 1) {
        setEditingPiece({
          composer: parts[0],
          title: parts.slice(1).join(' - '),
        })
      } else {
        setEditingPiece({
          title: key,
        })
      }
    }
  }

  const { updatePieceName } = useLogbookStore()

  const handleSavePiece = async (
    oldPiece: { title: string; composer?: string },
    newPiece: { title: string; composer?: string }
  ) => {
    try {
      const updatedCount = await updatePieceName(oldPiece, newPiece)
      toast.success(`Updated ${updatedCount} entries`)
      setEditingPiece(null)

      // Clear the analytics cache to force recalculation
      reportsCache.clear()

      // Update selectedPiece if it was the edited piece
      const oldKey = oldPiece.composer
        ? `${oldPiece.composer} - ${oldPiece.title}`
        : oldPiece.title
      const newKey = newPiece.composer
        ? `${newPiece.composer} - ${newPiece.title}`
        : newPiece.title

      if (selectedPiece === oldKey && setSelectedPiece) {
        setSelectedPiece(newKey)
      }
    } catch (_error) {
      toast.error('Failed to update piece name')
    }
  }

  return (
    <div className="space-y-4" data-testid="pieces-statistics">
      {/* Pieces List */}
      <div className="space-y-1 sm:space-y-2">
        {pieceStats.map(piece => {
          return (
            <div
              key={piece.key}
              className="p-2 sm:p-3 bg-white border border-morandi-stone-200 rounded-lg hover:bg-morandi-stone-50 transition-colors cursor-pointer group"
              onClick={() => setSelectedPiece?.(piece.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-morandi-stone-900">
                      {piece.key}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => handleEditPiece(piece.key, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title={t('components.practiceReports.editPieceName')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 mt-0.5 sm:mt-1">
                    <span className="text-xs text-morandi-stone-500">
                      {formatDuration(piece.totalDuration)} total
                    </span>
                    <span className="text-xs text-morandi-stone-500">
                      {piece.count} {piece.count === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit Piece Modal */}
      {editingPiece && (
        <EditPieceModal
          isOpen={!!editingPiece}
          onClose={() => setEditingPiece(null)}
          piece={editingPiece}
          onSave={handleSavePiece}
        />
      )}
    </div>
  )
}
