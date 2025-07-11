import { EnhancedAnalyticsData } from '../../types/reporting'
import { ChevronRight } from 'lucide-react'

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

  return (
    <div className="space-y-4" data-testid="pieces-statistics">
      {/* Pieces List */}
      <div className="space-y-2">
        {pieceStats.map(piece => {
          return (
            <div
              key={piece.key}
              className="p-3 bg-white border border-morandi-stone-200 rounded-lg hover:bg-morandi-stone-50 transition-colors cursor-pointer"
              onClick={() => setSelectedPiece?.(piece.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-morandi-stone-900">
                    {piece.key}
                  </h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-morandi-stone-500">
                      {formatDuration(piece.totalDuration)} total
                    </span>
                    <span className="text-xs text-morandi-stone-500">
                      {piece.count} {piece.count === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-morandi-stone-400" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
