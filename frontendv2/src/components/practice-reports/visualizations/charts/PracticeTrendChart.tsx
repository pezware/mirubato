import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartContainer } from './ChartContainer'
import { TimeSeriesData, ChartConfig } from '../../../../types/reporting'
import {
  format,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  parseISO,
} from 'date-fns'

interface PracticeTrendChartProps {
  data: TimeSeriesData[]
  period: 'day' | 'week' | 'month'
  showMovingAverage?: boolean
  showGoalLine?: number
  className?: string
}

export function PracticeTrendChart({
  data,
  period,
  showMovingAverage = false,
  showGoalLine,
  className,
}: PracticeTrendChartProps) {
  const { t } = useTranslation(['reports'])

  const chartData = useMemo(() => {
    // Group data by period
    const groupedData = groupDataByPeriod(data, period)

    // Fill in missing dates
    const filledData = fillMissingDates(groupedData, period)

    // Sort by date
    const sortedData = filledData.sort((a, b) => a.date.localeCompare(b.date))

    // Create chart datasets
    const datasets = [
      {
        label: t('reports:charts.practiceTime'),
        data: sortedData.map(d => d.value),
        borderColor: '#7C9885',
        backgroundColor: '#7C988533',
        tension: 0.4,
        fill: true,
      },
    ]

    // Add moving average if requested
    if (showMovingAverage && sortedData.length > 7) {
      const movingAvg = calculateMovingAverage(
        sortedData.map(d => d.value),
        7
      )
      datasets.push({
        label: t('reports:charts.movingAverage'),
        data: movingAvg,
        borderColor: '#B4A394',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
      })
    }

    // Add goal line if specified
    if (showGoalLine) {
      datasets.push({
        label: t('reports:charts.goal'),
        data: sortedData.map(() => showGoalLine),
        borderColor: '#E5C1A6',
        backgroundColor: 'transparent',
        borderDash: [10, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0,
        fill: false,
      })
    }

    return {
      labels: sortedData.map(d => formatDateLabel(d.date, period)),
      datasets,
    }
  }, [data, period, showMovingAverage, showGoalLine, t])

  const config: ChartConfig = {
    type: 'line',
    dataKey: 'practiceTime',
    options: {
      title: t('reports:charts.practiceTrend'),
      showLegend: true,
      showTooltips: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: {
              dataset: { label?: string }
              parsed: { y?: number }
            }) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y || 0
              return `${label}: ${formatDuration(value)}`
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: t('reports:charts.duration'),
          },
          ticks: {
            callback: (value: string | number) => formatDuration(Number(value)),
          },
        },
        x: {
          title: {
            display: true,
            text: t('reports:charts.date'),
          },
        },
      },
    },
  }

  return (
    <ChartContainer config={config} data={chartData} className={className} />
  )
}

// Helper functions
function groupDataByPeriod(
  data: TimeSeriesData[],
  period: 'day' | 'week' | 'month'
): TimeSeriesData[] {
  const grouped = new Map<string, number>()

  data.forEach(item => {
    const date = parseISO(item.date)
    let key: string

    switch (period) {
      case 'day':
        key = format(date, 'yyyy-MM-dd')
        break
      case 'week':
        key = format(startOfWeek(date), 'yyyy-MM-dd')
        break
      case 'month':
        key = format(startOfMonth(date), 'yyyy-MM-dd')
        break
    }

    grouped.set(key, (grouped.get(key) || 0) + item.value)
  })

  return Array.from(grouped.entries()).map(([date, value]) => ({
    date,
    value,
  }))
}

function fillMissingDates(
  data: TimeSeriesData[],
  period: 'day' | 'week' | 'month'
): TimeSeriesData[] {
  if (data.length === 0) return []

  const dates = data.map(d => d.date).sort()
  const startDate = parseISO(dates[0])
  const endDate = parseISO(dates[dates.length - 1])

  // Create a map for quick lookup
  const dataMap = new Map(data.map(d => [d.date, d.value]))

  // Generate all dates in range
  const allDates = eachDayOfInterval({ start: startDate, end: endDate })
    .filter(date => {
      switch (period) {
        case 'week':
          return date.getDay() === 0 // Only Sundays for week view
        case 'month':
          return date.getDate() === 1 // Only first day of month
        default:
          return true // All days for day view
      }
    })
    .map(date => format(date, 'yyyy-MM-dd'))

  // Fill in missing dates with 0
  return allDates.map(date => ({
    date,
    value: dataMap.get(date) || 0,
  }))
}

function calculateMovingAverage(values: number[], window: number): number[] {
  const result: number[] = []

  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(values[i])
    } else {
      const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(Math.round(sum / window))
    }
  }

  return result
}

function formatDateLabel(
  date: string,
  period: 'day' | 'week' | 'month'
): string {
  const d = parseISO(date)

  switch (period) {
    case 'day':
      return format(d, 'MMM d')
    case 'week':
      return `Week of ${format(d, 'MMM d')}`
    case 'month':
      return format(d, 'MMM yyyy')
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
