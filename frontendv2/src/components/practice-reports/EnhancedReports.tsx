import { useState, useMemo, lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useLogbookStore } from '../../stores/logbookStore'
import { useReportingStore } from '../../stores/reportingStore'
import { useEnhancedAnalytics } from '../../hooks/useEnhancedAnalytics'
import { LoadingSkeleton } from '../ui/Loading'
import { ReportsTabs, ReportView } from './ReportsTabs'
import { LogbookEntry } from '../../api/logbook'

// Lazy load view components
const OverviewView = lazy(() => import('./views/OverviewView'))
const AnalyticsView = lazy(() => import('./views/AnalyticsView'))
const DataTableView = lazy(() => import('./views/DataTableView'))
const PiecesView = lazy(() => import('./views/PiecesView'))
const ManualEntryForm = lazy(() => import('../ManualEntryForm'))

export default function EnhancedReports() {
  const { t } = useTranslation(['reports', 'common', 'logbook'])
  const { entries } = useLogbookStore()
  const { filters, groupBy, sortBy, clearFilters } = useReportingStore()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // State management
  const [reportView, setReportView] = useState<ReportView>('overview')
  const [isExporting, setIsExporting] = useState(false)
  const [editEntry, setEditEntry] = useState<LogbookEntry | undefined>(
    undefined
  )

  // Handle URL parameters and navigation state
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'newEntry') {
      setReportView('newEntry')
      // Check if we have an entry to edit from navigation state
      if (location.state && 'editEntry' in location.state) {
        setEditEntry(location.state.editEntry as LogbookEntry)
      }
    }
  }, [searchParams, location.state])

  // Update URL when tab changes
  const handleViewChange = (view: ReportView) => {
    setReportView(view)
    if (view === 'newEntry') {
      setSearchParams({ tab: 'newEntry' })
    } else {
      setSearchParams({})
    }
    // Clear edit entry when switching away from newEntry
    if (view !== 'newEntry') {
      setEditEntry(undefined)
    }
  }

  // Generate entries hash for caching
  const entriesHash = useMemo(() => {
    return entries.map(e => `${e.id}_${e.timestamp}_${e.duration}`).join('_')
  }, [entries])

  // Enhanced analytics with filtering, grouping, and sorting
  const analytics = useEnhancedAnalytics({
    entries,
    filters,
    groupBy,
    sortBy,
    entriesHash,
  })

  // Export functionality
  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setIsExporting(true)
    try {
      // Export logic will be implemented based on format
      if (format === 'csv') {
        exportToCSV(analytics.filteredEntries)
      } else if (format === 'json') {
        exportToJSON(analytics.filteredEntries)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = (data: typeof analytics.filteredEntries) => {
    // CSV export implementation (migrated from old component)
    const headers = [
      'Date',
      'Duration',
      'Piece',
      'Composer',
      'Instrument',
      'Notes',
    ]
    const rows = data.map(entry => [
      new Date(entry.timestamp).toLocaleDateString(),
      `${Math.floor(entry.duration / 60)}:${(entry.duration % 60).toString().padStart(2, '0')}`,
      entry.pieces.map(p => p.title).join(', ') || entry.scoreTitle || '',
      entry.pieces
        .map(p => p.composer)
        .filter(Boolean)
        .join(', ') ||
        entry.scoreComposer ||
        '',
      entry.instrument || '',
      entry.notes || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(cell =>
            typeof cell === 'string' &&
            (cell.includes(',') || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mirubato-practice-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToJSON = (data: typeof analytics.filteredEntries) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], {
      type: 'application/json;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mirubato-practice-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render the appropriate view based on selection
  const renderView = () => {
    switch (reportView) {
      case 'overview':
        return <OverviewView analytics={analytics} />
      case 'pieces':
        return <PiecesView analytics={analytics} />
      case 'analytics':
        return <AnalyticsView analytics={analytics} />
      case 'data':
        return <DataTableView analytics={analytics} />
      case 'newEntry':
        return (
          <ManualEntryForm
            entry={editEntry}
            onClose={() => {
              handleViewChange('overview')
              setEditEntry(undefined)
            }}
            onSave={() => {
              handleViewChange('overview')
              setEditEntry(undefined)
            }}
          />
        )
      default:
        return <OverviewView analytics={analytics} />
    }
  }

  return (
    <div>
      {/* Navigation Tabs - Outside the white box to match Toolbox */}
      <ReportsTabs
        reportView={reportView}
        onViewChange={handleViewChange}
        onOverviewClick={() => {
          handleViewChange('overview')
          clearFilters()
        }}
      />

      {/* Main Content Area */}
      {reportView === 'newEntry' ? (
        <Suspense
          fallback={
            <div className="p-6">
              <LoadingSkeleton className="h-96" />
            </div>
          }
        >
          <ManualEntryForm
            onClose={() => setReportView('overview')}
            onSave={() => setReportView('overview')}
          />
        </Suspense>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 w-full">
          {/* Export Controls */}
          <div className="px-4 py-2 border-b border-morandi-stone-200 bg-morandi-sand-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-morandi-stone-600">
                {analytics.filteredEntries.length} {t('reports:entriesFound')}
                {filters.length > 0 && ` (${t('reports:filtered')})`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={
                    isExporting || analytics.filteredEntries.length === 0
                  }
                  className="btn-secondary text-sm"
                  data-testid="export-csv-button"
                >
                  {t('reports:exportCSV')}
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={
                    isExporting || analytics.filteredEntries.length === 0
                  }
                  className="btn-secondary text-sm"
                  data-testid="export-json-button"
                >
                  {t('reports:exportJSON')}
                </button>
              </div>
            </div>
          </div>

          {/* View Content */}
          <div className="relative">
            <Suspense
              fallback={
                <div className="p-6">
                  <LoadingSkeleton className="h-96" />
                </div>
              }
            >
              {renderView()}
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}
