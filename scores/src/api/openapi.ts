/**
 * OpenAPI Specification for Scores Service
 */

export const openAPISpec = {
  openapi: '3.1.0',
  info: {
    title: 'Mirubato Scores API',
    version: '1.1.0',
    description: `
The Mirubato Scores Service provides a comprehensive API for managing sheet music scores, including storage, processing, and delivery.

## Features

- 📄 **Score Management**: CRUD operations for sheet music metadata
- 🔍 **Advanced Search**: Full-text search with multiple filters
- 📚 **Collections**: Curated collections of scores
- 📤 **Import**: Support for PDF uploads and IMSLP imports
- 🖼️ **Rendering**: Generate previews and rendered scores
- 📊 **Analytics**: Track popular and trending scores

## Authentication

Currently, the API is public for read operations. Write operations may require authentication in future versions.

## Rate Limiting

API requests are limited to 100 requests per minute per IP address.
    `,
    contact: {
      name: 'Mirubato Team',
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
      url: 'https://scores.mirubato.com',
      description: 'Production',
    },
    {
      url: 'https://scores-staging.mirubato.com',
      description: 'Staging',
    },
    {
      url: 'http://scores-mirubato.localhost:9788',
      description: 'Local Development',
    },
  ],
  tags: [
    {
      name: 'Scores',
      description: 'Score management operations',
    },
    {
      name: 'Search',
      description: 'Search and discovery',
    },
    {
      name: 'Collections',
      description: 'Curated collections',
    },
    {
      name: 'Import',
      description: 'Import scores from various sources',
    },
    {
      name: 'Render',
      description: 'Score rendering and display',
    },
    {
      name: 'Health',
      description: 'Service health and status',
    },
  ],
  paths: {
    '/livez': {
      get: {
        tags: ['Health'],
        summary: 'Liveness check',
        description: 'Check if the service is alive and responding',
        operationId: 'getLiveness',
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok',
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Comprehensive health check including dependencies',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus',
                },
              },
            },
          },
          '503': {
            description: 'Service is unhealthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus',
                },
              },
            },
          },
        },
      },
    },
    '/api/scores': {
      get: {
        tags: ['Scores'],
        summary: 'List scores',
        description: 'Get a paginated list of scores with optional filtering',
        operationId: 'listScores',
        parameters: [
          {
            name: 'instrument',
            in: 'query',
            description: 'Filter by instrument',
            schema: {
              $ref: '#/components/schemas/Instrument',
            },
          },
          {
            name: 'difficulty',
            in: 'query',
            description: 'Filter by difficulty',
            schema: {
              $ref: '#/components/schemas/Difficulty',
            },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items to return',
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
            description: 'Number of items to skip',
            schema: {
              type: 'integer',
              minimum: 0,
              default: 0,
            },
          },
        ],
        responses: {
          '200': {
            description: 'List of scores',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ScoreListResponse',
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Scores'],
        summary: 'Create score',
        description: 'Create a new score entry',
        operationId: 'createScore',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateScoreRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Score created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ScoreResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/scores/{id}': {
      get: {
        tags: ['Scores'],
        summary: 'Get score',
        description: 'Get a single score by ID',
        operationId: 'getScore',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Score ID',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Score details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ScoreResponse',
                },
              },
            },
          },
          '404': {
            description: 'Score not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Scores'],
        summary: 'Update score',
        description: 'Update score metadata',
        operationId: 'updateScore',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Score ID',
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateScoreRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Score updated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ScoreResponse',
                },
              },
            },
          },
          '404': {
            description: 'Score not found',
          },
        },
      },
      delete: {
        tags: ['Scores'],
        summary: 'Delete score',
        description: 'Delete a score and all associated files',
        operationId: 'deleteScore',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Score ID',
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Score deleted',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse',
                },
              },
            },
          },
          '404': {
            description: 'Score not found',
          },
        },
      },
    },
    '/api/scores/{id}/render': {
      get: {
        tags: ['Render'],
        summary: 'Render score',
        description: 'Render a score in various formats',
        operationId: 'renderScore',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Score ID',
            schema: {
              type: 'string',
            },
          },
          {
            name: 'format',
            in: 'query',
            description: 'Output format',
            schema: {
              type: 'string',
              enum: ['svg', 'png', 'pdf'],
              default: 'svg',
            },
          },
          {
            name: 'pageNumber',
            in: 'query',
            description: 'Page number for multi-page scores',
            schema: {
              type: 'integer',
              minimum: 1,
            },
          },
          {
            name: 'scale',
            in: 'query',
            description: 'Scale factor',
            schema: {
              type: 'number',
              minimum: 0.1,
              maximum: 5,
              default: 1,
            },
          },
        ],
        responses: {
          '200': {
            description: 'Rendered score',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RenderedScoreResponse',
                },
              },
            },
          },
          '404': {
            description: 'Score not found',
          },
        },
      },
    },
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Search scores',
        description: 'Advanced search with multiple filters',
        operationId: 'searchScores',
        parameters: [
          {
            name: 'query',
            in: 'query',
            description: 'Search query',
            schema: {
              type: 'string',
            },
          },
          {
            name: 'instrument',
            in: 'query',
            schema: {
              $ref: '#/components/schemas/Instrument',
            },
          },
          {
            name: 'difficulty',
            in: 'query',
            schema: {
              $ref: '#/components/schemas/Difficulty',
            },
          },
          {
            name: 'composer',
            in: 'query',
            description: 'Filter by composer',
            schema: {
              type: 'string',
            },
          },
          {
            name: 'stylePeriod',
            in: 'query',
            schema: {
              $ref: '#/components/schemas/StylePeriod',
            },
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Sort field',
            schema: {
              type: 'string',
              enum: [
                'title',
                'composer',
                'difficulty',
                'createdAt',
                'popularity',
              ],
              default: 'createdAt',
            },
          },
          {
            name: 'sortOrder',
            in: 'query',
            description: 'Sort order',
            schema: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SearchResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/collections': {
      get: {
        tags: ['Collections'],
        summary: 'List collections',
        description: 'Get all collections',
        operationId: 'listCollections',
        parameters: [
          {
            name: 'featured',
            in: 'query',
            description: 'Filter featured collections',
            schema: {
              type: 'boolean',
            },
          },
        ],
        responses: {
          '200': {
            description: 'List of collections',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CollectionListResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/import/pdf': {
      post: {
        tags: ['Import'],
        summary: 'Import PDF',
        description: 'Upload a PDF score',
        operationId: 'importPDF',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'PDF file',
                  },
                  metadata: {
                    type: 'string',
                    description: 'JSON metadata',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'PDF imported',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ImportResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/import/imslp': {
      post: {
        tags: ['Import'],
        summary: 'Import from IMSLP',
        description: 'Import a score from IMSLP URL',
        operationId: 'importIMSLP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ImportIMSLPRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Import started',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ImportResponse',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Instrument: {
        type: 'string',
        enum: ['PIANO', 'GUITAR', 'BOTH'],
        description: 'Musical instrument',
      },
      Difficulty: {
        type: 'string',
        enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
        description: 'Difficulty level',
      },
      StylePeriod: {
        type: 'string',
        enum: ['BAROQUE', 'CLASSICAL', 'ROMANTIC', 'MODERN', 'CONTEMPORARY'],
        description: 'Musical style period',
      },
      Score: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier',
          },
          title: {
            type: 'string',
            description: 'Score title',
          },
          composer: {
            type: 'string',
            description: 'Composer name',
          },
          opus: {
            type: 'string',
            description: 'Opus number',
            nullable: true,
          },
          movement: {
            type: 'string',
            description: 'Movement',
            nullable: true,
          },
          instrument: {
            $ref: '#/components/schemas/Instrument',
          },
          difficulty: {
            $ref: '#/components/schemas/Difficulty',
          },
          difficultyLevel: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'Difficulty level (1-10)',
          },
          gradeLevel: {
            type: 'string',
            description: 'Grade level (e.g., RCM 5)',
            nullable: true,
          },
          durationSeconds: {
            type: 'integer',
            description: 'Duration in seconds',
            nullable: true,
          },
          stylePeriod: {
            $ref: '#/components/schemas/StylePeriod',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      CreateScoreRequest: {
        type: 'object',
        required: ['title', 'composer', 'instrument', 'difficulty', 'source'],
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
          },
          composer: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
          },
          opus: {
            type: 'string',
            nullable: true,
          },
          instrument: {
            $ref: '#/components/schemas/Instrument',
          },
          difficulty: {
            $ref: '#/components/schemas/Difficulty',
          },
          difficultyLevel: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
            default: [],
          },
        },
      },
      UpdateScoreRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
          },
          composer: {
            type: 'string',
          },
          difficulty: {
            $ref: '#/components/schemas/Difficulty',
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
      Collection: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          slug: {
            type: 'string',
          },
          description: {
            type: 'string',
            nullable: true,
          },
          instrument: {
            $ref: '#/components/schemas/Instrument',
          },
          difficulty: {
            $ref: '#/components/schemas/Difficulty',
          },
          scoreIds: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          isFeatured: {
            type: 'boolean',
          },
        },
      },
      ImportIMSLPRequest: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            pattern: 'imslp\\.org',
            description: 'IMSLP URL',
          },
          autoProcess: {
            type: 'boolean',
            default: true,
            description: 'Automatically download and process PDFs',
          },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
          },
          service: {
            type: 'string',
          },
          environment: {
            type: 'string',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          checks: {
            type: 'object',
            properties: {
              database: {
                $ref: '#/components/schemas/HealthCheck',
              },
              storage: {
                $ref: '#/components/schemas/HealthCheck',
              },
              cache: {
                $ref: '#/components/schemas/HealthCheck',
              },
            },
          },
        },
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ok', 'error'],
          },
          latency: {
            type: 'number',
            description: 'Response time in milliseconds',
          },
          message: {
            type: 'string',
            nullable: true,
          },
        },
      },
      ScoreResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            $ref: '#/components/schemas/Score',
          },
        },
      },
      ScoreListResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Score',
                },
              },
              total: {
                type: 'integer',
              },
              limit: {
                type: 'integer',
              },
              offset: {
                type: 'integer',
              },
              hasMore: {
                type: 'boolean',
              },
            },
          },
        },
      },
      SearchResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            type: 'object',
            properties: {
              scores: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Score',
                },
              },
              total: {
                type: 'integer',
              },
              limit: {
                type: 'integer',
              },
              offset: {
                type: 'integer',
              },
            },
          },
        },
      },
      CollectionListResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Collection',
            },
          },
        },
      },
      ImportResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            type: 'object',
            properties: {
              scoreId: {
                type: 'string',
              },
              status: {
                type: 'string',
                enum: ['imported', 'processing', 'failed'],
              },
              message: {
                type: 'string',
              },
            },
          },
        },
      },
      RenderedScoreResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          data: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
              },
              data: {
                type: 'string',
                description: 'Base64 encoded image or SVG string',
              },
              pageCount: {
                type: 'integer',
              },
              dimensions: {
                type: 'object',
                properties: {
                  width: {
                    type: 'integer',
                  },
                  height: {
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
          },
          message: {
            type: 'string',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
          },
          code: {
            type: 'integer',
          },
        },
      },
    },
  },
}
