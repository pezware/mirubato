import { useState, useEffect, lazy, Suspense } from 'react'
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

  // Get view from URL or default to 'table'
  const urlView = searchParams.get('view') as ViewType | null
  const [activeView, setActiveView] = useState<ViewType>(urlView || 'table')

  // Update URL when view changes
  useEffect(() => {
    const currentView = searchParams.get('view')
    if (currentView !== activeView) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('view', activeView)

      // DataView should always ensure tab=data since it's the Data tab
      newParams.set('tab', 'data')

      setSearchParams(newParams, { replace: true })
    }
  }, [activeView, searchParams, setSearchParams])

  // Ensure URL has both tab=data and view parameters when component mounts
  useEffect(() => {
    const tab = searchParams.get('tab')
    const view = searchParams.get('view')

    // If DataView is mounted, ensure we have tab=data and a view parameter
    if (tab !== 'data' || !view) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('tab', 'data')
      newParams.set('view', activeView)
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - dependencies intentionally omitted

  // Remember last selected view in localStorage
  useEffect(() => {
    if (!urlView) {
      const savedView = localStorage.getItem(
        'mirubato.dataView'
      ) as ViewType | null
      if (savedView === 'table' || savedView === 'analytics') {
        setActiveView(savedView)
      }
    }
  }, [urlView])

  useEffect(() => {
    localStorage.setItem('mirubato.dataView', activeView)
  }, [activeView])

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 w-full">
      <div className="p-2 sm:p-3 lg:p-4">
        {/* Segmented Control for view selection */}
        <div className="mb-4 sm:mb-6 flex justify-center sm:justify-start">
          <SegmentedControl
            options={viewOptions}
            value={activeView}
            onChange={value => setActiveView(value as ViewType)}
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
            <div className="animate-fade-in">
              <DataTableView analytics={analytics} />
            </div>
          ) : (
            <div className="animate-fade-in">
              <AnalyticsView analytics={analytics} />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  )
}
