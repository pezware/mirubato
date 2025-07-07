import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  Monitor,
  createMonitor,
  getAdaptiveSampleRate,
  calculateCost,
  BatchMetricWriter,
} from '@shared/monitoring'

// Mock Analytics Engine
const mockAnalyticsEngine = {
  writeDataPoint: vi.fn(),
}

describe('Monitor', () => {
  let monitor: Monitor

  beforeEach(() => {
    vi.clearAllMocks()
    monitor = new Monitor(mockAnalyticsEngine as any, 'test-request-id')
  })

  describe('track', () => {
    it('should write data points to Analytics Engine', async () => {
      await monitor.track('test_event', {
        blobs: { key: 'value' },
        doubles: { metric: 123 },
      })

      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith({
        indexes: ['test_event'],
        blobs: {
          event: 'test_event',
          requestId: 'test-request-id',
          key: 'value',
        },
        doubles: {
          timestamp: expect.any(Number),
          metric: 123,
        },
      })
    })

    it('should respect sampling rate', async () => {
      // Test with 0% sampling
      await monitor.track('test_event', { sample: 0 })
      expect(mockAnalyticsEngine.writeDataPoint).not.toHaveBeenCalled()

      // Test with 100% sampling
      await monitor.track('test_event', { sample: 1 })
      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(1)
    })

    it('should respect max points per invocation limit', async () => {
      // Write 25 points (the default limit)
      for (let i = 0; i < 30; i++) {
        await monitor.track('test_event')
      }

      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(25)
    })

    it('should handle errors gracefully', async () => {
      mockAnalyticsEngine.writeDataPoint.mockImplementationOnce(() => {
        throw new Error('Analytics Engine error')
      })

      // Should not throw
      await expect(monitor.track('test_event')).resolves.toBeUndefined()
    })
  })

  describe('trackRequest', () => {
    it('should track request with proper metrics', async () => {
      await monitor.trackRequest(200, 150, {
        path: '/api/test',
        method: 'GET',
        worker: 'api',
      })

      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith({
        indexes: ['request:success'],
        blobs: {
          event: 'request',
          requestId: 'test-request-id',
          status: '200',
          path: '/api/test',
          method: 'GET',
          worker: 'api',
        },
        doubles: {
          timestamp: expect.any(Number),
          responseTime: 150,
          cpuTime: expect.any(Number),
          status: 200,
        },
      })
    })

    it('should categorize request types correctly', async () => {
      // Success
      await monitor.trackRequest(200, 100)
      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({ indexes: ['request:success'] })
      )

      // Client error
      vi.clearAllMocks()
      await monitor.trackRequest(404, 100)
      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({ indexes: ['request:client_error'] })
      )

      // Server error
      vi.clearAllMocks()
      await monitor.trackRequest(500, 100)
      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({ indexes: ['request:error'] })
      )
    })

    it('should always track errors (100% sampling)', async () => {
      await monitor.trackRequest(500, 100)
      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(1)
    })
  })

  describe('trackError', () => {
    it('should track errors with full context', async () => {
      const error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:10:5'

      await monitor.trackError(error, {
        worker: 'api',
        url: 'https://example.com/api/test',
      })

      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith({
        indexes: ['error:Error'],
        blobs: {
          event: 'error',
          requestId: 'test-request-id',
          message: 'Test error',
          stack: expect.stringContaining('Error: Test error'),
          worker: 'api',
          url: 'https://example.com/api/test',
        },
        doubles: {
          timestamp: expect.any(Number),
        },
      })
    })

    it('should limit error message and stack size', async () => {
      const longMessage = 'x'.repeat(2000)
      const longStack = 'y'.repeat(5000)
      const error = new Error(longMessage)
      error.stack = longStack

      await monitor.trackError(error)

      const call = mockAnalyticsEngine.writeDataPoint.mock.calls[0][0]
      expect(call.blobs.message).toHaveLength(1000)
      expect(call.blobs.stack).toHaveLength(4000)
    })
  })

  describe('trackBusiness', () => {
    it('should track business metrics', async () => {
      await monitor.trackBusiness('signups', 5, {
        plan: 'pro',
        country: 'US',
      })

      expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith({
        indexes: ['business:signups'],
        blobs: {
          event: 'business',
          requestId: 'test-request-id',
          metric: 'signups',
          plan: 'pro',
          country: 'US',
        },
        doubles: {
          timestamp: expect.any(Number),
          value: 5,
        },
      })
    })
  })

  describe('metrics', () => {
    it('should track data point count', () => {
      expect(monitor.getDataPointCount()).toBe(0)

      monitor.track('test1')
      monitor.track('test2')

      expect(monitor.getDataPointCount()).toBe(2)
    })

    it('should track elapsed time', async () => {
      const elapsed1 = monitor.getElapsedTime()

      await new Promise(resolve => setTimeout(resolve, 100))

      const elapsed2 = monitor.getElapsedTime()
      expect(elapsed2).toBeGreaterThan(elapsed1)
      expect(elapsed2).toBeGreaterThanOrEqual(100)
    })
  })
})

