#!/usr/bin/env node

/**
 * Generate wrangler configuration files from the unified configuration
 * This ensures consistency between environments
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

// Read the unified configuration
const configPath = path.join(rootDir, 'config/environments.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Function to get environment-specific settings
function getEnvironmentSettings(envName) {
  const env = config.environments[envName]
  if (!env) {
    throw new Error(`Unknown environment: ${envName}`)
  }

  return {
    environment: env.environment,
    database: env.database,
    kv: env.kv,
  }
}

// Generate backend wrangler configuration
function generateBackendConfig(environment = 'production') {
  const envSettings = getEnvironmentSettings(environment)

  const wranglerConfig = {
    name: config.workers.backend,
    main: 'dist/index.js',
    compatibility_date: '2024-09-23',
    workers_dev: environment !== 'production',
    vars: {
      ENVIRONMENT: envSettings.environment,
    },
    d1_databases: [
      {
        binding: envSettings.database.binding,
        database_name: envSettings.database.name,
        database_id: envSettings.database.id || 'your-database-id-here',
      },
    ],
    build: {
      command: 'npm run build',
    },
    kv_namespaces: [
      {
        binding: envSettings.kv.magicLinks.binding,
        id: envSettings.kv.magicLinks.id || 'your-kv-namespace-id-here',
      },
    ],
    compatibility_flags: ['nodejs_compat'],
  }

  // Add custom domain for production
  if (environment === 'production') {
    const domain = config.MYDOMAIN.replace('{MYDOMAIN}', config.MYDOMAIN)
    wranglerConfig.routes = [
      {
        pattern: `api.${domain}/*`,
        custom_domain: true,
      },
    ]
  }

  return wranglerConfig
}

// Generate frontend wrangler configuration
function generateFrontendConfig(environment = 'production') {
  const wranglerConfig = {
    name: config.workers.frontend,
    main: 'src/index.js',
    compatibility_date: '2025-01-01',
    workers_dev: environment !== 'production',
    assets: {
      directory: './dist',
      binding: 'ASSETS',
    },
  }

  // Add custom domain for production
  if (environment === 'production') {
    const domain = config.MYDOMAIN.replace('{MYDOMAIN}', config.MYDOMAIN)
    wranglerConfig.routes = [
      {
        pattern: `${domain}/*`,
        custom_domain: true,
      },
      {
        pattern: `www.${domain}/*`,
        custom_domain: true,
      },
    ]
  }

  return wranglerConfig
}

// Command line argument parsing
const args = process.argv.slice(2)
const command = args[0]
const environment = args[1] || 'production'

if (!command || !['backend', 'frontend', 'both'].includes(command)) {
  console.log(
    'Usage: node scripts/generate-wrangler-config.js [backend|frontend|both] [environment]'
  )
  console.log('Environments: local, preview, staging, production')
  process.exit(1)
}

try {
  if (command === 'backend' || command === 'both') {
    const backendConfig = generateBackendConfig(environment)
    const backendPath = path.join(rootDir, 'backend/wrangler.json')
    fs.writeFileSync(backendPath, JSON.stringify(backendConfig, null, 2) + '\n')
    console.log(`✅ Generated backend wrangler.json for ${environment}`)
  }

  if (command === 'frontend' || command === 'both') {
    const frontendConfig = generateFrontendConfig(environment)
    const frontendPath = path.join(rootDir, 'frontend/wrangler.json')
    fs.writeFileSync(
      frontendPath,
      JSON.stringify(frontendConfig, null, 2) + '\n'
    )
    console.log(`✅ Generated frontend wrangler.json for ${environment}`)
  }
} catch (error) {
  console.error('❌ Error generating wrangler config:', error.message)
  process.exit(1)
}
