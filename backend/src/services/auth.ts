import type { KVNamespace } from '@cloudflare/workers-types'
import {
  generateMagicLinkToken,
  createJWT,
  createRefreshToken,
  verifyRefreshToken as verifyToken,
} from '../utils/auth'
import type { User } from '../types/shared'

// Simple in-memory store as fallback when KV is not available
class InMemoryStore {
  private store = new Map<string, { value: string; expires: number }>()

  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    const expires = Date.now() + (options?.expirationTtl || 600) * 1000
    this.store.set(key, { value, expires })
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key)
    if (!item) return null

    if (Date.now() > item.expires) {
      this.store.delete(key)
      return null
    }

    return item.value
  }

  async delete(key: string) {
    this.store.delete(key)
  }
}

export class AuthService {
  private readonly MAGIC_LINK_TTL = 600 // 10 minutes
  private readonly MAGIC_LINK_PREFIX = 'magic_link:'
  private store: KVNamespace | InMemoryStore

  constructor(
    kv: KVNamespace | undefined,
    private jwtSecret: string
  ) {
    this.store = kv || new InMemoryStore()
  }

  async createMagicLink(email: string): Promise<string> {
    const token = generateMagicLinkToken()
    const key = `${this.MAGIC_LINK_PREFIX}${token}`

    // Store email with token
    await this.store.put(key, email, {
      expirationTtl: this.MAGIC_LINK_TTL,
    })

    return token
  }

  async verifyMagicLink(token: string): Promise<string | null> {
    const key = `${this.MAGIC_LINK_PREFIX}${token}`
    const email = await this.store.get(key)

    if (!email) {
      return null
    }

    // Delete the token after use
    await this.store.delete(key)

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
