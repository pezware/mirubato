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
    navigate('/logbook?tab=newEntry', { state: { editEntry: entry } })
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

  // Calculate streak data
  const streakData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    const dates = new Set<string>()

    // Sort entries by date (newest first)
    const sortedEntries = [...analytics.filteredEntries].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Track unique practice days
    sortedEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toDateString()
      dates.add(date)
    })

    // Calculate current streak (consecutive days ending today)
    const sortedDates = Array.from(dates)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime())

    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i]
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)

      if (date.toDateString() === expectedDate.toDateString()) {
        currentStreak++
      } else {
        break
      }
    }

    // Calculate max streak
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const diff = sortedDates[i - 1].getTime() - sortedDates[i].getTime()
        const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (daysDiff === 1) {
          tempStreak++
        } else {
          maxStreak = Math.max(maxStreak, tempStreak)
          tempStreak = 1
        }
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak)

    return { currentStreak, maxStreak, totalDays: dates.size }
  }, [analytics.filteredEntries])

  // Recent entries calculation removed - handled by RecentEntries component

  return (
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

      {/* Streak Information */}
      <div className="bg-morandi-sand-50 rounded-lg p-4">
        <h3 className="text-base sm:text-lg font-semibold text-morandi-stone-700 mb-3">
          {t('reports:practiceStreak')}
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-morandi-purple-600">
              {streakData.currentStreak}
            </div>
            <div className="text-xs sm:text-sm text-morandi-stone-600">
              {t('reports:currentStreak')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-morandi-sage-600">
              {streakData.maxStreak}
            </div>
            <div className="text-xs sm:text-sm text-morandi-stone-600">
              {t('reports:longestStreak')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-morandi-rust-600">
              {streakData.totalDays}
            </div>
            <div className="text-xs sm:text-sm text-morandi-stone-600">
              {t('reports:totalDays')}
            </div>
          </div>
        </div>
      </div>

      {/* Practice Calendar Heatmap - No label */}
      <div className="w-full overflow-x-auto">
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
  )
}
