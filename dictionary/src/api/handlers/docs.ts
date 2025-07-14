/**
 * OpenAPI Documentation Handler
 */

import { Hono } from 'hono'
import { Env } from '../../types/env'
import { swaggerUI } from '@hono/swagger-ui'

export const docsHandler = new Hono<{ Bindings: Env }>()

// Generate OpenAPI specification dynamically
const generateOpenAPISpec = (baseUrl: string) => ({
  openapi: '3.0.0',
  info: {
    title: 'Mirubato Music Dictionary API',
    version: '1.0.0',
    description: `
The Mirubato Music Dictionary API provides comprehensive access to musical terms, definitions, and educational content. 
Built with AI-powered enhancements and quality scoring, it serves as a reliable resource for music education.

## Features
- **Comprehensive Dictionary**: Access thousands of musical terms across instruments, genres, techniques, and theory
- **AI-Enhanced Content**: Definitions are generated and enhanced using state-of-the-art AI models
- **Quality Scoring**: Every entry has a quality score to ensure accuracy and educational value
- **Multi-language Support**: Definitions available in multiple languages
- **Smart Search**: Full-text search with filters and semantic search capabilities
- **Batch Operations**: Query multiple terms efficiently in a single request

## Authentication
Most endpoints are public. Protected endpoints require a JWT bearer token obtained from the Mirubato authentication service.

## Rate Limiting
- Anonymous users: 60 requests/minute
- Authenticated users: 120 requests/minute  
- Premium users: 600 requests/minute
`,
    contact: {
      name: 'Mirubato Support',
      email: 'support@mirubato.com',
      url: 'https://mirubato.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: baseUrl,
      description: 'Current server',
    },
    {
      url: 'https://dictionary.mirubato.com',
      description: 'Production server',
    },
    {
      url: 'https://dictionary-staging.mirubato.com',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:8787',
      description: 'Local development',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service health and monitoring',
    },
    {
      name: 'Terms',
      description: 'Dictionary term operations',
    },
    {
      name: 'Search',
      description: 'Search and discovery endpoints',
    },
    {
      name: 'Batch',
      description: 'Batch query operations',
    },
    {
      name: 'Enhance',
      description: 'AI-powered term enhancement',
    },
    {
      name: 'Analytics',
      description: 'Usage analytics and statistics',
    },
    {
      name: 'Export',
      description: 'Data export operations',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Comprehensive health check',
        description: 'Returns detailed health status of all service components',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthCheck',
                },
              },
            },
          },
          '503': {
            description: 'Service is degraded',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthCheck',
                },
              },
            },
          },
        },
      },
    },
    '/livez': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Simple check that service is running',
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok'] },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/readyz': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Check if service can handle requests',
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ready'] },
                    checks: {
                      type: 'object',
                      properties: {
                        database: { type: 'boolean' },
                        cache: { type: 'boolean' },
                      },
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '503': {
            description: 'Service is not ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['not_ready'] },
                    checks: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Prometheus metrics',
        description: 'Metrics endpoint in Prometheus format',
        responses: {
          '200': {
            description: 'Metrics in Prometheus format',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example:
                    '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",path="/api/v1/terms",status="200"} 42',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/terms/{term}': {
      get: {
        tags: ['Terms'],
        summary: 'Get dictionary entry by term',
        description:
          'Retrieves a comprehensive dictionary entry for the specified musical term',
        parameters: [
          {
            name: 'term',
            in: 'path',
            required: true,
            description: 'The musical term to look up',
            schema: {
              type: 'string',
              example: 'forte',
            },
          },
          {
            name: 'type',
            in: 'query',
            description: 'Filter by term type',
            schema: {
              type: 'string',
              enum: [
                'instrument',
                'genre',
                'technique',
                'composer',
                'theory',
                'general',
              ],
            },
          },
          {
            name: 'enhance',
            in: 'query',
            description: 'Request AI enhancement if quality is low',
            schema: {
              type: 'boolean',
              default: false,
            },
          },
          {
            name: 'generate_if_missing',
            in: 'query',
            description: 'Generate entry using AI if not found',
            schema: {
              type: 'boolean',
              default: false,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Term found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        entry: { $ref: '#/components/schemas/DictionaryEntry' },
                        related_terms: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/RelatedTerm' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Term not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/terms/{id}/feedback': {
      post: {
        tags: ['Terms'],
        summary: 'Submit feedback for a term',
        description:
          'Allows users to provide feedback on dictionary entry quality',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rating: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                  },
                  helpful: { type: 'boolean' },
                  feedback_text: {
                    type: 'string',
                    maxLength: 1000,
                  },
                  feedback_type: {
                    type: 'string',
                    enum: ['accuracy', 'clarity', 'completeness', 'other'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Feedback submitted successfully',
          },
        },
      },
    },
    '/api/v1/search': {
      get: {
        tags: ['Search'],
        summary: 'Search dictionary entries',
        description: 'Full-text search with advanced filtering options',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            description: 'Search query',
            schema: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
            },
          },
          {
            name: 'type',
            in: 'query',
            description: 'Filter by term type',
            schema: {
              type: 'string',
              enum: [
                'instrument',
                'genre',
                'technique',
                'composer',
                'theory',
                'general',
              ],
            },
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: 'offset',
            in: 'query',
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0,
            },
          },
          {
            name: 'sort_by',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['relevance', 'alphabetical', 'quality', 'popularity'],
              default: 'relevance',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        results: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/DictionaryEntry',
                          },
                        },
                        total: { type: 'integer' },
                        query: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/search/semantic': {
      post: {
        tags: ['Search'],
        summary: 'Semantic search',
        description: 'AI-powered semantic search for related terms',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 500,
                  },
                  limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 50,
                    default: 10,
                  },
                  threshold: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    default: 0.7,
                  },
                },
                required: ['query'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Semantic search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        results: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              entry: {
                                $ref: '#/components/schemas/DictionaryEntry',
                              },
                              score: { type: 'number' },
                              explanation: { type: 'string' },
                            },
                          },
                        },
                        query_interpretation: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/batch/query': {
      post: {
        tags: ['Batch'],
        summary: 'Batch query multiple terms',
        description: 'Query multiple dictionary terms in a single request',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  terms: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 50,
                  },
                  type: {
                    type: 'string',
                    enum: [
                      'instrument',
                      'genre',
                      'technique',
                      'composer',
                      'theory',
                      'general',
                    ],
                  },
                  generate_missing: { type: 'boolean', default: false },
                  include_related: { type: 'boolean', default: false },
                },
                required: ['terms'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Batch query results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        entries: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/DictionaryEntry',
                          },
                        },
                        missing: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                        total: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/enhance': {
      post: {
        tags: ['Enhance'],
        summary: 'Enhance dictionary entry with AI',
        description:
          'Request AI enhancement for low-quality dictionary entries',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  providers: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['claude', 'openai', 'gemini', 'cloudflare'],
                    },
                  },
                  force: { type: 'boolean', default: false },
                },
                required: ['id'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Enhancement successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        entry: { $ref: '#/components/schemas/DictionaryEntry' },
                        enhanced: { type: 'boolean' },
                        quality_improvement: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/v1/analytics/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get analytics summary',
        description: 'Retrieve analytics summary for dictionary usage',
        responses: {
          '200': {
            description: 'Analytics summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        total_entries: { type: 'integer' },
                        quality_distribution: {
                          type: 'object',
                          properties: {
                            high: { type: 'integer' },
                            medium: { type: 'integer' },
                            low: { type: 'integer' },
                          },
                        },
                        type_distribution: {
                          type: 'object',
                          additionalProperties: { type: 'integer' },
                        },
                        popular_terms: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              term: { type: 'string' },
                              search_count: { type: 'integer' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/export/{format}': {
      get: {
        tags: ['Export'],
        summary: 'Export dictionary data',
        description: 'Export dictionary entries in various formats',
        parameters: [
          {
            name: 'format',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: ['json', 'csv', 'pdf'],
            },
          },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'instrument',
                'genre',
                'technique',
                'composer',
                'theory',
                'general',
              ],
            },
          },
          {
            name: 'quality_min',
            in: 'query',
            schema: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Export successful',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
              'text/csv': {
                schema: { type: 'string' },
              },
              'application/pdf': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      DictionaryEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          term: { type: 'string' },
          normalized_term: { type: 'string' },
          type: {
            type: 'string',
            enum: [
              'instrument',
              'genre',
              'technique',
              'composer',
              'theory',
              'general',
            ],
          },
          definition: {
            type: 'object',
            properties: {
              concise: { type: 'string' },
              detailed: { type: 'string' },
              etymology: { type: 'string' },
              pronunciation: {
                type: 'object',
                properties: {
                  ipa: { type: 'string' },
                  syllables: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  stress_pattern: { type: 'string' },
                },
              },
              usage_example: { type: 'string' },
            },
          },
          references: {
            type: 'object',
            properties: {
              wikipedia: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    url: { type: 'string' },
                    excerpt: { type: 'string' },
                  },
                },
              },
              books: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    author: { type: 'string' },
                    isbn: { type: 'string' },
                    year: { type: 'integer' },
                  },
                },
              },
            },
          },
          quality_score: {
            type: 'object',
            properties: {
              accuracy: { type: 'number' },
              completeness: { type: 'number' },
              clarity: { type: 'number' },
              references: { type: 'number' },
              overall: { type: 'number' },
            },
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          version: { type: 'integer' },
        },
      },
      RelatedTerm: {
        type: 'object',
        properties: {
          entry: { $ref: '#/components/schemas/DictionaryEntry' },
          relationship_type: {
            type: 'string',
            enum: ['synonym', 'antonym', 'see_also', 'broader', 'narrower'],
          },
          confidence_score: { type: 'number' },
        },
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
          },
          service: { type: 'string' },
          version: { type: 'string' },
          environment: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          totalLatency: { type: 'integer' },
          services: {
            type: 'object',
            properties: {
              database: { type: 'object' },
              cache: { type: 'object' },
              storage: { type: 'object' },
              ai: { type: 'object' },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          message: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  },
})

// Serve OpenAPI spec as JSON
docsHandler.get('/openapi.json', c => {
  const url = new URL(c.req.url)
  const baseUrl = `${url.protocol}//${url.host}`
  return c.json(generateOpenAPISpec(baseUrl))
})

// Serve Swagger UI
docsHandler.get('/', swaggerUI({ url: '/docs/openapi.json' }))

// Redirect /docs to /docs/
docsHandler.get('', c => {
  return c.redirect('/docs/', 301)
})
