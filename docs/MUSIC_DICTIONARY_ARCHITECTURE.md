# Music Dictionary Service - Technical Architecture

## Implementation Guide

This document provides detailed technical implementation guidance for the Music Dictionary Service, complementing the PRD with specific code examples, configuration details, and best practices.

## Project Structure

```
dictionary/
├── wrangler.toml           # Cloudflare Worker configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── index.ts           # Worker entry point
│   ├── api/
│   │   ├── routes.ts      # API route definitions
│   │   ├── handlers/
│   │   │   ├── terms.ts   # Term query handlers
│   │   │   ├── batch.ts   # Batch processing
│   │   │   ├── search.ts  # Search functionality
│   │   │   ├── export.ts  # Export handlers
│   │   │   ├── enhance.ts # Enhancement jobs
│   │   │   └── admin.ts   # Admin endpoints
│   │   └── middleware/
│   │       ├── auth.ts    # Authentication
│   │       ├── cache.ts   # Caching logic
│   │       └── rateLimit.ts # Rate limiting
│   ├── services/
│   │   ├── ai/
│   │   │   ├── generator.ts    # AI content generation
│   │   │   ├── validator.ts    # Quality validation
│   │   │   └── enhancer.ts     # Content enhancement
│   │   ├── scoring/
│   │   │   ├── algorithm.ts    # Scoring algorithms
│   │   │   └── checkpoints.ts  # Quality checkpoints
│   │   ├── references/
│   │   │   ├── wikipedia.ts    # Wikipedia integration
│   │   │   ├── books.ts        # Book search
│   │   │   ├── media.ts        # Media references
│   │   │   └── shopping.ts     # Shopping links
│   │   └── storage/
│   │       ├── d1.ts           # D1 database operations
│   │       ├── kv.ts           # KV cache operations
│   │       └── r2.ts           # R2 storage operations
│   ├── types/
│   │   ├── dictionary.ts   # Core type definitions
│   │   ├── api.ts         # API types
│   │   └── ai.ts          # AI model types
│   └── utils/
│       ├── normalization.ts # Text normalization
│       ├── validation.ts    # Input validation
│       └── errors.ts        # Error handling
├── migrations/
│   ├── 0001_initial_schema.sql
│   └── 0002_analytics_tables.sql
└── scripts/
    ├── seed-data.ts        # Initial data seeding
    └── migrate.sh          # Migration runner
```

## Cloudflare Worker Configuration

### wrangler.toml

```toml
name = "mirubato-dictionary"
main = "src/index.ts"
compatibility_date = "2024-01-15"

[env.production]
workers_dev = false
routes = [
  { pattern = "dictionary.mirubato.com/*", zone_name = "mirubato.com" }
]

[[env.production.d1_databases]]
binding = "DB"
database_name = "mirubato-dictionary-prod"
database_id = "your-d1-database-id"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "mirubato-dictionary-exports"

[[env.production.ai]]
binding = "AI"

[env.production.vars]
OPENAI_API_KEY = "your-openai-key"
ANTHROPIC_API_KEY = "your-anthropic-key"
QUALITY_THRESHOLD = "70"
CACHE_TTL = "3600"

[env.staging]
workers_dev = true
name = "mirubato-dictionary-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "mirubato-dictionary-staging"
database_id = "your-staging-database-id"
```

## Core Implementation

### Worker Entry Point (src/index.ts)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { timing } from 'hono/timing'
import { routes } from './api/routes'
import { errorHandler } from './utils/errors'
import { cacheMiddleware } from './api/middleware/cache'
import { rateLimitMiddleware } from './api/middleware/rateLimit'

export interface Env {
  DB: D1Database
  CACHE: KVNamespace
  STORAGE: R2Bucket
  AI: any // Cloudflare AI binding
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
  QUALITY_THRESHOLD: string
  CACHE_TTL: string
}

const app = new Hono<{ Bindings: Env }>()

// Global middleware
app.use('*', cors({
  origin: ['https://mirubato.com', 'https://www.mirubato.com'],
  credentials: true,
}))
app.use('*', logger())
app.use('*', timing())
app.use('*', rateLimitMiddleware())
app.use('/api/*', cacheMiddleware())

// Error handling
app.onError(errorHandler)

// Mount routes
app.route('/api/v1', routes)

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'production'
  })
})

