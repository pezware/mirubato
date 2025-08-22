import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Table, BarChart3 } from 'lucide-react'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { SegmentedControl, LoadingSkeleton } from '../../ui'
import type { SegmentOption } from '../../ui'

// Lazy load the actual view components
const DataTableView = lazy(() => import('./DataTableView'))
const AnalyticsView = lazy(() => import('./AnalyticsView'))

interface DataViewProps {
  analytics: EnhancedAnalyticsData
}

type ViewType = 'table' | 'analytics'

export default function DataView({ analytics }: DataViewProps) {
  const { t } = useTranslation(['reports'])
  const [searchParams, setSearchParams] = useSearchParams()

  // Derive view from URL - single source of truth
  const urlView = searchParams.get('view') as ViewType | null
  const activeView: ViewType = urlView === 'analytics' ? 'analytics' : 'table'

  const viewOptions: SegmentOption[] = [
    {
      value: 'table',
      label: t('reports:tabs.table', 'Table'),
      icon: <Table size={16} />,
    },
    {
      value: 'analytics',
      label: t('reports:tabs.analytics'),
      icon: <BarChart3 size={16} />,
    },
  ]

  // Handle view change - directly update URL
  const handleViewChange = (value: string) => {
    const newView = value as ViewType

    // Prevent unnecessary updates
    if (activeView === newView) {
      return
    }

    const newParams = new URLSearchParams(searchParams)
    newParams.set('view', newView)
    setSearchParams(newParams, { replace: true })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 w-full">
      <div className="p-2 sm:p-3 lg:p-4">
        {/* Segmented Control for view selection */}
        <div className="mb-4 sm:mb-6 flex justify-center sm:justify-start">
          <SegmentedControl
            options={viewOptions}
            value={activeView}
            onChange={handleViewChange}
            className="w-full max-w-xs sm:w-auto"
          />
        </div>

        {/* Content Area with smooth transitions */}
        <Suspense
          fallback={
            <div className="min-h-[400px]">
              <LoadingSkeleton className="h-96" />
            </div>
          }
        >
          {activeView === 'table' ? (
            <DataTableView analytics={analytics} />
          ) : (
            <AnalyticsView analytics={analytics} />
          )}
        </Suspense>
      </div>
    </div>
  )
}
