import { useTranslation } from 'react-i18next'
import { AnalyticsData } from '../../hooks/usePracticeAnalytics'
import { LogbookEntry } from '../../types/logbook'
import { Card } from '../ui/Card'
import { formatDate } from '../../utils/dateUtils'

interface PieceComposerStatsProps {
  analytics: AnalyticsData & { filteredEntries?: LogbookEntry[] }
  selectedPiece: string | null
  selectedComposer: string | null
  formatDuration: (minutes: number) => string
}

export function PieceComposerStats({
  analytics,
  selectedPiece,
  selectedComposer,
  formatDuration,
}: PieceComposerStatsProps) {
  const { t } = useTranslation(['reports'])

  const getStats = () => {
    if (selectedPiece) {
      return analytics.pieceStats.get(selectedPiece)
    }

    if (selectedComposer && !selectedPiece) {
      // Aggregate stats for all pieces by this composer
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
        count: totalSessions,
        totalDuration: totalTime,
        lastPracticed,
        techniques,
      }
    }

    return null
  }

  const stats = getStats()
  if (!stats) return null

  // Get entries for the selected piece or composer
  const getRelatedEntries = () => {
    if (!analytics.filteredEntries) return []

    if (selectedPiece) {
      return analytics.filteredEntries.filter(entry =>
        entry.pieces.some(
          p => `${p.composer || 'Unknown'} - ${p.title}` === selectedPiece
        )
      )
    }

    if (selectedComposer) {
      return analytics.filteredEntries.filter(entry =>
        entry.pieces.some(p => (p.composer || 'Unknown') === selectedComposer)
      )
    }

    return []
  }

  const relatedEntries = getRelatedEntries()

  return (
    <div className="space-y-4">
      <Card className="bg-morandi-sage-50 p-4">
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
          {selectedPiece && (
            <div>
              <p className="text-lg font-bold text-morandi-stone-900">
                {formatDuration(Math.round(stats.totalDuration / stats.count))}
              </p>
              <p className="text-xs text-morandi-stone-600">
                {t('reports:avgPerSession')}
              </p>
            </div>
          )}
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
      </Card>

      {/* Practice Entries */}
      {relatedEntries.length > 0 && (
        <Card>
          <div className="p-4 border-b border-morandi-stone-200">
            <h3 className="font-medium text-morandi-stone-900">
              {selectedPiece
                ? t('reports:entriesForPiece', {
                    piece: selectedPiece.split(' - ')[1],
                  })
                : t('reports:entriesForComposer', {
                    composer: selectedComposer,
                  })}
            </h3>
            <p className="text-sm text-morandi-stone-600 mt-1">
              {relatedEntries.length} {t('reports:entries')}
            </p>
          </div>
          <div className="divide-y divide-morandi-stone-100">
            {relatedEntries
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
              .map(entry => (
                <div
                  key={entry.id}
                  className="p-4 hover:bg-morandi-stone-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-morandi-stone-900">
                      {formatDate(entry.timestamp)}
                    </span>
                    <span className="text-sm text-morandi-stone-600">
                      {formatDuration(entry.duration)}
                    </span>
                  </div>
                  {entry.pieces.length > 0 && (
                    <div className="text-sm text-morandi-stone-700 mb-1">
                      {entry.pieces.map((p, i) => (
                        <span key={i}>
                          {p.title}
                          {p.composer && ` - ${p.composer}`}
                          {i < entry.pieces.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  )}
                  {entry.notes && (
                    <p className="text-sm text-morandi-stone-600 line-clamp-2">
                      {entry.notes}
                    </p>
                  )}
                  {entry.mood && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-morandi-purple-100 text-morandi-purple-700">
                      {entry.mood.toLowerCase()}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default PieceComposerStats