export default app
```

### Cloudflare Workers AI Configuration

Cloudflare Workers AI provides native integration with multiple AI models. Here's the complete configuration for music dictionary use cases:

#### Available Models and Use Cases

```typescript
// src/config/ai-models.ts
export const CLOUDFLARE_AI_MODELS = {
  // Primary Models for Content Generation
  TEXT_GENERATION: {
    // Best for: Comprehensive definitions, detailed explanations
    LLAMA_3_1_8B: {
      model: '@cf/meta/llama-3.1-8b-instruct',
      maxTokens: 2048,
      cost: '$0.04 per 1M tokens',
      latency: '~500ms',
      strengths: ['Structured output', 'Musical knowledge', 'JSON formatting'],
      config: {
        temperature: 0.3, // Lower for factual content
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      }
    },
    
    // Best for: Quick validations, simple queries
    MISTRAL_7B: {
      model: '@cf/mistral/mistral-7b-instruct-v0.2',
      maxTokens: 1024,
      cost: '$0.02 per 1M tokens',
      latency: '~300ms',
      strengths: ['Fast response', 'Good for validation', 'Efficient'],
      config: {
        temperature: 0.1, // Very low for consistency
        top_p: 0.95
      }
    },
    
    // Alternative: Good for creative content
    GEMMA_7B: {
      model: '@cf/google/gemma-7b-it',
      maxTokens: 1024,
      cost: '$0.02 per 1M tokens',
      latency: '~400ms',
      strengths: ['Multilingual', 'Good reasoning'],
      config: {
        temperature: 0.5,
        top_p: 0.9
      }
    }
  },
  
  // Embedding Models for Semantic Search
  EMBEDDINGS: {
    // Best for: Finding similar terms, semantic search
    BGE_BASE: {
      model: '@cf/baai/bge-base-en-v1.5',
      dimensions: 768,
      maxTokens: 512,
      use_cases: ['Term similarity', 'Related concepts', 'Search']
    },
    
    // Alternative: Larger context window
    BGE_LARGE: {
      model: '@cf/baai/bge-large-en-v1.5',
      dimensions: 1024,
      maxTokens: 512,
      use_cases: ['Complex queries', 'Document search']
    }
  },
  
  // Classification Models
  CLASSIFICATION: {
    // For categorizing terms (instrument, genre, technique, etc.)
    DISTILBERT: {
      model: '@cf/huggingface/distilbert-sst-2-int8',
      use_cases: ['Sentiment analysis', 'Quality scoring']
    }
  },
  
  // Future Models (Coming Soon)
  UPCOMING: {
    CODE_GENERATION: '@cf/deepseek/deepseek-coder-6.7b-instruct',
    VISION: '@cf/llava-hf/llava-1.5-7b-hf' // For sheet music analysis
  }
}

// Recommended Pipeline Configuration
export const AI_PIPELINE_CONFIG = {
  // Step 1: Definition Generation
  definition: {
    primary: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B,
    fallback: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.MISTRAL_7B,
    retries: 2,
    timeout: 5000 // 5 seconds
  },
  
  // Step 2: Quality Validation
  validation: {
    model: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.MISTRAL_7B,
    scoreThreshold: 70,
    retries: 1,
    timeout: 3000 // 3 seconds
  },
  
  // Step 3: Enhancement (Weekly Batch)
  enhancement: {
    model: CLOUDFLARE_AI_MODELS.TEXT_GENERATION.LLAMA_3_1_8B,
    batchSize: 100,
    schedule: '0 0 * * 0', // Weekly on Sunday
    config: {
      temperature: 0.7, // Higher for creativity
      max_tokens: 1500
    }
  },
  
  // Step 4: Embedding for Search
  search: {
    model: CLOUDFLARE_AI_MODELS.EMBEDDINGS.BGE_BASE,
    cacheEmbeddings: true,
    similarityThreshold: 0.8
  }
}
```

#### Cloudflare AI Implementation Details

```typescript
// src/services/ai/cloudflare-ai-service.ts
import { Ai } from '@cloudflare/ai'

export class CloudflareAIService {
  private ai: Ai
  
  constructor(private env: Env) {
    this.ai = new Ai(env.AI)
  }
  
  // Text Generation with Structured Output
  async generateStructuredContent(
    prompt: string,
    model = '@cf/meta/llama-3.1-8b-instruct'
  ): Promise<any> {
    // Add JSON instruction to prompt
    const structuredPrompt = `${prompt}
    
    IMPORTANT: Respond with valid JSON only. No additional text.`
    
    const response = await this.ai.run(model, {
      prompt: structuredPrompt,
      max_tokens: 500,
      temperature: 0.3,
      // Cloudflare AI specific parameters
      stream: false, // Set to true for streaming responses
      raw: false,    // Set to true for raw model output
    })
    
    // Handle response formats
    if (typeof response === 'object' && 'response' in response) {
      return this.parseJSONResponse(response.response)
    }
    
    return response
  }
  
