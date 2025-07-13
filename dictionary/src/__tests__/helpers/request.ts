import { Hono } from 'hono'
import type { ExecutionContext } from 'hono'

export function createRequest(
  app: Hono<any>,
  url: string,
  options: RequestInit = {},
  env: any = {},
  executionContext?: ExecutionContext
) {
  // Create a mock execution context if not provided
  const ctx = executionContext || {
    waitUntil: (promise: Promise<any>) => promise,
    passThroughOnException: () => {}
  } as ExecutionContext

  // Wrap the app to inject the execution context
  const wrappedApp = new Hono()
  
  wrappedApp.use('*', async (c, next) => {
    // Inject the execution context into the Hono context
    Object.defineProperty(c, 'executionCtx', {
      value: ctx,
      writable: false,
      configurable: true
    })
    return await next()
  })
  
  // Mount the original app
  wrappedApp.route('/', app)
  
  return wrappedApp.request(url, options, env)
}