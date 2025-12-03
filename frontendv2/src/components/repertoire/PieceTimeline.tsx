import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ChartData,
  type TooltipItem,
  type ChartDataset,
  type ChartOptions,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { Card } from '@/components/ui'
import { ArrowRight } from 'lucide-react'
import {
  format,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns'

interface PracticeSession {
  id: string
  timestamp: string | number
  duration: number
  type: string
  notes?: string
}

interface StatusChange {
  timestamp: string
  oldStatus: string
  newStatus: string
}

interface PieceTimelineProps {
  sessions: PracticeSession[]
  personalNotes?: string
  className?: string
}

type PeriodType = 'day' | 'week' | 'month'

// Morandi color scheme
const MORANDI_SAGE = '#7C9885'
const MORANDI_STONE_100 = 'rgb(245, 243, 241)'

export function PieceTimeline({
  sessions,
  personalNotes,
  className = '',
}: PieceTimelineProps) {
  const { t, i18n } = useTranslation(['repertoire', 'reports', 'common'])
  const [period, setPeriod] = useState<PeriodType>('day')

  // Parse status changes from personal notes
  const statusChanges = useMemo<StatusChange[]>(() => {
    if (!personalNotes) return []

    const statusChangeRegex =
      /\[STATUS_CHANGE:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z):([^:]+):([^\]]+)\]/g
    const changes: StatusChange[] = []
    let match

    while ((match = statusChangeRegex.exec(personalNotes)) !== null) {
      changes.push({
        timestamp: match[1],
        oldStatus: match[2],
        newStatus: match[3],
      })
    }

    return changes.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [personalNotes])

  // Group sessions by period
  const chartData = useMemo<ChartData<'bar'>>(() => {
    if (sessions.length === 0) {
      return { labels: [], datasets: [] }
    }

    // Get date range
    const dates = sessions.map(s => new Date(s.timestamp))
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // Generate all periods in range
    let periodDates: Date[]
    switch (period) {
      case 'week':
        periodDates = eachWeekOfInterval(
          { start: minDate, end: maxDate },
          { weekStartsOn: 0 }
        )
        break
      case 'month':
        periodDates = eachMonthOfInterval({ start: minDate, end: maxDate })
        break
      default:
        periodDates = eachDayOfInterval({ start: minDate, end: maxDate })
    }

    // Group sessions by period
    const grouped = new Map<string, number>()
    periodDates.forEach(d => {
      const key = getPeriodKey(d, period)
      grouped.set(key, 0)
    })

    sessions.forEach(session => {
      const date = new Date(session.timestamp)
      const key = getPeriodKey(date, period)
      grouped.set(key, (grouped.get(key) || 0) + session.duration)
    })

    // Convert to sorted arrays
    const sortedKeys = Array.from(grouped.keys()).sort()
    const values = sortedKeys.map(k => grouped.get(k) || 0)

    // Create datasets
    const datasets: ChartDataset<'bar', number[]>[] = [
      {
        label: t('reports:charts.practiceTime'),
        data: values,
        backgroundColor: MORANDI_SAGE,
        borderColor: MORANDI_SAGE,
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ]

    return {
      labels: sortedKeys.map(k => formatPeriodLabel(k, period, i18n.language)),
      datasets,
    }
  }, [sessions, period, t, i18n.language])

  // Find status change positions for annotations
  const statusChangeAnnotations = useMemo(() => {
    if (statusChanges.length === 0 || !chartData.labels?.length) return []

    return statusChanges
      .map(change => {
        const changeDate = new Date(change.timestamp)
        const key = getPeriodKey(changeDate, period)
        const index = (chartData.labels as string[])?.findIndex(
          label => label === formatPeriodLabel(key, period, i18n.language)
        )
        if (index === -1) return null

        return {
          ...change,
          index,
          key,
        }
      })
      .filter(Boolean)
  }, [statusChanges, chartData.labels, period, i18n.language])

  // Chart options
  const chartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          titleFont: {
            family: 'Inter, system-ui, sans-serif',
            size: 13,
            weight: 600,
          },
          bodyFont: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
          },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            title: (contexts: TooltipItem<'bar'>[]) => {
              if (contexts.length === 0) return ''
              return contexts[0].label || ''
            },
            label: (context: TooltipItem<'bar'>) => {
              const value = context.parsed.y || 0
              return `${t('reports:charts.practiceTime')}: ${formatDuration(value)}`
            },
            afterBody: (contexts: TooltipItem<'bar'>[]) => {
              if (contexts.length === 0) return []
              const index = contexts[0].dataIndex

              // Check if there's a status change at this index
              const change = statusChangeAnnotations.find(
                c => c?.index === index
              )
              if (change) {
                const oldLabel = t(`repertoire:status.${change.oldStatus}`)
                const newLabel = t(`repertoire:status.${change.newStatus}`)
                return ['', `📌 ${oldLabel} → ${newLabel}`]
              }
              return []
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 10,
            },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: MORANDI_STONE_100,
          },
          ticks: {
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 11,
            },
            callback: (value: string | number) => formatDuration(Number(value)),
          },
        },
      },
    }),
    [t, statusChangeAnnotations]
  )

  // Period selector buttons
  const periodOptions: { value: PeriodType; label: string }[] = [
    { value: 'day', label: t('reports:presets.dailyShort') },
    { value: 'week', label: t('reports:presets.weeklyShort') },
    { value: 'month', label: t('reports:presets.monthlyShort') },
  ]

  if (sessions.length === 0) {
    return null
  }

  return (
    <Card className={className} padding="md">
      <div className="space-y-4">
        {/* Header with title and period selector */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-morandi-stone-700 uppercase tracking-wider">
            {t('repertoire:timeline.title')}
          </h3>
          <div className="flex gap-1 bg-morandi-stone-100 rounded-lg p-0.5">
            {periodOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === option.value
                    ? 'bg-white text-morandi-stone-900 shadow-sm'
                    : 'text-morandi-stone-600 hover:text-morandi-stone-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="h-48" data-testid="piece-timeline-chart">
          <Chart type="bar" data={chartData} options={chartOptions} />
        </div>

        {/* Status change legend */}
        {statusChanges.length > 0 && (
          <div className="border-t border-morandi-stone-200 pt-3">
            <div className="text-xs text-morandi-stone-500 mb-2">
              {t('repertoire:timeline.statusChanges')}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-morandi-stone-50 rounded text-xs"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusStyle(change.oldStatus)}`}
                  >
                    {t(`repertoire:status.${change.oldStatus}`)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-morandi-stone-400" />
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusStyle(change.newStatus)}`}
                  >
                    {t(`repertoire:status.${change.newStatus}`)}
                  </span>
                  <span className="text-morandi-stone-400 ml-1">
                    {formatDate(change.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// Helper functions
function getPeriodKey(date: Date, period: PeriodType): string {
  switch (period) {
    case 'week':
      return format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd')
    case 'month':
      return format(startOfMonth(date), 'yyyy-MM')
    default:
      return format(date, 'yyyy-MM-dd')
  }
}

function formatPeriodLabel(
  key: string,
  period: PeriodType,
  _locale: string
): string {
  try {
    const date = parseISO(period === 'month' ? `${key}-01` : key)
    switch (period) {
      case 'week':
        return format(date, 'MMM d')
      case 'month':
        return format(date, 'MMM')
      default:
        return format(date, 'MMM d')
    }
  } catch {
    return key
  }
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function formatDate(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'MMM d')
  } catch {
    return ''
  }
}

function getStatusStyle(status: string): string {
  switch (status) {
    case 'learning':
      return 'bg-green-100 text-green-700'
    case 'polished':
      return 'bg-blue-100 text-blue-700'
    case 'dropped':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-stone-100 text-stone-600'
  }
}