  // Embedding Generation for Semantic Search
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.run(
      '@cf/baai/bge-base-en-v1.5',
      { text }
    )
    
    return response.data[0] // Returns 768-dimensional vector
  }
  
  // Batch Processing for Efficiency
  async batchGenerate(
    prompts: string[],
    model = '@cf/meta/llama-3.1-8b-instruct'
  ): Promise<any[]> {
    // Process in parallel with rate limiting
    const batchSize = 5 // Cloudflare AI concurrent request limit
    const results: any[] = []
    
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(prompt => this.generateStructuredContent(prompt, model))
      )
      results.push(...batchResults)
      
      // Rate limiting delay
      if (i + batchSize < prompts.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }
  
  // Model-Specific Configurations
  getModelConfig(useCase: 'definition' | 'validation' | 'enhancement') {
    switch (useCase) {
      case 'definition':
        return {
          model: '@cf/meta/llama-3.1-8b-instruct',
          temperature: 0.3,
          max_tokens: 500,
          top_p: 0.9,
          prompt_template: (term: string, type: string) => `
            You are a professional music dictionary editor.
            
            Create a dictionary entry for the music term: "${term}"
            Term type: ${type}
            
            Response format (JSON):
            {
              "concise": "1-2 sentence definition",
              "detailed": "Comprehensive explanation (3-5 sentences)",
              "etymology": "Word origin if known",
              "pronunciation": {
                "ipa": "International Phonetic Alphabet notation"
              },
              "usage_example": "Example sentence using the term"
            }
          `
        }
        
      case 'validation':
        return {
          model: '@cf/mistral/mistral-7b-instruct-v0.2',
          temperature: 0.1,
          max_tokens: 100,
          prompt_template: (definition: string) => `
            Rate the quality of this music dictionary definition (0-100):
            "${definition}"
            
            Consider: accuracy, clarity, completeness, educational value.
            
            Response format (JSON):
            {
              "score": <number>,
              "issues": ["list", "of", "issues"],
              "suggestions": ["improvement", "suggestions"]
            }
          `
        }
        
      case 'enhancement':
        return {
          model: '@cf/meta/llama-3.1-8b-instruct',
          temperature: 0.7,
          max_tokens: 1000,
          prompt_template: (entry: any) => `
            Enhance this music dictionary entry with additional information:
            
            Current entry: ${JSON.stringify(entry)}
            
            Add: related terms, historical context, notable examples,
            learning tips, common misconceptions.
            
            Maintain the same JSON structure but enrich the content.
          `
        }
    }
  }
  
  private parseJSONResponse(response: string): any {
    // Clean up common LLM response issues
    let cleaned = response.trim()
    
    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    // Remove any text before first { or [
    const jsonStart = cleaned.match(/[{\[]/)
    if (jsonStart) {
      cleaned = cleaned.substring(jsonStart.index!)
    }
    
    try {
      return JSON.parse(cleaned)
    } catch (error) {
      console.error('JSON parse error:', error, 'Response:', cleaned)
      throw new Error('Failed to parse AI response as JSON')
    }
  }
}
```

### AI Service Implementation

```typescript
// src/services/ai/generator.ts
import { Env } from '../../index'
import { DictionaryEntry, Definition, TermType } from '../../types/dictionary'
import { CloudflareAIService } from './cloudflare-ai-service'
import { z } from 'zod'

const DefinitionSchema = z.object({
  concise: z.string().min(10).max(200),
  detailed: z.string().min(50).max(1000),
  etymology: z.string().optional(),
  pronunciation: z.object({
    ipa: z.string(),
    audio_url: z.string().optional()
  }).optional(),
  usage_example: z.string().optional()
})

export class AIGenerator {
  private cfAI: CloudflareAIService
  
  constructor(private env: Env) {
    this.cfAI = new CloudflareAIService(env)
  }

  async generateDefinition(term: string, type: TermType): Promise<Definition> {
    // Get model configuration for definition generation
    const config = this.cfAI.getModelConfig('definition')
    const prompt = config.prompt_template(term, type)
    
    try {
      // Try Cloudflare AI first (primary pipeline)
      const response = await this.generateWithCloudflareAI(prompt, config)
      if (response) return response
    } catch (error) {
      console.error('Cloudflare AI failed:', error)
    }

    // Fallback to OpenAI
    return this.generateWithOpenAI(prompt)
  }

  private async generateWithCloudflareAI(
    prompt: string, 
    config: any
  ): Promise<Definition | null> {
    const response = await this.env.AI.run(config.model, {
      prompt,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p
    })

    if (!response.response) return null

    try {
      const parsed = this.cfAI.parseJSONResponse(response.response)
      return DefinitionSchema.parse(parsed)
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return null
    }
  }

  private async generateWithOpenAI(prompt: string): Promise<Definition> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a music dictionary expert. Provide accurate, educational definitions.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    const content = data.choices[0].message.content
    const parsed = JSON.parse(content)
    return DefinitionSchema.parse(parsed)
  }
}
```

### Quality Scoring Implementation

```typescript
// src/services/scoring/algorithm.ts
import { DictionaryEntry, QualityScore } from '../../types/dictionary'

