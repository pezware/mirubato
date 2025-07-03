import { jwtVerify } from 'jose'
import { Context } from 'hono'

export interface TokenPayload {
  sub: string // user id
  email: string
  iat?: number
  exp?: number
}

/**
 * Verify JWT token
 * Used to validate tokens issued by the main API service
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))

  return payload as unknown as TokenPayload
}

/**
 * Get user ID from authorization header
 * Returns null if no valid auth is present
 */
export async function getUserIdFromAuth(
  c: Context<{ Bindings: { JWT_SECRET: string } }>
): Promise<string | null> {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const payload = await verifyToken(token, c.env.JWT_SECRET)
    return payload.sub
  } catch (error) {
    return null
  }
}
