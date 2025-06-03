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
    private magicLinksKV: KVNamespace,
    private jwtSecret: string
  ) {}

  async createMagicLink(email: string): Promise<string> {
    const token = generateMagicLinkToken()
    const key = `${this.MAGIC_LINK_PREFIX}${token}`

    console.log(`AuthService: Creating magic link for email: ${email}`)
    console.log(`AuthService: Token: ${token}, Key: ${key}`)
    console.log('AuthService: KV namespace exists:', !!this.magicLinksKV)

    // Store email with token in KV
    await this.magicLinksKV.put(key, email, {
      expirationTtl: this.MAGIC_LINK_TTL,
    })

    console.log(
      'AuthService: Magic link stored in KV with TTL:',
      this.MAGIC_LINK_TTL
    )

    return token
  }

  async verifyMagicLink(token: string): Promise<string | null> {
    const key = `${this.MAGIC_LINK_PREFIX}${token}`
    console.log(`AuthService: Verifying magic link with key: ${key}`)

    const email = await this.magicLinksKV.get(key)
    console.log(
      `AuthService: Retrieved email from KV: ${email ? 'found' : 'not found'}`
    )

    if (!email) {
      // Let's check if the KV namespace is properly bound
      console.log('AuthService: Magic link not found in KV storage')
      console.log('AuthService: KV namespace exists:', !!this.magicLinksKV)
      return null
    }

    // Delete the token after use
    console.log('AuthService: Deleting used magic link token')
    await this.magicLinksKV.delete(key)

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
