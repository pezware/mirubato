#!/usr/bin/env node

/**
 * Script to update domain configuration across the codebase
 * Usage: node scripts/update-domains.js
 *
 * This script reads from config/domains.json and updates all necessary files
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

// Read domain configuration
const configPath = path.join(rootDir, 'config/domains.json')
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Files to update with their update functions
const filesToUpdate = [
  {
    path: 'backend/src/config/cors.ts',
    update: content => {
      // Update production domains
      const domainsRegex = /domains: \[.*?\]/s
      const newDomains = `domains: ['https://${config.primaryDomain}', 'https://www.${config.primaryDomain}']`
      content = content.replace(domainsRegex, newDomains)

      // Update worker patterns
      const accountRegex = new RegExp(
        `${config.cloudflare.accountName}\\.workers\\.dev`,
        'g'
      )
      content = content.replace(
        /arbeitandy\.workers\.dev/g,
        `${config.cloudflare.accountName}.workers.dev`
      )

      const frontendWorkerRegex = new RegExp(
        `${config.cloudflare.frontendWorkerName}`,
        'g'
      )
      content = content.replace(
        /mirubato(?!-backend)/g,
        config.cloudflare.frontendWorkerName
      )

      const backendWorkerRegex = new RegExp(
        `${config.cloudflare.backendWorkerName}`,
        'g'
      )
      content = content.replace(
        /mirubato-backend/g,
        config.cloudflare.backendWorkerName
      )

      return content
    },
  },
  {
    path: 'frontend/src/config/endpoints.ts',
    update: content => {
      // Update production domain checks
      const domainCheckRegex =
        /if \(hostname === '[^']+' \|\| hostname === 'www\.[^']+'\)/g
      const newDomainCheck = `if (hostname === '${config.primaryDomain}' || hostname === 'www.${config.primaryDomain}')`
      content = content.replace(domainCheckRegex, newDomainCheck)

      // Update API URLs
      const apiUrlRegex = /https:\/\/api\.[^/]+/g
      const newApiUrl = `https://${config.apiSubdomain}.${config.primaryDomain}`
      content = content.replace(apiUrlRegex, newApiUrl)

      // Update worker names and account
      content = content.replace(
        /arbeitandy\.workers\.dev/g,
        `${config.cloudflare.accountName}.workers.dev`
      )
      content = content.replace(
        /mirubato(?!-backend)/g,
        config.cloudflare.frontendWorkerName
      )
      content = content.replace(
        /mirubato-backend/g,
        config.cloudflare.backendWorkerName
      )

      return content
    },
  },
  {
    path: 'backend/src/services/email.ts',
    update: content => {
      // Update APP_URL
      const appUrlRegex = /const APP_URL = '[^']+'/
      const newAppUrl = `const APP_URL = 'https://${config.primaryDomain}'`
      content = content.replace(appUrlRegex, newAppUrl)

      return content
    },
  },
  {
    path: 'frontend/wrangler.json',
    update: content => {
      // Update worker name
      const workerConfig = JSON.parse(content)
      workerConfig.name = config.cloudflare.frontendWorkerName
      return JSON.stringify(workerConfig, null, 2) + '\n'
    },
  },
  {
    path: 'backend/wrangler.json',
    update: content => {
      // Update worker name
      const workerConfig = JSON.parse(content)
      workerConfig.name = config.cloudflare.backendWorkerName
      return JSON.stringify(workerConfig, null, 2) + '\n'
    },
  },
]

// Update each file
console.log('Updating domain configuration...\n')

filesToUpdate.forEach(({ path: filePath, update }) => {
  const fullPath = path.join(rootDir, filePath)

  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      const updatedContent = update(content)
      fs.writeFileSync(fullPath, updatedContent)
      console.log(`✅ Updated: ${filePath}`)
    } else {
      console.log(`⚠️  Skipped: ${filePath} (file not found)`)
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message)
  }
})

console.log('\nDomain configuration update complete!')
console.log('\nNext steps:')
console.log('1. Review the changes with: git diff')
console.log('2. Rebuild both frontend and backend')
console.log('3. Update Cloudflare dashboard with new custom domains')
console.log('4. Update DNS records to point to your Workers')
