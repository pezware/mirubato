/**
 * Test script for multi-language dictionary support
 * Run with: npm run test:language
 */

import { DictionaryDatabase } from './src/services/storage/dictionary-database'
import { DictionaryGenerator } from './src/services/ai/dictionary-generator'
import { D1Database } from '@cloudflare/workers-types'

// Mock environment for testing
const mockEnv = {
  DB: {} as D1Database,
  CACHE: {} as any,
  AI: {} as any,
  QUALITY_THRESHOLD: '70',
  CACHE_TTL: '3600',
  ENVIRONMENT: 'test',
  API_SERVICE_URL: 'http://localhost:8787',
}

// Test scenarios
const testScenarios = [
  {
    name: 'Basic language search',
    description: 'Search for a term in a specific language',
    test: async (db: DictionaryDatabase) => {
      console.log('\n🧪 Testing: Basic language search')

      // Test searching for "Allegro" in English
      const resultEn = await db.findByTerm('allegro', 'en')
      console.log(
        '✅ English result:',
        resultEn?.lang,
        resultEn?.definition?.concise
      )

      // Test searching for "Allegro" in Spanish
      const resultEs = await db.findByTerm('allegro', 'es')
      console.log(
        '✅ Spanish result:',
        resultEs?.lang,
        resultEs?.definition?.concise
      )

      // Test searching for "Allegro" in French
      const resultFr = await db.findByTerm('allegro', 'fr')
      console.log(
        '✅ French result:',
        resultFr?.lang,
        resultFr?.definition?.concise
      )
    },
  },
  {
    name: 'Cross-language search',
    description:
      'Search across all languages when term not found in UI language',
    test: async (db: DictionaryDatabase) => {
      console.log('\n🧪 Testing: Cross-language search')

      // Search for a term that might only exist in Italian
      const result = await db.findByTerm('pianissimo', 'zh-CN', {
        searchAllLanguages: true,
      })
      console.log(
        '✅ Cross-language result:',
        result?.lang,
        result?.source_lang,
        result?.term
      )
    },
  },
  {
    name: 'Multi-language comparison',
    description: 'Get the same term in multiple languages',
    test: async (db: DictionaryDatabase) => {
      console.log('\n🧪 Testing: Multi-language comparison')

      const languages = ['en', 'es', 'fr', 'de']
      const result = await db.getTermInLanguages('forte', languages)

      console.log('✅ Term in multiple languages:')
      for (const [lang, entry] of Object.entries(result.languages)) {
        console.log(`  ${lang}: ${entry.definition?.concise}`)
      }
    },
  },
  {
    name: 'Search with language filter',
    description: 'Search with specific language filters',
    test: async (db: DictionaryDatabase) => {
      console.log('\n🧪 Testing: Search with language filter')

      const searchQuery = {
        q: 'tempo',
        lang: 'en',
        filters: {
          languages: ['en', 'es', 'fr'],
        },
      }

      const results = await db.search(searchQuery)
      console.log('✅ Search results:', results.total, 'entries found')
      console.log('✅ Suggested languages:', results.suggestedLanguages)
      console.log('✅ Detected term language:', results.detectedTermLanguage)
    },
  },
  {
    name: 'Batch query with language',
    description: 'Query multiple terms in a specific language',
    test: async (db: DictionaryDatabase) => {
      console.log('\n🧪 Testing: Batch query with language')

      const terms = ['allegro', 'andante', 'adagio', 'presto']
      const results = await db.findByTerms(terms, 'fr')

      console.log('✅ Batch results:')
      for (const [term, entry] of results.entries()) {
        console.log(
          `  ${term} (${entry.lang}): ${entry.definition?.concise?.substring(0, 50)}...`
        )
      }
    },
  },
  {
    name: 'Seed queue operations',
    description: 'Test seed queue for background generation',
    test: async (db: DictionaryDatabase) => {
      console.log('\n🧪 Testing: Seed queue operations')

      // Add items to seed queue
      await db.addToSeedQueue([
        { term: 'Crescendo', languages: ['en', 'es', 'fr', 'de'], priority: 9 },
        {
          term: 'Diminuendo',
          languages: ['en', 'es', 'fr', 'de'],
          priority: 9,
        },
        { term: 'Staccato', languages: ['en', 'es', 'fr', 'de'], priority: 10 },
      ])

      // Get queue stats
      const stats = await db.getSeedQueueStats()
      console.log('✅ Seed queue stats:', stats)

      // Get next items to process
      const items = await db.getNextSeedQueueItems(5)
      console.log('✅ Next items to process:', items.length)
      for (const item of items) {
        console.log(
          `  - ${item.term}: ${item.languages.join(', ')} (priority: ${item.priority})`
        )
      }
    },
  },
  {
    name: 'Language detection',
    description: 'Test language detection for musical terms',
    test: async (db: DictionaryDatabase) => {
      console.log('\n🧪 Testing: Language detection')

      // Italian musical terms
      const italianTerms = [
        'pianissimo',
        'fortissimo',
        'allegretto',
        'andantino',
      ]

      for (const term of italianTerms) {
        const result = await db.search({ q: term, searchAllLanguages: true })
        if (result.detectedTermLanguage) {
          console.log(`✅ ${term}: detected as ${result.detectedTermLanguage}`)
        }
      }
    },
  },
]

