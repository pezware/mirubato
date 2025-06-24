#!/usr/bin/env tsx
/**
 * Test script to simulate the exact frontend sync/push payload
 * This recreates the error seen in the browser console
 */

import axios from 'axios'

// Exact payload from the frontend error log
const testPayload = {
  changes: {
    entries: [
      {
        timestamp: '2025-06-23T22:32:52.797Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [],
        techniques: [],
        goalIds: [],
        notes: '',
        tags: [],
        metadata: { source: 'manual' },
        id: 'entry_1750717972797_0suwq20o8',
        createdAt: '2025-06-23T22:32:52.797Z',
        updatedAt: '2025-06-23T22:32:52.797Z',
      },
    ],
  },
}

async function testSyncPush() {
  const apiUrl = process.env.API_URL || 'http://localhost:8787'
  const authToken = process.env.AUTH_TOKEN || ''

  if (!authToken) {
    console.error('Please provide AUTH_TOKEN environment variable')
    console.log('You can get this from the browser dev tools:')
    console.log('1. Open the browser console')
    console.log('2. Look for Authorization header in network requests')
    console.log('3. Copy the Bearer token')
    console.log(
      '4. Run: AUTH_TOKEN="Bearer your-token-here" npm run test:sync-push'
    )
    process.exit(1)
  }

  console.log('Testing sync/push endpoint...')
  console.log('URL:', `${apiUrl}/api/sync/push`)
  console.log('Payload:', JSON.stringify(testPayload, null, 2))

  try {
    const response = await axios.post(`${apiUrl}/api/sync/push`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
      withCredentials: true,
    })

    console.log('✅ Success!')
    console.log('Response:', JSON.stringify(response.data, null, 2))
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Request failed!')
      console.error('Status:', error.response?.status)
      console.error('Error:', error.response?.data)

      if (error.response?.data?.stack) {
        console.error('Stack trace:', error.response.data.stack)
      }
    } else {
      console.error('Unexpected error:', error)
    }
  }
}

// Run the test
testSyncPush()
