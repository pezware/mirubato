import { useState, useMemo, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useLogbookStore } from '../stores/logbookStore'
import { useAutocomplete } from '../hooks/useAutocomplete'
import { usePracticeAnalytics } from '../hooks/usePracticeAnalytics'
import { LogbookEntry } from '../api/logbook'
import { ReportsTabs, ReportView } from './practice-reports/ReportsTabs'
import {
  ReportsFilters,
  TimePeriod,
  SortBy,
} from './practice-reports/ReportsFilters'
// import { PracticeOverview } from './practice-reports/PracticeOverview'
import { PiecesStatistics } from './practice-reports/PiecesStatistics'
import { SummaryStats } from './practice-reports/SummaryStats'
import { PieceComposerStats } from './practice-reports/PieceComposerStats'
import { LoadingSkeleton } from './ui/Loading'
import { Trash2, Edit2, Download } from 'lucide-react'
import Button from './ui/Button'

// Lazy load the manual entry form
const ManualEntryForm = lazy(() => import('./ManualEntryForm'))

export default function EnhancedPracticeReports() {
  const { t } = useTranslation(['reports', 'common', 'logbook'])
  const { entries, deleteEntry } = useLogbookStore()

  // State management
  const [reportView, setReportView] = useState<ReportView>('overview')
  const [sortBy, setSortBy] = useState<SortBy>('mostRecent')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)
  const [selectedComposer, setSelectedComposer] = useState<string | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')

  // Autocomplete hooks
  const pieceAutocomplete = useAutocomplete({
    type: 'piece',
    composer: selectedComposer || undefined,
    minLength: 0,
  })

  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 0,
  })

  // Generate entries hash for caching
  const entriesHash = useMemo(() => {
    return entries.map(e => `${e.id}_${e.timestamp}_${e.duration}`).join('_')
  }, [entries])

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = [...entries]

    // Filter by time period
    if (timePeriod !== 'all') {
      const now = new Date()

      if (timePeriod === 'week') {
        const cutoffDate = new Date()
        cutoffDate.setDate(now.getDate() - 7)
        filtered = filtered.filter(e => new Date(e.timestamp) >= cutoffDate)
      } else if (timePeriod === 'month') {
        filtered = filtered.filter(e => {
          const entryDate = new Date(e.timestamp)
          return (
            entryDate.getMonth() === now.getMonth() &&
            entryDate.getFullYear() === now.getFullYear()
          )
        })
      }
    }

    // Filter by selected date
    if (selectedDate) {
      filtered = filtered.filter(e => {
        const entryDate = new Date(e.timestamp).toDateString()
        const filterDate = new Date(selectedDate).toDateString()
        return entryDate === filterDate
      })
    }

    // Filter by piece
    if (selectedPiece) {
      filtered = filtered.filter(e =>
        e.pieces.some(
          p => `${p.composer || 'Unknown'} - ${p.title}` === selectedPiece
        )
      )
    }

    // Filter by composer
    if (selectedComposer) {
      filtered = filtered.filter(e =>
        e.pieces.some(p => (p.composer || 'Unknown') === selectedComposer)
      )
    }

    // Sort based on selected criteria
    switch (sortBy) {
      case 'mostRecent':
        filtered.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        break
      case 'mostPracticed': {
        const pieceFrequency = new Map<string, number>()
        entries.forEach(entry => {
          entry.pieces.forEach(piece => {
            const key = `${piece.composer || 'Unknown'} - ${piece.title}`
            pieceFrequency.set(key, (pieceFrequency.get(key) || 0) + 1)
          })
        })
        filtered.sort((a, b) => {
          const aMax = Math.max(
            ...a.pieces.map(
              p =>
                pieceFrequency.get(`${p.composer || 'Unknown'} - ${p.title}`) ||
                0
            )
          )
          const bMax = Math.max(
            ...b.pieces.map(
              p =>
                pieceFrequency.get(`${p.composer || 'Unknown'} - ${p.title}`) ||
                0
            )
          )
          return bMax - aMax
        })
        break
      }
      case 'longestSessions':
        filtered.sort((a, b) => b.duration - a.duration)
        break
    }

    return filtered
  }, [
    entries,
    timePeriod,
    selectedDate,
    selectedPiece,
    selectedComposer,
    sortBy,
  ])

  // Use analytics hook
  const analytics = usePracticeAnalytics({
    entries: filteredAndSortedEntries,
    sortBy,
    selectedDate,
    selectedPiece,
    selectedComposer,
    entriesHash,
  })

  // Helper functions
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)

    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm(t('logbook:entry.confirmDelete'))) {
      await deleteEntry(entryId)
    }
  }

  const handleEditEntry = (entryId: string) => {
    setEditingEntryId(entryId)
    setReportView('newEntry')
  }

  const handleEntrySaved = () => {
    setShowSuccessMessage(true)
    setEditingEntryId(null)

    setTimeout(() => {
      setShowSuccessMessage(false)
      setReportView('overview')
    }, 2000)
  }

  const handleOverviewClick = () => {
    setSelectedPiece(null)
    setSelectedComposer(null)
    pieceAutocomplete.setQuery('')
    composerAutocomplete.setQuery('')
  }

  const handleViewChange = (view: ReportView) => {
    setReportView(view)
    if (view === 'newEntry' && reportView !== 'newEntry') {
      setEditingEntryId(null)
      setShowSuccessMessage(false)
    }
  }

  // Export functions
  const exportAsJSON = () => {
    const dataToExport = {
      entries: filteredAndSortedEntries.map(entry => ({
        ...entry,
        localDate: new Date(entry.timestamp).toLocaleDateString(),
        localTime: new Date(entry.timestamp).toLocaleTimeString(),
      })),
      exportDate: new Date().toISOString(),
      filters: {
        timePeriod,
        sortBy,
        selectedDate,
        selectedPiece,
        selectedComposer,
      },
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute(
      'download',
      `mirubato-logbook-${new Date().toISOString().split('T')[0]}.json`
    )
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsCSV = () => {
    // Create CSV header
    const headers = [
      'Date',
      'Time',
      'Duration (min)',
      'Type',
      'Instrument',
      'Pieces',
      'Techniques',
      'Mood',
      'Notes',
    ]

    // Convert entries to CSV rows
    const rows = filteredAndSortedEntries.map(entry => {
      const date = new Date(entry.timestamp)
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        entry.duration,
        entry.type,
        entry.instrument,
        entry.pieces
          .map(p => `${p.title}${p.composer ? ` - ${p.composer}` : ''}`)
          .join('; '),
        entry.techniques.join('; '),
        entry.mood || '',
        entry.notes || '',
      ]
    })

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        row
          .map(cell =>
            // Escape cells containing commas or quotes
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
    a.setAttribute('href', url)
    a.setAttribute(
      'download',
      `mirubato-logbook-${new Date().toISOString().split('T')[0]}.csv`
    )
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200">
        {/* Navigation Tabs */}
        <ReportsTabs
          reportView={reportView}
          onViewChange={handleViewChange}
          onOverviewClick={handleOverviewClick}
        />

        {/* Top Section: Filters and Summary Stats */}
        {reportView !== 'newEntry' && (
          <div className="p-4 md:p-6 border-b border-morandi-stone-200">
            <ReportsFilters
              timePeriod={timePeriod}
              setTimePeriod={setTimePeriod}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedPiece={selectedPiece}
              setSelectedPiece={setSelectedPiece}
              selectedComposer={selectedComposer}
              setSelectedComposer={setSelectedComposer}
              sortBy={sortBy}
              setSortBy={setSortBy}
              reportView={reportView}
              pieceAutocomplete={pieceAutocomplete}
              composerAutocomplete={composerAutocomplete}
              analytics={analytics}
            >
              {/* Summary Stats in right column */}
              <div className="space-y-3">
                <SummaryStats
                  analytics={analytics}
                  timePeriod={timePeriod}
                  entries={entries}
                  filteredAndSortedEntries={filteredAndSortedEntries}
                  formatDuration={formatDuration}
                />

                {/* Piece/Composer specific stats - only in pieces view */}
                {reportView === 'pieces' &&
                  (selectedPiece || selectedComposer) && (
                    <PieceComposerStats
                      analytics={analytics}
                      selectedPiece={selectedPiece}
                      selectedComposer={selectedComposer}
                      formatDuration={formatDuration}
                    />
                  )}
              </div>
            </ReportsFilters>
          </div>
        )}

        {/* Main Content Area */}
        {reportView !== 'newEntry' && (
          <div className="p-4 md:p-6">
            {reportView === 'overview' ? (
              <>
                {/* Sort buttons and Export buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy('mostRecent')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        sortBy === 'mostRecent'
                          ? 'bg-morandi-sage-500 text-white'
                          : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                      }`}
                    >
                      {t('reports:sort.mostRecent')}
                    </button>
                    <button
                      onClick={() => setSortBy('mostPracticed')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        sortBy === 'mostPracticed'
                          ? 'bg-morandi-sage-500 text-white'
                          : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                      }`}
                    >
                      {t('reports:sort.mostPracticed')}
                    </button>
                    <button
                      onClick={() => setSortBy('longestSessions')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${
                        sortBy === 'longestSessions'
                          ? 'bg-morandi-sage-500 text-white'
                          : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                      }`}
                    >
                      {t('reports:sort.longestSessions')}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={exportAsJSON}
                      variant="secondary"
                      size="sm"
                      leftIcon={<Download className="w-3 h-3" />}
                      data-testid="export-json-button"
                    >
                      {t('reports:export.exportJSON')}
                    </Button>
                    <Button
                      onClick={exportAsCSV}
                      variant="secondary"
                      size="sm"
                      leftIcon={<Download className="w-3 h-3" />}
                      data-testid="export-csv-button"
                    >
                      {t('reports:export.exportCSV')}
                    </Button>
                  </div>
                </div>

                {/* Recent Entries List */}
                <div>
                  <EntryList
                    entries={filteredAndSortedEntries.slice(0, 10)}
                    onDelete={handleDeleteEntry}
                    onEdit={handleEditEntry}
                  />
                </div>
              </>
            ) : reportView === 'pieces' ? (
              <>
                {/* Show filtered entries if piece/composer is selected */}
                {selectedPiece || selectedComposer ? (
                  <EntryList
                    entries={filteredAndSortedEntries}
                    onDelete={handleDeleteEntry}
                    onEdit={handleEditEntry}
                  />
                ) : (
                  <PiecesStatistics
                    analytics={analytics}
                    selectedPiece={selectedPiece}
                    selectedComposer={selectedComposer}
                    setSelectedPiece={setSelectedPiece}
                    formatDuration={formatDuration}
                  />
                )}
              </>
            ) : null}
          </div>
        )}

        {/* New Entry Form */}
        {reportView === 'newEntry' && (
          <div className="p-4 md:p-6">
            {showSuccessMessage && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">{t('reports:entryCreated')}</p>
              </div>
            )}
            <Suspense fallback={<LoadingSkeleton className="h-96" />}>
              <ManualEntryForm
                onClose={() => setReportView('overview')}
                onSave={handleEntrySaved}
                entry={
                  editingEntryId
                    ? entries.find(e => e.id === editingEntryId)
                    : undefined
                }
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}

// Entry List Component
function EntryList({
  entries,
  onDelete,
  onEdit,
}: {
  entries: LogbookEntry[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}) {
  const { t } = useTranslation(['logbook', 'common'])

  if (entries.length === 0) {
    return (
      <p className="text-sm text-morandi-stone-500 italic">
        {t('logbook:noEntries')}
      </p>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 overflow-hidden">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          data-testid="logbook-entry"
          className={`p-4 hover:bg-morandi-stone-50 transition-colors group ${
            index !== 0 ? 'border-t border-morandi-stone-200' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Date, time, type and instrument badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm text-morandi-stone-700 font-medium">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
                <span className="text-sm text-morandi-stone-500">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="px-2 py-0.5 bg-morandi-sage-100 text-morandi-stone-700 text-xs rounded-full">
                  {entry.type}
                </span>
                <span className="px-2 py-0.5 bg-morandi-sand-100 text-morandi-stone-700 text-xs rounded-full">
                  {entry.instrument === 'PIANO' ? '🎹' : '🎸'}{' '}
                  {entry.instrument}
                </span>
              </div>

              {/* Duration and mood */}
              <div className="flex items-center gap-2 md:gap-4 mb-2">
                <span className="text-morandi-stone-700 text-sm">
                  {t('common:time.minute', { count: entry.duration })}
                </span>
                {entry.mood && (
                  <span className="text-base md:text-lg">
                    {entry.mood === 'FRUSTRATED'
                      ? '😣'
                      : entry.mood === 'NEUTRAL'
                        ? '😐'
                        : entry.mood === 'SATISFIED'
                          ? '😊'
                          : entry.mood === 'EXCITED'
                            ? '🤩'
                            : ''}
                  </span>
                )}
              </div>

              {/* Notes - show on separate line if present */}
              {entry.notes && (
                <p className="text-sm text-morandi-stone-500 mb-2 line-clamp-2">
                  📝 {entry.notes}
                </p>
              )}

              {/* Pieces - shown below if present */}
              {entry.pieces.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-xs md:text-sm font-medium text-morandi-stone-700 mb-1.5">
                    🎵 {t('logbook:entry.pieces')}:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.pieces.map((piece, index) => (
                      <div
                        key={index}
                        className="px-2 py-0.5 bg-morandi-sky-100 text-morandi-stone-700 rounded-full text-xs border border-morandi-sky-200"
                      >
                        {piece.title}
                        {piece.composer && (
                          <span className="text-morandi-stone-600">
                            {' '}
                            - {piece.composer}
                          </span>
                        )}
                        {piece.measures && (
                          <span className="text-morandi-stone-500">
                            {' '}
                            (mm. {piece.measures})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Techniques if present */}
              {entry.techniques.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-xs md:text-sm font-medium text-morandi-stone-700 mb-1.5">
                    ⚡ {t('logbook:entry.techniques')}:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.techniques.map((technique: string) => (
                      <span
                        key={technique}
                        className="px-2 py-0.5 bg-morandi-peach-100 text-morandi-stone-700 rounded-full text-xs"
                      >
                        {technique}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 ml-2 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(entry.id)}
                className="p-1.5 text-morandi-stone-600 hover:text-morandi-stone-800 transition-colors"
                aria-label={t('logbook:entry.editEntry')}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1.5 text-red-600 hover:text-red-800 transition-colors"
                aria-label={t('logbook:entry.deleteEntry')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
