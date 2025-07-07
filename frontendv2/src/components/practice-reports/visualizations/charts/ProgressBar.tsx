import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartContainer } from './ChartContainer'
import { ChartConfig } from '../../../../types/reporting'

interface ProgressBarProps {
  data: Array<{
    label: string
    value: number
    target?: number
    color?: string
  }>
  title?: string
  horizontal?: boolean
  showValues?: boolean
  showTargets?: boolean
  className?: string
}

export function ProgressBar({
  data,
  title,
  horizontal = true,
  showValues = true,
  showTargets = false,
  className,
}: ProgressBarProps) {
  const { t } = useTranslation(['reports'])

  const chartData = useMemo(() => {
    // Sort data by value descending
    const sortedData = [...data].sort((a, b) => b.value - a.value)

    // Limit to top 20 items
    const displayData = sortedData.slice(0, 20)

    // Default Morandi colors
    const morandiColors = [
      '#7C9885', // sage
      '#B4A394', // sand
      '#8B7E74', // stone
      '#9FB4CE', // sky
      '#E5C1A6', // peach
    ]

    const datasets = [
      {
        label: t('reports:charts.practiceTime'),
        data: displayData.map(d => d.value),
        backgroundColor: displayData.map(
          (d, i) => d.color || morandiColors[i % morandiColors.length]
        ),
        borderColor: displayData.map(
          (d, i) => d.color || morandiColors[i % morandiColors.length]
        ),
        borderWidth: 1,
      },
    ]

    // Add target dataset if targets are provided
    if (showTargets && displayData.some(d => d.target)) {
      datasets.push({
        label: t('reports:charts.target'),
        data: displayData.map(d => d.target || 0),
        backgroundColor: ['#E5C1A633'],
        borderColor: ['#E5C1A6'],
        borderWidth: 2,
        borderDash: [5, 5],
      })
    }

    return {
      labels: displayData.map(d => d.label),
      datasets,
    }
  }, [data, showTargets, t])

  const config: ChartConfig = {
    type: horizontal ? 'bar' : 'bar',
    dataKey: 'progress',
    options: {
      title: title || t('reports:charts.practiceProgress'),
      showLegend: showTargets,
      showTooltips: true,
      indexAxis: horizontal ? 'y' : 'x',
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: {
              dataset: { label?: string }
              parsed: { x?: number; y?: number }
            }) => {
              const label = context.dataset.label || ''
              const value = context.parsed[horizontal ? 'x' : 'y'] || 0
              return `${label}: ${formatDuration(value)}`
            },
          },
        },
        datalabels: showValues
          ? {
              anchor: 'end' as const,
              align: 'end' as const,
              formatter: (value: number) => formatDuration(value),
              color: '#4B5563',
              font: {
                size: 10,
              },
            }
          : false,
      },
      scales: {
        [horizontal ? 'x' : 'y']: {
          beginAtZero: true,
          title: {
            display: true,
            text: t('reports:charts.duration'),
          },
          ticks: {
            callback: (value: string | number) => formatDuration(Number(value)),
          },
        },
        [horizontal ? 'y' : 'x']: {
          grid: {
            display: false,
          },
          ticks: {
            autoSkip: false,
            maxRotation: horizontal ? 0 : 45,
            minRotation: horizontal ? 0 : 45,
          },
        },
      },
    },
  }

  return (
    <ChartContainer config={config} data={chartData} className={className} />
  )
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