export class QualityScorer {
  calculateScore(entry: DictionaryEntry): QualityScore {
    const definitionClarity = this.scoreDefinitionClarity(entry.definition)
    const referenceCompleteness = this.scoreReferences(entry.references)
    const accuracyVerification = this.scoreAccuracy(entry)
    
    const overall = Math.round(
      definitionClarity * 0.3 +
      referenceCompleteness * 0.25 +
      accuracyVerification * 0.25 +
      this.scoreMetadata(entry.metadata) * 0.1 +
      this.getUserFeedbackScore(entry.id) * 0.1
    )

    return {
      overall,
      definition_clarity: definitionClarity,
      reference_completeness: referenceCompleteness,
      accuracy_verification: accuracyVerification,
      last_ai_check: new Date().toISOString(),
      human_verified: false,
      improvement_suggestions: this.generateSuggestions(entry, overall)
    }
  }

  private scoreDefinitionClarity(definition: Definition): number {
    let score = 100

    // Length checks
    if (definition.concise.length < 20) score -= 20
    if (definition.concise.length > 150) score -= 10
    if (definition.detailed.length < 100) score -= 15
    if (definition.detailed.length > 800) score -= 5

    // Content quality checks
    if (!definition.concise.match(/[.!?]$/)) score -= 10 // No punctuation
    if (definition.concise.toLowerCase().includes('undefined')) score -= 30
    if (!definition.etymology && Math.random() > 0.5) score -= 5 // Some terms should have etymology

    // Clarity indicators
    const technicalTerms = definition.detailed.match(/\b\w{10,}\b/g) || []
    if (technicalTerms.length > 5) score -= 10 // Too technical

    return Math.max(0, Math.min(100, score))
  }

  private scoreReferences(references: References): number {
    let score = 0
    let maxScore = 0

    // Wikipedia (30 points)
    maxScore += 30
    if (references.wikipedia?.url) {
      score += 20
      if (references.wikipedia.extract) score += 10
    }

    // Books (20 points)
    maxScore += 20
    if (references.books && references.books.length > 0) {
      score += Math.min(20, references.books.length * 5)
    }

    // Research papers (15 points)
    maxScore += 15
    if (references.research_papers && references.research_papers.length > 0) {
      score += Math.min(15, references.research_papers.length * 5)
    }

    // Media (20 points for musicians/genres)
    if (references.media) {
      maxScore += 20
      if (references.media.spotify) score += 7
      if (references.media.youtube_music) score += 7
      if (references.media.youtube?.educational_videos) score += 6
    }

    // Shopping (15 points for instruments)
    if (references.shopping) {
      maxScore += 15
      if (references.shopping.instruments?.length > 0) score += 15
    }

    return Math.round((score / maxScore) * 100)
  }

  private generateSuggestions(entry: DictionaryEntry, score: number): string[] {
    const suggestions: string[] = []

    if (score < 70) {
      suggestions.push('Consider regenerating the definition for better clarity')
    }

    if (!entry.references.wikipedia) {
      suggestions.push('Add Wikipedia reference')
    }

    if (!entry.references.books || entry.references.books.length === 0) {
      suggestions.push('Add book recommendations')
    }

    if (entry.type === 'instrument' && !entry.references.shopping?.instruments) {
      suggestions.push('Add instrument purchase links')
    }

    if (entry.type === 'composer' && !entry.references.media?.spotify) {
      suggestions.push('Add Spotify artist link')
    }

    return suggestions
  }
}
```

### Caching Strategy

```typescript
// src/api/middleware/cache.ts
import { Context, Next } from 'hono'
import { Env } from '../../index'

