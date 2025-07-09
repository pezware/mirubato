import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { GroupedDataTable } from '../visualizations/tables/GroupedDataTable'
import { FilterBuilder } from '../advanced/FilterBuilder'
import { GroupingPanel } from '../advanced/GroupingPanel'
import { useReportingStore } from '../../../stores/reportingStore'
import { Card } from '../../ui/Card'
import { Download, Filter, Layers } from 'lucide-react'
import Button from '../../ui/Button'

interface DataTableViewProps {
  analytics: EnhancedAnalyticsData
}

export default function DataTableView({ analytics }: DataTableViewProps) {
  const { t } = useTranslation(['reports', 'common'])
  const [showFilters, setShowFilters] = useState(false)
  const [showGrouping, setShowGrouping] = useState(false)
  const { filters, groupBy, setGroupBy } = useReportingStore()

  // Set default grouping if none exists
  useEffect(() => {
    if (groupBy.length === 0) {
      setGroupBy([{ field: 'date:month', order: 'desc' }])
    }
  }, [])

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

  return (
    <div className="p-6" data-testid="data-table">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {t('reports:filters.title')}
            {filters.length > 0 && (
              <span className="bg-morandi-purple-600 text-white text-xs rounded-full px-2">
                {filters.length}
              </span>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGrouping(!showGrouping)}
            className="flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            {t('reports:grouping.title')}
            {groupBy.length > 0 && (
              <span className="bg-morandi-sage-600 text-white text-xs rounded-full px-2">
                {groupBy.length}
              </span>
            )}
          </Button>
          <span className="text-sm text-morandi-stone-600">
            {analytics.filteredEntries.length} {t('reports:entries')}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportData}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {t('reports:table.export')}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4 p-4">
          <FilterBuilder />
        </Card>
      )}

      {/* Grouping Panel */}
      {showGrouping && (
        <Card className="mb-4 p-4">
          <GroupingPanel />
        </Card>
      )}

      {/* Data Table */}
      <Card>
        {analytics.groupedData && analytics.groupedData.length > 0 ? (
          <GroupedDataTable data={analytics.groupedData} />
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
      </Card>
    </div>
  )
}
