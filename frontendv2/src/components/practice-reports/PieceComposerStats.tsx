import { useTranslation } from 'react-i18next'
import { AnalyticsData } from '../../hooks/usePracticeAnalytics'

interface PieceComposerStatsProps {
  analytics: AnalyticsData
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

  return (
    <div className="bg-morandi-sage-50 rounded-lg p-4 mt-3">
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
    </div>
  )
}

export default PieceComposerStats
