import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { GroupedDataTable } from '../visualizations/tables/GroupedDataTable'
import { FilterBuilder } from '../advanced/FilterBuilder'
import { GroupingPanel } from '../advanced/GroupingPanel'
import { useReportingStore } from '../../../stores/reportingStore'
import { useLogbookStore } from '../../../stores/logbookStore'
import { Download, Filter, Layers } from 'lucide-react'
import Button from '../../ui/Button'
import { LogbookEntry } from '../../../api/logbook'

interface DataTableViewProps {
  analytics: EnhancedAnalyticsData
}

export default function DataTableView({ analytics }: DataTableViewProps) {
  const { t } = useTranslation(['reports', 'common', 'logbook'])
  const navigate = useNavigate()
  const [showFilters, setShowFilters] = useState(false)
  const [showGrouping, setShowGrouping] = useState(false)
  const { filters, groupBy, setGroupBy } = useReportingStore()
  const { deleteEntry } = useLogbookStore()

  // Set default grouping if none exists
  useEffect(() => {
    if (groupBy.length === 0) {
      setGroupBy([{ field: 'date:month', order: 'desc' }])
    }
  }, [groupBy.length, setGroupBy])

  // Handlers for entry actions
  const handleEditEntry = (entry: LogbookEntry) => {
    // Navigate to edit tab with entry data
    navigate(`/logbook?tab=newEntry&editId=${entry.id}`, {
      state: { editEntry: entry },
    })
  }

  const handleDeleteEntry = async (entry: LogbookEntry) => {
    if (window.confirm(t('logbook:entry.confirmDelete'))) {
      await deleteEntry(entry.id)
    }
  }

  const handleExportData = () => {
    // Export grouped data functionality
    const data = analytics.groupedData || analytics.filteredEntries
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `practice-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToCSV = (data: typeof analytics.filteredEntries) => {
    // CSV export implementation
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
          .map(cell => {
            if (typeof cell === 'string') {
              // Check if cell needs to be quoted (contains comma, quote, or newline)
              if (
                cell.includes(',') ||
                cell.includes('"') ||
                cell.includes('\n') ||
                cell.includes('\r')
              ) {
                // Escape quotes by doubling them
                const escapedCell = cell.replace(/"/g, '""')
                // Return quoted cell with newlines preserved
                return `"${escapedCell}"`
              }
            }
            return cell
          })
          .join(',')
      ),
    ].join('\r\n') // Use Windows-style line endings for better compatibility

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 w-full">
      <div className="p-4 sm:p-6" data-testid="data-table">
        {/* Entry count and Export - Always visible */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-morandi-stone-200">
          <div className="text-sm text-morandi-stone-600 opacity-0">
            {analytics.filteredEntries.length} {t('reports:entries')}
            {filters.length > 0 && ` (${t('reports:filtered')})`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(analytics.filteredEntries)}
              disabled={analytics.filteredEntries.length === 0}
              className="btn-secondary text-xs sm:text-sm px-2 sm:px-4 flex-1 sm:flex-initial"
              data-testid="export-csv-button"
            >
              {t('reports:exportCSV')}
            </button>
            <button
              onClick={() => exportToJSON(analytics.filteredEntries)}
              disabled={analytics.filteredEntries.length === 0}
              className="btn-secondary text-xs sm:text-sm px-2 sm:px-4 flex-1 sm:flex-initial"
              data-testid="export-json-button"
            >
              {t('reports:exportJSON')}
            </button>
          </div>
        </div>

        {/* Controls - Stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Filter className="w-4 h-4" />
              <span>{t('reports:filters.title')}</span>
              {filters.length > 0 && (
                <span className="bg-morandi-purple-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {filters.length}
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowGrouping(!showGrouping)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Layers className="w-4 h-4" />
              <span>{t('reports:grouping.title')}</span>
              {groupBy.length > 0 && (
                <span className="bg-morandi-sage-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {groupBy.length}
                </span>
              )}
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            <span>{t('reports:table.export')}</span>
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4">
            <FilterBuilder />
          </div>
        )}

        {/* Grouping Panel */}
        {showGrouping && (
          <div className="mb-4">
            <GroupingPanel />
          </div>
        )}

        {/* Data Table */}
        {analytics.groupedData && analytics.groupedData.length > 0 ? (
          <GroupedDataTable
            data={analytics.groupedData}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">{t('reports:table.noData')}</p>
            <p className="text-sm text-gray-400">
              {analytics.filteredEntries.length > 0
                ? t('reports:applyGroupingToSeeData')
                : t('reports:noEntriesFound')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
