/**
 * Authentication utilities for Dictionary Admin Portal
 */

import { SignJWT, jwtVerify } from 'jose'
import { nanoid } from 'nanoid'

/**
 * Generate magic link token
 * Creates a JWT token that expires in 1 hour for admin portal access
 */
export async function generateMagicLinkToken(
  email: string,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT({
    email,
    type: 'magic_link',
    isAdmin: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // 1 hour for admin portal
    .setJti(nanoid())
    .sign(new TextEncoder().encode(secret))

  return jwt
}

/**
 * Verify magic link token
 */
export async function verifyMagicLinkToken(
  token: string,
  secret: string
): Promise<{ email: string; isAdmin: boolean }> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

  if (payload.type !== 'magic_link') {
    throw new Error('Invalid token type')
  }

  return {
    email: payload.email as string,
    isAdmin: (payload.isAdmin as boolean) || false,
  }
}

/**
 * Generate JWT access token for authenticated sessions
 */
export async function generateAccessToken(
  email: string,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT({
    email,
    isAdmin: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Longer session for admin work
    .sign(new TextEncoder().encode(secret))

  return jwt
}

/**
 * Verify JWT access token
 */
export async function verifyAccessToken(
  token: string,
  secret: string
): Promise<{ email: string; isAdmin: boolean }> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

  return {
    email: payload.email as string,
    isAdmin: (payload.isAdmin as boolean) || false,
  }
}
