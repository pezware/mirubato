/**
 * LogbookReports Component - Collapsible reporting section for Logbook page
 *
 * Provides analytics and reporting functionality with multiple pivot views
 * Follows universal access principle (works for all users)
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  LogbookReportData,
  ReportFilters,
  ReportExportOptions,
} from '../modules/analytics/types'
import { useModules } from '../contexts/ModulesContext'
import { Instrument } from '@mirubato/shared/types'

type ReportView = 'overview' | 'repertoire' | 'time' | 'categories'
type TimePeriod = 'week' | 'month' | 'quarter' | 'year'
type CategoryType = 'tag' | 'technique' | 'instrument'

export interface LogbookReportsProps {
  className?: string
}

export const LogbookReports: React.FC<LogbookReportsProps> = ({
  className = '',
}) => {
  const { reportingModule } = useModules()
  const [isExpanded, setIsExpanded] = useState(false)
  const [reportData, setReportData] = useState<LogbookReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // View state
  const [currentView, setCurrentView] = useState<ReportView>('overview')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  const [categoryType, setCategoryType] = useState<CategoryType>('tag')

  // Filters
  const [filters, setFilters] = useState<ReportFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  const loadReportData = useCallback(async () => {
    if (!reportingModule) return

    setLoading(true)
    setError(null)
    try {
      const data = await reportingModule.generateLogbookReport(filters)
      setReportData(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load report data'
      )
    } finally {
      setLoading(false)
    }
  }, [reportingModule, filters])

  // Load report data when expanded or filters change
  useEffect(() => {
    if (isExpanded && reportingModule) {
      loadReportData()
    }
  }, [isExpanded, reportingModule, loadReportData])

  const handleExport = async (format: 'csv' | 'json') => {
    if (!reportingModule || !reportData) return

    try {
      const pivot = getPivotFromView(currentView)
      const options: ReportExportOptions = {
        format,
        pivot,
        filters,
        includeSummary: true,
      }

      const result = await reportingModule.exportReport(options)

      if (result.success && result.data && result.filename) {
        // Create download link
        const blob =
          typeof result.data === 'string'
            ? new Blob([result.data], {
                type: format === 'csv' ? 'text/csv' : 'application/json',
              })
            : result.data

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        setError(result.error || 'Export failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const getPivotFromView = (view: ReportView): ReportExportOptions['pivot'] => {
    switch (view) {
      case 'repertoire':
        return 'repertoire'
      case 'time':
        return timePeriod === 'week' ? 'week' : 'month'
      case 'categories':
        return categoryType
      default:
        return 'repertoire'
    }
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Time range options
  const getTimeRangeOptions = (): Array<{
    label: string
    value: ReportFilters['timeRange']
  }> => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return [
      { label: 'All Time', value: undefined },
      {
        label: 'Last 7 Days',
        value: {
          start: today.getTime() - 7 * 24 * 60 * 60 * 1000,
          end: now.getTime(),
        },
      },
      {
        label: 'Last 30 Days',
        value: {
          start: today.getTime() - 30 * 24 * 60 * 60 * 1000,
          end: now.getTime(),
        },
      },
      {
        label: 'This Month',
        value: {
          start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
          end: now.getTime(),
        },
      },
      {
        label: 'Last Month',
        value: {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
          end: new Date(now.getFullYear(), now.getMonth(), 0).getTime(),
        },
      },
    ]
  }

  if (!reportingModule) {
    return null
  }

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">📊</span>
          <h3 className="text-lg font-semibold text-gray-900">
            Reports & Analytics
          </h3>
        </div>
        <span
          className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* View Selector */}
            <div className="flex space-x-2">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'repertoire', label: 'Repertoire' },
                { key: 'time', label: 'Timeline' },
                { key: 'categories', label: 'Categories' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCurrentView(key as ReportView)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    currentView === key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Export and Filter buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
              >
                🔍 Filters
              </button>

              <div className="relative">
                <select
                  onChange={e => {
                    const timeRange = getTimeRangeOptions().find(
                      opt => opt.label === e.target.value
                    )?.value
                    setFilters(prev => ({ ...prev, timeRange }))
                  }}
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-sm"
                  defaultValue="All Time"
                >
                  {getTimeRangeOptions().map(({ label }) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleExport('csv')}
                disabled={!reportData || loading}
                className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                📁 CSV
              </button>

              <button
                onClick={() => handleExport('json')}
                disabled={!reportData || loading}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                📄 JSON
              </button>
            </div>
          </div>

          {/* Additional filters */}
          {showFilters && (
            <div className="p-3 bg-gray-50 rounded space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Instrument filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instruments
                  </label>
                  <select
                    multiple
                    value={filters.instruments || []}
                    onChange={e => {
                      const instruments = Array.from(
                        e.target.selectedOptions,
                        option => option.value as Instrument
                      )
                      setFilters(prev => ({
                        ...prev,
                        instruments:
                          instruments.length > 0 ? instruments : undefined,
                      }))
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="PIANO">Piano</option>
                    <option value="GUITAR">Guitar</option>
                  </select>
                </div>

                {/* Type filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Types
                  </label>
                  <select
                    multiple
                    value={filters.types || []}
                    onChange={e => {
                      const types = Array.from(
                        e.target.selectedOptions,
                        option => option.value
                      ) as ReportFilters['types']
                      setFilters(prev => ({
                        ...prev,
                        types: types && types.length > 0 ? types : undefined,
                      }))
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="practice">Practice</option>
                    <option value="lesson">Lesson</option>
                    <option value="performance">Performance</option>
                    <option value="rehearsal">Rehearsal</option>
                  </select>
                </div>

                {/* Mood filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Moods
                  </label>
                  <select
                    multiple
                    value={
                      filters.moods?.filter(
                        (mood): mood is NonNullable<typeof mood> => mood != null
                      ) || []
                    }
                    onChange={e => {
                      const moods = Array.from(
                        e.target.selectedOptions,
                        option => option.value
                      ).filter(Boolean) as NonNullable<
                        ReportFilters['moods']
                      >[number][]
                      setFilters(prev => ({
                        ...prev,
                        moods:
                          moods && moods.length > 0
                            ? (moods as ReportFilters['moods'])
                            : undefined,
                      }))
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="frustrated">😤 Frustrated</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="satisfied">😊 Satisfied</option>
                    <option value="excited">😃 Excited</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="min-h-[200px]">
            {loading && (
              <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading report data...</div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="text-red-700">Error: {error}</div>
                <button
                  onClick={loadReportData}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {reportData && !loading && !error && (
              <div className="space-y-4">
                {/* Overview */}
                {currentView === 'overview' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-sm text-blue-600 font-medium">
                        Total Practice Time
                      </div>
                      <div className="text-xl font-bold text-blue-800">
                        {formatDuration(reportData.overall.totalDuration)}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600 font-medium">
                        Sessions
                      </div>
                      <div className="text-xl font-bold text-green-800">
                        {reportData.overall.totalSessions}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-sm text-purple-600 font-medium">
                        Avg Session
                      </div>
                      <div className="text-xl font-bold text-purple-800">
                        {formatDuration(
                          reportData.overall.averageSessionDuration
                        )}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="text-sm text-orange-600 font-medium">
                        Practice Streak
                      </div>
                      <div className="text-xl font-bold text-orange-800">
                        {reportData.overall.practiceStreak} days
                      </div>
                    </div>
                  </div>
                )}

                {/* Repertoire View */}
                {currentView === 'repertoire' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Practice by Piece
                    </h4>
                    <div className="overflow-hidden border border-gray-200 rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">
                              Piece
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">
                              Composer
                            </th>
                            <th className="px-3 py-2 text-right font-medium text-gray-900">
                              Time
                            </th>
                            <th className="px-3 py-2 text-right font-medium text-gray-900">
                              Sessions
                            </th>
                            <th className="px-3 py-2 text-right font-medium text-gray-900">
                              Avg
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {reportData.byRepertoire
                            .slice(0, 10)
                            .map((piece, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-900">
                                  {piece.piece.title}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {piece.piece.composer || '-'}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-900">
                                  {formatDuration(piece.totalDuration)}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                  {piece.sessionCount}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                  {formatDuration(piece.averageDuration)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Time View */}
                {currentView === 'time' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">
                        Practice by {timePeriod}
                      </h4>
                      <div className="space-x-2">
                        {['week', 'month'].map(period => (
                          <button
                            key={period}
                            onClick={() => setTimePeriod(period as TimePeriod)}
                            className={`px-2 py-1 rounded text-xs ${
                              timePeriod === period
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(timePeriod === 'week'
                        ? reportData.byWeek
                        : reportData.byMonth
                      )
                        .slice(0, 8)
                        .map((period, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="font-medium text-gray-900">
                              {period.period}
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900">
                                {formatDuration(period.totalDuration)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {period.sessionCount} sessions
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Categories View */}
                {currentView === 'categories' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">
                        Practice by {categoryType}
                      </h4>
                      <div className="space-x-2">
                        {['tag', 'technique', 'instrument'].map(type => (
                          <button
                            key={type}
                            onClick={() =>
                              setCategoryType(type as CategoryType)
                            }
                            className={`px-2 py-1 rounded text-xs ${
                              categoryType === type
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(categoryType === 'tag'
                        ? reportData.byTag
                        : categoryType === 'technique'
                          ? reportData.byTechnique
                          : reportData.byInstrument
                      )
                        .slice(0, 10)
                        .map((category, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="font-medium text-gray-900">
                              {category.category}
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900">
                                {formatDuration(category.totalDuration)}
                              </div>
                              <div className="text-sm text-gray-600">
                                {category.sessionCount} sessions •{' '}
                                {category.pieceCount} pieces
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LogbookReports
