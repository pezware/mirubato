import { useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartType as ChartJSType,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { Card } from '../../../ui/Card'
import Button from '../../../ui/Button'
import { Download, Maximize2, Info } from 'lucide-react'
import { ChartConfig } from '../../../../types/reporting'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ChartContainerProps {
  config: ChartConfig
  data: {
    labels: string[]
    datasets: Array<
      {
        label?: string
        data: number[]
        backgroundColor?: string | string[]
        borderColor?: string | string[]
        borderWidth?: number
        tension?: number
        fill?: boolean
        borderDash?: number[]
        pointRadius?: number
      } & Record<string, unknown>
    >
  }
  className?: string
  onFullscreen?: () => void
  onExport?: (format: 'png' | 'svg') => void
}

export function ChartContainer({
  config,
  data,
  className = '',
  onFullscreen,
  onExport,
}: ChartContainerProps) {
  const chartRef = useRef<ChartJS>(null)
  const [showInfo, setShowInfo] = useState(false)

  // Default chart options with Morandi color scheme
  const defaultOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: config.options.showLegend !== false,
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        enabled: config.options.showTooltips !== false,
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 13,
          weight: 600 as const,
        },
        bodyFont: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
      },
      title: config.options.title
        ? {
            display: true,
            text: config.options.title,
            font: {
              family: 'Inter, system-ui, sans-serif',
              size: 16,
              weight: 600 as const,
            },
            padding: 20,
          }
        : undefined,
    },
    scales:
      config.type === 'line' || config.type === 'bar'
        ? {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  family: 'Inter, system-ui, sans-serif',
                  size: 11,
                },
              },
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(156, 163, 175, 0.1)',
              },
              ticks: {
                font: {
                  family: 'Inter, system-ui, sans-serif',
                  size: 11,
                },
              },
            },
          }
        : undefined,
  }

  // Merge with custom options
  const chartOptions = {
    ...defaultOptions,
    ...config.options,
    plugins: {
      ...defaultOptions.plugins,
      ...(config.options.plugins || {}),
    },
  }

  // Handle export
  const handleExport = (format: 'png' | 'svg') => {
    if (!chartRef.current) return

    if (format === 'png') {
      const url = chartRef.current.toBase64Image()
      const link = document.createElement('a')
      link.download = `${config.options.title || 'chart'}.png`
      link.href = url
      link.click()
    }

    onExport?.(format)
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
  ]

  // Apply colors if not specified
  if (!data.datasets[0].backgroundColor && !data.datasets[0].borderColor) {
    data.datasets = data.datasets.map((dataset, index: number) => ({
      ...dataset,
      backgroundColor:
        config.type === 'pie' || config.type === 'donut'
          ? morandiColors
          : morandiColors[index % morandiColors.length],
      borderColor:
        config.type === 'line'
          ? morandiColors[index % morandiColors.length]
          : undefined,
      borderWidth: config.type === 'line' ? 2 : 1,
      tension: config.type === 'line' ? 0.4 : undefined,
      fill: config.type === 'area' ? true : false,
    }))
  }

  return (
    <Card className={`relative ${className}`}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {config.options.title && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInfo(!showInfo)}
            className="p-1"
          >
            <Info className="w-4 h-4" />
          </Button>
        )}
        {onFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFullscreen}
            className="p-1"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleExport('png')}
          className="p-1"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {showInfo && (
        <div className="absolute top-16 right-4 bg-white p-4 rounded-lg shadow-lg border border-morandi-stone-200 max-w-sm z-10">
          <p className="text-sm text-morandi-stone-600">
            {getChartDescription(config.type)}
          </p>
        </div>
      )}

      <div className="h-full w-full p-4" style={{ minHeight: '300px' }}>
        <Chart
          ref={chartRef}
          type={config.type as ChartJSType}
          data={data}
          options={chartOptions}
        />
      </div>
    </Card>
  )
}

function getChartDescription(type: string): string {
  const descriptions: Record<string, string> = {
    line: 'Shows trends and patterns over time. Use this to track your practice progress.',
    area: 'Similar to line chart but emphasizes the magnitude of change over time.',
    bar: 'Compares different categories or shows changes over time. Great for comparing practice sessions.',
    horizontalBar:
      'Like bar chart but horizontal. Better for long category names.',
    pie: 'Shows proportions of a whole. Perfect for seeing practice time distribution.',
    donut:
      'Similar to pie chart but with a center cutout. Shows proportions clearly.',
    heatmap:
      'Shows intensity of practice over time. Darker colors indicate more practice.',
  }
  return descriptions[type] || 'Visualizes your practice data.'
}
