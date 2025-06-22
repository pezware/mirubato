import { generateMagicLinkToken } from '../utils/auth'
import type { Env } from '../index'

export class AuthService {
  constructor(private env: Env) {}

  /**
   * Generate a magic link token for email authentication
   */
  async generateMagicLink(email: string): Promise<string> {
    return generateMagicLinkToken(email, this.env.MAGIC_LINK_SECRET)
  }

  /**
   * Store refresh token (for future implementation of token blacklisting)
   */
  async storeRefreshToken(_userId: string, _token: string): Promise<void> {
    // In a production system, you'd store this in a database
    // to track active sessions and enable token revocation
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(_userId: string, _token: string): Promise<void> {
    // Implementation for token revocation
  }

  /**
   * Check if refresh token is valid
   */
  async isRefreshTokenValid(_userId: string, _token: string): Promise<boolean> {
    // For now, we rely on JWT expiration
    // In production, check against stored tokens
    return true
  }
}
