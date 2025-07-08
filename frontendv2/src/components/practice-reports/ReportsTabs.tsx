import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'

export type ReportView =
  | 'overview'
  | 'pieces'
  | 'analytics'
  | 'data'
  | 'newEntry'

interface ReportsTabsProps {
  reportView: ReportView
  onViewChange: (view: ReportView) => void
  onOverviewClick?: () => void
}

export function ReportsTabs({
  reportView,
  onViewChange,
  onOverviewClick,
}: ReportsTabsProps) {
  const { t } = useTranslation(['reports'])

  return (
    <div className="flex gap-1 p-1 bg-morandi-stone-100 mx-4 md:mx-6 mt-4 rounded-lg">
      <Button
        onClick={() => {
          onViewChange('overview')
          onOverviewClick?.()
        }}
        data-testid="overview-tab"
        variant="ghost"
        className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
          reportView === 'overview'
            ? 'bg-white text-morandi-stone-900 shadow-sm'
            : 'text-morandi-stone-600 hover:text-morandi-stone-900'
        }`}
      >
        <span className="hidden md:inline">📈 </span>
        {t('reports:tabs.overview')}
      </Button>
      <Button
        onClick={() => onViewChange('pieces')}
        data-testid="pieces-tab"
        variant="ghost"
        className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
          reportView === 'pieces'
            ? 'bg-white text-morandi-stone-900 shadow-sm'
            : 'text-morandi-stone-600 hover:text-morandi-stone-900'
        }`}
      >
        <span className="hidden md:inline">🎵 </span>
        {t('reports:tabs.pieces')}
      </Button>
      <Button
        onClick={() => onViewChange('analytics')}
        data-testid="analytics-tab"
        variant="ghost"
        className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
          reportView === 'analytics'
            ? 'bg-white text-morandi-stone-900 shadow-sm'
            : 'text-morandi-stone-600 hover:text-morandi-stone-900'
        }`}
      >
        <span className="hidden md:inline">📊 </span>
        {t('reports:tabs.analytics')}
      </Button>
      <Button
        onClick={() => onViewChange('data')}
        data-testid="data-tab"
        variant="ghost"
        className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
          reportView === 'data'
            ? 'bg-white text-morandi-stone-900 shadow-sm'
            : 'text-morandi-stone-600 hover:text-morandi-stone-900'
        }`}
      >
        <span className="hidden md:inline">📋 </span>
        {t('reports:tabs.data')}
      </Button>
      <Button
        onClick={() => onViewChange('newEntry')}
        data-testid="new-entry-tab"
        variant="ghost"
        className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
          reportView === 'newEntry'
            ? 'bg-white text-morandi-stone-900 shadow-sm'
            : 'text-morandi-stone-600 hover:text-morandi-stone-900'
        }`}
      >
        <span className="hidden md:inline">➕ </span>
        {t('reports:tabs.newEntry')}
      </Button>
    </div>
  )
}
