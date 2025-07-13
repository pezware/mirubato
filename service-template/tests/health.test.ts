import { describe, it, expect, beforeAll } from 'vitest'
import { app } from '../src/app'
import type { Env } from '../src/types'

// Mock environment
const mockEnv: Env = {
  DB: {
    prepare: () => ({
      first: async () => ({ '1': 1 }),
    }),
  } as any,
  CACHE: {
    put: async () => {},
    get: async () => 'ok',
    delete: async () => {},
  } as any,
  JWT_SECRET: 'test-secret',
  ENVIRONMENT: 'test' as any,
  CORS_ORIGIN: '*',
  LOG_LEVEL: 'debug',
}

describe('Health Endpoints', () => {
  describe('GET /livez', () => {
    it('should return ok status', async () => {
      const res = await app.request('/livez', {}, mockEnv)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({ status: 'ok' })
    })
  })

  describe('GET /readyz', () => {
    it('should return ready when database is accessible', async () => {
      const res = await app.request('/readyz', {}, mockEnv)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toEqual({ status: 'ready' })
    })

    it('should return not ready when database fails', async () => {
      const failEnv = {
        ...mockEnv,
        DB: {
          prepare: () => ({
            first: async () => {
              throw new Error('Database error')
            },
          }),
        } as any,
      }

      const res = await app.request('/readyz', {}, failEnv)
      const json = await res.json()

      expect(res.status).toBe(503)
      expect(json.status).toBe('not ready')
      expect(json.error).toBeDefined()
    })
  })

  describe('GET /health', () => {
    it('should return comprehensive health status', async () => {
      const res = await app.request('/health', {}, mockEnv)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json).toMatchObject({
        status: 'healthy',
        environment: 'test',
        checks: {
          database: true,
          cache: true,
        },
      })
      expect(json.timestamp).toBeDefined()
      expect(json.version).toBeDefined()
    })
  })

  describe('GET /metrics', () => {
    it('should return Prometheus-formatted metrics', async () => {
      const res = await app.request('/metrics', {}, mockEnv)
      const text = await res.text()

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('text/plain; version=0.0.4')
      expect(text).toContain('# HELP service_info')
      expect(text).toContain('# TYPE service_info gauge')
      expect(text).toContain('service_info{')
    })
  })
})
