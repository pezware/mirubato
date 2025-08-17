import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { GroupedDataTable } from '../visualizations/tables/GroupedDataTable'
import { PeriodPresets } from '../advanced/PeriodPresets'
import { PracticeTrendChart } from '../visualizations/charts/PracticeTrendChart'
import { useLogbookStore } from '../../../stores/logbookStore'
import Button from '../../ui/Button'
import { Card } from '../../ui/Card'
import { LogbookEntry } from '../../../api/logbook'
import { calculateTimeSeriesDataByPeriod } from '../../../hooks/useEnhancedAnalytics'
import LogbookEntryList from '../../LogbookEntryList'

interface DataTableViewProps {
  analytics: EnhancedAnalyticsData
}

export default function DataTableView({ analytics }: DataTableViewProps) {
  const { t } = useTranslation(['reports', 'common', 'logbook'])
  const navigate = useNavigate()
  // Always use presets mode - no toggle needed
  // Removed unused state variables
  const [presetData, setPresetData] = useState<LogbookEntry[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<
    'daily' | 'week' | 'month' | 'year'
  >('daily')
  const { deleteEntry, entries } = useLogbookStore()

  // Handle preset data changes
  const handlePresetDataChange = useCallback(
    (
      filteredData: LogbookEntry[],
      period: 'daily' | 'week' | 'month' | 'year'
    ) => {
      setPresetData(filteredData)
      setSelectedPeriod(period)
    },
    []
  )

  // Handle entry updates (for the practice logs table)
  const handleEntryUpdate = useCallback(() => {
    // This will trigger a re-render to show updated entries
    // The useLogbookStore will automatically update the entries
  }, [])

  // Always use preset data
  const currentData = presetData

  // Calculate chart data from filtered preset data, grouped by selected period
  const chartData = useMemo(() => {
    if (presetData.length > 0) {
      return calculateTimeSeriesDataByPeriod(presetData, selectedPeriod)
    }
    return analytics.timeSeriesData || []
  }, [presetData, selectedPeriod, analytics.timeSeriesData])

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

  const exportToCSV = (data: typeof analytics.filteredEntries) => {
    // CSV export implementation - add safety check
    if (!data || !Array.isArray(data)) {
      console.warn('No data available for CSV export')
      return
    }

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
    // JSON export implementation - add safety check
    if (!data || !Array.isArray(data)) {
      console.warn('No data available for JSON export')
      return
    }

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

  // Removed chartViewOptions - no longer needed

  return (
    <div data-testid="data-table">
      {/* Period Presets Section */}
      <Card className="mb-4 sm:mb-6" padding="sm">
        <PeriodPresets
          entries={entries}
          onDataChange={handlePresetDataChange}
        />
      </Card>

      {/* Combined Chart and Table View */}
      {currentData.length > 0 && (
        <>
          {/* Chart Section */}
          <Card className="mb-4 sm:mb-6" padding="sm">
            <h3 className="text-base sm:text-lg font-semibold text-morandi-stone-700 mb-3 sm:mb-4">
              {t('reports:presets.practiceOverview')}
            </h3>
            <PracticeTrendChart data={chartData} period={selectedPeriod} />
          </Card>
        </>
      )}

      {/* Practice Logs Table - Shows all entries independent of filters */}
      <Card className="mb-4 sm:mb-6" padding="sm">
        <h3 className="text-base sm:text-lg font-semibold text-morandi-stone-700 mb-3 sm:mb-4">
          {t('reports:practiceLogsList')}
        </h3>
        <LogbookEntryList entries={entries} onUpdate={handleEntryUpdate} />
      </Card>

      {/* Export Controls */}
      <div className="relative z-20 flex gap-2 w-full sm:w-auto mb-6 pb-2 justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            exportToCSV(currentData.length > 0 ? currentData : entries)
          }
          disabled={entries.length === 0}
          className="flex-1 sm:flex-initial min-h-[44px]"
          data-testid="export-csv-button"
        >
          {t('reports:exportCSV')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            exportToJSON(currentData.length > 0 ? currentData : entries)
          }
          disabled={entries.length === 0}
          className="flex-1 sm:flex-initial min-h-[44px]"
          data-testid="export-json-button"
        >
          {t('reports:exportJSON')}
        </Button>
      </div>

      {/* Data Table */}
      {analytics.groupedData && analytics.groupedData.length > 0 && (
        <GroupedDataTable
          data={analytics.groupedData}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
        />
      )}
    </div>
  )
}
