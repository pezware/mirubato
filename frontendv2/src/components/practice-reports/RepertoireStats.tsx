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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-morandi-stone-50 rounded-lg p-2 sm:p-3 flex flex-col justify-center items-center">
          <p
            className="text-lg font-bold text-morandi-stone-900 text-center"
            data-testid="total-pieces"
          >
            {getTotalPieces()}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
            <span className="block sm:hidden">{t('repertoire:total')}</span>
            <span className="hidden sm:block">{t('repertoire:totalPieces')}</span>
          </p>
        </div>

        <div className="bg-morandi-peach-50 rounded-lg p-2 sm:p-3 flex flex-col justify-center items-center">
          <p
            className="text-lg font-bold text-morandi-stone-900 text-center"
            data-testid="active-pieces"
          >
            {getActivePieces()}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
            <span className="block sm:hidden">{t('repertoire:active')}</span>
            <span className="hidden sm:block">{t('repertoire:activePieces')}</span>
          </p>
        </div>

        <div className="bg-morandi-rose-50 rounded-lg p-2 sm:p-3 flex flex-col justify-center items-center">
          <p
            className="text-lg font-bold text-morandi-stone-900 text-center"
            data-testid="polished-pieces"
          >
            {getPolishedPieces()}
          </p>
          <p className="text-xs sm:text-sm text-morandi-stone-600 text-center leading-tight">
            <span className="block sm:hidden">{t('repertoire:polished')}</span>
            <span className="hidden sm:block">{t('repertoire:polishedPieces')}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