export async function cacheMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Skip cache for non-GET requests
    if (c.req.method !== 'GET') {
      return next()
    }

    // Skip cache for admin endpoints
    if (c.req.path.includes('/admin/')) {
      return next()
    }

    const cacheKey = `cache:${c.req.url}`
    
    // Try to get from KV cache
    const cached = await c.env.CACHE.get(cacheKey, 'json')
    if (cached) {
      c.header('X-Cache', 'HIT')
      c.header('Cache-Control', 'public, max-age=300') // 5 minutes
      return c.json(cached)
    }

    // Continue to handler
    await next()

    // Cache successful responses
    if (c.res.status === 200) {
      const response = await c.res.json()
      const ttl = parseInt(c.env.CACHE_TTL) || 3600

      // Store in KV with TTL
      await c.env.CACHE.put(
        cacheKey,
        JSON.stringify(response),
        { expirationTtl: ttl }
      )

      c.header('X-Cache', 'MISS')
      c.header('Cache-Control', `public, max-age=${ttl}`)
      
      // Return the response
      return c.json(response)
    }
  }
}
```

### Database Operations

```typescript
// src/services/storage/d1.ts
import { Env } from '../../index'
import { DictionaryEntry } from '../../types/dictionary'

export class DictionaryDatabase {
  constructor(private db: D1Database) {}

  async findByTerm(normalizedTerm: string): Promise<DictionaryEntry | null> {
    const result = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries 
        WHERE normalized_term = ? 
        AND overall_score >= ?
      `)
      .bind(normalizedTerm, 60)
      .first()

    if (!result) return null

    return this.deserializeEntry(result)
  }

  async insert(entry: DictionaryEntry): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO dictionary_entries (
          id, term, normalized_term, type, definition, 
          references, metadata, quality_score, overall_score,
          created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entry.id,
        entry.term,
        entry.normalized_term,
        entry.type,
        JSON.stringify(entry.definition),
        JSON.stringify(entry.references),
        JSON.stringify(entry.metadata),
        JSON.stringify(entry.quality_score),
        entry.quality_score.overall,
        entry.created_at,
        entry.updated_at,
        entry.version
      )
      .run()
  }

  async update(entry: DictionaryEntry): Promise<void> {
    await this.db
      .prepare(`
        UPDATE dictionary_entries 
        SET definition = ?, references = ?, metadata = ?, 
            quality_score = ?, overall_score = ?, 
            updated_at = ?, version = version + 1
        WHERE id = ?
      `)
      .bind(
        JSON.stringify(entry.definition),
        JSON.stringify(entry.references),
        JSON.stringify(entry.metadata),
        JSON.stringify(entry.quality_score),
        entry.quality_score.overall,
        new Date().toISOString(),
        entry.id
      )
      .run()
  }

  async searchTerms(query: string, limit: number = 20): Promise<DictionaryEntry[]> {
    const results = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries 
        WHERE normalized_term LIKE ? 
        OR term LIKE ?
        ORDER BY overall_score DESC, search_frequency DESC
        LIMIT ?
      `)
      .bind(`%${query.toLowerCase()}%`, `%${query}%`, limit)
      .all()

    return results.results.map(r => this.deserializeEntry(r))
  }

  async getEnhancementCandidates(limit: number = 100): Promise<DictionaryEntry[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const results = await this.db
      .prepare(`
        SELECT * FROM dictionary_entries 
        WHERE overall_score < 80 
        AND updated_at < ?
        ORDER BY search_frequency DESC, overall_score ASC
        LIMIT ?
      `)
      .bind(thirtyDaysAgo.toISOString(), limit)
      .all()

    return results.results.map(r => this.deserializeEntry(r))
  }

  private deserializeEntry(row: any): DictionaryEntry {
    return {
      ...row,
      definition: JSON.parse(row.definition),
      references: JSON.parse(row.references),
      metadata: JSON.parse(row.metadata),
      quality_score: JSON.parse(row.quality_score)
    }
  }
}
```

### Reference Integration Example

```typescript
// src/services/references/wikipedia.ts
export class WikipediaService {
  private readonly API_URL = 'https://en.wikipedia.org/api/rest_v1'

  async getArticleInfo(term: string): Promise<WikipediaReference | null> {
    try {
      // Search for the page
      const searchUrl = `${this.API_URL}/page/summary/${encodeURIComponent(term)}`
      const response = await fetch(searchUrl)
      
      if (!response.ok) return null

      const data = await response.json()
      
      return {
        url: data.content_urls.desktop.page,
        extract: data.extract,
        last_verified: new Date().toISOString()
      }
    } catch (error) {
      console.error('Wikipedia API error:', error)
      return null
    }
  }
}

