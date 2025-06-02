/**
 * Configuration for API endpoints based on deployment environment
 * Uses the unified configuration system
 */

import {
  getGraphQLEndpoint,
  getHealthEndpoint,
} from '@mirubato/shared/config/environment'

export interface EndpointConfig {
  graphql: string
  health: string
}

/**
 * Get the API endpoints based on the current environment
 * Priority:
 * 1. Explicit environment variable (VITE_GRAPHQL_ENDPOINT)
 * 2. Unified configuration system
 */
export function getEndpoints(): EndpointConfig {
  // Check for explicit environment variable first (for backward compatibility)
  if (import.meta.env.VITE_GRAPHQL_ENDPOINT) {
    const baseUrl = import.meta.env.VITE_GRAPHQL_ENDPOINT.replace(
      '/graphql',
      ''
    )
    return {
      graphql: import.meta.env.VITE_GRAPHQL_ENDPOINT,
      health: `${baseUrl}/health`,
    }
  }

  // Use the unified configuration system
  return {
    graphql: getGraphQLEndpoint(),
    health: getHealthEndpoint(),
  }
}

// Export a singleton instance
export const endpoints = getEndpoints()

// Log the configuration for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('API Endpoints:', endpoints)
}
