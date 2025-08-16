import { useState, useMemo, lazy, Suspense, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useLogbookStore } from '../../stores/logbookStore'
import { useReportingStore } from '../../stores/reportingStore'
import { useEnhancedAnalytics } from '../../hooks/useEnhancedAnalytics'
import { LoadingSkeleton } from '../ui/Loading'
import { ReportsTabs, ReportView } from './ReportsTabs'
import { LogbookEntry } from '../../api/logbook'

// Lazy load view components (except DataView for immediate response)
const OverviewView = lazy(() => import('./views/OverviewView'))
const RepertoireView = lazy(() => import('../repertoire/RepertoireView'))
const ManualEntryForm = lazy(() => import('../ManualEntryForm'))

// Regular import for DataView to fix double-click issue
import DataView from './views/DataView'

interface EnhancedReportsProps {
  searchQuery?: string
}

export default function EnhancedReports({
  searchQuery = '',
}: EnhancedReportsProps) {
  const { entries, loadEntries } = useLogbookStore()
  const { filters, groupBy, sortBy, clearFilters } = useReportingStore()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // State management
  const [reportView, setReportView] = useState<ReportView>('overview')
  const [editEntry, setEditEntry] = useState<LogbookEntry | undefined>(
    undefined
  )

  // Load entries on mount
  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Handle URL parameters and navigation state
  useEffect(() => {
    const tab = searchParams.get('tab')
    const editId = searchParams.get('editId')

    if (tab === 'newEntry') {
      setReportView('newEntry')

      // First check for entry ID in URL
      if (editId) {
        const entryToEdit = entries.find(e => e.id === editId)
        if (entryToEdit) {
          setEditEntry(entryToEdit)
        }
      }
      // Fallback to navigation state
      else if (location.state && 'editEntry' in location.state) {
        setEditEntry(location.state.editEntry as LogbookEntry)
      }
    } else if (tab === 'repertoire') {
      setReportView('repertoire')
    } else if (tab === 'data') {
      setReportView('data')
    } else if (!tab) {
      // Reset to overview if no tab parameter
      setReportView('overview')
    }
  }, [searchParams, location.state, entries])

  // Update URL when tab changes with navigation guards
  const handleViewChange = (view: ReportView) => {
    // Prevent rapid navigation changes that could cause race conditions
    const currentTab = searchParams.get('tab')

    // If we're already navigating to this view, don't trigger again
    if (
      (view === 'overview' && !currentTab) ||
      (view !== 'overview' && currentTab === view)
    ) {
      return
    }

    console.log(`[Navigation] ${currentTab || 'overview'} → ${view}`)
    setReportView(view)

    // Use a single atomic URL update to prevent conflicts
    const newParams = new URLSearchParams()

    if (view === 'newEntry') {
      // Keep editId if it exists
      const editId = searchParams.get('editId')
      newParams.set('tab', 'newEntry')
      if (editId) {
        newParams.set('editId', editId)
      }
    } else if (view === 'overview') {
      // Clear all params for overview (default view) - newParams is already empty
    } else {
      // Set tab parameter for other views (repertoire, data)
      newParams.set('tab', view)

      // For data view, preserve existing view parameter if it exists
      if (view === 'data') {
        const existingView = searchParams.get('view')
        if (existingView) {
          newParams.set('view', existingView)
        }
      }
    }

    // Apply URL changes atomically
    setSearchParams(newParams, { replace: true })

    // Clear navigation state when switching to overview
    if (view === 'overview') {
      window.history.replaceState({}, document.title)
    }

    // Clear edit entry when switching away from newEntry
    if (view !== 'newEntry') {
      setEditEntry(undefined)
    }
  }

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries

    const query = searchQuery.toLowerCase()
    return entries.filter(entry => {
      // Search in pieces
      const piecesMatch = entry.pieces?.some(
        piece =>
          piece.title?.toLowerCase().includes(query) ||
          piece.composer?.toLowerCase().includes(query)
      )

      // Search in notes
      const notesMatch = entry.notes?.toLowerCase().includes(query)

      // Search in techniques
      const techniquesMatch = entry.techniques?.some(technique =>
        technique.toLowerCase().includes(query)
      )

      // Search in type (e.g., "lesson", "practice", etc.)
      const typeMatch = entry.type?.toLowerCase().includes(query)

      // Search in instrument
      const instrumentMatch = entry.instrument?.toLowerCase().includes(query)

      return (
        piecesMatch ||
        notesMatch ||
        techniquesMatch ||
        typeMatch ||
        instrumentMatch
      )
    })
  }, [entries, searchQuery])

  // Generate entries hash for caching
  const entriesHash = useMemo(() => {
    return filteredEntries
      .map(e => `${e.id}_${e.timestamp}_${e.duration}`)
      .join('_')
  }, [filteredEntries])

  // Enhanced analytics with filtering, grouping, and sorting
  const analytics = useEnhancedAnalytics({
    entries: filteredEntries,
    filters,
    groupBy,
    sortBy,
    entriesHash,
  })

  // Render the appropriate view based on selection
  const renderView = () => {
    switch (reportView) {
      case 'overview':
        return <OverviewView analytics={analytics} />
      case 'repertoire':
        return <RepertoireView analytics={analytics} />
      case 'data':
        return <DataView analytics={analytics} />
      case 'newEntry':
        return (
          <ManualEntryForm
            entry={editEntry}
            onClose={() => {
              setSearchParams({})
              setReportView('overview')
              setEditEntry(undefined)
            }}
            onSave={() => {
              setSearchParams({})
              setReportView('overview')
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
            <div className="p-3 sm:p-4">
              <LoadingSkeleton className="h-96" />
            </div>
          }
        >
          <ManualEntryForm
            entry={editEntry}
            onClose={() => {
              setSearchParams({})
              setReportView('overview')
              setEditEntry(undefined)
            }}
            onSave={() => {
              setSearchParams({})
              setReportView('overview')
              setEditEntry(undefined)
            }}
          />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <div className="p-3 sm:p-4">
              <LoadingSkeleton className="h-96" />
            </div>
          }
        >
          {renderView()}
        </Suspense>
      )}
    </div>
  )
}
