/**
 * Visualization Module Types
 * Comprehensive data visualization for progress, analytics, and insights
 */

export interface VisualizationConfig {
  library: 'chartjs' | 'd3' | 'custom'
  theme: 'light' | 'dark' | 'auto'
  animations: boolean
  responsiveBreakpoints: number[]
  exportFormats: ('png' | 'svg' | 'pdf')[]
  accessibility: {
    announceUpdates: boolean
    keyboardNavigation: boolean
    highContrast: boolean
  }
}

export interface ChartSpecification {
  id: string
  type: ChartType
  dataSource: string // Event type or data key
  updateFrequency: 'realtime' | 'session' | 'daily'
  dimensions: {
    width?: number | 'auto'
    height?: number | 'auto'
    aspectRatio?: number
  }
  interactivity: {
    zoom: boolean
    pan: boolean
    tooltips: boolean
    legend: boolean
    onClick?: boolean
  }
  styling?: ChartStyling
}

export type ChartType =
  | 'progressLine'
  | 'practiceHeatmap'
  | 'skillRadar'
  | 'repertoireTree'
  | 'goalProgress'
  | 'accuracyHistogram'
  | 'tempoProgression'
  | 'practiceTimeBar'
  | 'difficultyDistribution'
  | 'performanceReadiness'

export interface ChartStyling {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
    grid: string
  }
  fonts: {
    family: string
    sizes: {
      title: number
      label: number
      legend: number
      tooltip: number
    }
  }
  spacing: {
    padding: number
    margin: number
    gridSpacing: number
  }
}

export interface ChartData {
  id: string
  type: ChartType
  title: string
  subtitle?: string
  datasets: ChartDataset[]
  labels?: string[]
  metadata: {
    lastUpdated: number
    dataSource: string
    filterApplied?: string
    aggregationPeriod?: 'day' | 'week' | 'month' | 'year'
  }
}

export interface ChartDataset {
  id: string
  label: string
  data: DataPoint[]
  styling?: {
    color: string
    fillColor?: string
    borderWidth?: number
    pointStyle?: 'circle' | 'square' | 'triangle'
    lineStyle?: 'solid' | 'dashed' | 'dotted'
  }
  metadata?: Record<string, unknown>
}

export interface DataPoint {
  x: number | string
  y: number
  label?: string
  metadata?: Record<string, unknown>
}

export interface VisualizationExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'csv' | 'json'
  quality?: number // For raster formats
  width?: number
  height?: number
  backgroundColor?: string
  includeData?: boolean // For non-visual formats
  compression?: boolean
}

export interface VisualizationExportResult {
  success: boolean
  data?: string | ArrayBuffer
  filename: string
  mimeType: string
  size: number
  error?: string
}

export interface ChartInteractionEvent {
  chartId: string
  type: 'click' | 'hover' | 'zoom' | 'pan' | 'select'
  data: {
    point?: DataPoint
    dataset?: string
    coordinates?: { x: number; y: number }
    zoomLevel?: number
    selection?: DataPoint[]
  }
  timestamp: number
}

export interface DashboardLayout {
  id: string
  userId: string
  name: string
  description?: string
  charts: DashboardChart[]
  layout: 'grid' | 'flex' | 'masonry'
  responsive: boolean
  createdAt: number
  updatedAt: number
}

export interface DashboardChart {
  chartId: string
  position: {
    row: number
    column: number
    width: number
    height: number
  }
  title?: string
  refreshRate?: number // seconds
  filters?: Record<string, unknown>
}

export interface ChartFilter {
  field: string
  operator: 'equals' | 'contains' | 'range' | 'in' | 'exists'
  value: unknown
  label?: string
}

export interface ProgressVisualizationData {
  userId: string
  timeRange: {
    start: number
    end: number
    period: 'day' | 'week' | 'month'
  }
  practiceTime: Array<{
    date: string
    minutes: number
    quality: number
  }>
  accuracy: Array<{
    date: string
    score: number
    trend: 'improving' | 'stable' | 'declining'
  }>
  pieces: Array<{
    id: string
    title: string
    progress: number
    lastPracticed: number
    readiness: number
  }>
  skills: Array<{
    name: string
    current: number
    target: number
    history: Array<{ date: string; level: number }>
  }>
}

export interface HeatmapData {
  dates: string[]
  values: Array<{
    date: string
    value: number
    intensity: 'none' | 'low' | 'medium' | 'high' | 'max'
    details?: {
      practiceTime: number
      sessionsCount: number
      piecesWorked: number
    }
  }>
  stats: {
    totalDays: number
    activeDays: number
    streak: number
    averageDaily: number
  }
}

export interface RadarChartData {
  axes: Array<{
    skill: string
    label: string
    maxValue: number
    currentValue: number
    targetValue?: number
  }>
  datasets: Array<{
    label: string
    values: number[]
    color: string
  }>
}

export interface TreeVisualizationData {
  nodes: Array<{
    id: string
    label: string
    value: number
    level: number
    parentId?: string
    status: 'locked' | 'active' | 'completed' | 'mastered'
    metadata?: Record<string, unknown>
  }>
  connections: Array<{
    from: string
    to: string
    type: 'prerequisite' | 'progression' | 'alternative'
  }>
}

export interface VisualizationAnalytics {
  chartId: string
  viewCount: number
  totalViewTime: number
  lastViewed: number
  interactions: {
    clicks: number
    zooms: number
    exports: number
    filters: number
  }
  performance: {
    averageLoadTime: number
    averageRenderTime: number
    errorCount: number
  }
}

export interface AnimationConfig {
  enabled: boolean
  duration: number
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  delay?: number
  stagger?: number // For multiple elements
}

export interface ResponsiveConfig {
  breakpoints: {
    mobile: number
    tablet: number
    desktop: number
    wide: number
  }
  adaptations: {
    mobile: ChartAdaptation
    tablet: ChartAdaptation
    desktop: ChartAdaptation
  }
}

export interface ChartAdaptation {
  hiddenElements?: string[]
  simplifiedView?: boolean
  alternativeLayout?: string
  reducedAnimations?: boolean
  fontSize?: number
  spacing?: number
}

export interface VisualizationError {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
  chartId?: string
  timestamp: number
  context?: Record<string, unknown>
  suggestions?: string[]
}

export interface VisualizationPerformanceMetrics {
  chartId: string
  renderTime: number
  dataProcessingTime: number
  memoryUsage: number
  frameRate?: number
  errorCount: number
  lastRender: number
}

// Event types for the visualization module
export interface VisualizationEventData {
  chartRendered: {
    chartId: string
    type: ChartType
    renderTime: number
    dataPoints: number
  }
  chartExported: {
    chartId: string
    format: string
    size: number
    success: boolean
  }
  chartInteraction: ChartInteractionEvent
  dataUpdated: {
    chartId: string
    source: string
    recordsUpdated: number
    timestamp: number
  }
  layoutChanged: {
    dashboardId: string
    changes: string[]
    timestamp: number
  }
  errorOccurred: VisualizationError
}
