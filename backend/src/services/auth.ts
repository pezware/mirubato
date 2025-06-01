import type { KVNamespace } from '@cloudflare/workers-types'
import {
  generateMagicLinkToken,
  createJWT,
  createRefreshToken,
  verifyRefreshToken as verifyToken,
} from '../utils/auth'
import type { User } from '../types/shared'

export class AuthService {
  private readonly MAGIC_LINK_TTL = 600 // 10 minutes
  private readonly MAGIC_LINK_PREFIX = 'magic_link:'

  constructor(
    private kv: KVNamespace,
    private jwtSecret: string
  ) {}

  async createMagicLink(email: string): Promise<string> {
    const token = generateMagicLinkToken()
    const key = `${this.MAGIC_LINK_PREFIX}${token}`

    // Store email with token in KV
    await this.kv.put(key, email, {
      expirationTtl: this.MAGIC_LINK_TTL,
    })

    return token
  }

  async verifyMagicLink(token: string): Promise<string | null> {
    const key = `${this.MAGIC_LINK_PREFIX}${token}`
    const email = await this.kv.get(key)

    if (!email) {
      return null
    }

    // Delete the token after use
    await this.kv.delete(key)

    return email
  }

  async generateTokens(
    user: User
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      createJWT(user, this.jwtSecret),
      createRefreshToken(user.id, this.jwtSecret),
    ])

    return { accessToken, refreshToken }
  }

  async verifyRefreshToken(token: string): Promise<string> {
    const payload = await verifyToken(token, this.jwtSecret)
    return payload.sub
  }
}
