/**
 * Configuration for API endpoints based on deployment environment
 * This file handles the mapping between frontend and backend deployments
 */

export interface EndpointConfig {
  graphql: string
  health: string
}

/**
 * Get the API endpoints based on the current environment
 * Priority:
 * 1. Explicit environment variable (VITE_GRAPHQL_ENDPOINT)
 * 2. Hostname-based detection
 * 3. Default to production
 */
export function getEndpoints(): EndpointConfig {
  // Check for explicit environment variable first
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

  const hostname = window.location.hostname

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      graphql: 'http://localhost:8787/graphql',
      health: 'http://localhost:8787/health',
    }
  }

  // Production domains
  if (hostname === 'mirubato.com' || hostname === 'www.mirubato.com') {
    return {
      graphql: 'https://api.mirubato.com/graphql',
      health: 'https://api.mirubato.com/health',
    }
  }

  // Cloudflare preview deployments
  if (hostname.endsWith('.workers.dev') || hostname.endsWith('.pages.dev')) {
    // Try to detect the branch from the hostname
    // Format: {deployment-id}-{branch}-mirubato.workers.dev
    const parts = hostname.split('.')
    const subdomain = parts[0]

    // Check if this is a branch deployment with pattern: {hash}-mirubato
    const branchMatch = subdomain.match(/^([a-f0-9]+)-mirubato$/)
    if (branchMatch) {
      // For branch deployments, use the corresponding backend
      // You can customize this mapping as needed
      const backendMappings: Record<string, string> = {
        // Add specific frontend -> backend mappings here
        'd7bb3b9e-mirubato': '1fe7f83d-mirubato-backend',
        // Add more mappings as needed
      }

      const backendSubdomain = backendMappings[subdomain] || 'mirubato-backend'
      const backendBase = `https://${backendSubdomain}.arbeitandy.workers.dev`

      return {
        graphql: `${backendBase}/graphql`,
        health: `${backendBase}/health`,
      }
    }

    // Default preview backend
    return {
      graphql: 'https://mirubato-backend.arbeitandy.workers.dev/graphql',
      health: 'https://mirubato-backend.arbeitandy.workers.dev/health',
    }
  }

  // Default fallback to production
  console.warn(`Unknown hostname: ${hostname}, falling back to production API`)
  return {
    graphql: 'https://api.mirubato.com/graphql',
    health: 'https://api.mirubato.com/health',
  }
}

// Export a singleton instance
export const endpoints = getEndpoints()

// Log the configuration for debugging
console.log('API Endpoints:', endpoints)
