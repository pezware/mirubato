import { useTranslation } from 'react-i18next'
import { AnalyticsData } from '../../hooks/usePracticeAnalytics'
import { LogbookEntry } from '../../api/logbook'
import { Card } from '../ui/Card'
import { EntryCard } from './components/EntryCard'

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
          (p: LogbookEntry['pieces'][0]) =>
            `${p.composer || 'Unknown'} - ${p.title}` === selectedPiece
        )
      )
    }

    if (selectedComposer) {
      return analytics.filteredEntries.filter(entry =>
        entry.pieces.some(
          (p: LogbookEntry['pieces'][0]) =>
            (p.composer || 'Unknown') === selectedComposer
        )
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
            <p className="text-lg font-bold text-morandi-stone-900">
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
          <div className="p-4 space-y-3">
            {relatedEntries
              .sort(
                (a, b) =>
                  new Date(b.timestamp).getTime() -
                  new Date(a.timestamp).getTime()
              )
              .map(entry => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default PieceComposerStats
