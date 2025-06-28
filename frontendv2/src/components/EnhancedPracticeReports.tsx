import { useState, useMemo, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useLogbookStore } from '../stores/logbookStore'
import { reportsCache, ReportsCacheManager } from '../utils/reportsCacheManager'
import Autocomplete from './ui/Autocomplete'
import { useAutocomplete } from '../hooks/useAutocomplete'

// Lazy load the manual entry form
const ManualEntryForm = lazy(() => import('./ManualEntryForm'))

type ReportView = 'overview' | 'pieces' | 'newEntry'
type SortBy = 'mostRecent' | 'mostPracticed' | 'longestSessions'

export default function EnhancedPracticeReports() {
  const { t } = useTranslation(['reports', 'common', 'logbook'])
  const { entries, deleteEntry } = useLogbookStore()
  // Component is always expanded now
  const [reportView, setReportView] = useState<ReportView>('overview')
  const [sortBy, setSortBy] = useState<SortBy>('mostRecent')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)
  const [selectedComposer, setSelectedComposer] = useState<string | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [timePeriod, setTimePeriod] = useState<'all' | 'month' | 'week'>('week')

  // Autocomplete hooks for dynamic search
  const pieceAutocomplete = useAutocomplete({
    type: 'piece',
    composer: selectedComposer || undefined, // Filter by composer if already selected
    minLength: 0, // Show suggestions immediately
  })

  const composerAutocomplete = useAutocomplete({
    type: 'composer',
    minLength: 0, // Show suggestions immediately
  })

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
        // Filter for current month only
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
        // Sort by pieces that appear most frequently
        const pieceFrequency = new Map<string, number>()
        entries.forEach(entry => {
          entry.pieces.forEach(piece => {
            const key = `${piece.composer || 'Unknown'} - ${piece.title}`
            pieceFrequency.set(key, (pieceFrequency.get(key) || 0) + 1)
          })
        })
        filtered.sort((a, b) => {
          const aFreq = Math.max(
            ...a.pieces.map(
              p =>
                pieceFrequency.get(`${p.composer || 'Unknown'} - ${p.title}`) ||
                0
            )
          )
          const bFreq = Math.max(
            ...b.pieces.map(
              p =>
                pieceFrequency.get(`${p.composer || 'Unknown'} - ${p.title}`) ||
                0
            )
          )
          return bFreq - aFreq
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
    selectedDate,
    selectedPiece,
    selectedComposer,
    sortBy,
    timePeriod,
  ])

  // Generate entries hash for cache invalidation
  const entriesHash = useMemo(
    () => ReportsCacheManager.generateEntriesHash(filteredAndSortedEntries),
    [filteredAndSortedEntries]
  )

  // Define analytics type
  interface AnalyticsData {
    todayTotal: number
    todayCount: number
    weekTotal: number
    weekCount: number
    currentStreak: number
    practiceByDay: Map<string, number>
    uniqueComposers: number
    uniquePieces: number
    pieceStats: Map<
      string,
      {
        count: number
        totalDuration: number
        lastPracticed: string
        techniques: Set<string>
      }
    >
  }

  // Calculate analytics with caching
  const analytics = useMemo<AnalyticsData>(() => {
    // Check cache first
    const cached = reportsCache.getAnalytics(
      sortBy,
      selectedDate,
      selectedPiece || selectedComposer,
      entriesHash
    ) as AnalyticsData | null
    if (cached) return cached

    // Calculate analytics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    let todayTotal = 0
    let todayCount = 0
    let weekTotal = 0
    let weekCount = 0

    const practiceByDay = new Map<string, number>()
    const composers = new Set<string>()
    const pieces = new Set<string>()
    const pieceStats = new Map<
      string,
      {
        count: number
        totalDuration: number
        lastPracticed: string
        techniques: Set<string>
      }
    >()

    // Calculate current streak
    const practiceDates = new Set<string>()

    filteredAndSortedEntries.forEach(entry => {
      const entryDate = new Date(entry.timestamp)
      const dateStr = entryDate.toDateString()

      // Track practice days
      practiceDates.add(dateStr)
      practiceByDay.set(
        dateStr,
        (practiceByDay.get(dateStr) || 0) + entry.duration
      )

      // Today's stats
      if (dateStr === today.toDateString()) {
        todayTotal += entry.duration
        todayCount++
      }

      // This week's stats
      if (entryDate >= weekStart) {
        weekTotal += entry.duration
        weekCount++
      }

      // Track composers and pieces
      entry.pieces.forEach(piece => {
        const composer = piece.composer || 'Unknown'
        const pieceKey = `${composer} - ${piece.title}`

        composers.add(composer)
        pieces.add(pieceKey)

        // Update piece stats
        const existing = pieceStats.get(pieceKey) || {
          count: 0,
          totalDuration: 0,
          lastPracticed: entry.timestamp,
          techniques: new Set(),
        }

        existing.count++
        existing.totalDuration += entry.duration
        if (new Date(entry.timestamp) > new Date(existing.lastPracticed)) {
          existing.lastPracticed = entry.timestamp
        }
        entry.techniques.forEach(t => existing.techniques.add(t))

        pieceStats.set(pieceKey, existing)
      })
    })

    // Calculate streak
    let currentStreak = 0
    const sortedDates = Array.from(practiceDates).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )

    if (sortedDates.length > 0 && sortedDates[0] === today.toDateString()) {
      currentStreak = 1
      const checkDate = new Date(today)

      for (let i = 1; i < sortedDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1)
        if (sortedDates[i] === checkDate.toDateString()) {
          currentStreak++
        } else {
          break
        }
      }
    }

    const result: AnalyticsData = {
      todayTotal,
      todayCount,
      weekTotal,
      weekCount,
      currentStreak,
      practiceByDay,
      uniqueComposers: composers.size,
      uniquePieces: pieces.size,
      pieceStats,
    }

    // Cache the result
    reportsCache.setAnalytics(
      sortBy,
      selectedDate,
      selectedPiece || selectedComposer,
      entriesHash,
      result
    )

    return result
  }, [
    filteredAndSortedEntries,
    sortBy,
    selectedDate,
    selectedPiece,
    selectedComposer,
    entriesHash,
  ])

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
    // Show success message
    setShowSuccessMessage(true)

    // Clear editing state
    setEditingEntryId(null)

    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false)
      // Switch to overview tab to show the new entry
      setReportView('overview')
    }, 2000)
  }

  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-morandi-stone-200">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-morandi-stone-100 mx-4 md:mx-6 mt-4 rounded-lg">
          <button
            onClick={() => {
              setReportView('overview')
              // Clear piece/composer filters when switching to overview
              setSelectedPiece(null)
              setSelectedComposer(null)
              pieceAutocomplete.setQuery('')
              composerAutocomplete.setQuery('')
            }}
            className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
              reportView === 'overview'
                ? 'bg-white text-morandi-stone-900 shadow-sm'
                : 'text-morandi-stone-600 hover:text-morandi-stone-900'
            }`}
          >
            <span className="hidden md:inline">📈 </span>
            {t('reports:tabs.overview')}
          </button>
          <button
            onClick={() => setReportView('pieces')}
            className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
              reportView === 'pieces'
                ? 'bg-white text-morandi-stone-900 shadow-sm'
                : 'text-morandi-stone-600 hover:text-morandi-stone-900'
            }`}
          >
            <span className="hidden md:inline">🎵 </span>
            {t('reports:tabs.pieces')}
          </button>
          <button
            onClick={() => {
              setReportView('newEntry')
              // Clear any editing state when switching to new entry tab
              if (reportView !== 'newEntry') {
                setEditingEntryId(null)
                setShowSuccessMessage(false)
              }
            }}
            className={`flex-1 px-2 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
              reportView === 'newEntry'
                ? 'bg-white text-morandi-stone-900 shadow-sm'
                : 'text-morandi-stone-600 hover:text-morandi-stone-900'
            }`}
          >
            <span className="hidden md:inline">➕ </span>
            {t('reports:tabs.newEntry')}
          </button>
        </div>

        {/* Top Section: Selection Criteria & Summary */}
        {reportView !== 'newEntry' && (
          <div className="p-4 md:p-6 border-b border-morandi-stone-200">
            {/* Time Period Filter */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setTimePeriod('all')}
                className={`px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                  timePeriod === 'all'
                    ? 'bg-morandi-sage-500 text-white'
                    : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                }`}
              >
                {t('reports:filters.allTime')}
              </button>
              <button
                onClick={() => setTimePeriod('month')}
                className={`px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                  timePeriod === 'month'
                    ? 'bg-morandi-sage-500 text-white'
                    : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                }`}
              >
                {t('reports:filters.thisMonth')}
              </button>
              <button
                onClick={() => setTimePeriod('week')}
                className={`px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                  timePeriod === 'week'
                    ? 'bg-morandi-sage-500 text-white'
                    : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                }`}
              >
                {t('reports:filters.last7Days')}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Left: Calendar and Filters */}
              <div>
                {/* Calendar Heat Map - shared between overview and pieces */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-morandi-stone-700 mb-3">
                    {t('reports:practiceCalendar')}
                  </h3>
                  {timePeriod === 'week' ? (
                    // Show only 7 days for "Last 7 days"
                    <div className="max-w-sm">
                      {(() => {
                        // Calculate all 7 dates first to avoid issues
                        const today = new Date()
                        today.setHours(0, 0, 0, 0) // Normalize to start of day

                        const weekDates: Date[] = []
                        for (let i = 0; i < 7; i++) {
                          const date = new Date(today)
                          date.setDate(today.getDate() - 6 + i)
                          weekDates.push(date)
                        }

                        return (
                          <>
                            {/* Day headers for week view */}
                            <div className="grid grid-cols-7 gap-1 mb-1">
                              {weekDates.map((date, i) => (
                                <div
                                  key={`header-${i}`}
                                  className="text-center text-xs text-morandi-stone-500 font-medium py-1"
                                >
                                  {date
                                    .toLocaleDateString('en-US', {
                                      weekday: 'short',
                                    })
                                    .charAt(0)}
                                </div>
                              ))}
                            </div>
                            {/* Day cells for week view */}
                            <div className="grid grid-cols-7 gap-1">
                              {weekDates.map((date, i) => {
                                const dateStr = date.toDateString()
                                const practiceMinutes =
                                  analytics.practiceByDay.get(dateStr) || 0
                                const intensity =
                                  practiceMinutes > 0
                                    ? Math.min(practiceMinutes / 60, 1)
                                    : 0
                                const isSelected =
                                  selectedDate &&
                                  new Date(selectedDate).toDateString() ===
                                    dateStr
                                const isToday = today.toDateString() === dateStr

                                return (
                                  <button
                                    key={`day-${i}-${date.getDate()}`}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedDate(null)
                                      } else {
                                        setSelectedDate(date.toISOString())
                                      }
                                    }}
                                    className={`aspect-square rounded transition-all text-sm relative flex flex-col items-center justify-center ${
                                      practiceMinutes > 0
                                        ? intensity > 0.8
                                          ? 'bg-morandi-sage-600 text-white hover:bg-morandi-sage-700'
                                          : intensity > 0.6
                                            ? 'bg-morandi-sage-500 text-white hover:bg-morandi-sage-600'
                                            : intensity > 0.4
                                              ? 'bg-morandi-sage-400 text-morandi-stone-900 hover:bg-morandi-sage-500'
                                              : intensity > 0.2
                                                ? 'bg-morandi-sage-300 text-morandi-stone-900 hover:bg-morandi-sage-400'
                                                : 'bg-morandi-sage-200 text-morandi-stone-900 hover:bg-morandi-sage-300'
                                        : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                                    } ${
                                      isSelected
                                        ? 'ring-2 ring-morandi-sage-700 ring-offset-1'
                                        : ''
                                    } ${
                                      isToday
                                        ? 'font-bold ring-1 ring-morandi-stone-400'
                                        : ''
                                    }`}
                                    title={`${date.toLocaleDateString()}: ${practiceMinutes > 0 ? formatDuration(practiceMinutes) : t('reports:noPractice')}`}
                                  >
                                    <span className="text-base font-semibold leading-tight">
                                      {date.getDate()}
                                    </span>
                                    {practiceMinutes > 0 && (
                                      <span className="text-[10px] opacity-90 font-medium">
                                        {practiceMinutes}m
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  ) : (
                    // Show full month calendar
                    <div className="grid grid-cols-7 gap-1 max-w-sm">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
                        (dayLetter, i) => (
                          <div
                            key={`day-header-${i}`}
                            className="text-center text-xs text-morandi-stone-500 font-medium py-1"
                          >
                            {dayLetter}
                          </div>
                        )
                      )}
                      {(() => {
                        const today = new Date()
                        const firstDay = new Date(
                          today.getFullYear(),
                          today.getMonth(),
                          1
                        )
                        const lastDay = new Date(
                          today.getFullYear(),
                          today.getMonth() + 1,
                          0
                        )
                        const startOffset = firstDay.getDay()
                        const daysInMonth = lastDay.getDate()
                        const totalCells =
                          Math.ceil((startOffset + daysInMonth) / 7) * 7

                        return Array.from({ length: totalCells }, (_, i) => {
                          const dayNumber = i - startOffset + 1
                          const isValidDay =
                            dayNumber > 0 && dayNumber <= daysInMonth

                          if (!isValidDay) {
                            return (
                              <div
                                key={i}
                                className="aspect-square bg-morandi-stone-100"
                              />
                            )
                          }

                          const date = new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            dayNumber
                          )
                          const dateStr = date.toDateString()
                          const practiceMinutes =
                            analytics.practiceByDay.get(dateStr) || 0
                          const intensity =
                            practiceMinutes > 0
                              ? Math.min(practiceMinutes / 60, 1)
                              : 0
                          const isSelected =
                            selectedDate &&
                            new Date(selectedDate).toDateString() === dateStr
                          const isToday = today.toDateString() === dateStr
                          const isFuture = date > today

                          return (
                            <button
                              key={`calendar-day-${i}-${dayNumber}`}
                              onClick={() => {
                                if (!isFuture && isSelected) {
                                  setSelectedDate(null)
                                } else if (!isFuture) {
                                  setSelectedDate(date.toISOString())
                                }
                              }}
                              disabled={isFuture}
                              className={`aspect-square rounded transition-all text-xs relative flex flex-col items-center justify-center ${
                                isFuture
                                  ? 'bg-morandi-stone-100 text-morandi-stone-400 cursor-not-allowed'
                                  : practiceMinutes > 0
                                    ? intensity > 0.8
                                      ? 'bg-morandi-sage-600 text-white hover:bg-morandi-sage-700'
                                      : intensity > 0.6
                                        ? 'bg-morandi-sage-500 text-white hover:bg-morandi-sage-600'
                                        : intensity > 0.4
                                          ? 'bg-morandi-sage-400 text-morandi-stone-900 hover:bg-morandi-sage-500'
                                          : intensity > 0.2
                                            ? 'bg-morandi-sage-300 text-morandi-stone-900 hover:bg-morandi-sage-400'
                                            : 'bg-morandi-sage-200 text-morandi-stone-900 hover:bg-morandi-sage-300'
                                    : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                              } ${
                                isSelected
                                  ? 'ring-2 ring-morandi-sage-700 ring-offset-1'
                                  : ''
                              } ${
                                isToday
                                  ? 'font-bold ring-1 ring-morandi-stone-400'
                                  : ''
                              }`}
                              title={
                                !isFuture
                                  ? `${date.toLocaleDateString()}: ${practiceMinutes > 0 ? formatDuration(practiceMinutes) : t('reports:noPractice')}`
                                  : ''
                              }
                            >
                              <span className="text-base font-semibold leading-tight">
                                {dayNumber}
                              </span>
                              {practiceMinutes > 0 && !isFuture && (
                                <span className="text-[10px] opacity-90 font-medium">
                                  {practiceMinutes}m
                                </span>
                              )}
                            </button>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>

                {selectedDate && (
                  <div className="text-sm text-morandi-stone-600 mb-3">
                    {t('reports:showingDataFor')}{' '}
                    {new Date(selectedDate).toLocaleDateString()}
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="ml-2 text-morandi-sage-600 hover:text-morandi-sage-700"
                    >
                      {t('common:clear')}
                    </button>
                  </div>
                )}

                {/* Filters and Sort Options */}
                {reportView === 'pieces' ? (
                  <>
                    {/* Piece/Composer Filters */}
                    <div className="space-y-3">
                      <div className="relative">
                        <Autocomplete
                          placeholder={t('reports:searchPieces')}
                          value={selectedPiece || ''}
                          onChange={value => {
                            setSelectedPiece(value)
                            pieceAutocomplete.setQuery(value)
                            if (!value) {
                              setSelectedComposer(null) // Clear composer when piece is cleared
                            }
                          }}
                          onSelect={option => {
                            setSelectedPiece(option.label)
                            // If the piece has composer metadata, set it
                            if (option.metadata?.composer) {
                              setSelectedComposer(option.metadata.composer)
                            }
                          }}
                          options={pieceAutocomplete.suggestions}
                          isLoading={pieceAutocomplete.isLoading}
                        />
                        {selectedPiece && (
                          <button
                            onClick={() => {
                              setSelectedPiece(null)
                              setSelectedComposer(null)
                              pieceAutocomplete.setQuery('')
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-morandi-stone-200 rounded"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <Autocomplete
                          placeholder={t('reports:searchComposers')}
                          value={selectedComposer || ''}
                          onChange={value => {
                            setSelectedComposer(value)
                            composerAutocomplete.setQuery(value)
                            if (!value) {
                              setSelectedPiece(null) // Clear piece when composer is cleared
                            }
                          }}
                          onSelect={option => {
                            setSelectedComposer(option.value)
                            setSelectedPiece(null) // Clear piece when composer is selected
                          }}
                          options={composerAutocomplete.suggestions}
                          isLoading={composerAutocomplete.isLoading}
                        />
                        {selectedComposer && (
                          <button
                            onClick={() => {
                              setSelectedComposer(null)
                              composerAutocomplete.setQuery('')
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-morandi-stone-200 rounded"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Sort Options for Overview */
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => setSortBy('mostRecent')}
                      className={`px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                        sortBy === 'mostRecent'
                          ? 'bg-morandi-sage-500 text-white'
                          : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                      }`}
                    >
                      {t('reports:sort.mostRecent')}
                    </button>
                    <button
                      onClick={() => setSortBy('mostPracticed')}
                      className={`px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                        sortBy === 'mostPracticed'
                          ? 'bg-morandi-sage-500 text-white'
                          : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                      }`}
                    >
                      {t('reports:sort.mostPracticed')}
                    </button>
                    <button
                      onClick={() => setSortBy('longestSessions')}
                      className={`px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                        sortBy === 'longestSessions'
                          ? 'bg-morandi-sage-500 text-white'
                          : 'bg-morandi-stone-100 text-morandi-stone-700 hover:bg-morandi-stone-200'
                      }`}
                    >
                      {t('reports:sort.longestSessions')}
                    </button>
                  </div>
                )}
              </div>

              {/* Right: Summary Stats */}
              <div className="space-y-3">
                {/* Unified summary stats for both overview and pieces tabs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-morandi-stone-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-morandi-stone-900">
                      {formatDuration(
                        timePeriod === 'week'
                          ? analytics.weekTotal
                          : timePeriod === 'month'
                            ? (
                                Array.from(
                                  analytics.practiceByDay.entries()
                                ) as [string, number][]
                              )
                                .filter(([date]) => {
                                  const d = new Date(date)
                                  const now = new Date()
                                  return (
                                    d.getMonth() === now.getMonth() &&
                                    d.getFullYear() === now.getFullYear()
                                  )
                                })
                                .reduce((sum, [, mins]) => sum + mins, 0)
                            : (
                                Array.from(
                                  analytics.practiceByDay.values()
                                ) as number[]
                              ).reduce((sum, mins) => sum + mins, 0)
                      )}
                    </p>
                    <p className="text-xs text-morandi-stone-600">
                      {t('reports:totalPractice')}
                    </p>
                  </div>
                  <div className="bg-morandi-stone-100 rounded-lg p-3">
                    <p className="text-2xl font-bold text-morandi-stone-900">
                      {timePeriod === 'week'
                        ? analytics.weekCount
                        : timePeriod === 'month'
                          ? filteredAndSortedEntries.filter(e => {
                              const d = new Date(e.timestamp)
                              const now = new Date()
                              return (
                                d.getMonth() === now.getMonth() &&
                                d.getFullYear() === now.getFullYear()
                              )
                            }).length
                          : entries.length}
                    </p>
                    <p className="text-xs text-morandi-stone-600">
                      {t('reports:sessions')}
                    </p>
                  </div>
                  <div className="bg-morandi-peach-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-morandi-stone-900">
                      {analytics.uniquePieces}
                    </p>
                    <p className="text-xs text-morandi-stone-600">
                      {t('reports:pieces')} {t('reports:practiced')}
                    </p>
                  </div>
                  <div className="bg-morandi-rose-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-morandi-stone-900">
                      {analytics.uniqueComposers}
                    </p>
                    <p className="text-xs text-morandi-stone-600">
                      {t('reports:composers')}
                    </p>
                  </div>
                </div>

                {/* Piece/Composer specific stats - only in pieces view */}
                {reportView === 'pieces' &&
                  (selectedPiece || selectedComposer) && (
                    <div className="bg-morandi-sage-50 rounded-lg p-4 mt-3">
                      {selectedPiece && (
                        <>
                          <h3 className="font-medium text-morandi-stone-900 mb-2">
                            {selectedPiece.split(' - ')[1]}
                          </h3>
                          <p className="text-sm text-morandi-stone-600 mb-3">
                            {selectedPiece.split(' - ')[0]}
                          </p>
                        </>
                      )}
                      {selectedComposer && !selectedPiece && (
                        <h3 className="font-medium text-morandi-stone-900 mb-3">
                          {selectedComposer}
                        </h3>
                      )}

                      {(() => {
                        const stats = selectedPiece
                          ? analytics.pieceStats.get(selectedPiece)
                          : null

                        if (selectedComposer && !selectedPiece) {
                          // Aggregate stats for all pieces by this composer
                          let totalTime = 0
                          let totalSessions = 0
                          const techniques = new Set<string>()
                          let lastPracticed = ''

                          analytics.pieceStats.forEach(
                            (
                              stats: {
                                count: number
                                totalDuration: number
                                lastPracticed: string
                                techniques: Set<string>
                              },
                              pieceKey: string
                            ) => {
                              if (
                                pieceKey.startsWith(selectedComposer + ' - ')
                              ) {
                                totalTime += stats.totalDuration
                                totalSessions += stats.count
                                stats.techniques.forEach((t: string) =>
                                  techniques.add(t)
                                )
                                if (
                                  !lastPracticed ||
                                  new Date(stats.lastPracticed) >
                                    new Date(lastPracticed)
                                ) {
                                  lastPracticed = stats.lastPracticed
                                }
                              }
                            }
                          )

                          return (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:stats.totalPractice')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {formatDuration(totalTime)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:sessions')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {totalSessions}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:stats.avgSession')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {formatDuration(
                                    totalSessions > 0
                                      ? totalTime / totalSessions
                                      : 0
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:lastPracticed')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {lastPracticed
                                    ? new Date(
                                        lastPracticed
                                      ).toLocaleDateString()
                                    : '-'}
                                </p>
                              </div>
                            </div>
                          )
                        }

                        if (stats) {
                          return (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:stats.totalPractice')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {formatDuration(stats.totalDuration)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:sessions')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {stats.count}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:stats.avgSession')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {formatDuration(
                                    stats.totalDuration / stats.count
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-morandi-stone-600">
                                  {t('reports:lastPracticed')}
                                </p>
                                <p className="text-lg font-medium text-morandi-stone-900">
                                  {new Date(
                                    stats.lastPracticed
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          )
                        }

                        return null
                      })()}

                      {/* Technique Progress */}
                      <div className="space-y-2 mt-3">
                        <p className="text-xs text-morandi-stone-600">
                          {t('reports:techniquesPracticed')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const techniques = new Map<string, number>()

                            if (selectedPiece) {
                              const stats =
                                analytics.pieceStats.get(selectedPiece)
                              if (stats) {
                                stats.techniques.forEach((t: string) => {
                                  techniques.set(
                                    t,
                                    (techniques.get(t) || 0) + 1
                                  )
                                })
                              }
                            } else if (selectedComposer) {
                              analytics.pieceStats.forEach(
                                (
                                  stats: {
                                    count: number
                                    totalDuration: number
                                    lastPracticed: string
                                    techniques: Set<string>
                                  },
                                  pieceKey: string
                                ) => {
                                  if (
                                    pieceKey.startsWith(
                                      selectedComposer + ' - '
                                    )
                                  ) {
                                    stats.techniques.forEach((t: string) => {
                                      techniques.set(
                                        t,
                                        (techniques.get(t) || 0) + 1
                                      )
                                    })
                                  }
                                }
                              )
                            }

                            return Array.from(techniques.entries())
                              .sort((a, b) => b[1] - a[1])
                              .map(([technique, count]) => (
                                <span
                                  key={technique}
                                  className="text-xs px-2 py-1 bg-morandi-sage-100 text-morandi-sage-700 rounded-full"
                                >
                                  {technique} ({count})
                                </span>
                              ))
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Section: Content Area */}
        <div className="p-4 md:p-6">
          {reportView === 'overview' && (
            <div className="space-y-3">
              {filteredAndSortedEntries.map(entry => (
                <div
                  key={entry.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded-lg bg-morandi-stone-50 hover:bg-morandi-stone-100 transition-colors"
                >
                  <div className="flex-1 mb-2 md:mb-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                      <p className="font-medium text-morandi-stone-900 text-sm md:text-base">
                        {new Date(entry.timestamp).toLocaleDateString()} •{' '}
                        {formatDuration(entry.duration)}
                      </p>
                      <span className="text-xs px-2 py-0.5 bg-morandi-sage-100 text-morandi-sage-700 rounded-full w-fit">
                        {t(`common:music.${entry.type.toLowerCase()}`)}
                      </span>
                    </div>
                    <p className="text-sm text-morandi-stone-700 mt-1">
                      {entry.pieces
                        .map(p => `${p.title} - ${p.composer || 'Unknown'}`)
                        .join(', ')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-morandi-stone-600">
                      <span>
                        {entry.instrument.toLowerCase() === 'piano'
                          ? '🎹'
                          : '🎸'}{' '}
                        {t(
                          `common:instruments.${entry.instrument.toLowerCase()}`
                        )}
                      </span>
                      {entry.techniques.length > 0 && (
                        <span>• {entry.techniques.join(', ')}</span>
                      )}
                      {entry.mood && (
                        <span>
                          •{' '}
                          {entry.mood === 'EXCITED'
                            ? '😊'
                            : entry.mood === 'SATISFIED'
                              ? '😌'
                              : entry.mood === 'NEUTRAL'
                                ? '😐'
                                : '😔'}{' '}
                          {t(`logbook:mood.${entry.mood.toLowerCase()}`)}
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-morandi-stone-500 mt-1 italic">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 self-end md:self-center">
                    <button
                      onClick={() => handleEditEntry(entry.id)}
                      className="p-1.5 hover:bg-morandi-stone-200 rounded transition-colors"
                      title={t('common:edit')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1.5 hover:bg-morandi-stone-200 rounded transition-colors text-red-600"
                      title={t('common:delete')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reportView === 'pieces' && (
            <div className="space-y-4">
              {/* Piece groups when no filter selected */}
              {!selectedPiece && !selectedComposer && (
                <div className="space-y-4">
                  {(
                    Array.from(analytics.pieceStats.entries()) as [
                      string,
                      {
                        count: number
                        totalDuration: number
                        lastPracticed: string
                        techniques: Set<string>
                      },
                    ][]
                  )
                    .sort((a, b) => {
                      const [, statsA] = a
                      const [, statsB] = b
                      switch (sortBy) {
                        case 'mostPracticed':
                          return statsB.count - statsA.count
                        case 'longestSessions':
                          return statsB.totalDuration - statsA.totalDuration
                        case 'mostRecent':
                        default:
                          return (
                            new Date(statsB.lastPracticed).getTime() -
                            new Date(statsA.lastPracticed).getTime()
                          )
                      }
                    })
                    .map(([pieceKey, stats]) => (
                      <div
                        key={pieceKey}
                        className="bg-morandi-stone-50 rounded-lg p-4 hover:bg-morandi-stone-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedPiece(pieceKey)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-morandi-stone-900">
                              {pieceKey}
                            </h4>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-morandi-stone-600">
                              <span>
                                {stats.count}{' '}
                                {t('reports:sessions').toLowerCase()}
                              </span>
                              <span>
                                • {formatDuration(stats.totalDuration)}{' '}
                                {t('reports:total')}
                              </span>
                              <span>
                                •{' '}
                                {formatDuration(
                                  stats.totalDuration / stats.count
                                )}{' '}
                                {t('reports:avg')}
                              </span>
                              <span>
                                • {t('reports:lastPracticed')}{' '}
                                {new Date(
                                  stats.lastPracticed
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {stats.techniques.size > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Array.from(stats.techniques).map(
                                  (technique: string) => (
                                    <span
                                      key={technique}
                                      className="text-xs px-2 py-1 bg-morandi-sage-100 text-morandi-sage-700 rounded-full"
                                    >
                                      {technique}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                          <svg
                            className="w-5 h-5 text-morandi-stone-400 ml-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Filtered entries */}
              {(selectedPiece || selectedComposer) && (
                <div className="space-y-3">
                  {filteredAndSortedEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="group flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 rounded-lg bg-morandi-stone-50 hover:bg-morandi-stone-100 transition-colors"
                    >
                      <div className="flex-1 mb-2 md:mb-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                          <p className="font-medium text-morandi-stone-900 text-sm md:text-base">
                            {new Date(entry.timestamp).toLocaleDateString()} •{' '}
                            {formatDuration(entry.duration)}
                          </p>
                          <span className="text-xs px-2 py-0.5 bg-morandi-sage-100 text-morandi-sage-700 rounded-full w-fit">
                            {t(`common:music.${entry.type.toLowerCase()}`)}
                          </span>
                        </div>
                        <p className="text-sm text-morandi-stone-700 mt-1">
                          {entry.pieces
                            .map(p => `${p.title} - ${p.composer || 'Unknown'}`)
                            .join(', ')}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-morandi-stone-600">
                          <span>
                            {entry.instrument.toLowerCase() === 'piano'
                              ? '🎹'
                              : '🎸'}{' '}
                            {t(
                              `common:instruments.${entry.instrument.toLowerCase()}`
                            )}
                          </span>
                          {entry.techniques.length > 0 && (
                            <span>• {entry.techniques.join(', ')}</span>
                          )}
                          {entry.mood && (
                            <span>
                              •{' '}
                              {entry.mood === 'EXCITED'
                                ? '😊'
                                : entry.mood === 'SATISFIED'
                                  ? '😌'
                                  : entry.mood === 'NEUTRAL'
                                    ? '😐'
                                    : '😔'}{' '}
                              {t(`logbook:mood.${entry.mood.toLowerCase()}`)}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-morandi-stone-500 mt-1 italic">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 self-end md:self-center">
                        <button
                          onClick={() => handleEditEntry(entry.id)}
                          className="p-1.5 hover:bg-morandi-stone-200 rounded transition-colors"
                          title={t('common:edit')}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 hover:bg-morandi-stone-200 rounded transition-colors text-red-600"
                          title={t('common:delete')}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reportView === 'newEntry' && (
            <div className="space-y-4">
              {/* Success Message */}
              {showSuccessMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-300 ease-in-out transform">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <p className="text-green-700 font-medium">
                      {editingEntryId
                        ? t('logbook:entry.successUpdated')
                        : t('logbook:entry.successAdded')}
                    </p>
                  </div>
                </div>
              )}

              <Suspense
                fallback={
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-purple-600"></div>
                  </div>
                }
              >
                <ManualEntryForm
                  entry={
                    editingEntryId
                      ? entries.find(e => e.id === editingEntryId)
                      : undefined
                  }
                  onSave={handleEntrySaved}
                  onClose={() => {
                    setEditingEntryId(null)
                    setReportView('overview')
                  }}
                />
              </Suspense>
            </div>
          )}
        </div>

        {/* Export Buttons - ONLY in Overview tab */}
        {reportView === 'overview' && (
          <div className="p-3 md:p-4 border-t border-morandi-stone-200 bg-morandi-stone-50">
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(entries, null, 2) // Export ALL entries
                  const dataUri =
                    'data:application/json;charset=utf-8,' +
                    encodeURIComponent(dataStr)
                  const exportFileDefaultName = `practice-report-${new Date().toISOString().split('T')[0]}.json`

                  const linkElement = document.createElement('a')
                  linkElement.setAttribute('href', dataUri)
                  linkElement.setAttribute('download', exportFileDefaultName)
                  linkElement.click()
                }}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-morandi-stone-200 text-morandi-stone-700 rounded-md hover:bg-morandi-stone-300 transition-colors"
              >
                {t('reports:export.exportJSON')}
              </button>
              <button
                onClick={() => {
                  // Generate CSV for ALL entries
                  const headers = [
                    'Date',
                    'Duration (min)',
                    'Type',
                    'Instrument',
                    'Pieces',
                    'Techniques',
                    'Mood',
                    'Notes',
                  ]
                  const rows = entries.map(entry => [
                    new Date(entry.timestamp).toLocaleString(),
                    entry.duration,
                    entry.type,
                    entry.instrument,
                    entry.pieces
                      .map(p => `${p.composer || 'Unknown'} - ${p.title}`)
                      .join('; '),
                    entry.techniques.join(', '),
                    entry.mood || '',
                    entry.notes || '',
                  ])

                  const csvContent = [
                    headers.join(','),
                    ...rows.map(row =>
                      row
                        .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
                        .join(',')
                    ),
                  ].join('\n')

                  const dataUri =
                    'data:text/csv;charset=utf-8,' +
                    encodeURIComponent(csvContent)
                  const exportFileDefaultName = `practice-report-${new Date().toISOString().split('T')[0]}.csv`

                  const linkElement = document.createElement('a')
                  linkElement.setAttribute('href', dataUri)
                  linkElement.setAttribute('download', exportFileDefaultName)
                  linkElement.click()
                }}
                className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm bg-morandi-stone-200 text-morandi-stone-700 rounded-md hover:bg-morandi-stone-300 transition-colors"
              >
                {t('reports:export.exportCSV')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