// src/services/references/books.ts
export class BookSearchService {
  async searchBooks(term: string, type: TermType): Promise<Book[]> {
    // Use Google Books API or Open Library API
    const query = this.buildBookQuery(term, type)
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      
      return data.items?.map(item => this.transformToBook(item)) || []
    } catch (error) {
      console.error('Book search error:', error)
      return []
    }
  }

  private buildBookQuery(term: string, type: TermType): string {
    const baseQuery = `"${term}" music`
    
    switch (type) {
      case 'instrument':
        return `${baseQuery} "how to play" OR "method" OR "technique"`
      case 'composer':
        return `${baseQuery} biography OR life OR works`
      case 'theory':
        return `${baseQuery} "music theory" OR textbook`
      default:
        return baseQuery
    }
  }

  private transformToBook(googleBook: any): Book {
    const isbn = googleBook.volumeInfo.industryIdentifiers?.find(
      id => id.type === 'ISBN_13'
    )?.identifier

    return {
      title: googleBook.volumeInfo.title,
      author: googleBook.volumeInfo.authors?.[0] || 'Unknown',
      isbn: isbn || '',
      amazon_url: `https://www.amazon.com/s?k=${isbn || googleBook.volumeInfo.title}`,
      affiliate_url: undefined, // Will be added by affiliate service
      relevance_score: 0.8 // Could be improved with better scoring
    }
  }
}
```

### Performance Optimization

```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()

  startTimer(operation: string): () => void {
    const start = Date.now()
    
    return () => {
      const duration = Date.now() - start
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, [])
      }
      
      this.metrics.get(operation)!.push(duration)
      
      // Keep only last 100 measurements
      const measurements = this.metrics.get(operation)!
      if (measurements.length > 100) {
        measurements.shift()
      }
    }
  }

  getMetrics(operation: string): {
    avg: number
    p50: number
    p95: number
    p99: number
  } | null {
    const measurements = this.metrics.get(operation)
    if (!measurements || measurements.length === 0) return null

    const sorted = [...measurements].sort((a, b) => a - b)
    
    return {
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
}

// Usage in handlers
export async function handleTermQuery(c: Context) {
  const monitor = c.get('monitor') as PerformanceMonitor
  const endTimer = monitor.startTimer('term_query')
  
  try {
    // ... handler logic
    
    return c.json(result)
  } finally {
    endTimer()
  }
}
```

## Deployment Guide

### Initial Setup

```bash
# Clone and setup
cd dictionary
npm install

# Create D1 database
wrangler d1 create mirubato-dictionary-prod
wrangler d1 create mirubato-dictionary-staging

# Run migrations
wrangler d1 execute mirubato-dictionary-staging --file=./migrations/0001_initial_schema.sql
wrangler d1 execute mirubato-dictionary-staging --file=./migrations/0002_analytics_tables.sql

# Create KV namespace
wrangler kv:namespace create "CACHE"

# Create R2 bucket
wrangler r2 bucket create mirubato-dictionary-exports

# Deploy to staging
wrangler deploy --env staging

# Test the service
curl https://mirubato-dictionary-staging.workers.dev/health

# Deploy to production
wrangler deploy --env production
```

### Health Check Implementation

```typescript
// src/api/handlers/health.ts
import { Hono } from 'hono'
import { Env } from '../../index'

export const healthHandler = new Hono<{ Bindings: Env }>()

/**
 * Comprehensive health check with AI service tests
 */
healthHandler.get('/health', async c => {
  const startTime = Date.now()

  // Run all health checks in parallel
  const [database, cache, cloudflareAI, openAI, anthropic, smokeTests] = await Promise.all([
    checkDatabase(c.env.DB),
    checkCache(c.env.CACHE),
    checkCloudflareAI(c.env.AI),
    checkOpenAI(c.env.OPENAI_API_KEY),
    checkAnthropic(c.env.ANTHROPIC_API_KEY),
    runAISmokeTests(c.env)
  ])

  const checks = {
    database,
    cache,
    ai: {
      cloudflare: cloudflareAI,
      openai: openAI,
      anthropic: anthropic
    },
    smokeTests
  }

  const allHealthy = Object.values(checks).every(check => {
    if (typeof check === 'object' && 'cloudflare' in check) {
      // For AI checks, at least Cloudflare AI should be healthy
      return check.cloudflare.status === 'healthy'
    }
    return check.status === 'healthy'
  })

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      service: 'mirubato-dictionary',
      version: '1.0.0',
      environment: c.env.ENVIRONMENT || 'production',
      timestamp: new Date().toISOString(),
      totalLatency: Date.now() - startTime,
      services: checks
    },
    allHealthy ? 200 : 503
  )
})

