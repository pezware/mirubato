import type { KVNamespace } from '@cloudflare/workers-types'
import {
  generateMagicLinkToken,
  createJWT,
  createRefreshToken,
  verifyRefreshToken as verifyToken,
  verifyJWT as verifyJWTUtil,
} from '../utils/auth'
import type { BackendUser } from '../types/shared'
import type { JWTPayload } from '../utils/auth'

export class AuthService {
  private readonly MAGIC_LINK_TTL = 3600 // 1 hour
  private readonly MAGIC_LINK_PREFIX = 'magic_link:'

  constructor(
    private magicLinksKV: KVNamespace,
    private jwtSecret: string
  ) {}

  async createMagicLink(email: string): Promise<string> {
    const token = generateMagicLinkToken()
    const key = `${this.MAGIC_LINK_PREFIX}${token}`

    // Store email with token in KV
    await this.magicLinksKV.put(key, email, {
      expirationTtl: this.MAGIC_LINK_TTL,
    })

    return token
  }

  async verifyMagicLink(token: string): Promise<string | null> {
    const key = `${this.MAGIC_LINK_PREFIX}${token}`
    const verifiedKey = `${this.MAGIC_LINK_PREFIX}verified:${token}`

    // Check if this token was already verified recently
    const alreadyVerified = await this.magicLinksKV.get(verifiedKey)
    if (alreadyVerified) {
      // Return the email from the verified cache
      return alreadyVerified
    }

    const email = await this.magicLinksKV.get(key)

    if (!email) {
      return null
    }

    // Mark the token as verified with a short TTL (60 seconds minimum for KV)
    // This prevents issues with duplicate requests during React StrictMode or retries
    await this.magicLinksKV.put(verifiedKey, email, {
      expirationTtl: 60, // 60 seconds grace period (KV minimum)
    })

    // Delete the original token after use
    await this.magicLinksKV.delete(key)

    return email
  }

  async generateTokens(
    user: BackendUser
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      createJWT(user, this.jwtSecret),
      createRefreshToken(user.id, this.jwtSecret, user),
    ])

    return { accessToken, refreshToken }
  }

  async verifyRefreshToken(
    token: string
  ): Promise<{ sub: string; user?: BackendUser }> {
    const payload = await verifyToken(token, this.jwtSecret)
    return payload
  }

  async verifyJWT(token: string): Promise<JWTPayload> {
    return verifyJWTUtil(token, this.jwtSecret)
  }
}
