import * as jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import type { User } from '../types/shared'

export interface JWTPayload {
  sub: string
  email: string
  user: User
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
  user: User,
  secret: string,
  expiresIn = '15m'
): Promise<string> {
  const payload = {
    sub: user.id,
    email: user.email,
    user,
  }

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn as any,
    issuer: 'mirubato',
  })
}

// Create a refresh token
export async function createRefreshToken(
  userId: string,
  secret: string
): Promise<string> {
  return jwt.sign(
    {
      sub: userId,
      type: 'refresh',
    },
    secret,
    {
      expiresIn: '30d',
      issuer: 'mirubato',
    }
  )
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
): Promise<{ sub: string }> {
  try {
    const payload = jwt.verify(token, secret, {
      issuer: 'mirubato',
    }) as { sub: string; type: string }

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type')
    }

    return { sub: payload.sub }
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
