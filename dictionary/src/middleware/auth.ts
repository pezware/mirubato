/**
 * Authentication Middleware for Dictionary API
 * JWT-only authentication following the scores service pattern
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { Env } from '../types/env'

export interface AuthOptions {
  optional?: boolean // Allow unauthenticated access
  roles?: string[] // Required roles
  scopes?: string[] // Required scopes
}

/**
 * JWT authentication middleware
 */
export function auth(options: AuthOptions = {}) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
      if (options.optional) {
        return await next()
      }
      throw new HTTPException(401, { message: 'Authorization header required' })
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Invalid authorization format' })
    }

    const token = authHeader.substring(7)

    try {
      // Verify JWT token
      if (!c.env.JWT_SECRET) {
        throw new HTTPException(500, { message: 'JWT secret not configured' })
      }
      const payload = (await verify(token, c.env.JWT_SECRET)) as any

      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new HTTPException(401, { message: 'Token expired' })
      }

      // Check roles if specified
      if (options.roles && options.roles.length > 0) {
        const userRoles = payload.roles || []
        const hasRole = options.roles.some((role: string) =>
          userRoles.includes(role)
        )

        if (!hasRole) {
          throw new HTTPException(403, {
            message: `Insufficient role. Required: ${options.roles.join(' or ')}`,
          })
        }
      }

      // Check scopes if specified
      if (options.scopes && options.scopes.length > 0) {
        const userScopes = payload.scopes || []
        const hasAllScopes = options.scopes.every((scope: string) =>
          userScopes.includes(scope)
        )

        if (!hasAllScopes) {
          throw new HTTPException(403, {
            message: `Insufficient scopes. Required: ${options.scopes.join(', ')}`,
          })
        }
      }

      // Set user context
      c.set('userId' as any, payload.sub || payload.user_id)
      c.set('userEmail' as any, payload.email)
      c.set('userRoles' as any, payload.roles || [])
      c.set('userScopes' as any, payload.scopes || [])
      c.set('userTier' as any, payload.tier || 'free')
      c.set('jwtPayload' as any, payload)

      await next()
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error
      }

      console.error('JWT verification error:', error)

      if (options.optional) {
        return await next()
      }

      throw new HTTPException(401, {
        message: 'Invalid or expired token',
        cause: error,
      })
    }
  }
}

/**
 * Check if user has permission for a resource
 */
export function requirePermission(
  resource: string,
  action: string,
  getResourceId?: (c: Context) => string
) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId' as any)
    const userRoles = c.get('userRoles' as any) || []

    // Admins have all permissions
    if (userRoles.includes('admin')) {
      return await next()
    }

    // Check specific permission
    const resourceId = getResourceId ? getResourceId(c) : null
    const hasPermission = await checkPermission(
      c.env.DB,
      userId,
      resource,
      action,
      resourceId
    )

    if (!hasPermission) {
      throw new HTTPException(403, {
        message: `Permission denied: ${action} on ${resource}`,
      })
    }

    await next()
  }
}

/**
 * Require ownership of a resource
 */
export function requireOwnership(
  getResourceOwnerId: (c: Context) => Promise<string | null>
) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get('userId' as any)
    const userRoles = c.get('userRoles' as any) || []

    // Admins can access any resource
    if (userRoles.includes('admin')) {
      return await next()
    }

    const ownerId = await getResourceOwnerId(c)

    if (!ownerId || ownerId !== userId) {
      throw new HTTPException(403, {
        message: 'Access denied: You do not own this resource',
      })
    }

    await next()
  }
}

/**
 * Service-to-service authentication
 */
export function serviceAuth(allowedServices: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const serviceHeader = c.req.header('X-Service-Name')
    const serviceToken = c.req.header('X-Service-Token')

    if (!serviceHeader || !serviceToken) {
      throw new HTTPException(401, {
        message: 'Service authentication required',
      })
    }

    if (!allowedServices.includes(serviceHeader)) {
      throw new HTTPException(403, {
        message: `Service ${serviceHeader} not allowed`,
      })
    }

    // Verify service token
    if (!c.env.JWT_SECRET) {
      throw new HTTPException(500, { message: 'JWT secret not configured' })
    }

    const expectedToken = await generateServiceToken(
      c.env.JWT_SECRET,
      serviceHeader
    )

    if (serviceToken !== expectedToken) {
      throw new HTTPException(401, {
        message: 'Invalid service token',
      })
    }

    c.set('serviceName' as any, serviceHeader)
    await next()
  }
}

/**
 * Extract user info from auth context
 */
export function getUserInfo(c: Context): {
  userId?: string
  email?: string
  authenticated: boolean
  method?: 'jwt' | 'service'
} {
  const userId = c.get('userId' as any)
  const email = c.get('userEmail' as any)
  const serviceName = c.get('serviceName' as any)

  if (userId) {
    return {
      userId,
      email,
      authenticated: true,
      method: 'jwt',
    }
  }

  if (serviceName) {
    return {
      authenticated: true,
      method: 'service',
    }
  }

  return {
    authenticated: false,
  }
}

// Helper functions

async function checkPermission(
  db: D1Database,
  userId: string,
  resource: string,
  action: string,
  resourceId: string | null
): Promise<boolean> {
  const result = await db
    .prepare(
      `
    SELECT COUNT(*) as allowed
    FROM user_permissions
    WHERE user_id = ?
      AND resource = ?
      AND action = ?
      AND (resource_id = ? OR resource_id IS NULL)
  `
    )
    .bind(userId, resource, action, resourceId)
    .first()

  return (result?.allowed as number) > 0
}

async function generateServiceToken(
  secret: string,
  serviceName: string
): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${serviceName}:${secret}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
