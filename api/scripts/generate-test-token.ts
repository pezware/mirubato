#!/usr/bin/env tsx
import { generateAccessToken } from '../src/utils/auth'

// Generate a test token for local development
async function generateTestToken() {
  // Use a test secret - in production this would come from env
  const JWT_SECRET =
    process.env.JWT_SECRET || 'test-secret-for-development-only'
  const userId = 'test-user-123'
  const email = 'test@example.com'

  const token = await generateAccessToken(userId, email, JWT_SECRET)

  console.log('Test JWT Token:')
  console.log(token)
  console.log('\nUse this token in Authorization header:')
  console.log(`Authorization: Bearer ${token}`)
  console.log('\nTest with:')
  console.log(
    `curl -H "Authorization: Bearer ${token}" https://apiv2-staging.mirubato.com/api/sync/status`
  )
}

generateTestToken().catch(console.error)