// API endpoint tests
const apiTests = [
  {
    name: 'Search API with language',
    description: 'Test /api/v1/search with language parameters',
    endpoint: '/api/v1/search',
    params: {
      q: 'forte',
      lang: 'es',
      searchAllLanguages: false,
    },
  },
  {
    name: 'Get term with language',
    description: 'Test /api/v1/terms/:term with language',
    endpoint: '/api/v1/terms/allegro',
    params: {
      lang: 'fr',
      searchAllLanguages: false,
    },
  },
  {
    name: 'Get term in multiple languages',
    description: 'Test /api/v1/terms/:term/languages',
    endpoint: '/api/v1/terms/adagio/languages',
    params: {
      languages: 'en,es,fr,de',
    },
  },
  {
    name: 'Batch query with language',
    description: 'Test /api/v1/batch/query',
    endpoint: '/api/v1/batch/query',
    method: 'POST',
    body: {
      terms: ['forte', 'piano', 'mezzo'],
      lang: 'de',
    },
  },
]

// Main test runner
async function runTests() {
  console.log('🚀 Starting multi-language dictionary tests...\n')

  // Initialize database connection
  const db = new DictionaryDatabase(mockEnv.DB)

  // Run database tests
  console.log('📊 Database Tests:')
  console.log('==================')

  for (const scenario of testScenarios) {
    try {
      await scenario.test(db)
      console.log(`✅ ${scenario.name} - PASSED\n`)
    } catch (error) {
      console.error(`❌ ${scenario.name} - FAILED`)
      console.error(`   Error: ${error}\n`)
    }
  }

  // Display API test examples
  console.log('\n🌐 API Test Examples:')
  console.log('======================')

  for (const test of apiTests) {
    console.log(`\n${test.name}:`)
    console.log(`${test.description}`)

    if (test.method === 'POST') {
      console.log(`\ncurl -X POST http://localhost:9799${test.endpoint} \\`)
      console.log(`  -H "Content-Type: application/json" \\`)
      console.log(`  -d '${JSON.stringify(test.body, null, 2)}'`)
    } else {
      const params = new URLSearchParams(test.params as any).toString()
      console.log(`\ncurl "http://localhost:9799${test.endpoint}?${params}"`)
    }
  }

  console.log('\n\n🎉 Test script completed!')
  console.log(
    'Note: This is a test helper script. Actual tests require a running database.'
  )
}

// Run tests
runTests().catch(console.error)

// Export for use in actual test suites
export { testScenarios, apiTests }
