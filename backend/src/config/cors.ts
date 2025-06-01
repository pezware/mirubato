/**
 * CORS configuration for the backend API
 *
 * Modify this file to add your own domains and patterns.
 * The patterns support wildcards (*) for matching preview deployments.
 */

export interface CorsConfig {
  production: {
    // Exact domain matches
    domains: string[]
    // Pattern matches (e.g., for preview deployments)
    patterns: string[]
  }
  development: {
    // Local development origins
    origins: string[]
  }
}

export const corsConfig: CorsConfig = {
  production: {
    // Frontend production domains that can access the API
    // Note: The backend domain (api.mirubato.com) doesn't need to be here
    // as CORS is for cross-origin requests from frontend to backend
    domains: ['https://mirubato.com', 'https://www.mirubato.com'],
    // Patterns for Cloudflare Workers preview deployments
    // Replace 'arbeitandy' with your Cloudflare account name
    patterns: [
      // Frontend preview deployments
      'https://mirubato.arbeitandy.workers.dev',
      // Frontend deployments with any prefix (e.g., feature-branch-mirubato, 7a80e837-mirubato)
      'https://*-mirubato.arbeitandy.workers.dev',
      // Backend preview deployments (for testing GraphQL playground)
      'https://mirubato-backend.arbeitandy.workers.dev',
      'https://*-mirubato-backend.arbeitandy.workers.dev',
      // Generic Cloudflare patterns (optional - remove if too permissive)
      'https://*.workers.dev',
      'https://*.pages.dev',
    ],
  },
  development: {
    origins: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ],
  },
}

/**
 * Check if an origin matches any of the configured patterns
 */
export function isOriginAllowed(
  origin: string,
  environment: 'production' | 'development'
): boolean {
  if (!origin) return false

  if (environment === 'production') {
    // Check exact domain matches
    if (corsConfig.production.domains.includes(origin)) {
      return true
    }

    // Check pattern matches
    for (const pattern of corsConfig.production.patterns) {
      if (matchesPattern(origin, pattern)) {
        return true
      }
    }
  } else {
    // Development: check exact matches
    if (corsConfig.development.origins.includes(origin)) {
      return true
    }

    // Also allow any localhost origin in development
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return true
    }

    // In development, also check production domains for testing
    if (corsConfig.production.domains.includes(origin)) {
      return true
    }

    // In development, also check production patterns for preview deployments
    for (const pattern of corsConfig.production.patterns) {
      if (matchesPattern(origin, pattern)) {
        return true
      }
    }
  }

  return false
}

/**
 * Simple pattern matching function
 * Supports * as a wildcard for any characters
 */
function matchesPattern(origin: string, pattern: string): boolean {
  // Convert pattern to regex
  // Escape special regex characters except *
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(origin)
}
