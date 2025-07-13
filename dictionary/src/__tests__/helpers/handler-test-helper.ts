/**
 * Test helpers for Cloudflare Workers handlers
 */

import type { ExecutionContext } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import type { Env } from '../../types/env'
import { vi } from 'vitest'

/**
 * Creates a mock ExecutionContext for testing
 */
export function createExecutionContext(): ExecutionContext {
  const waitUntilPromises: Promise<any>[] = []

  return {
    waitUntil(promise: Promise<any>): void {
      waitUntilPromises.push(promise)
    },
    passThroughOnException(): void {
      // No-op for tests
    },
    // For testing, we can access the promises
    _waitUntilPromises: waitUntilPromises,
  } as ExecutionContext & { _waitUntilPromises: Promise<any>[] }
}

/**
 * Creates a test request with the correct base URL
 */
export function createTestRequest(
  path: string,
  options?: RequestInit
): Request {
  const url = `http://localhost:9799${path}`
  return new Request(url, options)
}

/**
 * Test a Hono handler directly
 */
export async function testHandler(
  handler: Hono<{ Bindings: Env }>,
  request: Request,
  env: Env,
  ctx?: ExecutionContext
): Promise<Response> {
  const executionContext = ctx || createExecutionContext()
  return handler.fetch(request, env, executionContext)
}

/**
 * Create a mock environment for testing
 */
export function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    DB: {} as any,
    CACHE: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ keys: [] }),
    } as any,
    STORAGE: {} as any,
    AI: {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          term: 'test',
          definition: 'Test definition',
          quality_score: { overall: 80 },
        }),
      }),
    } as any,
    QUALITY_THRESHOLD: '70',
    CACHE_TTL: '3600',
    ENVIRONMENT: 'test',
    API_SERVICE_URL: 'http://localhost:8787',
    JWT_SECRET: 'test-secret',
    ...overrides,
  }
}

/**
 * Wait for all waitUntil promises to resolve
 */
export async function waitForWaitUntil(ctx: ExecutionContext): Promise<void> {
  const ctxWithPromises = ctx as ExecutionContext & {
    _waitUntilPromises?: Promise<any>[]
  }
  if (ctxWithPromises._waitUntilPromises) {
    await Promise.all(ctxWithPromises._waitUntilPromises)
  }
}
