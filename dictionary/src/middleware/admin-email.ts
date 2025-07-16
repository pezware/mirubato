/**
 * Admin Email Validation Middleware
 * Restricts access to users with @mirubato.com email addresses
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Env, Variables } from '../types/env'

/**
 * Validates that authenticated user has a @mirubato.com email
 * Must be used AFTER auth() middleware
 */
export function adminEmailAuth() {
  return async (
    c: Context<{ Bindings: Env; Variables: Variables }>,
    next: Next
  ) => {
    // Get user email from JWT payload (set by auth middleware)
    const userEmail = c.get('userEmail')

    if (!userEmail) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    // Validate email domain - must be exactly @mirubato.com
    // This regex ensures no subdomain tricks like @mirubato.com.hacker.com
    const validEmailPattern = /^[^@]+@mirubato\.com$/

    if (!validEmailPattern.test(userEmail)) {
      throw new HTTPException(403, {
        message: 'Access restricted to @mirubato.com email addresses',
      })
    }

    // Set admin flag for downstream use
    c.set('isAdmin', true)

    await next()
  }
}

/**
 * Helper to check if current user is admin
 */
export function isAdminUser(
  c: Context<{ Bindings: Env; Variables: Variables }>
): boolean {
  const userEmail = c.get('userEmail')
  if (!userEmail) return false

  const validEmailPattern = /^[^@]+@mirubato\.com$/
  return validEmailPattern.test(userEmail)
}
