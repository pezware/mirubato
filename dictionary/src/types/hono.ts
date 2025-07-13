/**
 * Hono type definitions for the dictionary service
 */

import type { Context as HonoContext } from 'hono'
import type { Env, Variables } from './env'

// Create a properly typed context for our handlers
export type AppContext = HonoContext<{ Bindings: Env; Variables: Variables }>

// Re-export commonly used Hono types
export { Hono } from 'hono'
export type { Next } from 'hono'
export type { MiddlewareHandler } from 'hono'