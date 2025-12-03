import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { type ChartData, type TooltipItem, type ChartDataset } from 'chart.js'
import { ChartContainer } from './ChartContainer'
import { TimeSeriesData, ChartConfig } from '../../../../types/reporting'
import { formatDuration } from '../../../ui'
import {
  format,
  startOfWeek,
  startOfMonth,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
} from 'date-fns'

interface PracticeTrendChartProps {
  data: TimeSeriesData[]
  period: 'day' | 'week' | 'month' | 'year'
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

  const chartData = useMemo<ChartData<'bar'>>(() => {
    // Group data by period
    const groupedData = groupDataByPeriod(data, period)

    // Fill in missing dates
    const filledData = fillMissingDates(groupedData, period)

    // Sort by date
    const sortedData = filledData.sort((a, b) => a.date.localeCompare(b.date))

    // Create chart datasets
    const datasets: ChartDataset<'bar', number[]>[] = [
      {
        label: t('reports:charts.practiceTime'),
        data: sortedData.map(d => d.value),
        borderColor: '#7C9885',
        backgroundColor: '#7C9885',
        borderWidth: 1,
        borderRadius: 4,
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
        backgroundColor: 'rgba(180, 163, 148, 0.7)',
        borderWidth: 1,
        borderRadius: 4,
      } as ChartDataset<'bar', number[]>)
    }

    // Add goal line if specified
    if (showGoalLine) {
      datasets.push({
        label: t('reports:charts.goal'),
        data: sortedData.map(() => showGoalLine),
        borderColor: '#E5C1A6',
        backgroundColor: 'rgba(229, 193, 166, 0.5)',
        borderWidth: 2,
        borderRadius: 2,
      } as ChartDataset<'bar', number[]>)
    }

    return {
      labels: sortedData.map(d => formatDateLabel(d.date, period)),
      datasets,
    }
  }, [data, period, showMovingAverage, showGoalLine, t])

  const config: ChartConfig = {
    type: 'bar',
    dataKey: 'practiceTime',
    options: {
      title: t('reports:charts.practiceTrend'),
      showLegend: true,
      showTooltips: true,
      plugins: {
        tooltip: {
          callbacks: {
            title: (contexts: TooltipItem<'bar'>[]) => {
              if (contexts.length === 0) return ''
              const context = contexts[0]
              const dateLabel = chartData.labels?.[context.dataIndex] as string

              // Find the original date for this data point
              const sortedData =
                data.length > 0 ? groupDataByPeriod(data, period) : []
              const filledData = fillMissingDates(sortedData, period)
              const sortedFilledData = filledData.sort((a, b) =>
                a.date.localeCompare(b.date)
              )

              if (context.dataIndex < sortedFilledData.length) {
                const originalDate = sortedFilledData[context.dataIndex].date
                return formatTooltipTitle(originalDate, period)
              }

              return dateLabel || ''
            },
            label: (context: TooltipItem<'bar'>) => {
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
  period: 'day' | 'week' | 'month' | 'year'
): TimeSeriesData[] {
  const grouped = new Map<string, number>()

  data.forEach(item => {
    // Skip items with invalid dates
    if (!item.date || item.date === '') return

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
      case 'year':
        key = format(date, 'yyyy-01-01')
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
  period: 'day' | 'week' | 'month' | 'year'
): TimeSeriesData[] {
  if (data.length === 0) return []

  // Filter out any entries with undefined or null dates
  const validDates = data
    .map(d => d.date)
    .filter((date): date is string => date != null && date !== '')
    .sort()

  if (validDates.length === 0) return []

  const startDate = parseISO(validDates[0])
  const endDate = parseISO(validDates[validDates.length - 1])

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
        case 'year':
          return date.getMonth() === 0 && date.getDate() === 1 // Only January 1st for year view
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
  period: 'day' | 'week' | 'month' | 'year'
): string {
  const d = parseISO(date)

  switch (period) {
    case 'day':
      return format(d, 'MMM d')
    case 'week':
      return `Week of ${format(d, 'MMM d')}`
    case 'month':
      return format(d, 'MMM yyyy')
    case 'year':
      return format(d, 'yyyy')
  }
}

function formatTooltipTitle(
  date: string,
  period: 'day' | 'week' | 'month' | 'year'
): string {
  const d = parseISO(date)

  switch (period) {
    case 'day':
      return format(d, 'MMM d, yyyy')
    case 'week': {
      const weekStart = startOfWeek(d)
      const weekEnd = endOfWeek(d)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
    case 'month':
      return format(d, 'MMMM yyyy')
    case 'year':
      return format(d, 'yyyy')
    default:
      return format(d, 'MMM d, yyyy')
  }
}
