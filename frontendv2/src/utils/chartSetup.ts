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
  RadialLinearScale,
  TimeScale,
} from 'chart.js'

// Register all Chart.js components globally
// This ensures they are available before any chart component is rendered
ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Set default options
ChartJS.defaults.font.family = 'Inter, system-ui, sans-serif'
ChartJS.defaults.color = '#374151'
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(31, 41, 55, 0.95)'
ChartJS.defaults.plugins.tooltip.titleColor = '#ffffff'
ChartJS.defaults.plugins.tooltip.bodyColor = '#ffffff'
ChartJS.defaults.plugins.tooltip.borderColor = '#374151'
ChartJS.defaults.plugins.tooltip.borderWidth = 1

export { ChartJS }