/**
 * AI-specific health check endpoint
 */
healthHandler.get('/health/ai', async c => {
  const models = await testAllAIModels(c.env)
  
  return c.json({
    status: models.some(m => m.status === 'healthy') ? 'operational' : 'degraded',
    timestamp: new Date().toISOString(),
    models
  })
})

// AI Health Check Functions
async function checkCloudflareAI(ai: any) {
  if (!ai) {
    return {
      status: 'unconfigured' as const,
      message: 'Cloudflare AI binding not configured'
    }
  }

  try {
    const start = Date.now()
    
    // Test with a simple prompt using Llama 3.1 8B
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: 'Define the word "piano" in one sentence.',
      max_tokens: 50,
      temperature: 0.1
    })

    const latency = Date.now() - start

    if (response && response.response) {
      return {
        status: 'healthy' as const,
        latency,
        model: '@cf/meta/llama-3.1-8b-instruct',
        responseLength: response.response.length,
        message: 'Cloudflare AI operational'
      }
    } else {
      return {
        status: 'unhealthy' as const,
        latency,
        error: 'No response from AI model'
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error?.toString(),
      message: 'Cloudflare AI test failed'
    }
  }
}

async function checkOpenAI(apiKey: string | undefined) {
  if (!apiKey) {
    return {
      status: 'unconfigured' as const,
      message: 'OpenAI API key not configured'
    }
  }

  try {
    const start = Date.now()
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Reply with "OK"' }],
        max_tokens: 10,
        temperature: 0
      })
    })

    const latency = Date.now() - start

    if (response.ok) {
      return {
        status: 'healthy' as const,
        latency,
        model: 'gpt-3.5-turbo',
        message: 'OpenAI API operational'
      }
    } else {
      return {
        status: 'unhealthy' as const,
        latency,
        httpStatus: response.status,
        error: `API returned ${response.status}`
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error?.toString(),
      message: 'OpenAI API test failed'
    }
  }
}

async function checkAnthropic(apiKey: string | undefined) {
  if (!apiKey) {
    return {
      status: 'unconfigured' as const,
      message: 'Anthropic API key not configured'
    }
  }

  try {
    const start = Date.now()
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Reply with OK' }],
        max_tokens: 10
      })
    })

    const latency = Date.now() - start

    if (response.ok) {
      return {
        status: 'healthy' as const,
        latency,
        model: 'claude-3-haiku',
        message: 'Anthropic API operational'
      }
    } else {
      return {
        status: 'unhealthy' as const,
        latency,
        httpStatus: response.status,
        error: `API returned ${response.status}`
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error?.toString(),
      message: 'Anthropic API test failed'
    }
  }
}

async function runAISmokeTests(env: Env) {
  const tests = {
    definition_generation: false,
    quality_validation: false,
    reference_extraction: false,
    multi_model_fallback: false
  }

  try {
    // Test 1: Generate a simple definition
    if (env.AI) {
      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: 'Define "forte" in music context. Response in JSON: {"definition": "..."}',
        max_tokens: 100,
        temperature: 0.3
      })
      tests.definition_generation = !!(response && response.response)
    }

    // Test 2: Validate quality with Mistral
    if (env.AI) {
      const response = await env.AI.run('@cf/mistral/mistral-7b-instruct-v0.2', {
        prompt: 'Rate this definition quality from 1-10: "A piano is a keyboard instrument." Response: {"score": X}',
        max_tokens: 50,
        temperature: 0.1
      })
      tests.quality_validation = !!(response && response.response)
    }

    // Test 3: Extract references (using text generation)
    if (env.AI) {
      const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: 'List Wikipedia URL for "violin". Response: {"url": "..."}',
        max_tokens: 100,
        temperature: 0.1
      })
      tests.reference_extraction = !!(response && response.response)
    }

    // Test 4: Multi-model fallback
    let fallbackWorked = false
    try {
      // Try primary model
      await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: 'Test prompt',
        max_tokens: 10
      })
      fallbackWorked = true
    } catch {
      // Try fallback
      if (env.OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Test' }],
            max_tokens: 10
          })
        })
        fallbackWorked = response.ok
      }
    }
    tests.multi_model_fallback = fallbackWorked

    const allPassed = Object.values(tests).every(test => test === true)

    return {
      status: allPassed ? 'healthy' as const : 'degraded' as const,
      tests,
      message: allPassed ? 'All AI smoke tests passed' : 'Some AI tests failed'
    }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      tests,
      error: error?.toString()
    }
  }
}

