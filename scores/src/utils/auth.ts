import { jwtVerify } from 'jose'

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
