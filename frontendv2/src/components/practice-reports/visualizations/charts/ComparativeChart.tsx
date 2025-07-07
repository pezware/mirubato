import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChartContainer } from './ChartContainer'
import { ComparativeData, ChartConfig } from '../../../../types/reporting'

interface ComparativeChartProps {
  data: ComparativeData[]
  title?: string
  type?: 'bar' | 'line'
  showChange?: boolean
  className?: string
}

export function ComparativeChart({
  data,
  title,
  type = 'bar',
  showChange = true,
  className,
}: ComparativeChartProps) {
  const { t } = useTranslation(['reports'])

  const chartData = useMemo(() => {
    const datasets = []

    // Current values dataset
    datasets.push({
      label: t('reports:charts.current'),
      data: data.map(d => d.current),
      backgroundColor: '#7C9885',
      borderColor: '#7C9885',
      borderWidth: type === 'line' ? 2 : 1,
    })

    // Previous values dataset if available
    if (data.some(d => d.previous !== undefined)) {
      datasets.push({
        label: t('reports:charts.previous'),
        data: data.map(d => d.previous || 0),
        backgroundColor: '#B4A394',
        borderColor: '#B4A394',
        borderWidth: type === 'line' ? 2 : 1,
      })
    }

    // Target values dataset if available
    if (data.some(d => d.target !== undefined)) {
      datasets.push({
        label: t('reports:charts.target'),
        data: data.map(d => d.target || 0),
        backgroundColor: '#E5C1A6',
        borderColor: '#E5C1A6',
        borderWidth: type === 'line' ? 2 : 1,
        borderDash: [5, 5],
      })
    }

    return {
      labels: data.map(d => d.category),
      datasets,
    }
  }, [data, type, t])

  const config: ChartConfig = {
    type: type,
    dataKey: 'comparative',
    options: {
      title: title || t('reports:charts.comparison'),
      showLegend: true,
      showTooltips: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: {
              dataset: { label?: string }
              parsed: { y?: number }
              dataIndex: number
            }) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y || 0
              const dataIndex = context.dataIndex
              const item = data[dataIndex]

              let result = `${label}: ${formatDuration(value)}`

              // Add change information if showing current values
              if (
                showChange &&
                context.dataset.label === t('reports:charts.current') &&
                item.change !== undefined
              ) {
                const changeStr =
                  item.change > 0 ? `+${item.change}` : `${item.change}`
                const changePercent = item.changePercent || 0
                result += ` (${changeStr} min, ${changePercent.toFixed(1)}%)`
              }

              return result
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
          grid: {
            display: false,
          },
        },
      },
    },
  }

  return (
    <div className={className}>
      <ChartContainer config={config} data={chartData} />

      {showChange && data.some(d => d.change !== undefined) && (
        <div className="mt-4 px-4">
          <h4 className="text-sm font-medium text-morandi-stone-700 mb-2">
            {t('reports:charts.changes')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data
              .filter(d => d.change !== undefined)
              .map((item, index) => (
                <ChangeIndicator key={index} item={item} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChangeIndicator({ item }: { item: ComparativeData }) {
  const isPositive = (item.change || 0) > 0
  const changeStr = item.change! > 0 ? `+${item.change}` : `${item.change}`
  const changePercent = item.changePercent || 0

  return (
    <div className="flex items-center justify-between bg-morandi-stone-50 rounded-lg p-2">
      <span className="text-sm text-morandi-stone-700">{item.category}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {changeStr} min
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isPositive
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {changePercent > 0 ? '+' : ''}
          {changePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
