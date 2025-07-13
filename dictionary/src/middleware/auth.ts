/**
 * Authentication Middleware for Dictionary API
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verify } from 'hono/jwt'
import { Env } from '../types/env'

export interface AuthOptions {
  optional?: boolean  // Allow unauthenticated access
  roles?: string[]    // Required roles
  scopes?: string[]   // Required scopes
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
      const payload = await verify(token, c.env.JWT_SECRET) as any

      // Check if token is expired
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new HTTPException(401, { message: 'Token expired' })
      }

      // Check roles if specified
      if (options.roles && options.roles.length > 0) {
        const userRoles = payload.roles || []
        const hasRole = options.roles.some((role: string) => userRoles.includes(role))
        
        if (!hasRole) {
          throw new HTTPException(403, { 
            message: `Insufficient role. Required: ${options.roles.join(' or ')}` 
          })
        }
      }

      // Check scopes if specified
      if (options.scopes && options.scopes.length > 0) {
        const userScopes = payload.scopes || []
        const hasAllScopes = options.scopes.every((scope: string) => userScopes.includes(scope))
        
        if (!hasAllScopes) {
          throw new HTTPException(403, { 
            message: `Insufficient scopes. Required: ${options.scopes.join(', ')}` 
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
        cause: error 
      })
    }
  }
}

/**
 * API Key authentication middleware
 */
export function apiKeyAuth(options: {
  header?: string
  query?: string
  optional?: boolean
} = {}) {
  const { header = 'X-API-Key', query = 'apikey', optional = false } = options

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Check header first, then query parameter
    const apiKey = c.req.header(header) || c.req.query(query)

    if (!apiKey) {
      if (optional) {
        return await next()
      }
      throw new HTTPException(401, { message: 'API key required' })
    }

    try {
      // Validate API key format
      if (!isValidApiKeyFormat(apiKey)) {
        throw new Error('Invalid API key format')
      }

      // Look up API key in database
      const keyData = await c.env.DB.prepare(`
        SELECT * FROM api_keys 
        WHERE key_hash = ? AND active = 1
      `).bind(await hashApiKey(apiKey)).first()

      if (!keyData) {
        throw new Error('Invalid API key')
      }

      // Check expiration
      if (keyData.expires_at && new Date(keyData.expires_at as string) < new Date()) {
        throw new Error('API key expired')
      }

      // Update last used timestamp
      await c.env.DB.prepare(`
        UPDATE api_keys 
        SET last_used_at = ?, usage_count = usage_count + 1
        WHERE id = ?
      `).bind(new Date().toISOString(), keyData.id).run()

      // Set context
      c.set('apiKeyId' as any, keyData.id as string)
      c.set('apiKeyName' as any, keyData.name as string)
      c.set('apiKeyScopes' as any, JSON.parse(keyData.scopes as string || '[]'))
      c.set('userId' as any, keyData.user_id as string)

      await next()
    } catch (error) {
      if (optional) {
        return await next()
      }

      console.error('API key validation error:', error)
      throw new HTTPException(401, { 
        message: error instanceof Error ? error.message : 'Invalid API key' 
      })
    }
  }
}

/**
 * Combined authentication - tries JWT first, then API key
 */
