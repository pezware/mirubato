/**
 * CORS configuration for the backend API
 * Uses the unified configuration system
 */

import {
  getConfig,
  getCorsOrigins,
  isOriginAllowed as checkOrigin,
} from '@mirubato/shared/config/environment'

export interface CorsConfig {
  production: {
    domains: string[]
    patterns: string[]
  }
  development: {
    origins: string[]
  }
}

/**
 * Get CORS configuration based on the unified config
 * This is kept for backward compatibility but uses the new system internally
 */
export function getCorsConfig(
  environment?: 'production' | 'development'
): CorsConfig {
  // Use the provided environment or try to detect it
  const envKey =
    environment === 'production'
      ? 'production'
      : environment === 'development'
        ? 'local'
        : undefined

  const config = getConfig(envKey)
  const origins = getCorsOrigins(config)

  // Separate exact domains from patterns
  const domains = origins.filter(origin => !origin.includes('*'))
  const patterns = origins.filter(origin => origin.includes('*'))

  // Always include generic patterns for Cloudflare deployments
  if (!patterns.includes('https://*.workers.dev')) {
    patterns.push('https://*.workers.dev')
  }
  if (!patterns.includes('https://*.pages.dev')) {
    patterns.push('https://*.pages.dev')
  }

  return {
    production: {
      domains: domains.filter(d => d.startsWith('https://')),
      patterns,
    },
    development: {
      origins: domains.filter(
        d =>
          d.startsWith('http://localhost') || d.startsWith('http://127.0.0.1')
      ),
    },
  }
}

// Export a static version for compatibility
export const corsConfig = getCorsConfig()

/**
 * Check if an origin matches any of the configured patterns
 * Delegates to the unified configuration system
 */
export function isOriginAllowed(
  origin: string,
  _environment: 'production' | 'development'
): boolean {
  // Use the unified system's origin checking
  // Note: environment parameter is kept for backward compatibility but not used
  return checkOrigin(origin)
}
