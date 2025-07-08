import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type ChartData,
  type TooltipItem,
  type LegendItem,
  type Chart,
} from 'chart.js'
import { ChartContainer } from './ChartContainer'
import { DistributionItem, ChartConfig } from '../../../../types/reporting'

interface DistributionPieProps {
  data: DistributionItem[]
  title?: string
  showPercentages?: boolean
  showLegend?: boolean
  type?: 'pie' | 'donut' | 'instrument' | 'piece' | 'composer'
  className?: string
}

export function DistributionPie({
  data,
  title,
  showPercentages = true,
  showLegend = true,
  type = 'pie',
  className,
}: DistributionPieProps) {
  const chartType = type === 'donut' || type === 'pie' ? type : 'pie'
  const { t } = useTranslation(['reports'])

  const chartData = useMemo<ChartData<'pie'>>(() => {
    // Sort data by value descending
    const sortedData = [...data].sort((a, b) => b.value - a.value)

    // Limit to top 10 items and group the rest as "Other"
    let displayData = sortedData
    if (sortedData.length > 10) {
      const top10 = sortedData.slice(0, 10)
      const otherValue = sortedData
        .slice(10)
        .reduce((sum, item) => sum + item.value, 0)
      const total = sortedData.reduce((sum, item) => sum + item.value, 0)

      displayData = [
        ...top10,
        {
          label: t('reports:charts.other'),
          value: otherValue,
          percentage: (otherValue / total) * 100,
        },
      ]
    }

    // Default Morandi colors
    const morandiColors = [
      '#7C9885', // sage
      '#B4A394', // sand
      '#8B7E74', // stone
      '#9FB4CE', // sky
      '#E5C1A6', // peach
      '#7C9885CC', // sage with opacity
      '#B4A394CC', // sand with opacity
      '#8B7E74CC', // stone with opacity
      '#9FB4CECC', // sky with opacity
      '#E5C1A6CC', // peach with opacity
      '#A0A0A0', // gray for "Other"
    ]

    return {
      labels: displayData.map(d => d.label),
      datasets: [
        {
          data: displayData.map(d => d.value),
          backgroundColor: displayData.map(
            (d, i) => d.color || morandiColors[i % morandiColors.length]
          ),
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    }
  }, [data, t])

  const config: ChartConfig = {
    type: chartType,
    dataKey: 'distribution',
    options: {
      title: title || t('reports:charts.distribution'),
      showLegend: showLegend,
      showTooltips: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'pie'>) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const percentage = (
                (value /
                  (context.dataset.data as number[]).reduce(
                    (a, b) => a + b,
                    0
                  )) *
                100
              ).toFixed(1)
              return showPercentages
                ? `${label}: ${formatDuration(Number(value))} (${percentage}%)`
                : `${label}: ${formatDuration(Number(value))}`
            },
          },
        },
        legend: {
          position: 'right' as const,
          labels: {
            generateLabels: (chart: Chart) => {
              const data = chart.data
              if (data.labels?.length && data.datasets?.length) {
                const dataset = data.datasets[0]
                const total = (dataset.data as number[]).reduce(
                  (a, b) => a + b,
                  0
                )

                return (data.labels as string[]).map((label, i) => {
                  const value = dataset.data[i] as number
                  const percentage = ((value / total) * 100).toFixed(1)

                  return {
                    text: showPercentages ? `${label} (${percentage}%)` : label,
                    fillStyle: Array.isArray(dataset.backgroundColor)
                      ? dataset.backgroundColor[i]
                      : dataset.backgroundColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: dataset.borderWidth,
                    hidden: false,
                    index: i,
                  } as LegendItem
                })
              }
              return []
            },
          },
        },
        datalabels: showPercentages
          ? {
              formatter: (
                value: number,
                context: { dataset: { data: unknown[] } }
              ) => {
                const total = (context.dataset.data as number[]).reduce(
                  (a, b) => a + b,
                  0
                )
                const percentage = ((value / total) * 100).toFixed(0)
                return parseFloat(percentage) > 5 ? `${percentage}%` : ''
              },
              color: '#ffffff',
              font: {
                weight: 'bold' as const,
                size: 12,
              },
            }
          : false,
      },
      cutout: chartType === 'donut' ? '50%' : undefined,
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
