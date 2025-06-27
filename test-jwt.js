// Test script to verify JWT secrets match between services
const crypto = require('crypto')

// This will help us verify if the JWT secrets are the same
// by creating a signature with a test payload

async function testJWT() {
  // Test payload
  const payload = JSON.stringify({
    sub: 'test-user',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })

  // If you have the JWT secrets, you can test them here
  // For now, let's just show how to generate a test token
  console.log('To verify JWT secrets match:')
  console.log('1. Run this in both api and scores directories:')
  console.log('   wrangler secret put JWT_SECRET_TEST --env staging')
  console.log('2. Use the SAME secret value for both')
  console.log('3. Or use wrangler to re-set the JWT_SECRET with the same value')

  console.log('\nTo generate a secure secret:')
  console.log('openssl rand -base64 32')
}

testJWT()
