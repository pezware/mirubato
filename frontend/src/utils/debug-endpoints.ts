/**
 * Debug utility to log current endpoint configuration
 * This helps verify that staging frontend uses staging backend
 */

import {
  getConfig,
  detectEnvironment,
  getGraphQLEndpoint,
} from '@mirubato/shared/config/environment'
import { endpoints } from '../config/endpoints'

export function debugEndpoints() {
  const environment = detectEnvironment()
  const config = getConfig()
  const graphqlEndpoint = getGraphQLEndpoint()

  const info = {
    currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
    detectedEnvironment: environment,
    expectedBackendUrl: config.currentEnvironment.backend.url,
    actualGraphQLEndpoint: graphqlEndpoint,
    endpointsConfig: endpoints,
  }

  console.log('🔍 Endpoint Configuration Debug:', info)

  // Visual indicator for staging
  if (environment === 'staging' && typeof window !== 'undefined') {
    console.log('✅ Running in STAGING environment')
    console.log(`📡 GraphQL API: ${graphqlEndpoint}`)

    // Add a visual badge to the page if in staging
    const badge = document.createElement('div')
    badge.innerHTML = `STAGING: ${graphqlEndpoint}`
    badge.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: #ff6b6b;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
      font-family: monospace;
    `
    document.body.appendChild(badge)
  }

  return info
}

// Auto-run in development/staging
if (import.meta.env.DEV || detectEnvironment() === 'staging') {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      debugEndpoints()
    })
  }
}
