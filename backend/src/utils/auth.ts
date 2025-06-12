import * as jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import type { BackendUser } from '../types/shared'

export interface JWTPayload {
  sub: string
  email: string
  user: BackendUser
  iat: number
  exp: number
}

export interface MagicLinkPayload {
  email: string
  token: string
  exp: number
}

// Generate a magic link token
export function generateMagicLinkToken(): string {
  return nanoid(32)
}

// Create a JWT token
export async function createJWT(
  user: BackendUser,
  secret: string,
  expiresIn: string | number = '15m'
): Promise<string> {
  const payload = {
    sub: user.id,
    email: user.email,
    user,
  }

  // @ts-expect-error - JWT library type definitions have compatibility issues
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'mirubato',
  })
}

// Create a refresh token
export async function createRefreshToken(
  userId: string,
  secret: string,
  user?: BackendUser
): Promise<string> {
  const payload: { sub: string; type: string; user?: BackendUser } = {
    sub: userId,
    type: 'refresh',
  }

  // Include full user data for temp users
  if (userId.startsWith('temp_') && user) {
    payload.user = user
  }

  return jwt.sign(payload, secret, {
    expiresIn: '30d',
    issuer: 'mirubato',
  })
}

// Verify a JWT token
export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  try {
    const payload = jwt.verify(token, secret, {
      issuer: 'mirubato',
    }) as JWTPayload

    return payload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

// Verify a refresh token
export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<{ sub: string; user?: BackendUser }> {
  try {
    const payload = jwt.verify(token, secret, {
      issuer: 'mirubato',
    }) as { sub: string; type: string; user?: BackendUser }

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type')
    }

    return { sub: payload.sub, user: payload.user }
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}

// Hash email for privacy
export function hashEmail(email: string): string {
  return Buffer.from(email).toString('base64')
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
