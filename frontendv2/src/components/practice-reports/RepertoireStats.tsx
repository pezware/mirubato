import { useTranslation } from 'react-i18next'
import { RepertoireItem } from '../../api/repertoire'

interface RepertoireStatsProps {
  repertoireItems: RepertoireItem[]
}

export function RepertoireStats({ repertoireItems }: RepertoireStatsProps) {
  const { t } = useTranslation(['repertoire', 'reports'])

  // Calculate repertoire-specific stats
  const getTotalPieces = () => {
    return repertoireItems.length
  }

  const getActivePieces = () => {
    return repertoireItems.filter(item => item.status === 'learning').length
  }

  const getPolishedPieces = () => {
    return repertoireItems.filter(item => item.status === 'polished').length
  }

  return (
    <div className="space-y-3" data-testid="repertoire-stats">
      {/* Repertoire Stats Grid - 3 stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-morandi-stone-50 rounded-lg p-3">
          <p
            className="text-2xl font-bold text-morandi-stone-900"
            data-testid="total-pieces"
          >
            {getTotalPieces()}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('repertoire:totalPieces')}
          </p>
        </div>

        <div className="bg-morandi-peach-50 rounded-lg p-3">
          <p
            className="text-2xl font-bold text-morandi-stone-900"
            data-testid="active-pieces"
          >
            {getActivePieces()}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('repertoire:activePieces')}
          </p>
        </div>

        <div className="bg-morandi-rose-50 rounded-lg p-3">
          <p
            className="text-2xl font-bold text-morandi-stone-900"
            data-testid="polished-pieces"
          >
            {getPolishedPieces()}
          </p>
          <p className="text-xs text-morandi-stone-600">
            {t('repertoire:polishedPieces')}
          </p>
        </div>
      </div>
    </div>
  )
}
