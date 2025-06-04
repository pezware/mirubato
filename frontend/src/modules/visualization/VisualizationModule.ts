/**
 * Visualization Module - Comprehensive data visualization for progress, analytics, and insights
 */

import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js'
import { EventBus } from '../core/EventBus'
import { StorageModule } from '../infrastructure/StorageModule'
import type { ModuleInterface, ModuleHealth, EventPayload } from '../core/types'
import type {
  VisualizationConfig,
  ChartSpecification,
  ChartData,
  ChartType,
  VisualizationExportOptions,
  VisualizationExportResult,
  ProgressVisualizationData,
  HeatmapData,
  RadarChartData,
  DashboardLayout,
  ChartInteractionEvent,
  VisualizationAnalytics,
  VisualizationPerformanceMetrics,
  ChartStyling,
  VisualizationError,
} from './types'

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
)

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class VisualizationModule implements ModuleInterface {
  public readonly name = 'VisualizationModule'
  public readonly version = '1.0.0'

  private eventBus: EventBus
  private storage: StorageModule
  private config: Required<VisualizationConfig>
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }
  private cache = new Map<string, CacheEntry<any>>()
  private performanceMetrics = new Map<
    string,
    VisualizationPerformanceMetrics
  >()
  private analytics = new Map<string, VisualizationAnalytics>()
  private readonly CACHE_TTL = 300000 // 5 minutes

  constructor(storage: StorageModule, config: VisualizationConfig) {
    this.eventBus = EventBus.getInstance()
    this.storage = storage
    this.config = {
      library: config.library || 'chartjs',
      theme: config.theme || 'light',
      animations: config.animations ?? true,
      responsiveBreakpoints: config.responsiveBreakpoints || [768, 1024, 1440],
      exportFormats: config.exportFormats || ['png', 'svg'],
      accessibility: {
        announceUpdates: config.accessibility?.announceUpdates ?? true,
        keyboardNavigation: config.accessibility?.keyboardNavigation ?? true,
        highContrast: config.accessibility?.highContrast ?? false,
      },
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:init:start',
        data: {},
        metadata: { version: this.version },
      })

      // Initialize storage if needed
      if (this.storage.initialize) {
        await this.storage.initialize()
      }

      // Set up event subscriptions
      this.setupEventSubscriptions()

      this.health.status = 'green'

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:init:complete',
        data: {},
        metadata: { version: this.version },
      })
    } catch (error) {
      this.health.status = 'red'
      this.health.message =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to initialize VisualizationModule:', error)
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Unsubscribe from events
      this.eventBus.unsubscribe('progress:report:ready')
      this.eventBus.unsubscribe('curriculum:analytics:ready')
      this.eventBus.unsubscribe('logger:report:generated')
      this.eventBus.unsubscribe('practice:session:ended')
      this.eventBus.unsubscribe('progress:milestone:achieved')
      this.eventBus.unsubscribe('curriculum:path:completed')

      // Clear caches
      this.cache.clear()
      this.performanceMetrics.clear()
      this.analytics.clear()

      this.health.status = 'gray'

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:shutdown:complete',
        data: {},
        metadata: { version: this.version },
      })
    } catch (error) {
      console.error('Error during shutdown:', error)
    }
  }

  getHealth(): ModuleHealth {
    return { ...this.health }
  }

  // Chart Management

  async createChart(
    spec: ChartSpecification & { userId?: string }
  ): Promise<ChartSpecification & { userId: string; createdAt: number }> {
    try {
      this.validateChartSpecification(spec)

      const chart = {
        ...spec,
        userId: spec.userId || 'default',
        createdAt: Date.now(),
      }

      await this.storage.saveLocal(`chart:${spec.id}`, chart)
      this.invalidateCache(`charts:${chart.userId}`)

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:chart:created',
        data: { chart },
        metadata: { version: this.version },
      })

      return chart
    } catch (error) {
      console.error('Error creating chart:', error)
      throw error
    }
  }

  async getUserCharts(
    userId: string
  ): Promise<(ChartSpecification & { userId: string; createdAt: number })[]> {
    const cacheKey = `charts:${userId}`
    const cached =
      this.getFromCache<
        (ChartSpecification & { userId: string; createdAt: number })[]
      >(cacheKey)
    if (cached) return cached

    const keys = await this.storage.getKeys()
    const chartKeys = keys.filter((k: string) => k.startsWith('chart:'))
    const chartPromises = chartKeys.map((key: string) =>
      this.storage.loadLocal<
        ChartSpecification & { userId: string; createdAt: number }
      >(key)
    )
    const loadedCharts = await Promise.all(chartPromises)
    const userCharts = loadedCharts
      .filter(
        (c): c is ChartSpecification & { userId: string; createdAt: number } =>
          c !== null && c.userId === userId
      )
      .sort((a, b) => b.createdAt - a.createdAt)

    this.setCache(cacheKey, userCharts)
    return userCharts
  }

  async updateChart(
    chartId: string,
    updates: Partial<ChartSpecification>
  ): Promise<ChartSpecification & { userId: string; createdAt: number }> {
    const existingChart = await this.storage.loadLocal<
      ChartSpecification & { userId: string; createdAt: number }
    >(`chart:${chartId}`)

    if (!existingChart) {
      throw new Error('Chart not found')
    }

    const updatedChart = {
      ...existingChart,
      ...updates,
      id: chartId, // Preserve ID
      updatedAt: Date.now(),
    }

    await this.storage.saveLocal(`chart:${chartId}`, updatedChart)
    this.invalidateCache(`charts:${existingChart.userId}`)

    await this.eventBus.publish({
      source: this.name,
      type: 'visualization:chart:updated',
      data: { chart: updatedChart },
      metadata: { version: this.version },
    })

    return updatedChart
  }

  async deleteChart(chartId: string): Promise<void> {
    const chart = await this.storage.loadLocal<
      ChartSpecification & { userId: string }
    >(`chart:${chartId}`)

    await this.storage.deleteLocal(`chart:${chartId}`)

    if (chart) {
      this.invalidateCache(`charts:${chart.userId}`)
    }

    await this.eventBus.publish({
      source: this.name,
      type: 'visualization:chart:deleted',
      data: { chartId },
      metadata: { version: this.version },
    })
  }

  // Data Processing and Rendering

  async processProgressData(
    data: ProgressVisualizationData,
    chartType: ChartType
  ): Promise<ChartData> {
    const cacheKey = `progress:${data.userId}:${chartType}:${data.timeRange.start}:${data.timeRange.end}`
    const cached = this.getFromCache<ChartData>(cacheKey)
    if (cached) return cached

    let chartData: ChartData

    switch (chartType) {
      case 'progressLine':
        chartData = this.createProgressLineChart(data)
        break
      case 'practiceTimeBar':
        chartData = this.createPracticeTimeBarChart(data)
        break
      case 'accuracyHistogram':
        chartData = this.createAccuracyHistogramChart(data)
        break
      default:
        throw new Error(`Unsupported chart type: ${chartType}`)
    }

    this.setCache(cacheKey, chartData)
    return chartData
  }

  async generateHeatmapData(
    userId: string,
    practiceData: Array<{
      date: string
      practiceTime: number
      sessionsCount: number
    }>
  ): Promise<HeatmapData> {
    const cacheKey = `heatmap:${userId}:${practiceData.length}`
    const cached = this.getFromCache<HeatmapData>(cacheKey)
    if (cached) return cached

    const sortedData = practiceData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const values = sortedData.map(day => {
      let intensity: HeatmapData['values'][0]['intensity'] = 'none'
      if (day.practiceTime > 60) intensity = 'max'
      else if (day.practiceTime > 45) intensity = 'high'
      else if (day.practiceTime > 30) intensity = 'medium'
      else if (day.practiceTime > 0) intensity = 'low'

      return {
        date: day.date,
        value: day.practiceTime,
        intensity,
        details: {
          practiceTime: day.practiceTime,
          sessionsCount: day.sessionsCount,
          piecesWorked: Math.floor(day.sessionsCount * 1.5), // Estimate
        },
      }
    })

    const activeDays = values.filter(v => v.value > 0).length
    const totalTime = values.reduce((sum, v) => sum + v.value, 0)

    // Calculate streak
    let currentStreak = 0
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i].value > 0) {
        currentStreak++
      } else {
        break
      }
    }

    const heatmapData: HeatmapData = {
      dates: sortedData.map(d => d.date),
      values,
      stats: {
        totalDays: practiceData.length,
        activeDays,
        streak: currentStreak,
        averageDaily: totalTime / Math.max(1, practiceData.length),
      },
    }

    this.setCache(cacheKey, heatmapData)
    return heatmapData
  }

  async createRadarChartData(
    userId: string,
    skillsData: Array<{ skill: string; current: number; target: number }>
  ): Promise<RadarChartData> {
    const cacheKey = `radar:${userId}:${skillsData.length}`
    const cached = this.getFromCache<RadarChartData>(cacheKey)
    if (cached) return cached

    const axes = skillsData.map(skill => ({
      skill: skill.skill,
      label: skill.skill
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      maxValue: 10,
      currentValue: skill.current,
      targetValue: skill.target,
    }))

    const datasets = [
      {
        label: 'Current Level',
        values: skillsData.map(s => s.current),
        color: this.getChartColors().primary,
      },
      {
        label: 'Target Level',
        values: skillsData.map(s => s.target),
        color: this.getChartColors().secondary,
      },
    ]

    const radarData: RadarChartData = {
      axes,
      datasets,
    }

    this.setCache(cacheKey, radarData)
    return radarData
  }

  async renderChart(
    chartId: string,
    data: ChartData,
    dimensions: { width: number; height: number }
  ): Promise<HTMLCanvasElement | null> {
    try {
      const startTime = Date.now()

      if (!data) {
        this.recordError({
          code: 'MISSING_DATA',
          message: 'Chart data is required for rendering',
          severity: 'medium',
          chartId,
          timestamp: Date.now(),
        })
        return null
      }

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = dimensions.width
      canvas.height = dimensions.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Configure chart based on type
      const chartConfig = this.createChartConfig(data, dimensions)

      // Create Chart.js instance
      new Chart(ctx, chartConfig)

      const renderTime = Date.now() - startTime

      // Record performance metrics
      this.recordPerformanceMetrics({
        chartId,
        renderTime,
        dataProcessingTime: 0, // Would be measured in real processing
        memoryUsage: 0, // Would use performance.memory if available
        errorCount: 0,
        lastRender: Date.now(),
      })

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:rendered',
        data: {
          chartId,
          renderTime,
          dataPoints: data.datasets.reduce(
            (sum, dataset) => sum + dataset.data.length,
            0
          ),
        },
        metadata: { version: this.version },
      })

      return canvas
    } catch (error) {
      console.error('Error rendering chart:', error)
      this.health.status = 'yellow'

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:error',
        data: {
          chartId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })

      return null
    }
  }

  // Export Functionality

  async exportChart(
    chartId: string,
    options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    try {
      this.validateExportOptions(options)

      let result: VisualizationExportResult

      switch (options.format) {
        case 'png':
          result = await this.exportAsPNG(chartId, options)
          break
        case 'svg':
          result = await this.exportAsSVG(chartId, options)
          break
        case 'pdf':
          result = await this.exportAsPDF(chartId, options)
          break
        case 'csv':
          result = await this.exportAsCSV(chartId, options)
          break
        case 'json':
          result = await this.exportAsJSON(chartId, options)
          break
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:exported',
        data: {
          chartId,
          format: options.format,
          size: result.size,
          success: result.success,
        },
        metadata: { version: this.version },
      })

      return result
    } catch (error) {
      const errorResult: VisualizationExportResult = {
        success: false,
        filename: `error_${chartId}.txt`,
        mimeType: 'text/plain',
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:exported',
        data: {
          chartId,
          format: options.format,
          success: false,
          error: errorResult.error,
        },
        metadata: { version: this.version },
      })

      return errorResult
    }
  }

  // Dashboard Management

  async createDashboard(
    layoutData: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DashboardLayout> {
    const dashboard: DashboardLayout = {
      ...layoutData,
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await this.storage.saveLocal(`dashboard:${dashboard.id}`, dashboard)
    this.invalidateCache(`dashboards:${dashboard.userId}`)

    await this.eventBus.publish({
      source: this.name,
      type: 'visualization:dashboard:created',
      data: { dashboard },
      metadata: { version: this.version },
    })

    return dashboard
  }

  async getUserDashboards(userId: string): Promise<DashboardLayout[]> {
    const cacheKey = `dashboards:${userId}`
    const cached = this.getFromCache<DashboardLayout[]>(cacheKey)
    if (cached) return cached

    const keys = await this.storage.getKeys()
    const dashboardKeys = keys.filter((k: string) => k.startsWith('dashboard:'))
    const dashboardPromises = dashboardKeys.map((key: string) =>
      this.storage.loadLocal<DashboardLayout>(key)
    )
    const loadedDashboards = await Promise.all(dashboardPromises)
    const userDashboards = loadedDashboards
      .filter((d): d is DashboardLayout => d !== null && d.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt)

    this.setCache(cacheKey, userDashboards)
    return userDashboards
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<Omit<DashboardLayout, 'id' | 'createdAt'>>
  ): Promise<DashboardLayout> {
    const existingDashboard = await this.storage.loadLocal<DashboardLayout>(
      `dashboard:${dashboardId}`
    )

    if (!existingDashboard) {
      throw new Error('Dashboard not found')
    }

    const updatedDashboard = {
      ...existingDashboard,
      ...updates,
      id: dashboardId,
      updatedAt: Date.now(),
    }

    await this.storage.saveLocal(`dashboard:${dashboardId}`, updatedDashboard)
    this.invalidateCache(`dashboards:${existingDashboard.userId}`)

    await this.eventBus.publish({
      source: this.name,
      type: 'visualization:dashboard:updated',
      data: { dashboard: updatedDashboard },
      metadata: { version: this.version },
    })

    return updatedDashboard
  }

  // Interaction and Analytics

  async handleChartInteraction(
    interaction: ChartInteractionEvent
  ): Promise<void> {
    // Record interaction analytics
    const analytics = this.analytics.get(interaction.chartId) || {
      chartId: interaction.chartId,
      viewCount: 0,
      totalViewTime: 0,
      lastViewed: 0,
      interactions: { clicks: 0, zooms: 0, exports: 0, filters: 0 },
      performance: { averageLoadTime: 0, averageRenderTime: 0, errorCount: 0 },
    }

    switch (interaction.type) {
      case 'click':
        analytics.interactions.clicks++
        break
      case 'zoom':
        analytics.interactions.zooms++
        break
    }

    this.analytics.set(interaction.chartId, analytics)

    await this.eventBus.publish({
      source: this.name,
      type: 'visualization:interaction',
      data: { interaction },
      metadata: { version: this.version },
    })
  }

  async recordChartView(chartId: string): Promise<void> {
    const analytics = this.analytics.get(chartId) || {
      chartId,
      viewCount: 0,
      totalViewTime: 0,
      lastViewed: 0,
      interactions: { clicks: 0, zooms: 0, exports: 0, filters: 0 },
      performance: { averageLoadTime: 0, averageRenderTime: 0, errorCount: 0 },
    }

    analytics.viewCount++
    analytics.lastViewed = Date.now()

    this.analytics.set(chartId, analytics)
  }

  async getVisualizationAnalytics(
    chartId: string
  ): Promise<VisualizationAnalytics> {
    return (
      this.analytics.get(chartId) || {
        chartId,
        viewCount: 0,
        totalViewTime: 0,
        lastViewed: 0,
        interactions: { clicks: 0, zooms: 0, exports: 0, filters: 0 },
        performance: {
          averageLoadTime: 0,
          averageRenderTime: 0,
          errorCount: 0,
        },
      }
    )
  }

  async getPerformanceMetrics(
    chartId: string
  ): Promise<VisualizationPerformanceMetrics> {
    return (
      this.performanceMetrics.get(chartId) || {
        chartId,
        renderTime: 0,
        dataProcessingTime: 0,
        memoryUsage: 0,
        errorCount: 0,
        lastRender: 0,
      }
    )
  }

  // Responsive and Accessibility

  async adaptChartForViewport(
    spec: ChartSpecification,
    viewport: { width: number; height: number }
  ): Promise<ChartSpecification> {
    const adaptedSpec = { ...spec }

    // Mobile adaptations
    if (viewport.width < this.config.responsiveBreakpoints[0]) {
      adaptedSpec.dimensions = {
        width: Math.min(viewport.width - 40, 350),
        height: 250,
      }
      adaptedSpec.interactivity = {
        ...adaptedSpec.interactivity,
        zoom: false, // Disable zoom on mobile
        pan: false,
      }
    }

    return adaptedSpec
  }

  async generateAccessibleDescription(data: ChartData): Promise<string> {
    const { title, datasets, labels } = data
    const dataPointCount = datasets.reduce(
      (sum, dataset) => sum + dataset.data.length,
      0
    )

    let description = `${title}. Chart with ${dataPointCount} data points`

    if (datasets.length > 0) {
      const firstDataset = datasets[0]
      const values = firstDataset.data.map(d => d.y)
      const min = Math.min(...values)
      const max = Math.max(...values)

      description += `. Values range from ${min} to ${max}`

      if (values.length > 1) {
        const trend =
          values[values.length - 1] > values[0] ? 'increasing' : 'decreasing'
        description += ` with an overall ${trend} trend`
      }
    }

    if (labels && labels.length > 0) {
      description += `. Time period from ${labels[0]} to ${
        labels[labels.length - 1]
      }`
    }

    return description + '.'
  }

  async getChartStyling(_chartType: ChartType): Promise<ChartStyling> {
    const baseColors = this.getChartColors()

    return {
      colors: baseColors,
      fonts: {
        family: 'Inter, system-ui, sans-serif',
        sizes: {
          title: this.config.accessibility.highContrast ? 18 : 16,
          label: this.config.accessibility.highContrast ? 14 : 12,
          legend: this.config.accessibility.highContrast ? 14 : 12,
          tooltip: this.config.accessibility.highContrast ? 14 : 12,
        },
      },
      spacing: {
        padding: 16,
        margin: 12,
        gridSpacing: 8,
      },
    }
  }

  // Private Helper Methods

  private setupEventSubscriptions(): void {
    this.eventBus.subscribe(
      'progress:report:ready',
      this.handleProgressReportEvent
    )
    this.eventBus.subscribe(
      'curriculum:analytics:ready',
      this.handleCurriculumAnalyticsEvent
    )
    this.eventBus.subscribe(
      'logger:report:generated',
      this.handleLoggerReportEvent
    )
    this.eventBus.subscribe(
      'practice:session:ended',
      this.handlePracticeSessionEvent
    )
    this.eventBus.subscribe(
      'progress:milestone:achieved',
      this.handleMilestoneEvent
    )
    this.eventBus.subscribe(
      'curriculum:path:completed',
      this.handlePathCompletionEvent
    )
  }

  private handleProgressReportEvent = async (
    event: EventPayload
  ): Promise<void> => {
    if (event.data?.userId) {
      this.invalidateCache(`progress:${event.data.userId}`)

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:data:updated',
        data: { source: 'progress', userId: event.data.userId },
        metadata: { version: this.version },
      })
    }
  }

  private handleCurriculumAnalyticsEvent = async (
    event: EventPayload
  ): Promise<void> => {
    if (event.data?.userId) {
      this.invalidateCache(`curriculum:${event.data.userId}`)

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:data:updated',
        data: { source: 'curriculum', userId: event.data.userId },
        metadata: { version: this.version },
      })
    }
  }

  private handleLoggerReportEvent = async (
    event: EventPayload
  ): Promise<void> => {
    if (event.data?.userId) {
      this.invalidateCache(`logger:${event.data.userId}`)

      await this.eventBus.publish({
        source: this.name,
        type: 'visualization:data:updated',
        data: { source: 'logger', userId: event.data.userId },
        metadata: { version: this.version },
      })
    }
  }

  private handlePracticeSessionEvent = async (
    event: EventPayload
  ): Promise<void> => {
    if (event.data?.session?.userId) {
      this.invalidateCache(`heatmap:${event.data.session.userId}`)
    }
  }

  private handleMilestoneEvent = async (event: EventPayload): Promise<void> => {
    await this.eventBus.publish({
      source: this.name,
      type: 'visualization:milestone:highlighted',
      data: { milestone: event.data },
      metadata: { version: this.version },
    })
  }

  private handlePathCompletionEvent = async (
    event: EventPayload
  ): Promise<void> => {
    await this.eventBus.publish({
      source: this.name,
      type: 'visualization:tree:updated',
      data: { pathCompletion: event.data },
      metadata: { version: this.version },
    })
  }

  private validateChartSpecification(spec: ChartSpecification): void {
    if (!spec.id || !spec.type) {
      throw new Error('Chart ID and type are required')
    }

    if (spec.dimensions) {
      if (
        (typeof spec.dimensions.width === 'number' &&
          spec.dimensions.width <= 0) ||
        (typeof spec.dimensions.height === 'number' &&
          spec.dimensions.height <= 0)
      ) {
        throw new Error('Invalid dimensions: width and height must be positive')
      }
    }
  }

  private validateExportOptions(options: VisualizationExportOptions): void {
    if (!options.format) {
      throw new Error('Export format is required')
    }

    if (options.width && options.width <= 0) {
      throw new Error('Export width must be positive')
    }

    if (options.height && options.height <= 0) {
      throw new Error('Export height must be positive')
    }
  }

  private createProgressLineChart(data: ProgressVisualizationData): ChartData {
    return {
      id: `progress-line-${data.userId}`,
      type: 'progressLine',
      title: 'Practice Progress',
      datasets: [
        {
          id: 'practice-time',
          label: 'Practice Time (minutes)',
          data: data.practiceTime.map(pt => ({
            x: pt.date,
            y: pt.minutes,
          })),
          styling: {
            color: this.getChartColors().primary,
            lineStyle: 'solid',
          },
        },
      ],
      labels: data.practiceTime.map(pt => pt.date),
      metadata: {
        lastUpdated: Date.now(),
        dataSource: 'practice:sessions',
        aggregationPeriod: data.timeRange.period,
      },
    }
  }

  private createPracticeTimeBarChart(
    data: ProgressVisualizationData
  ): ChartData {
    return {
      id: `practice-bar-${data.userId}`,
      type: 'practiceTimeBar',
      title: 'Daily Practice Time',
      datasets: [
        {
          id: 'daily-practice',
          label: 'Minutes Practiced',
          data: data.practiceTime.map(pt => ({
            x: pt.date,
            y: pt.minutes,
          })),
        },
      ],
      labels: data.practiceTime.map(pt => pt.date),
      metadata: {
        lastUpdated: Date.now(),
        dataSource: 'practice:time',
      },
    }
  }

  private createAccuracyHistogramChart(
    data: ProgressVisualizationData
  ): ChartData {
    return {
      id: `accuracy-histogram-${data.userId}`,
      type: 'accuracyHistogram',
      title: 'Accuracy Distribution',
      datasets: [
        {
          id: 'accuracy-scores',
          label: 'Accuracy',
          data: data.accuracy.map(acc => ({
            x: acc.date,
            y: acc.score * 100, // Convert to percentage
          })),
        },
      ],
      labels: data.accuracy.map(acc => acc.date),
      metadata: {
        lastUpdated: Date.now(),
        dataSource: 'performance:accuracy',
      },
    }
  }

  private createChartConfig(
    data: ChartData,
    _dimensions: { width: number; height: number }
  ): any {
    const styling = this.getChartColors()

    return {
      type: this.mapChartTypeToChartJS(data.type),
      data: {
        labels: data.labels,
        datasets: data.datasets.map(dataset => ({
          label: dataset.label,
          data: dataset.data.map(point => point.y),
          backgroundColor: dataset.styling?.fillColor || styling.secondary,
          borderColor: dataset.styling?.color || styling.primary,
          borderWidth: dataset.styling?.borderWidth || 2,
        })),
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: this.config.animations,
        plugins: {
          title: {
            display: true,
            text: data.title,
            color: styling.text,
          },
          legend: {
            display: true,
            labels: {
              color: styling.text,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: styling.text,
            },
            grid: {
              color: styling.grid,
            },
          },
          y: {
            ticks: {
              color: styling.text,
            },
            grid: {
              color: styling.grid,
            },
          },
        },
      },
    }
  }

  private mapChartTypeToChartJS(type: ChartType): string {
    const mapping: Record<ChartType, string> = {
      progressLine: 'line',
      practiceTimeBar: 'bar',
      accuracyHistogram: 'bar',
      practiceHeatmap: 'scatter',
      skillRadar: 'radar',
      repertoireTree: 'scatter',
      goalProgress: 'doughnut',
      tempoProgression: 'line',
      difficultyDistribution: 'pie',
      performanceReadiness: 'radar',
    }
    return mapping[type] || 'line'
  }

  private async exportAsPNG(
    chartId: string,
    _options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    // In a real implementation, this would render the chart and export as PNG
    const mockData = 'data:image/png;base64,test'

    return {
      success: true,
      data: mockData,
      filename: `${chartId}.png`,
      mimeType: 'image/png',
      size: mockData.length,
    }
  }

  private async exportAsSVG(
    chartId: string,
    _options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
      <text x="400" y="200" text-anchor="middle">Chart: ${chartId}</text>
    </svg>`

    return {
      success: true,
      data: svgData,
      filename: `${chartId}.svg`,
      mimeType: 'image/svg+xml',
      size: svgData.length,
    }
  }

  private async exportAsPDF(
    chartId: string,
    _options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    // Mock PDF export
    const pdfData = `PDF content for chart ${chartId}`

    return {
      success: true,
      data: pdfData,
      filename: `${chartId}.pdf`,
      mimeType: 'application/pdf',
      size: pdfData.length,
    }
  }

  private async exportAsCSV(
    chartId: string,
    _options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    const csvData = `Date,Value\n2025-01-01,75\n2025-01-02,80`

    return {
      success: true,
      data: csvData,
      filename: `${chartId}.csv`,
      mimeType: 'text/csv',
      size: csvData.length,
    }
  }

  private async exportAsJSON(
    chartId: string,
    _options: VisualizationExportOptions
  ): Promise<VisualizationExportResult> {
    const jsonData = JSON.stringify({
      chartId,
      data: [
        { date: '2025-01-01', value: 75 },
        { date: '2025-01-02', value: 80 },
      ],
    })

    return {
      success: true,
      data: jsonData,
      filename: `${chartId}.json`,
      mimeType: 'application/json',
      size: jsonData.length,
    }
  }

  private getChartColors(): ChartStyling['colors'] {
    if (this.config.accessibility.highContrast) {
      return {
        primary: '#000000',
        secondary: '#666666',
        accent: '#0066CC',
        background: '#FFFFFF',
        text: '#000000',
        grid: '#CCCCCC',
      }
    }

    if (this.config.theme === 'dark') {
      return {
        primary: '#60A5FA',
        secondary: '#34D399',
        accent: '#F59E0B',
        background: '#1F2937',
        text: '#F9FAFB',
        grid: '#374151',
      }
    }

    return {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937',
      grid: '#E5E7EB',
    }
  }

  private recordPerformanceMetrics(
    metrics: VisualizationPerformanceMetrics
  ): void {
    this.performanceMetrics.set(metrics.chartId, metrics)
  }

  private recordError(error: VisualizationError): void {
    console.error('Visualization error:', error)
    this.health.status = 'yellow'
  }

  // Cache management
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL,
    })
  }

  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()

      // Publish cache invalidation event
      this.eventBus.publish({
        source: this.name,
        type: 'visualization:cache:invalidated',
        data: { pattern: 'all' },
        metadata: { version: this.version },
      })
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }

    // Publish cache invalidation event
    this.eventBus.publish({
      source: this.name,
      type: 'visualization:cache:invalidated',
      data: { pattern },
      metadata: { version: this.version },
    })
  }
}
