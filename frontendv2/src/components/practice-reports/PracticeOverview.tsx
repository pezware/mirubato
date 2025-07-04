// This component is currently not used - returns null
// Keeping file to maintain structure but component is disabled

import { AnalyticsData } from '../../hooks/usePracticeAnalytics'
import { LogbookEntry } from '../../api/logbook'

interface PracticeOverviewProps {
  analytics: AnalyticsData
  timePeriod: 'all' | 'month' | 'week'
  entries: LogbookEntry[]
  filteredAndSortedEntries: LogbookEntry[]
  formatDuration: (minutes: number) => string
}

export function PracticeOverview({
  analytics: _analytics,
  timePeriod: _timePeriod,
  entries: _entries,
  filteredAndSortedEntries: _filteredAndSortedEntries,
  formatDuration: _formatDuration,
}: PracticeOverviewProps) {
  // Component disabled - returns null
  return null
}
