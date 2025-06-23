import { useState, useMemo } from 'react'
import { useLogbookStore } from '../stores/logbookStore'

type TimeFilter = '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'allTime'

export default function LogbookReports() {
  const { entries } = useLogbookStore()
  const [isOpen, setIsOpen] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30days')

  // Filter entries based on time
  const filteredEntries = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )

    switch (timeFilter) {
      case '7days':
        const sevenDaysAgo = new Date(startOfToday)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return entries.filter(e => new Date(e.timestamp) >= sevenDaysAgo)

      case '30days':
        const thirtyDaysAgo = new Date(startOfToday)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return entries.filter(e => new Date(e.timestamp) >= thirtyDaysAgo)

      case 'thisMonth':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return entries.filter(e => new Date(e.timestamp) >= startOfMonth)

      case 'lastMonth':
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        )
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return entries.filter(e => {
          const date = new Date(e.timestamp)
          return date >= startOfLastMonth && date < startOfThisMonth
        })

      case 'allTime':
      default:
        return entries
    }
  }, [entries, timeFilter])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalMinutes = filteredEntries.reduce((sum, e) => sum + e.duration, 0)
    const totalSessions = filteredEntries.length
    const avgDuration =
      totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0

    // Calculate practice streak
    const sortedEntries = [...filteredEntries].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    let currentStreak = 0
    if (sortedEntries.length > 0) {
      const today = new Date().toDateString()
      const lastPractice = new Date(sortedEntries[0].timestamp).toDateString()

      if (
        today === lastPractice ||
        new Date().getTime() - new Date(sortedEntries[0].timestamp).getTime() <
          48 * 60 * 60 * 1000
      ) {
        currentStreak = 1

        for (let i = 1; i < sortedEntries.length; i++) {
          const prevDate = new Date(sortedEntries[i - 1].timestamp)
          const currDate = new Date(sortedEntries[i].timestamp)
          const dayDiff = Math.floor(
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (dayDiff <= 1) {
            currentStreak++
          } else {
            break
          }
        }
      }
    }

    // Pieces practiced
    const piecesMap = new Map<string, number>()
    filteredEntries.forEach(entry => {
      entry.pieces.forEach(piece => {
        const key = piece.title
        piecesMap.set(key, (piecesMap.get(key) || 0) + 1)
      })
    })

    const topPieces: Array<[string, number]> = Array.from(piecesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Instrument breakdown
    const instrumentBreakdown = filteredEntries.reduce(
      (acc, entry) => {
        acc[entry.instrument] = (acc[entry.instrument] || 0) + entry.duration
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalSessions,
      avgDuration,
      currentStreak,
      topPieces,
      instrumentBreakdown,
    }
  }, [filteredEntries])

  if (!isOpen) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setIsOpen(true)}
          className="text-morandi-sage-600 hover:text-morandi-sage-700 text-sm font-medium"
        >
          View Reports →
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-light text-morandi-stone-700">
          Practice Reports
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-morandi-stone-500 hover:text-morandi-stone-700"
        >
          ✕
        </button>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '7days', label: 'Last 7 days' },
          { value: '30days', label: 'Last 30 days' },
          { value: 'thisMonth', label: 'This month' },
          { value: 'lastMonth', label: 'Last month' },
          { value: 'allTime', label: 'All time' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTimeFilter(value as TimeFilter)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              timeFilter === value
                ? 'bg-morandi-sage-400 text-white'
                : 'bg-morandi-stone-100 text-morandi-stone-600 hover:bg-morandi-stone-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-morandi-sage-100 rounded-lg p-4">
          <div className="text-2xl font-light text-morandi-stone-700">
            {stats.totalHours}h
          </div>
          <div className="text-sm text-morandi-stone-600">Total Practice</div>
        </div>
        <div className="bg-morandi-sky-100 rounded-lg p-4">
          <div className="text-2xl font-light text-morandi-stone-700">
            {stats.totalSessions}
          </div>
          <div className="text-sm text-morandi-stone-600">Sessions</div>
        </div>
        <div className="bg-morandi-sand-100 rounded-lg p-4">
          <div className="text-2xl font-light text-morandi-stone-700">
            {stats.avgDuration}m
          </div>
          <div className="text-sm text-morandi-stone-600">Avg Duration</div>
        </div>
        <div className="bg-morandi-blush-100 rounded-lg p-4">
          <div className="text-2xl font-light text-morandi-stone-700">
            {stats.currentStreak}
          </div>
          <div className="text-sm text-morandi-stone-600">Day Streak</div>
        </div>
      </div>

      {/* Top Pieces */}
      {stats.topPieces.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
            Most Practiced Pieces
          </h4>
          <div className="space-y-2">
            {stats.topPieces.map(([title, count]) => (
              <div key={title} className="flex justify-between items-center">
                <span className="text-sm text-morandi-stone-600">{title}</span>
                <span className="text-sm text-morandi-stone-500">
                  {count} sessions
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrument Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-morandi-stone-700 mb-3">
          Time by Instrument
        </h4>
        <div className="space-y-2">
          {Object.entries(stats.instrumentBreakdown).map(
            ([instrument, minutes]) => (
              <div
                key={instrument}
                className="flex justify-between items-center"
              >
                <span className="text-sm text-morandi-stone-600">
                  {instrument === 'PIANO' ? '🎹 Piano' : '🎸 Guitar'}
                </span>
                <span className="text-sm text-morandi-stone-500">
                  {(minutes / 60).toFixed(1)}h
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Export Options */}
      <div className="mt-6 pt-6 border-t border-morandi-stone-200">
        <div className="flex gap-2">
          <button
            onClick={() => {
              const data = JSON.stringify(filteredEntries, null, 2)
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `mirubato-export-${new Date().toISOString().split('T')[0]}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="btn-secondary text-sm"
          >
            Export JSON
          </button>
          <button
            onClick={() => {
              // Simple CSV export
              const headers = [
                'Date',
                'Duration (min)',
                'Type',
                'Instrument',
                'Pieces',
                'Notes',
              ]
              const rows = filteredEntries.map(e => [
                new Date(e.timestamp).toLocaleDateString(),
                e.duration,
                e.type,
                e.instrument,
                e.pieces.map(p => p.title).join('; '),
                e.notes || '',
              ])

              const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n')

              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `mirubato-export-${new Date().toISOString().split('T')[0]}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="btn-secondary text-sm"
          >
            Export CSV
          </button>
        </div>
      </div>
    </div>
  )
}
