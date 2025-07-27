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
      setSearchParams(newParams, { replace: true })
    }
  }, [activeView, searchParams, setSearchParams])

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
      <div className="p-4 sm:p-6">
        {/* Segmented Control for view selection */}
        <div className="mb-6 flex justify-center sm:justify-start">
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
