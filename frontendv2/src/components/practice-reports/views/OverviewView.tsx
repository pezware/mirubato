import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { HeatmapCalendar } from '../visualizations/charts/HeatmapCalendar'
import { ProgressBar } from '../visualizations/charts/ProgressBar'
import { SummaryStats } from '../SummaryStats'
import { RecentEntries } from '../components/RecentEntries'
import { formatDuration } from '../../../utils/dateUtils'
import { useNavigate } from 'react-router-dom'
import { useLogbookStore } from '../../../stores/logbookStore'
import { LogbookEntry } from '../../../api/logbook'

interface OverviewViewProps {
  analytics: EnhancedAnalyticsData
}

export default function OverviewView({ analytics }: OverviewViewProps) {
  const { t } = useTranslation(['reports', 'common'])
  const navigate = useNavigate()
  const { deleteEntry } = useLogbookStore()

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

  // Convert time series data to map for heatmap
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>()
    if (analytics.timeSeriesData) {
      analytics.timeSeriesData.forEach(item => {
        map.set(item.date, item.value)
      })
    }
    return map
  }, [analytics.timeSeriesData])

  // Recent entries calculation removed - handled by RecentEntries component

  return (
    <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 w-full">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Recent Entries - Moved to top */}
        <RecentEntries
          entries={analytics.filteredEntries}
          limit={10}
          onEdit={handleEditEntry}
          onDelete={handleDeleteEntry}
        />

        {/* Summary Statistics */}
        <div className="w-full">
          <SummaryStats
            filteredAndSortedEntries={analytics.filteredEntries}
            formatDuration={formatDuration}
          />
        </div>

        {/* Practice Calendar Heatmap - No label */}
        <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="min-w-[600px]">
            <HeatmapCalendar data={heatmapData} />
          </div>
        </div>

        {/* Progress Indicators */}
        {analytics.progressData && analytics.progressData.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-morandi-stone-700 mb-3">
              {t('reports:practiceGoals')}
            </h3>
            <div className="space-y-3">
              {analytics.progressData.map((progress, index) => (
                <ProgressBar
                  key={index}
                  data={[
                    {
                      label: progress.label,
                      value: progress.current,
                      target: progress.target,
                      color: progress.color,
                    },
                  ]}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
