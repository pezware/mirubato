import { useTranslation } from 'react-i18next'
import { Tabs } from '../ui'
import { TrendingUp, Music, BarChart3, Table, Plus } from 'lucide-react'

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

  const tabs = [
    {
      id: 'overview',
      label: t('reports:tabs.overview'),
      icon: <TrendingUp size={20} />,
      shortLabel: t('reports:tabs.overview'),
    },
    {
      id: 'newEntry',
      label: t('reports:tabs.newEntry'),
      icon: <Plus size={20} />,
      shortLabel: t('reports:tabs.new', 'New'),
    },
    {
      id: 'pieces',
      label: t('reports:tabs.pieces'),
      icon: <Music size={20} />,
      shortLabel: t('reports:tabs.pieces'),
    },
    {
      id: 'analytics',
      label: t('reports:tabs.analytics'),
      icon: <BarChart3 size={20} />,
      shortLabel: t('reports:tabs.analytics'),
    },
    {
      id: 'data',
      label: t('reports:tabs.data'),
      icon: <Table size={20} />,
      shortLabel: t('reports:tabs.data'),
    },
  ]

  const handleTabChange = (tabId: string) => {
    if (tabId === 'overview') {
      onViewChange('overview')
      onOverviewClick?.()
    } else {
      onViewChange(tabId as ReportView)
    }
  }

  return (
    <Tabs
      tabs={tabs}
      activeTab={reportView}
      onTabChange={handleTabChange}
      className="mb-6"
    />
  )
}
