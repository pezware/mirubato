import { useTranslation } from 'react-i18next'
import { LogbookEntry } from '../../api/logbook'

interface SummaryStatsProps {
  filteredAndSortedEntries: LogbookEntry[]
  formatDuration: (minutes: number) => string
}

export function SummaryStats({
  filteredAndSortedEntries,
  formatDuration,
}: SummaryStatsProps) {
  const { t } = useTranslation(['reports'])

  // Calculate time period totals
  const getTimePeriodTotal = () => {
    // Use filtered entries directly as they already contain the correct date range
    return filteredAndSortedEntries.reduce(
      (sum, entry) => sum + entry.duration,
      0
    )
  }

  const getSessionCount = () => {
    // Use filtered entries count directly
    return filteredAndSortedEntries.length
  }

  const getUniquePieces = () => {
    const pieces = new Set<string>()
    filteredAndSortedEntries.forEach(entry => {
      entry.pieces.forEach(piece => {
        pieces.add(`${piece.composer || 'Unknown'} - ${piece.title}`)
      })
    })
    return pieces.size
  }

  const getUniqueComposers = () => {
    const composers = new Set<string>()
    filteredAndSortedEntries.forEach(entry => {
      entry.pieces.forEach(piece => {
        composers.add(piece.composer || 'Unknown')
      })
    })
    return composers.size
  }

  return (
    <div className="space-y-3">
      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-morandi-stone-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {formatDuration(getTimePeriodTotal())}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:totalPractice')}
          </p>
        </div>

        <div className="bg-morandi-stone-100 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {getSessionCount()}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:sessions')}
          </p>
        </div>

        <div className="bg-morandi-peach-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {getUniquePieces()}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:pieces')} {t('reports:practiced')}
          </p>
        </div>

        <div className="bg-morandi-rose-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-morandi-stone-900">
            {getUniqueComposers()}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('reports:composers')}
          </p>
        </div>
      </div>
    </div>
  )
}
