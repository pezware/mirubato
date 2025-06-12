import type { KVNamespace } from '@cloudflare/workers-types'
import {
  generateMagicLinkToken,
  createJWT,
  createRefreshToken,
  verifyRefreshToken as verifyToken,
} from '../utils/auth'
import type { BackendUser } from '../types/shared'

export class AuthService {
  private readonly MAGIC_LINK_TTL = 600 // 10 minutes
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
    const email = await this.magicLinksKV.get(key)

    if (!email) {
      return null
    }

    // Delete the token after use
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
}
