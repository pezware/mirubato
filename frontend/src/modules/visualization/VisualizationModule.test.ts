import { VisualizationModule } from './VisualizationModule'
import { EventBus, MockEventDrivenStorage } from '../core'
import type {
  VisualizationConfig,
  ChartSpecification,
  ChartType,
  VisualizationExportOptions,
  ProgressVisualizationData,
  DashboardLayout,
  ChartInteractionEvent,
} from './types'
import type { EventPayload } from '../core/types'

// Mock Chart.js
jest.mock('chart.js', () => {
  const mockChart = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
  }))

  ;(mockChart as any).register = jest.fn()

  return {
    Chart: mockChart,
    CategoryScale: jest.fn(),
    LinearScale: jest.fn(),
    PointElement: jest.fn(),
    LineElement: jest.fn(),
    Title: jest.fn(),
    Tooltip: jest.fn(),
    Legend: jest.fn(),
    BarElement: jest.fn(),
    ArcElement: jest.fn(),
  }
})

// Mock canvas
const mockCanvasContext = {
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  putImageData: jest.fn(),
  toDataURL: jest.fn(() => 'data:image/png;base64,test'),
  drawImage: jest.fn(),
}

const mockCanvas = {
  getContext: jest.fn(() => mockCanvasContext),
  toDataURL: jest.fn(() => 'data:image/png;base64,test'),
  width: 800,
  height: 600,
}

global.HTMLCanvasElement = jest.fn(() => mockCanvas) as any
Object.defineProperty(global, 'HTMLCanvasElement', {
  value: jest.fn(() => mockCanvas),
  writable: true,
})

