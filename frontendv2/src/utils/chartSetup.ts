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
  LineController,
  BarController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  BubbleController,
  ScatterController,
} from 'chart.js'

// Register all Chart.js components globally
// This ensures they are available before any chart component is rendered
// Including all controllers to prevent tree-shaking issues
ChartJS.register(
  // Scales
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  TimeScale,
  // Elements
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  // Plugins
  Title,
  Tooltip,
  Legend,
  Filler,
  // Controllers - IMPORTANT: These prevent "controller not registered" errors
  LineController,
  BarController,
  PieController,
  DoughnutController,
  RadarController,
  PolarAreaController,
  BubbleController,
  ScatterController
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
