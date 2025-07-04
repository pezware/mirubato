import { useTranslation } from 'react-i18next'
import { AnalyticsData } from '../../hooks/usePracticeAnalytics'
import { Card } from '../ui/Card'
import { ChevronRight } from 'lucide-react'

interface PiecesStatisticsProps {
  analytics: AnalyticsData
  selectedPiece: string | null
  selectedComposer: string | null
  setSelectedPiece: (piece: string) => void
  formatDuration: (minutes: number) => string
}

export function PiecesStatistics({
  analytics,
  selectedPiece,
  selectedComposer,
  setSelectedPiece,
  formatDuration,
}: PiecesStatisticsProps) {
  const { t } = useTranslation(['reports'])

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

  // Calculate composer stats if composer is selected
  const getComposerStats = () => {
    if (!selectedComposer || selectedPiece) return null

    let totalTime = 0
    let totalSessions = 0
    const techniques = new Set<string>()
    let lastPracticed = ''

    analytics.pieceStats.forEach((stats, pieceKey) => {
      if (pieceKey.startsWith(selectedComposer + ' - ')) {
        totalTime += stats.totalDuration
        totalSessions += stats.count
        stats.techniques.forEach(t => techniques.add(t))
        if (
          !lastPracticed ||
          new Date(stats.lastPracticed) > new Date(lastPracticed)
        ) {
          lastPracticed = stats.lastPracticed
        }
      }
    })

    return {
      totalTime,
      totalSessions,
      techniques: Array.from(techniques),
      lastPracticed,
    }
  }

  const composerStats = getComposerStats()

  return (
    <div className="space-y-4">
      {/* Selected Piece/Composer Summary */}
      {(selectedPiece || selectedComposer) && (
        <Card className="bg-white border border-morandi-stone-200 p-4">
          {selectedPiece && (
            <>
              <h3 className="font-medium text-morandi-stone-900 mb-2">
                {selectedPiece.split(' - ')[1]}
              </h3>
              <p className="text-sm text-morandi-stone-600 mb-3">
                {selectedPiece.split(' - ')[0]}
              </p>
            </>
          )}
          {selectedComposer && !selectedPiece && (
            <h3 className="font-medium text-morandi-stone-900 mb-3">
              {selectedComposer}
            </h3>
          )}

          {selectedPiece && pieceStats[0] && (
            <PieceStatsDisplay
              stats={pieceStats[0]}
              formatDuration={formatDuration}
              t={t}
            />
          )}

          {composerStats && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-morandi-stone-900">
                  {formatDuration(composerStats.totalTime)}
                </p>
                <p className="text-xs text-morandi-stone-600">
                  {t('reports:totalTime')}
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-morandi-stone-900">
                  {composerStats.totalSessions}
                </p>
                <p className="text-xs text-morandi-stone-600">
                  {t('reports:sessions')}
                </p>
              </div>
              {composerStats.lastPracticed && (
                <div className="col-span-2">
                  <p className="text-sm text-morandi-stone-600">
                    {t('reports:lastPracticed')}:{' '}
                    {new Date(composerStats.lastPracticed).toLocaleDateString()}
                  </p>
                </div>
              )}
              {composerStats.techniques.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-morandi-stone-600 mb-2">
                    {t('reports:techniquesPracticed')}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {composerStats.techniques.map(technique => (
                      <span
                        key={technique}
                        className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-700 rounded-md text-xs"
                      >
                        {technique}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Pieces List */}
      <div className="space-y-2">
        {pieceStats.map(piece => {
          return (
            <div
              key={piece.key}
              className="p-3 bg-white border border-morandi-stone-200 rounded-lg hover:bg-morandi-stone-50 transition-colors cursor-pointer"
              onClick={() => setSelectedPiece(piece.key)}
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

function PieceStatsDisplay({
  stats,
  formatDuration,
  t,
}: {
  stats: {
    key: string
    count: number
    totalDuration: number
    lastPracticed: string
    techniques: Set<string>
  }
  formatDuration: (minutes: number) => string
  t: (key: string) => string
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-2xl font-bold text-morandi-stone-900">
          {formatDuration(stats.totalDuration)}
        </p>
        <p className="text-xs text-morandi-stone-600">
          {t('reports:totalTime')}
        </p>
      </div>
      <div>
        <p className="text-2xl font-bold text-morandi-stone-900">
          {stats.count}
        </p>
        <p className="text-xs text-morandi-stone-600">
          {t('reports:sessions')}
        </p>
      </div>
      <div>
        <p className="text-lg font-bold text-morandi-stone-900">
          {formatDuration(Math.round(stats.totalDuration / stats.count))}
        </p>
        <p className="text-xs text-morandi-stone-600">
          {t('reports:avgPerSession')}
        </p>
      </div>
      <div>
        <p className="text-sm text-morandi-stone-900">
          {new Date(stats.lastPracticed).toLocaleDateString()}
        </p>
        <p className="text-xs text-morandi-stone-600">
          {t('reports:lastPracticed')}
        </p>
      </div>
      {stats.techniques.size > 0 && (
        <div className="col-span-2">
          <p className="text-sm text-morandi-stone-600 mb-2">
            {t('reports:techniquesPracticed')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(stats.techniques).map((technique: string) => (
              <span
                key={technique}
                className="px-2 py-1 bg-morandi-stone-100 text-morandi-stone-700 rounded-md text-xs"
              >
                {technique}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
