import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { EnhancedAnalyticsData } from '../../../types/reporting'
import { HeatmapCalendar } from '../visualizations/charts/HeatmapCalendar'
import { ProgressBar } from '../visualizations/charts/ProgressBar'
import { SummaryStats } from '../SummaryStats'
import { LogbookSplitView } from '../../logbook/LogbookSplitView'
import { formatDuration } from '../../../utils/dateUtils'
import { useLogbookStore } from '../../../stores/logbookStore'

interface OverviewViewProps {
  analytics: EnhancedAnalyticsData
}

export default function OverviewView({ analytics }: OverviewViewProps) {
  const { t } = useTranslation(['reports', 'common'])
  const { loadEntries } = useLogbookStore()

  // Handle updates
  const handleUpdate = useCallback(() => {
    loadEntries()
  }, [loadEntries])

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

  return (
    <div className="space-y-4">
      {/* Full width top section */}
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Summary Statistics */}
        <div className="w-full">
          <SummaryStats
            filteredAndSortedEntries={analytics.filteredEntries}
            formatDuration={formatDuration}
            analytics={analytics}
          />
        </div>

        {/* Practice Calendar Heatmap */}
        <div className="w-full">
          <HeatmapCalendar data={heatmapData} />
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

      {/* Split view section for practice logs */}
      <LogbookSplitView
        entries={analytics.filteredEntries}
        onUpdate={handleUpdate}
        showTimeline={false}
      />
    </div>
  )
}
