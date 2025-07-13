import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { healthHandler } from '../../api/handlers/health'
import type { Env } from '../../types/env'
import {
  createTestRequest,
  testHandler,
  createMockEnv,
} from '../helpers/handler-test-helper'

// Mock the CloudflareAIService
vi.mock('../../services/ai/cloudflare-ai-service', () => ({
  CloudflareAIService: vi.fn().mockImplementation(() => ({
    testModel: vi.fn().mockResolvedValue({ success: true }),
    generateStructuredContent: vi.fn().mockResolvedValue({
      response: JSON.stringify({ definition: 'A musical term' }),
    }),
    testConnection: vi.fn().mockResolvedValue({ available: true, latency: 10 }),
  })),
}))

describe('Health Handler', () => {
  let mockEnv: Env

  beforeEach(() => {
    // Create mock environment with DB prepared statement
    mockEnv = createMockEnv({
      DB: {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ '1': 1 }),
          all: vi.fn().mockResolvedValue({ results: [{ count: 100 }] }),
        }),
      } as any,
      STORAGE: {
        head: vi.fn().mockResolvedValue({ size: 1000 }),
        list: vi.fn().mockResolvedValue({ objects: [] }),
      } as any,
      CACHE: {
        get: vi.fn().mockResolvedValue('test-value'),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue({ keys: [] }),
      } as any,
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
    })

    // Mock global fetch for API key tests
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    } as any)

    // Add AI to mockEnv after it's created
    mockEnv.AI = {
      run: vi.fn().mockResolvedValue({ response: 'test' }),
    } as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /livez', () => {
    it('should return ok status', async () => {
      const request = createTestRequest('/livez')
      const response = await testHandler(healthHandler, request, mockEnv)

      expect(response.status).toBe(200)
      const data = (await response.json()) as any
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('GET /readyz', () => {
    it('should return ready when database is accessible', async () => {
      const request = createTestRequest('/readyz')
      const response = await testHandler(healthHandler, request, mockEnv)

      expect(response.status).toBe(200)
      const data = (await response.json()) as any
      expect(data.status).toBe('ready')
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith('SELECT 1')
    })

    it('should return not ready when database is not accessible', async () => {
      // Mock database error
      ;(mockEnv.DB.prepare as any).mockReturnValue({
        first: vi
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      })

      const request = createTestRequest('/readyz')
      const response = await testHandler(healthHandler, request, mockEnv)

      expect(response.status).toBe(503)
      const data = (await response.json()) as any
      expect(data.status).toBe('not ready')
      expect(data.error).toContain('Database connection failed')
    })
  })

  describe('GET /health', () => {
    it('should return comprehensive health check', async () => {
      const request = createTestRequest('/health')
      const response = await testHandler(healthHandler, request, mockEnv)

      const data = (await response.json()) as any
      // Remove debug log since test should pass now
      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.service).toBe('mirubato-dictionary')
      expect(data.version).toBeDefined()
      expect(data.environment).toBe('test')
      expect(data.timestamp).toBeDefined()
      expect(data.services).toBeDefined()

      // Check individual service statuses
      expect(data.services.database.status).toBe('healthy')
      expect(data.services.cache.status).toBe('healthy')
      expect(data.services.storage.status).toBe('healthy')
      expect(data.services.ai.cloudflare.status).toBe('healthy')
    })

    it('should return degraded status when some services are unhealthy', async () => {
      // Mock cache failure
      ;(mockEnv.CACHE.get as any).mockRejectedValue(
        new Error('Cache unavailable')
      )

      const request = createTestRequest('/health')
      const response = await testHandler(healthHandler, request, mockEnv)

      expect(response.status).toBe(503)
      const data = (await response.json()) as any
      expect(data.status).toBe('degraded')
      expect(data.services.cache.status).toBe('unhealthy')
    })
  })

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const request = createTestRequest('/health/detailed')
      const response = await testHandler(healthHandler, request, mockEnv)

      expect(response.status).toBe(200)
      const data = (await response.json()) as any

      // The detailed endpoint doesn't have a status field
      expect(data.timestamp).toBeDefined()
      expect(data.service).toBe('mirubato-dictionary')
      expect(data.version).toBeDefined()
      expect(data.ai).toBeDefined()
      expect(data.ai.models).toBeDefined()
      expect(Array.isArray(data.ai.models)).toBe(true)
    })
  })

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const request = createTestRequest('/metrics')
      const response = await testHandler(healthHandler, request, mockEnv)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe(
        'text/plain; version=0.0.4'
      )

      const text = await response.text()
      expect(text).toContain('# HELP dictionary_entries_total')
      expect(text).toContain('# TYPE dictionary_entries_total gauge')
      expect(text).toContain('dictionary_service_info')
    })
  })
})
