/**
 * Unified environment configuration system
 * This module provides a single source of truth for all environment-specific settings
 */

import environmentsConfig from '../../config/environments.json'

export interface EnvironmentConfig {
  name: string
  frontend: {
    url?: string
    urls?: string[]
    urlPattern?: string
    port?: number
  }
  backend: {
    url?: string
    urlPattern?: string
    port?: number
  }
  database: {
    name: string
    binding: string
    id?: string
  }
  kv: {
    magicLinks: {
      binding: string
      id?: string
      namespace?: string
    }
  }
  environment: 'development' | 'staging' | 'production'
}

export interface UnifiedConfig {
  domain: string
  team: string
  currentEnvironment: EnvironmentConfig
  workers: {
    frontend: string
    backend: string
  }
  api: {
    graphqlPath: string
    healthPath: string
    debugPath: string
  }
  email: {
    from: {
      name: string
      email: string
    }
    resendApiKeyBinding: string
  }
  security: {
    jwtSecretBinding: string
    jwtExpiresIn: string
    magicLinkExpiresIn: string
    rateLimiterBinding: string
  }
}

/**
 * Replace placeholders in configuration values
 */
function replacePlaceholders(
  value: any,
  replacements: Record<string, string>
): any {
  if (typeof value === 'string') {
    return value.replace(
      /{([^}]+)}/g,
      (match, key) => replacements[key] || match
    )
  }
  if (Array.isArray(value)) {
    return value.map(item => replacePlaceholders(item, replacements))
  }
  if (typeof value === 'object' && value !== null) {
    const result: any = {}
    for (const key in value) {
      result[key] = replacePlaceholders(value[key], replacements)
    }
    return result
  }
  return value
}

/**
 * Detect current environment based on hostname or environment variables
 */
export function detectEnvironment(): keyof typeof environmentsConfig.environments {
  // In Node/Worker environment
  if (typeof process !== 'undefined' && process.env) {
    const env = process.env.ENVIRONMENT || process.env.NODE_ENV
    if (env === 'production') return 'production'
    if (env === 'staging') return 'staging'
    if (env === 'development') return 'local'
  }

  // In browser environment
  // @ts-ignore - window is only available in browser
  if (typeof window !== 'undefined' && window.location) {
    // @ts-ignore
    const hostname = window.location.hostname

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local'
    }

    // Production (custom domains)
    const domain = environmentsConfig.MYDOMAIN
    if (hostname === domain || hostname === `www.${domain}`) {
      return 'production'
    }

    // Workers.dev deployments
    if (hostname.endsWith('.workers.dev')) {
      const team = environmentsConfig.MYTEAM

      // Staging (direct workers.dev)
      if (
        hostname === `mirubato.${team}.workers.dev` ||
        hostname === `mirubato-backend.${team}.workers.dev`
      ) {
        return 'staging'
      }

      // Preview deployments (with hash prefix)
      if (hostname.includes('-mirubato')) {
        return 'preview'
      }
    }
  }

  // Default to local
  return 'local'
}

/**
 * Get the unified configuration for the current environment
 */
export function getConfig(
  environmentName?: keyof typeof environmentsConfig.environments
): UnifiedConfig {
  const env = environmentName || detectEnvironment()
  const environmentConfig = environmentsConfig.environments[env]

  if (!environmentConfig) {
    throw new Error(`Unknown environment: ${env}`)
  }

  // Prepare replacements
  const replacements = {
    MYDOMAIN: environmentsConfig.MYDOMAIN,
    MYTEAM: environmentsConfig.MYTEAM,
  }

  // Replace placeholders in the configuration
  const processedEnvConfig = replacePlaceholders(
    environmentConfig,
    replacements
  )
  const processedWorkers = replacePlaceholders(
    environmentsConfig.workers,
    replacements
  )
  const processedEmail = replacePlaceholders(
    environmentsConfig.email,
    replacements
  )

  return {
    domain: environmentsConfig.MYDOMAIN,
    team: environmentsConfig.MYTEAM,
    currentEnvironment: processedEnvConfig,
    workers: processedWorkers,
    api: environmentsConfig.api,
    email: processedEmail,
    security: environmentsConfig.security,
  }
}

/**
 * Get the GraphQL endpoint for the current environment
 */
export function getGraphQLEndpoint(config?: UnifiedConfig): string {
  const cfg = config || getConfig()
  const backend = cfg.currentEnvironment.backend

  // For local environment
  if (backend.port) {
    return `${backend.url}${cfg.api.graphqlPath}`
  }

  // For preview environments with pattern
  // @ts-ignore - window is only available in browser
  if (backend.urlPattern && typeof window !== 'undefined' && window.location) {
    // Try to match frontend and backend deployments
    // @ts-ignore
    const hostname = window.location.hostname
    const match = hostname.match(/^([a-f0-9]+-)?mirubato/)
    if (match) {
      const prefix = match[1] || ''
      const backendUrl = backend.urlPattern.replace('*-', prefix)
      return `${backendUrl}${cfg.api.graphqlPath}`
    }
  }

  // For staging/production with direct URL
  if (backend.url) {
    return `${backend.url}${cfg.api.graphqlPath}`
  }

  throw new Error('Unable to determine GraphQL endpoint')
}

/**
 * Get the health check endpoint for the current environment
 */
export function getHealthEndpoint(config?: UnifiedConfig): string {
  const cfg = config || getConfig()
  const endpoint = getGraphQLEndpoint(cfg)
  return endpoint.replace(cfg.api.graphqlPath, cfg.api.healthPath)
}

/**
 * Get all allowed CORS origins for the current environment
 */
export function getCorsOrigins(config?: UnifiedConfig): string[] {
  const cfg = config || getConfig()
  const origins: string[] = []

  // Add frontend URLs
  const frontend = cfg.currentEnvironment.frontend
  if (frontend.url) {
    origins.push(frontend.url)
  }
  if (frontend.urls) {
    origins.push(...frontend.urls)
  }

  // Add patterns for preview environments
  if (frontend.urlPattern) {
    const patterns = [
      frontend.urlPattern,
      // Also allow the backend preview URLs for GraphQL playground
      cfg.currentEnvironment.backend.urlPattern,
    ].filter(Boolean) as string[]

    origins.push(...patterns)
  }

  // Always allow localhost for development
  if (cfg.currentEnvironment.environment === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    )
  }

  return origins
}

/**
 * Check if a domain is allowed for CORS
 */
export function isOriginAllowed(
  origin: string,
  config?: UnifiedConfig
): boolean {
  const cfg = config || getConfig()
  const allowedOrigins = getCorsOrigins(cfg)

  // Check exact matches
  if (allowedOrigins.includes(origin)) {
    return true
  }

  // Check patterns (simple wildcard support)
  for (const pattern of allowedOrigins) {
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' +
          pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
          '$'
      )
      if (regex.test(origin)) {
        return true
      }
    }
  }

  return false
}

// Export the raw config for reference
export const rawConfig = environmentsConfig