describe('createMonitor', () => {
  it('should create monitor with request ID from cf-ray header', () => {
    const mockRequest = {
      headers: {
        get: (name: string) => (name === 'cf-ray' ? 'test-ray-id' : null),
      },
    } as any

    const monitor = createMonitor(
      { ANALYTICS: mockAnalyticsEngine } as any,
      mockRequest
    )

    // Verify by checking the requestId in a tracked event
    monitor.track('test')
    expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        blobs: expect.objectContaining({
          requestId: 'test-ray-id',
        }),
      })
    )
  })

  it('should generate random UUID if no cf-ray header', () => {
    const mockRequest = {
      headers: {
        get: () => null,
      },
    } as any

    const monitor = createMonitor(
      { ANALYTICS: mockAnalyticsEngine } as any,
      mockRequest
    )

    monitor.track('test')
    const call = mockAnalyticsEngine.writeDataPoint.mock.calls[0][0]
    expect(call.blobs.requestId).toMatch(/^[0-9a-f-]{36}$/) // UUID format
  })
})

describe('getAdaptiveSampleRate', () => {
  it('should return appropriate sample rates based on traffic', () => {
    expect(getAdaptiveSampleRate(50)).toBe(1.0) // < 100
    expect(getAdaptiveSampleRate(500)).toBe(0.5) // < 1000
    expect(getAdaptiveSampleRate(5000)).toBe(0.1) // < 10000
    expect(getAdaptiveSampleRate(50000)).toBe(0.01) // >= 10000
  })
})

describe('calculateCost', () => {
  it('should calculate costs correctly', () => {
    expect(calculateCost('requests', 1_000_000)).toBeCloseTo(0.15)
    expect(calculateCost('cpu_time', 1_000_000)).toBeCloseTo(0.02)
    expect(calculateCost('d1_reads', 1_000_000)).toBeCloseTo(0.001)
    expect(calculateCost('d1_writes', 1_000_000)).toBeCloseTo(1.0)
  })

  it('should return 0 for unknown resources', () => {
    expect(calculateCost('unknown_resource', 1_000_000)).toBe(0)
  })
})

describe('BatchMetricWriter', () => {
  let monitor: Monitor
  let batch: BatchMetricWriter

  beforeEach(() => {
    vi.clearAllMocks()
    monitor = new Monitor(mockAnalyticsEngine as any, 'test-request-id')
    batch = new BatchMetricWriter(monitor)
  })

  it('should batch metrics and flush them', async () => {
    batch.add('metric1', { doubles: { value: 1 } })
    batch.add('metric2', { doubles: { value: 2 } })
    batch.add('metric3', { doubles: { value: 3 } })

    expect(batch.size()).toBe(3)
    expect(mockAnalyticsEngine.writeDataPoint).not.toHaveBeenCalled()

    await batch.flush()

    expect(mockAnalyticsEngine.writeDataPoint).toHaveBeenCalledTimes(3)
    expect(batch.size()).toBe(0)
  })

  it('should handle empty batch', async () => {
    expect(batch.size()).toBe(0)
    await batch.flush()
    expect(mockAnalyticsEngine.writeDataPoint).not.toHaveBeenCalled()
  })
})
