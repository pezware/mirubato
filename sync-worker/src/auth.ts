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
