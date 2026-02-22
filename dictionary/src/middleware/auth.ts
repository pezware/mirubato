/**
 * Authentication Middleware for Dictionary API
 * JWT-only authentication following the scores service pattern
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { Env, Variables } from '../types/env'

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

export interface AuthOptions {
  optional?: boolean // Allow unauthenticated access
  roles?: string[] // Required roles
  scopes?: string[] // Required scopes
}

/**
 * JWT authentication middleware
 */
export function auth(options: AuthOptions = {}) {
  return async (c: AppContext, next: Next) => {
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
      // Verify JWT token - let it fail naturally if JWT_SECRET is undefined
      const payload = (await verify(
        token,
        c.env.JWT_SECRET as string,
        'HS256'
      )) as Record<string, unknown>

      // Check if token is expired
      const exp = payload.exp as number | undefined
      if (exp && exp < Math.floor(Date.now() / 1000)) {
        throw new HTTPException(401, { message: 'Token expired' })
      }

      // Check roles if specified
      if (options.roles && options.roles.length > 0) {
        const userRoles = (payload.roles as string[]) || []

        // For compatibility with main API tokens, check email domain for admin role
        const userObj = payload.user as Record<string, unknown> | undefined
        const email = (payload.email as string) || (userObj?.email as string)
        if (options.roles.includes('admin') && email) {
          // Allow @mirubato.com emails or specific test email
          const isAdminEmail =
            email.endsWith('@mirubato.com') ||
            email === 'andyxiang.work@gmail.com'
          if (isAdminEmail) {
            userRoles.push('admin')
          }
        }

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
        const userScopes = (payload.scopes as string[]) || []
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
      c.set('userId', (payload.sub || payload.user_id) as string)
      c.set('userEmail', payload.email as string)
      c.set('userRoles', (payload.roles as string[]) || [])
      c.set('userScopes', (payload.scopes as string[]) || [])
      c.set('userTier', (payload.tier as string) || 'free')
      c.set('jwtPayload', payload)

      await next()
    } catch (error) {
      // If auth is optional and verification fails, just continue without auth
      if (options.optional) {
        return await next()
      }

      if (error instanceof HTTPException) {
        throw error
      }

      // For required auth, return proper error
      console.error('JWT verification failed:', error)
      throw new HTTPException(401, {
        message: 'Invalid or expired token',
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
  return async (c: AppContext, next: Next) => {
    const userId = c.get('userId')
    const userRoles = c.get('userRoles') || []

    if (!userId) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

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
  return async (c: AppContext, next: Next) => {
    const userId = c.get('userId')
    const userRoles = c.get('userRoles') || []

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
  return async (c: AppContext, next: Next) => {
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

    c.set('serviceName', serviceHeader)
    await next()
  }
}

/**
 * Extract user info from auth context
 */
export function getUserInfo(c: AppContext): {
  userId?: string
  email?: string
  authenticated: boolean
  method?: 'jwt' | 'service'
} {
  const userId = c.get('userId')
  const email = c.get('userEmail')
  const serviceName = c.get('serviceName')

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
