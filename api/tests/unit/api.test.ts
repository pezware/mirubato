import { describe, it, expect, vi } from 'vitest'
import { app } from '../../src/index'

// Mock the environment
const mockEnv = {
  DB: {
    prepare: vi.fn(() => ({
      first: vi.fn().mockResolvedValue({ '1': 1, count: 10 }),
      all: vi.fn().mockResolvedValue({ results: [] }),
      run: vi.fn().mockResolvedValue({}),
      bind: vi.fn().mockReturnThis(),
    })),
    batch: vi.fn().mockResolvedValue([]),
  },
  ENVIRONMENT: 'test',
  JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation',
  MAGIC_LINK_SECRET: 'test-magic-link-secret',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  MUSIC_CATALOG: {
    get: vi.fn().mockImplementation(async key => {
      if (key === '__health_check_test') return '{"timestamp": 123}'
      return null
    }),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [] }),
  },
  RATE_LIMITER: undefined,
}

describe('API Basic Tests', () => {
  it('should return health check', async () => {
    const response = await app.request('/health', {}, mockEnv)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('status')
  })

  it('should return 404 for unknown routes', async () => {
    const response = await app.request('/unknown', {}, mockEnv)

    expect(response.status).toBe(404)
  })

  it('should return API info at root', async () => {
    const response = await app.request('/api', {}, mockEnv)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('endpoints')
  })

  it('should return landing page at root', async () => {
    const response = await app.request('/', {}, mockEnv)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
  })
})
