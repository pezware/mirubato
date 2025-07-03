import { jwtVerify } from 'jose'
import { Context } from 'hono'
import type { UserRole } from '../types/collections'

export interface EnhancedTokenPayload {
  sub: string // user id
  email: string
  role?: UserRole
  displayName?: string
  primaryInstrument?: 'PIANO' | 'GUITAR' | 'BOTH'
  iat?: number
  exp?: number
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  displayName?: string
  primaryInstrument?: 'PIANO' | 'GUITAR' | 'BOTH'
}

/**
 * Verify JWT token with enhanced payload
 */
export async function verifyEnhancedToken(
  token: string,
  secret: string
): Promise<EnhancedTokenPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
  return payload as unknown as EnhancedTokenPayload
}

/**
 * Get authenticated user from authorization header
 * Returns null if no valid auth is present
 */
export async function getAuthUser(
  c: Context<{ Bindings: { JWT_SECRET: string; DB: D1Database } }>
): Promise<AuthUser | null> {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const payload = await verifyEnhancedToken(token, c.env.JWT_SECRET)

    // If role is not in token, fetch from API database
    // This ensures we always have the latest role information
    let role: UserRole = payload.role || 'user'

    if (!payload.role) {
      // For now, we'll check if email ends with @mirubato.com
      // In production, this would query the API service
      if (payload.email.endsWith('@mirubato.com')) {
        role = 'admin'
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      role,
      displayName: payload.displayName,
      primaryInstrument: payload.primaryInstrument,
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin'
}

/**
 * Check if user has teacher role
 */
export function isTeacher(user: AuthUser | null): boolean {
  return user?.role === 'teacher' || isAdmin(user)
}

/**
 * Check if user can manage collections
 */
export function canManageCollections(user: AuthUser | null): boolean {
  return !!user // Any authenticated user can manage their own collections
}

/**
 * Check if user can feature collections
 */
export function canFeatureCollections(user: AuthUser | null): boolean {
  return isAdmin(user)
}

/**
 * Check if user can share collections
 */
export function canShareCollections(user: AuthUser | null): boolean {
  return isTeacher(user)
}
