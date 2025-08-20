/**
 * JWT authentication utilities for sync-worker
 */

import { jwtVerify } from 'jose'

export interface TokenPayload {
  sub: string // user id
  email: string
  iat?: number
  exp?: number
}

/**
 * Verify JWT token
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

    // Validate required fields
    if (!payload.sub || typeof payload.sub !== 'string') {
      console.error('Invalid token: missing user ID')
      return null
    }

    return payload as unknown as TokenPayload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Extract and verify JWT from Authorization header
 */
export async function verifyAuthHeader(
  authHeader: string | null,
  secret: string
): Promise<TokenPayload | null> {
  if (!authHeader) {
    return null
  }

  // Check for Bearer token format
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    console.error('Invalid Authorization header format')
    return null
  }

  const token = match[1]
  return verifyToken(token, secret)
}

/**
 * Verify WebSocket connection token
 * Tokens can be passed as query parameters for WebSocket connections
 */
export async function verifyWebSocketToken(
  token: string | null,
  secret: string
): Promise<{ userId: string; email: string } | null> {
  if (!token) {
    console.error('No token provided for WebSocket connection')
    return null
  }

  const payload = await verifyToken(token, secret)
  if (!payload) {
    return null
  }

  return {
    userId: payload.sub,
    email: payload.email,
  }
}
