import { useState, useMemo, lazy, Suspense, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useLogbookStore } from '../../stores/logbookStore'
import { useReportingStore } from '../../stores/reportingStore'
import { useEnhancedAnalytics } from '../../hooks/useEnhancedAnalytics'
import { LoadingSkeleton } from '../ui/Loading'
import { ReportsTabs, ReportView } from './ReportsTabs'
import { LogbookEntry } from '../../api/logbook'

// Lazy load view components
const OverviewView = lazy(() => import('./views/OverviewView'))
const DataView = lazy(() => import('./views/DataView'))
const RepertoireView = lazy(() => import('../repertoire/RepertoireView'))
const ManualEntryForm = lazy(() => import('../ManualEntryForm'))

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

  // Update URL when tab changes
  const handleViewChange = (view: ReportView) => {
    setReportView(view)

    if (view === 'newEntry') {
      // Keep editId if it exists
      const editId = searchParams.get('editId')
      if (editId) {
        setSearchParams({ tab: 'newEntry', editId })
      } else {
        setSearchParams({ tab: 'newEntry' })
      }
    } else if (view === 'overview') {
      // Clear URL params for overview (default view)
      setSearchParams({})
      // Clear navigation state when switching away
      window.history.replaceState({}, document.title)
    } else {
      // Set tab parameter for other views (repertoire, data)
      setSearchParams({ tab: view })
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
            <div className="p-4 sm:p-6">
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
            <div className="p-4 sm:p-6">
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
