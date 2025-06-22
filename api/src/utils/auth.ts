import { SignJWT, jwtVerify } from 'jose'
import { nanoid } from 'nanoid'

export interface TokenPayload {
  sub: string // user id
  email: string
  iat?: number
  exp?: number
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  userId: string,
  email: string,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))

  return jwt
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(
  userId: string,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .setJti(nanoid()) // unique token id
    .sign(new TextEncoder().encode(secret))

  return jwt
}

/**
 * Verify JWT token
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

  return payload as unknown as TokenPayload
}

/**
 * Generate magic link token
 */
export async function generateMagicLinkToken(
  email: string,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT({ email, type: 'magic_link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // 15 minutes
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
): Promise<{ email: string }> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

  if (payload.type !== 'magic_link') {
    throw new Error('Invalid token type')
  }

  return { email: payload.email as string }
}

/**
 * Hash password (for future use if needed)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
}

/**
 * Generate secure random token
 */
export function generateSecureToken(): string {
  return nanoid(32)
}
