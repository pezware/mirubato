#!/usr/bin/env node

/**
 * Generate .env files from the unified configuration
 * This ensures consistency across environments
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

// Replace placeholders
function replacePlaceholders(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/{MYDOMAIN}/g, config.MYDOMAIN)
    .replace(/{MYTEAM}/g, config.MYTEAM)
}

// Generate frontend .env file
function generateFrontendEnv(environment) {
  const env = config.environments[environment]
  if (!env) {
    throw new Error(`Unknown environment: ${environment}`)
  }

  let envContent = ''

  // For production, use the API domain
  if (environment === 'production') {
    const apiDomain = replacePlaceholders(`https://api.${config.MYDOMAIN}`)
    envContent = `# GraphQL Backend URL - Production
VITE_GRAPHQL_ENDPOINT=${apiDomain}${config.api.graphqlPath}

# Environment
VITE_ENV=production`
  }
  // For staging, use the workers.dev URL
  else if (environment === 'staging') {
    const backendUrl = replacePlaceholders(env.backend.url)
    envContent = `# GraphQL Backend URL - Staging
VITE_GRAPHQL_ENDPOINT=${backendUrl}${config.api.graphqlPath}

# Environment
VITE_ENV=staging`
  }
  // For local development
  else if (environment === 'local') {
    envContent = `# GraphQL Backend URL - Local Development
VITE_GRAPHQL_ENDPOINT=${env.backend.url}${config.api.graphqlPath}

# Environment
VITE_ENV=development`
  }
  // For preview, we don't set VITE_GRAPHQL_ENDPOINT as it's dynamic
  else if (environment === 'preview') {
    envContent = `# GraphQL Backend URL - Preview
# Endpoint is dynamically determined based on deployment URL

# Environment
VITE_ENV=development`
  }

  return envContent
}

// Generate backend .env file
function generateBackendEnv(environment) {
  const env = config.environments[environment]
  if (!env) {
    throw new Error(`Unknown environment: ${environment}`)
  }

  let envContent = `ENVIRONMENT=${env.environment}\n`

  // Add environment-specific variables
  if (environment === 'local') {
    envContent += `
# Local development settings
JWT_SECRET=dev-secret-key-change-in-production
RESEND_API_KEY=your-resend-api-key-here`
  }

  return envContent
}

// Command line argument parsing
const args = process.argv.slice(2)
const target = args[0] || 'both'
const environment = args[1] || 'production'

if (!['frontend', 'backend', 'both'].includes(target)) {
  console.log(
    'Usage: node scripts/generate-env-files.js [frontend|backend|both] [environment]'
  )
  console.log('Environments: local, preview, staging, production')
  process.exit(1)
}

try {
  // Map environment to .env file suffix
  const envFileSuffix = {
    local: '.local',
    preview: '.preview',
    staging: '.staging',
    production: '.production',
  }[environment]

  if (target === 'frontend' || target === 'both') {
    const frontendEnv = generateFrontendEnv(environment)
    const frontendPath = path.join(rootDir, `frontend/.env${envFileSuffix}`)
    fs.writeFileSync(frontendPath, frontendEnv)
    console.log(`✅ Generated frontend/.env${envFileSuffix}`)
  }

  if (target === 'backend' || target === 'both') {
    const backendEnv = generateBackendEnv(environment)
    const backendPath = path.join(rootDir, `backend/.env${envFileSuffix}`)
    fs.writeFileSync(backendPath, backendEnv)
    console.log(`✅ Generated backend/.env${envFileSuffix}`)
  }

  // Also update .env.example files
  if (environment === 'local') {
    // Frontend example
    const frontendExample = `# GraphQL Backend URL
VITE_GRAPHQL_ENDPOINT=http://localhost:8787/graphql

# Environment
VITE_ENV=development`
    fs.writeFileSync(
      path.join(rootDir, 'frontend/.env.example'),
      frontendExample
    )

    // Backend example
    const backendExample = `ENVIRONMENT=development

# Secrets (set these in your local .env file)
JWT_SECRET=your-jwt-secret-here
RESEND_API_KEY=your-resend-api-key-here`
    fs.writeFileSync(path.join(rootDir, 'backend/.env.example'), backendExample)

    console.log('✅ Updated .env.example files')
  }
} catch (error) {
  console.error('❌ Error generating .env files:', error.message)
  process.exit(1)
}
