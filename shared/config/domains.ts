/**
 * Centralized domain configuration for Mirubato
 *
 * To deploy to a different domain:
 * 1. Update the domains in this file
 * 2. Rebuild and deploy both frontend and backend
 *
 * Environment variables can override these defaults:
 * - VITE_FRONTEND_DOMAIN (frontend build time)
 * - VITE_API_DOMAIN (frontend build time)
 * - FRONTEND_DOMAIN (backend runtime)
 * - API_DOMAIN (backend runtime)
 */

export interface DomainConfig {
  // Primary domain (without protocol)
  primaryDomain: string
  // API subdomain (usually 'api')
  apiSubdomain: string
  // Cloudflare Workers account name
  workersAccount: string
  // Worker names
  frontendWorkerName: string
  backendWorkerName: string
}

// Default configuration
export const defaultDomainConfig: DomainConfig = {
  primaryDomain: 'mirubato.com',
  apiSubdomain: 'api',
  workersAccount: 'arbeitandy',
  frontendWorkerName: 'mirubato',
  backendWorkerName: 'mirubato-backend',
}

// Helper functions to generate URLs
export function getFrontendUrls(config: DomainConfig = defaultDomainConfig) {
  return {
    production: [
      `https://${config.primaryDomain}`,
      `https://www.${config.primaryDomain}`,
    ],
    preview: [
      `https://${config.frontendWorkerName}.${config.workersAccount}.workers.dev`,
      `https://*-${config.frontendWorkerName}.${config.workersAccount}.workers.dev`,
    ],
  }
}

export function getBackendUrls(config: DomainConfig = defaultDomainConfig) {
  return {
    production: `https://${config.apiSubdomain}.${config.primaryDomain}`,
    preview: `https://${config.backendWorkerName}.${config.workersAccount}.workers.dev`,
  }
}

// Get domain config from environment or defaults
export function getDomainConfig(): DomainConfig {
  // In browser environment
  if (typeof window !== 'undefined' && import.meta?.env) {
    const primaryDomain =
      import.meta.env.VITE_PRIMARY_DOMAIN || defaultDomainConfig.primaryDomain
    const apiSubdomain =
      import.meta.env.VITE_API_SUBDOMAIN || defaultDomainConfig.apiSubdomain
    const workersAccount =
      import.meta.env.VITE_WORKERS_ACCOUNT || defaultDomainConfig.workersAccount
    const frontendWorkerName =
      import.meta.env.VITE_FRONTEND_WORKER_NAME ||
      defaultDomainConfig.frontendWorkerName
    const backendWorkerName =
      import.meta.env.VITE_BACKEND_WORKER_NAME ||
      defaultDomainConfig.backendWorkerName

    return {
      primaryDomain,
      apiSubdomain,
      workersAccount,
      frontendWorkerName,
      backendWorkerName,
    }
  }

  // In Node/Worker environment
  if (typeof process !== 'undefined' && process.env) {
    return {
      primaryDomain:
        process.env.PRIMARY_DOMAIN || defaultDomainConfig.primaryDomain,
      apiSubdomain:
        process.env.API_SUBDOMAIN || defaultDomainConfig.apiSubdomain,
      workersAccount:
        process.env.WORKERS_ACCOUNT || defaultDomainConfig.workersAccount,
      frontendWorkerName:
        process.env.FRONTEND_WORKER_NAME ||
        defaultDomainConfig.frontendWorkerName,
      backendWorkerName:
        process.env.BACKEND_WORKER_NAME ||
        defaultDomainConfig.backendWorkerName,
    }
  }

  // Fallback to defaults
  return defaultDomainConfig
}