async function testAllAIModels(env: Env) {
  const models = [
    // Cloudflare AI Models
    {
      provider: 'cloudflare',
      model: '@cf/meta/llama-3.1-8b-instruct',
      name: 'Llama 3.1 8B',
      test: () => env.AI?.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: 'Test',
        max_tokens: 10
      })
    },
    {
      provider: 'cloudflare',
      model: '@cf/mistral/mistral-7b-instruct-v0.2',
      name: 'Mistral 7B v0.2',
      test: () => env.AI?.run('@cf/mistral/mistral-7b-instruct-v0.2', {
        prompt: 'Test',
        max_tokens: 10
      })
    },
    {
      provider: 'cloudflare',
      model: '@cf/google/gemma-7b-it',
      name: 'Gemma 7B',
      test: () => env.AI?.run('@cf/google/gemma-7b-it', {
        prompt: 'Test',
        max_tokens: 10
      })
    },
    // External APIs
    {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      test: async () => {
        if (!env.OPENAI_API_KEY) throw new Error('No API key')
        const response = await fetch('https://api.openai.com/v1/models/gpt-3.5-turbo', {
          headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` }
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
      }
    }
  ]

  return Promise.all(models.map(async model => {
    try {
      const start = Date.now()
      await model.test()
      return {
        ...model,
        status: 'healthy' as const,
        latency: Date.now() - start
      }
    } catch (error) {
      return {
        ...model,
        status: 'unhealthy' as const,
        error: error?.toString()
      }
    }
  }))
}
```

### Monitoring Setup

```typescript
// src/monitoring/metrics.ts
export async function reportMetrics(env: Env, metrics: any) {
  // Send to analytics service
  await fetch('https://analytics.mirubato.com/metrics', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.METRICS_API_KEY}`
    },
    body: JSON.stringify({
      service: 'dictionary',
      timestamp: new Date().toISOString(),
      metrics
    })
  })
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/services/scoring/algorithm.test.ts
import { describe, it, expect } from 'vitest'
import { QualityScorer } from './algorithm'

describe('QualityScorer', () => {
  const scorer = new QualityScorer()

  it('should score high-quality definitions highly', () => {
    const entry = {
      definition: {
        concise: 'A piano is a large keyboard instrument with strings struck by hammers.',
        detailed: 'The piano is an acoustic, stringed musical instrument invented...',
        etymology: 'From Italian pianoforte, meaning soft-loud',
        pronunciation: { ipa: '/piˈænoʊ/' }
      },
      references: {
        wikipedia: { url: 'https://...', extract: '...' },
        books: [{ title: 'The Piano', ... }],
        shopping: { instruments: [{ store_name: 'Sweetwater', ... }] }
      },
      metadata: { search_frequency: 100, ... }
    }

    const score = scorer.calculateScore(entry)
    expect(score.overall).toBeGreaterThan(85)
  })
})
```

### Integration Tests

```typescript
// tests/integration/api.test.ts
import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('Dictionary API', () => {
  it('should return term definition', async () => {
    const response = await app.request('/api/v1/terms/piano')
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.status).toBe('success')
    expect(data.data.entry.term).toBe('piano')
  })
})
```

## Best Practices

### 1. Error Handling

Always wrap AI calls and external API calls in try-catch blocks with appropriate fallbacks.

### 2. Rate Limiting

Implement per-IP and per-key rate limiting to prevent abuse.

### 3. Caching

Use multi-layer caching (KV for hot data, D1 for persistent, edge cache for static).

### 4. Monitoring

Track all key metrics and set up alerts for anomalies.

### 5. Security

- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Regular security audits

## Troubleshooting

### Common Issues

1. **AI Model Timeout**
   - Solution: Implement shorter timeouts and fallback models
   - Use streaming responses where possible

2. **Database Performance**
   - Solution: Add appropriate indexes
   - Use connection pooling
   - Implement query optimization

3. **Cache Invalidation**
   - Solution: Use versioned cache keys
   - Implement cache warming strategies
   - Monitor cache hit rates

---

*Last Updated: January 2024*
*Version: 1.0*