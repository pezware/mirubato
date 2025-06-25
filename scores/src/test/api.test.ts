import { describe, it, expect } from 'vitest'
import app from '../index'

// Mock environment bindings
const mockEnv = {
  DB: {
    prepare: () => ({
      first: async () => ({ count: 5 }),
      all: async () => ({ results: [] }),
      run: async () => ({ success: true }),
    }),
  },
  SCORES_BUCKET: {
    list: async () => ({ objects: [] }),
    put: async () => {},
    get: async () => null,
    delete: async () => {},
  },
  CACHE: {
    get: async () => 'test',
    put: async () => {},
    delete: async () => {},
  },
}

describe('Scores API', () => {
  it('should return health check', async () => {
    const response = await app.request('/health', {}, mockEnv)
    const json = (await response.json()) as any

    expect(response.status).toBe(200)
    expect(json.status).toBe('healthy')
    expect(json.service).toBe('mirubato-scores')
  })

  it('should return API documentation page', async () => {
    const response = await app.request('/api/docs', {}, mockEnv)

    // The /api/docs endpoint returns a redirect to /docs
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/docs')
  })

  it('should handle 404', async () => {
    const response = await app.request('/non-existent', {}, mockEnv)
    const json = (await response.json()) as any

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Not found')
  })
})
