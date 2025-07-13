import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, getUserId } from '../src/middleware/auth'
import { rateLimiter } from '../src/middleware/rate-limit'
import { validateBody } from '../src/middleware/validation'
import { SignJWT } from 'jose'
import { z } from 'zod'
import type { Env } from '../src/types'

const mockEnv: Env = {
  DB: {} as any,
  CACHE: {
    get: async () => null,
    put: async () => {},
  } as any,
  JWT_SECRET: 'test-secret',
  ENVIRONMENT: 'test' as any,
  CORS_ORIGIN: '*',
  LOG_LEVEL: 'debug',
}

describe('Middleware', () => {
  describe('Auth Middleware', () => {
    it('should reject requests without token', async () => {
      const app = new Hono<{ Bindings: Env }>()
      app.use('*', authMiddleware)
      app.get('/', c => c.json({ success: true }))

      const res = await app.request('/', {}, mockEnv)
      expect(res.status).toBe(401)
    })

    it('should accept valid JWT token', async () => {
      const app = new Hono<{ Bindings: Env }>()
      app.use('*', authMiddleware)
      app.get('/', c => {
        const userId = getUserId(c)
        return c.json({ success: true, userId })
      })

      // Create valid JWT
      const secret = new TextEncoder().encode(mockEnv.JWT_SECRET)
      const token = await new SignJWT({ sub: 'user123', email: 'test@example.com' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret)

      const res = await app.request(
        '/',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        mockEnv
      )

      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.userId).toBe('user123')
    })
  })

  describe('Rate Limit Middleware', () => {
    it('should allow requests within limit', async () => {
      const app = new Hono<{ Bindings: Env }>()
      app.use('*', rateLimiter({ requests: 2, window: 60 }))
      app.get('/', c => c.json({ success: true }))

      const res1 = await app.request('/', {}, mockEnv)
      expect(res1.status).toBe(200)

      const res2 = await app.request('/', {}, mockEnv)
      expect(res2.status).toBe(200)
    })
  })

  describe('Validation Middleware', () => {
    it('should validate request body', async () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().positive(),
      })

      const app = new Hono<{ Bindings: Env }>()
      app.post('/', validateBody(schema), c => {
        return c.json({ success: true })
      })

      // Valid request
      const validRes = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John', age: 25 }),
        },
        mockEnv
      )
      expect(validRes.status).toBe(200)

      // Invalid request
      const invalidRes = await app.request(
        '/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '', age: -5 }),
        },
        mockEnv
      )
      expect(invalidRes.status).toBe(400)
    })
  })
})