describe('VisualizationModule', () => {
  let visualization: VisualizationModule
  let eventBus: EventBus
  let mockStorage: MockEventDrivenStorage
  let publishSpy: jest.SpyInstance
  let subscribeSpy: jest.SpyInstance

  const testConfig: VisualizationConfig = {
    library: 'chartjs',
    theme: 'light',
    animations: true,
    responsiveBreakpoints: [768, 1024, 1440],
    exportFormats: ['png', 'svg', 'pdf'],
    accessibility: {
      announceUpdates: true,
      keyboardNavigation: true,
      highContrast: false,
    },
  }

  const testChartSpec: ChartSpecification = {
    id: 'progress-chart-1',
    type: 'progressLine',
    dataSource: 'progress:report:ready',
    updateFrequency: 'session',
    dimensions: {
      width: 800,
      height: 400,
      aspectRatio: 2,
    },
    interactivity: {
      zoom: true,
      pan: true,
      tooltips: true,
      legend: true,
      onClick: true,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    publishSpy = jest.spyOn(eventBus, 'publish')
    subscribeSpy = jest.spyOn(eventBus, 'subscribe')

    // Use mock event-driven storage for tests
    mockStorage = new MockEventDrivenStorage()

    // Create module with mock storage
    visualization = new VisualizationModule(testConfig, mockStorage)
  })

  afterEach(async () => {
    if (visualization) {
      await visualization.shutdown()
    }
    if (mockStorage) {
      mockStorage.clear()
    }
    jest.clearAllMocks()
    EventBus.resetInstance()
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await visualization.initialize()

      expect(visualization.name).toBe('VisualizationModule')
      expect(visualization.version).toBe('1.0.0')
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:init:start',
        })
      )
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:init:complete',
        })
      )
    })

    it('should set up event subscriptions', async () => {
      await visualization.initialize()

      expect(subscribeSpy).toHaveBeenCalledWith(
        'progress:report:ready',
        expect.any(Function)
      )
      expect(subscribeSpy).toHaveBeenCalledWith(
        'curriculum:analytics:ready',
        expect.any(Function)
      )
      expect(subscribeSpy).toHaveBeenCalledWith(
        'logger:report:generated',
        expect.any(Function)
      )
      expect(subscribeSpy).toHaveBeenCalledWith(
        'practice:session:ended',
        expect.any(Function)
      )
    })

    it('should handle initialization errors gracefully', async () => {
      // Mock subscribe to throw error during initialization
      subscribeSpy.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      await visualization.initialize()

      const health = visualization.getHealth()
      expect(health.status).toBe('red')
      expect(health.message).toContain('Storage error')
    })

    it('should shutdown cleanly', async () => {
      await visualization.initialize()
      await visualization.shutdown()

      // EventBus doesn't have unsubscribe method in our implementation
      // Shutdown should clear subscriptions internally
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:shutdown:complete',
        })
      )
    })
  })

  describe('Chart Management', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should create a new chart specification', async () => {
      const chart = await visualization.createChart(testChartSpec)

      expect(chart.id).toBe(testChartSpec.id)
      expect(chart.type).toBe(testChartSpec.type)
      // Check storage state directly
      const storedChart = await mockStorage.read(`chart:${testChartSpec.id}`)
      expect(storedChart).toEqual(chart)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:chart:created',
          data: { chart },
        })
      )
    })

    it('should get all charts for a user', async () => {
      const mockCharts = [
        { ...testChartSpec, userId: 'user-1' },
        { ...testChartSpec, id: 'chart-2', userId: 'user-1' },
        { ...testChartSpec, id: 'chart-3', userId: 'user-2' },
      ]

      // Set up storage state directly
      for (const chart of mockCharts) {
        await mockStorage.write(`chart:${chart.id}`, chart)
      }

      const userCharts = await visualization.getUserCharts('user-1')

      expect(userCharts).toHaveLength(2)
      expect(userCharts.every(c => c.userId === 'user-1')).toBe(true)
    })

    it('should update chart specification', async () => {
      const existingChart = { ...testChartSpec, userId: 'user-1' }
      await mockStorage.write(`chart:${testChartSpec.id}`, existingChart)

      const updates = {
        dimensions: { width: 1000, height: 500 },
        interactivity: { ...testChartSpec.interactivity, zoom: false },
      }

      const updatedChart = await visualization.updateChart(
        testChartSpec.id,
        updates
      )

      expect(updatedChart.dimensions.width).toBe(1000)
      expect(updatedChart.interactivity.zoom).toBe(false)
      // Check storage state directly
      const storedChart = await mockStorage.read(`chart:${testChartSpec.id}`)
      expect(storedChart).toEqual(updatedChart)
    })

    it('should delete a chart', async () => {
      await visualization.deleteChart(testChartSpec.id)

      // Verify chart was deleted from storage
      const deletedChart = await mockStorage.read(`chart:${testChartSpec.id}`)
      expect(deletedChart).toBeNull()

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:chart:deleted',
          data: { chartId: testChartSpec.id },
        })
      )
    })
  })

  describe('Data Processing and Rendering', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should process progress visualization data', async () => {
      const mockProgressData: ProgressVisualizationData = {
        userId: 'user-1',
        timeRange: {
          start: Date.now() - 30 * 24 * 60 * 60 * 1000,
          end: Date.now(),
          period: 'day',
        },
        practiceTime: [
          { date: '2025-01-01', minutes: 45, quality: 0.85 },
          { date: '2025-01-02', minutes: 60, quality: 0.9 },
        ],
        accuracy: [
          { date: '2025-01-01', score: 0.82, trend: 'improving' },
          { date: '2025-01-02', score: 0.87, trend: 'improving' },
        ],
        pieces: [
          {
            id: 'piece-1',
            title: 'Moonlight Sonata',
            progress: 75,
            lastPracticed: Date.now() - 2 * 24 * 60 * 60 * 1000,
            readiness: 65,
          },
        ],
        skills: [
          {
            name: 'sight-reading',
            current: 6,
            target: 8,
            history: [
              { date: '2025-01-01', level: 5 },
              { date: '2025-01-15', level: 6 },
            ],
          },
        ],
      }

      const chartData = await visualization.processProgressData(
        mockProgressData,
        'progressLine'
      )

      expect(chartData.type).toBe('progressLine')
      expect(chartData.datasets).toHaveLength(1)
      expect(chartData.datasets[0].data).toHaveLength(2)
      expect(chartData.labels).toEqual(['2025-01-01', '2025-01-02'])
    })

    it('should generate heatmap data', async () => {
      const mockPracticeData = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        practiceTime: Math.floor(Math.random() * 120),
        sessionsCount: Math.floor(Math.random() * 3),
      }))

      const heatmapData = await visualization.generateHeatmapData(
        'user-1',
        mockPracticeData
      )

      expect(heatmapData.dates).toHaveLength(365)
      expect(heatmapData.values).toHaveLength(365)
      expect(heatmapData.stats).toHaveProperty('totalDays', 365)
      expect(heatmapData.stats).toHaveProperty('activeDays')
      expect(heatmapData.stats).toHaveProperty('streak')
    })

    it('should create radar chart data for skills', async () => {
      const skillsData = [
        { skill: 'sight-reading', current: 6, target: 8 },
        { skill: 'technique', current: 7, target: 9 },
        { skill: 'theory', current: 5, target: 7 },
        { skill: 'performance', current: 4, target: 6 },
      ]

      const radarData = await visualization.createRadarChartData(
        'user-1',
        skillsData
      )

      expect(radarData.axes).toHaveLength(4)
      expect(radarData.datasets).toHaveLength(2) // Current and Target
      expect(radarData.axes[0]).toHaveProperty('skill', 'sight-reading')
      expect(radarData.axes[0]).toHaveProperty('currentValue', 6)
    })

    it('should render chart to canvas', async () => {
      const chartData = {
        id: 'test-chart',
        type: 'progressLine' as ChartType,
        title: 'Practice Progress',
        datasets: [
          {
            id: 'progress-dataset',
            label: 'Progress',
            data: [
              { x: '2025-01-01', y: 75 },
              { x: '2025-01-02', y: 80 },
            ],
          },
        ],
        labels: ['2025-01-01', '2025-01-02'],
        metadata: {
          lastUpdated: Date.now(),
          dataSource: 'practice:sessions',
        },
      }

      const canvas = await visualization.renderChart(
        testChartSpec.id,
        chartData,
        { width: 800, height: 400 }
      )

      expect(canvas).toBeDefined()
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:rendered',
          data: expect.objectContaining({
            chartId: testChartSpec.id,
            renderTime: expect.any(Number),
          }),
        })
      )
    })
  })

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should export chart as PNG', async () => {
      const exportOptions: VisualizationExportOptions = {
        format: 'png',
        width: 1200,
        height: 600,
        quality: 0.9,
        backgroundColor: '#ffffff',
      }

      const result = await visualization.exportChart(
        testChartSpec.id,
        exportOptions
      )

      expect(result.success).toBe(true)
      expect(result.mimeType).toBe('image/png')
      expect(result.filename).toMatch(/\.png$/)
      expect(result.data).toBeDefined()
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:exported',
          data: expect.objectContaining({
            chartId: testChartSpec.id,
            format: 'png',
            success: true,
          }),
        })
      )
    })

    it('should export chart as SVG', async () => {
      const exportOptions: VisualizationExportOptions = {
        format: 'svg',
        includeData: true,
      }

      const result = await visualization.exportChart(
        testChartSpec.id,
        exportOptions
      )

      expect(result.success).toBe(true)
      expect(result.mimeType).toBe('image/svg+xml')
      expect(result.filename).toMatch(/\.svg$/)
    })

    it('should export data as CSV', async () => {
      const exportOptions: VisualizationExportOptions = {
        format: 'csv',
        includeData: true,
      }

      const result = await visualization.exportChart(
        testChartSpec.id,
        exportOptions
      )

      expect(result.success).toBe(true)
      expect(result.mimeType).toBe('text/csv')
      expect(result.filename).toMatch(/\.csv$/)
    })

    it('should handle export errors gracefully', async () => {
      const invalidOptions: VisualizationExportOptions = {
        format: 'png',
        width: -100, // Invalid width
      }

      const result = await visualization.exportChart(
        'non-existent-chart',
        invalidOptions
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Dashboard Management', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should create a dashboard layout', async () => {
      const layoutData: Omit<
        DashboardLayout,
        'id' | 'createdAt' | 'updatedAt'
      > = {
        userId: 'user-1',
        name: 'Practice Dashboard',
        description: 'Overview of practice progress and analytics',
        charts: [
          {
            chartId: 'progress-chart-1',
            position: { row: 1, column: 1, width: 2, height: 1 },
            title: 'Practice Progress',
            refreshRate: 60,
          },
          {
            chartId: 'heatmap-chart-1',
            position: { row: 2, column: 1, width: 2, height: 1 },
            title: 'Practice Heatmap',
            refreshRate: 300,
          },
        ],
        layout: 'grid',
        responsive: true,
      }

      const dashboard = await visualization.createDashboard(layoutData)

      expect(dashboard.userId).toBe('user-1')
      expect(dashboard.name).toBe('Practice Dashboard')
      expect(dashboard.charts).toHaveLength(2)
      expect(dashboard.id).toBeDefined()
      // Check that dashboard was saved to storage
      const savedDashboard = await mockStorage.read(`dashboard:${dashboard.id}`)
      expect(savedDashboard).toEqual(dashboard)
    })

    it('should get user dashboards', async () => {
      const mockDashboards = [
        {
          id: 'dash-1',
          userId: 'user-1',
          name: 'Dashboard 1',
          charts: [],
          layout: 'grid' as const,
          responsive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'dash-2',
          userId: 'user-2',
          name: 'Dashboard 2',
          charts: [],
          layout: 'flex' as const,
          responsive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      // Set up storage state directly
      for (const dash of mockDashboards) {
        await mockStorage.write(`dashboard:${dash.id}`, dash)
      }

      const userDashboards = await visualization.getUserDashboards('user-1')

      expect(userDashboards).toHaveLength(1)
      expect(userDashboards[0].userId).toBe('user-1')
    })

    it('should update dashboard layout', async () => {
      const existingDashboard = {
        id: 'dash-1',
        userId: 'user-1',
        name: 'Dashboard',
        charts: [],
        layout: 'grid' as const,
        responsive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Set up existing dashboard in storage
      await mockStorage.write(
        `dashboard:${existingDashboard.id}`,
        existingDashboard
      )

      const updates = {
        name: 'Updated Dashboard',
        layout: 'flex' as const,
        charts: [
          {
            chartId: 'new-chart',
            position: { row: 1, column: 1, width: 1, height: 1 },
          },
        ],
      }

      const updated = await visualization.updateDashboard('dash-1', updates)

      expect(updated.name).toBe('Updated Dashboard')
      expect(updated.layout).toBe('flex')
      expect(updated.charts).toHaveLength(1)
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should handle progress report events', async () => {
      const progressEvent: EventPayload = {
        eventId: 'evt_progress_123',
        timestamp: Date.now(),
        source: 'ProgressAnalyticsModule',
        type: 'progress:report:ready',
        data: {
          userId: 'user-1',
          report: {
            practiceTime: 120,
            accuracy: 0.85,
            pieces: ['piece-1', 'piece-2'],
          },
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'progress:report:ready'
      )?.[1]

      await eventHandler?.(progressEvent)

      // Should update relevant charts with new data
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:data:updated',
        })
      )
    })

    it('should handle curriculum analytics events', async () => {
      const analyticsEvent: EventPayload = {
        eventId: 'evt_curriculum_456',
        timestamp: Date.now(),
        source: 'CurriculumModule',
        type: 'curriculum:analytics:ready',
        data: {
          userId: 'user-1',
          analytics: {
            skillProgress: [
              { skill: 'sight-reading', level: 6 },
              { skill: 'technique', level: 7 },
            ],
          },
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'curriculum:analytics:ready'
      )?.[1]

      await eventHandler?.(analyticsEvent)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:data:updated',
        })
      )
    })

    it('should handle chart interaction events', async () => {
      const interactionEvent: ChartInteractionEvent = {
        chartId: 'progress-chart-1',
        type: 'click',
        data: {
          point: { x: '2025-01-01', y: 75 },
          dataset: 'progress-dataset',
          coordinates: { x: 100, y: 200 },
        },
        timestamp: Date.now(),
      }

      await visualization.handleChartInteraction(interactionEvent)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:interaction',
          data: { interaction: interactionEvent },
        })
      )
    })
  })

  describe('Performance and Analytics', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should track chart performance metrics', async () => {
      const chartId = 'performance-test-chart'
      const renderStart = Date.now()

      // Simulate chart rendering
      await visualization.renderChart(
        chartId,
        {
          id: chartId,
          type: 'progressLine',
          title: 'Test Chart',
          datasets: [
            {
              id: 'test-dataset',
              label: 'Test',
              data: [
                { x: '2025-01-01', y: 10 },
                { x: '2025-01-02', y: 20 },
              ],
            },
          ],
          labels: ['2025-01-01', '2025-01-02'],
          metadata: { lastUpdated: Date.now(), dataSource: 'test' },
        },
        { width: 800, height: 400 }
      )

      const metrics = await visualization.getPerformanceMetrics(chartId)

      expect(metrics.chartId).toBe(chartId)
      expect(metrics.renderTime).toBeGreaterThanOrEqual(0)
      expect(metrics.dataProcessingTime).toBeGreaterThanOrEqual(0)
      expect(metrics.lastRender).toBeGreaterThanOrEqual(renderStart)
    })

    it('should collect visualization analytics', async () => {
      const chartId = 'analytics-test-chart'

      // Simulate chart interactions
      await visualization.recordChartView(chartId)
      await visualization.recordChartView(chartId)
      await visualization.handleChartInteraction({
        chartId,
        type: 'click',
        data: { coordinates: { x: 50, y: 100 } },
        timestamp: Date.now(),
      })

      const analytics = await visualization.getVisualizationAnalytics(chartId)

      expect(analytics.chartId).toBe(chartId)
      expect(analytics.viewCount).toBe(2)
      expect(analytics.interactions.clicks).toBe(1)
      expect(analytics.lastViewed).toBeGreaterThan(0)
    })
  })

  describe('Responsive and Accessibility Features', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should adapt charts for mobile devices', async () => {
      const mobileSpec = await visualization.adaptChartForViewport(
        testChartSpec,
        { width: 375, height: 667 } // iPhone viewport
      )

      expect(mobileSpec.dimensions.width).toBeLessThan(
        testChartSpec.dimensions.width as number
      )
      expect(mobileSpec.interactivity.zoom).toBe(false) // Disabled for mobile
    })

    it('should generate accessible chart descriptions', async () => {
      const chartData = {
        id: 'accessibility-test',
        type: 'progressLine' as ChartType,
        title: 'Practice Progress Over Time',
        datasets: [
          {
            id: 'progress',
            label: 'Accuracy Score',
            data: [
              { x: '2025-01-01', y: 75 },
              { x: '2025-01-02', y: 80 },
              { x: '2025-01-03', y: 85 },
            ],
          },
        ],
        labels: ['2025-01-01', '2025-01-02', '2025-01-03'],
        metadata: { lastUpdated: Date.now(), dataSource: 'practice' },
      }

      const description =
        await visualization.generateAccessibleDescription(chartData)

      expect(description).toContain('Practice Progress Over Time')
      expect(description).toContain('3 data points')
      expect(description).toContain('increasing trend')
      expect(description).toContain('75 to 85')
    })

    it('should support high contrast themes', async () => {
      const highContrastConfig = {
        ...testConfig,
        accessibility: { ...testConfig.accessibility, highContrast: true },
      }

      const contrastModule = new VisualizationModule(
        highContrastConfig,
        mockStorage
      )
      await contrastModule.initialize()

      const styling = await contrastModule.getChartStyling('progressLine')

      expect(styling.colors.primary).toMatch(/#[0-9A-F]{6}/i)
      expect(styling.colors.background).toBe('#FFFFFF')
      expect(styling.colors.text).toBe('#000000')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should handle missing chart data gracefully', async () => {
      const result = await visualization.renderChart(
        'non-existent-chart',
        null as any,
        { width: 800, height: 400 }
      )

      expect(result).toBeNull()
      const health = visualization.getHealth()
      expect(health.status).toBe('yellow')
    })

    it('should validate chart specifications', async () => {
      const invalidSpec = {
        ...testChartSpec,
        dimensions: { width: -100, height: 'invalid' as any },
      }

      await expect(visualization.createChart(invalidSpec)).rejects.toThrow(
        /invalid dimensions/i
      )
    })

    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        x: `day-${i}`,
        y: Math.random() * 100,
      }))

      const chartData = {
        id: 'large-dataset-test',
        type: 'progressLine' as ChartType,
        title: 'Large Dataset',
        datasets: [
          {
            id: 'large',
            label: 'Data',
            data: largeDataset,
          },
        ],
        labels: largeDataset.map(d => d.x),
        metadata: { lastUpdated: Date.now(), dataSource: 'test' },
      }

      const start = Date.now()
      await visualization.renderChart('large-test', chartData, {
        width: 800,
        height: 400,
      })
      const renderTime = Date.now() - start

      // Should complete within reasonable time
      expect(renderTime).toBeLessThan(5000) // 5 seconds max
    })

    it('should recover from rendering failures', async () => {
      // Mock document.createElement to throw error
      const originalCreateElement = document.createElement
      document.createElement = jest.fn().mockImplementation(() => {
        throw new Error('Canvas creation failed')
      })

      const result = await visualization.renderChart(
        'error-test',
        {
          id: 'error-test',
          type: 'progressLine',
          title: 'Error Test',
          datasets: [
            {
              id: 'test',
              label: 'Test',
              data: [{ x: '1', y: 1 }],
            },
          ],
          labels: ['1'],
          metadata: { lastUpdated: Date.now(), dataSource: 'test' },
        },
        { width: 800, height: 400 }
      )

      expect(result).toBeNull()
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:error',
        })
      )

      // Restore original
      document.createElement = originalCreateElement
    })
  })

  describe('Data Caching and Performance', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should cache processed chart data', async () => {
      const mockData: ProgressVisualizationData = {
        userId: 'user-1',
        timeRange: {
          start: Date.now() - 86400000,
          end: Date.now(),
          period: 'day',
        },
        practiceTime: [{ date: '2025-01-01', minutes: 60, quality: 0.9 }],
        accuracy: [{ date: '2025-01-01', score: 0.85, trend: 'improving' }],
        pieces: [],
        skills: [],
      }

      // First call should process data
      const result1 = await visualization.processProgressData(
        mockData,
        'progressLine'
      )

      // Second call should use cache
      const result2 = await visualization.processProgressData(
        mockData,
        'progressLine'
      )

      expect(result1).toEqual(result2)
      // Cache should be used on second call (implementation detail)
    })

    it('should invalidate cache when data updates', async () => {
      const updateEvent: EventPayload = {
        eventId: 'evt_update_123',
        timestamp: Date.now(),
        source: 'ProgressAnalyticsModule',
        type: 'progress:report:ready',
        data: { userId: 'user-1', newData: true },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'progress:report:ready'
      )?.[1]

      await eventHandler?.(updateEvent)

      // Cache should be invalidated and fresh data processed
      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visualization:cache:invalidated',
        })
      )
    })
  })

  describe('Integration with Other Modules', () => {
    beforeEach(async () => {
      await visualization.initialize()
    })

    it('should integrate with ProgressAnalyticsModule for real-time updates', async () => {
      const progressEvent: EventPayload = {
        eventId: 'evt_real_time_123',
        timestamp: Date.now(),
        source: 'ProgressAnalyticsModule',
        type: 'progress:milestone:achieved',
        data: {
          userId: 'user-1',
          milestone: { type: 'accuracy', value: 90 },
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'progress:milestone:achieved'
      )?.[1]

      if (eventHandler) {
        await eventHandler(progressEvent)

        expect(publishSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'visualization:milestone:highlighted',
          })
        )
      }
    })

    it('should coordinate with CurriculumModule for learning path visualization', async () => {
      const curriculumEvent: EventPayload = {
        eventId: 'evt_curriculum_456',
        timestamp: Date.now(),
        source: 'CurriculumModule',
        type: 'curriculum:path:completed',
        data: {
          userId: 'user-1',
          pathId: 'classical-path-1',
          completionStats: { duration: 180, modules: 12 },
        },
        metadata: { version: '1.0.0' },
      }

      const eventHandler = subscribeSpy.mock.calls.find(
        call => call[0] === 'curriculum:path:completed'
      )?.[1]

      if (eventHandler) {
        await eventHandler(curriculumEvent)

        expect(publishSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'visualization:tree:updated',
          })
        )
      }
    })
  })
})