export function combinedAuth(options: AuthOptions & {
  apiKeyHeader?: string
  apiKeyQuery?: string
} = {}) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization')
    const apiKeyHeader = c.req.header(options.apiKeyHeader || 'X-API-Key')
    const apiKeyQuery = c.req.query(options.apiKeyQuery || 'apikey')

    // Try JWT first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwtMiddleware = auth(options)
        return await jwtMiddleware(c, next)
      } catch (error) {
        // If JWT fails and we have an API key, try that
        if (!apiKeyHeader && !apiKeyQuery) {
          throw error
        }
      }
    }

    // Try API key
    if (apiKeyHeader || apiKeyQuery) {
      const apiKeyMiddleware = apiKeyAuth({
        header: options.apiKeyHeader,
        query: options.apiKeyQuery,
        optional: options.optional
      })
      return await apiKeyMiddleware(c, next)
    }

    // No auth provided
    if (options.optional) {
      return await next()
    }

    throw new HTTPException(401, { 
      message: 'Authentication required. Provide either Bearer token or API key' 
    })
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
        message: `Permission denied: ${action} on ${resource}` 
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
        message: 'Access denied: You do not own this resource' 
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
        message: 'Service authentication required' 
      })
    }

    if (!allowedServices.includes(serviceHeader)) {
      throw new HTTPException(403, { 
        message: `Service ${serviceHeader} not allowed` 
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
        message: 'Invalid service token' 
      })
    }

    c.set('serviceName' as any, serviceHeader)
    await next()
  }
}

// Helper functions

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function isValidApiKeyFormat(apiKey: string): boolean {
  // Format: dict_[env]_[random32chars]
  return /^dict_(dev|staging|prod)_[a-zA-Z0-9]{32}$/.test(apiKey)
}

async function checkPermission(
  db: D1Database,
  userId: string,
  resource: string,
  action: string,
  resourceId: string | null
): Promise<boolean> {
  const result = await db.prepare(`
    SELECT COUNT(*) as allowed
    FROM user_permissions
    WHERE user_id = ?
      AND resource = ?
      AND action = ?
      AND (resource_id = ? OR resource_id IS NULL)
  `).bind(userId, resource, action, resourceId).first()

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

/**
 * Extract user info from various auth methods
 */
export function getUserInfo(c: Context): {
  userId?: string
  email?: string
  authenticated: boolean
  method?: 'jwt' | 'apikey' | 'service'
} {
  const userId = c.get('userId' as any)
  const email = c.get('userEmail' as any)
  const apiKeyId = c.get('apiKeyId' as any)
  const serviceName = c.get('serviceName' as any)

  if (userId) {
    return {
      userId,
      email,
      authenticated: true,
      method: apiKeyId ? 'apikey' : 'jwt'
    }
  }

  if (serviceName) {
    return {
      authenticated: true,
      method: 'service'
    }
  }

  return {
    authenticated: false
  }
}

/**
 * Legacy middleware that handles both JWT and API key auth
 */
export function authMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authHeader = c.req.header('Authorization')
    const apiKey = c.req.header('X-API-Key')
    
    // Handle API key
    if (apiKey) {
      c.set('apiKey' as any, apiKey)
    }
    
    // Handle JWT
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        if (!c.env.JWT_SECRET) {
          throw new Error('JWT secret not configured')
        }
        const payload = await verify(token, c.env.JWT_SECRET) as any
        c.set('user' as any, payload)
      } catch (error) {
        // Set user to null on error
        c.set('user' as any, null)
      }
    } else {
      c.set('user' as any, null)
    }
    
    await next()
  }
}

/**
 * Legacy require auth that checks for user or API key
 */
export function requireAuth() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const user = c.get('user' as any)
    const apiKey = c.get('apiKey' as any)
    const serviceAuth = c.req.header('X-Service-Auth')
    
    // Allow service-to-service
    if (serviceAuth) {
      return await next()
    }
    
    // Check API key if present
    if (apiKey && !user) {
      try {
        const keyData = await validateAPIKey(apiKey, c.env)
        if (keyData) {
          return await next()
        }
      } catch (error) {
        // Fall through to unauthorized
      }
    }
    
    // Check user auth
    if (!user) {
      return c.json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, 401)
    }
    
    await next()
  }
}

/**
 * Validate API key from cache
 */
export async function validateAPIKey(apiKey: string, env: Env): Promise<any> {
  try {
    const cacheKey = `api_key:${apiKey}`
    const cached = await env.CACHE.get(cacheKey)
    
    if (cached) {
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    console.error('API key validation error:', error)
    return null
  }
}