import { SERVICE_VERSION } from '../utils/version'

export const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'Mirubato API',
    version: SERVICE_VERSION,
    description:
      'REST API for Mirubato cloud sync and authentication. This API serves authenticated users only for data synchronization.',
    contact: {
      name: 'Mirubato Team',
      email: 'support@mirubato.com',
    },
  },
  servers: [
    {
      url: 'https://api.mirubato.com',
      description: 'Production',
    },
    {
      url: 'https://api-staging.mirubato.com',
      description: 'Staging',
    },
    {
      url: 'http://api-mirubato.localhost:9797',
      description: 'Development',
    },
  ],
  tags: [
    {
      name: 'auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'sync',
      description: 'Data synchronization endpoints',
    },
    {
      name: 'user',
      description: 'User management endpoints',
    },
  ],
  paths: {
    '/api/auth/request-magic-link': {
      post: {
        tags: ['auth'],
        summary: 'Request magic link',
        description: "Send a magic link to the user's email for authentication",
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'user@example.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Magic link sent successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthPayload',
                },
              },
            },
          },
          '400': {
            description: 'Invalid email',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '429': {
            description: 'Too many requests',
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
    '/api/auth/verify-magic-link': {
      post: {
        tags: ['auth'],
        summary: 'Verify magic link',
        description: 'Verify the magic link token and authenticate the user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: {
                    type: 'string',
                    example: 'magic-link-token',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid or expired token',
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
    '/api/auth/google': {
      post: {
        tags: ['auth'],
        summary: 'Google OAuth login',
        description: 'Authenticate with Google OAuth',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['credential'],
                properties: {
                  credential: {
                    type: 'string',
                    description: 'Google ID token',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid credential',
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
    '/api/auth/refresh': {
      post: {
        tags: ['auth'],
        summary: 'Refresh token',
        description: 'Refresh the access token using a refresh token',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TokenResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid refresh token',
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
    '/api/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Logout',
        description: 'Logout the user and invalidate tokens',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthPayload',
                },
              },
            },
          },
        },
      },
    },
    '/api/sync/pull': {
      post: {
        tags: ['sync'],
        summary: 'Pull user data',
        description: 'Get all user data from cloud for initial sync',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Data retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SyncData',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
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
    '/api/sync/push': {
      post: {
        tags: ['sync'],
        summary: 'Push local changes',
        description: 'Push local changes to cloud',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SyncChanges',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Changes pushed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SyncResult',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '409': {
            description: 'Sync conflict',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SyncConflict',
                },
              },
            },
          },
        },
      },
    },
    '/api/sync/batch': {
      post: {
        tags: ['sync'],
        summary: 'Batch sync',
        description: 'Bidirectional sync batch operation',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SyncBatch',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Batch sync completed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BatchSyncResult',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
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
    '/api/sync/status': {
      get: {
        tags: ['sync'],
        summary: 'Get sync status',
        description: 'Get sync metadata and status',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Sync status retrieved',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SyncStatus',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
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
    '/api/user/me': {
      get: {
        tags: ['user'],
        summary: 'Get current user',
        description: 'Get current user information',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': {
            description: 'User information',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
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
      delete: {
        tags: ['user'],
        summary: 'Delete account',
        description: 'Delete user account and all associated data',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Account deleted successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthPayload',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
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
    '/api/user/preferences': {
      put: {
        tags: ['user'],
        summary: 'Update preferences',
        description: 'Update user preferences (cloud backup)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UserPreferences',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Preferences updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean',
                      example: true,
                    },
                    preferences: {
                      $ref: '#/components/schemas/UserPreferences',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
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
  },
  components: {
    schemas: {
      AuthPayload: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Magic link sent to your email',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            example: 'refresh-token',
          },
          expiresIn: {
            type: 'integer',
            example: 3600,
          },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          expiresIn: {
            type: 'integer',
            example: 3600,
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'user-123',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          displayName: {
            type: 'string',
            example: 'John Doe',
          },
          authProvider: {
            type: 'string',
            enum: ['magic_link', 'google'],
            example: 'google',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
        },
      },
      UserPreferences: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: ['light', 'dark', 'auto'],
            example: 'dark',
          },
          notificationSettings: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      SyncData: {
        type: 'object',
        properties: {
          entries: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          goals: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          syncToken: {
            type: 'string',
            example: 'sync-token-123',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
        },
      },
      SyncChanges: {
        type: 'object',
        properties: {
          changes: {
            type: 'object',
            properties: {
              entries: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
              goals: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
          lastSyncToken: {
            type: 'string',
            example: 'previous-token',
          },
        },
      },
      SyncResult: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          syncToken: {
            type: 'string',
            example: 'new-token',
          },
          conflicts: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
        },
      },
      SyncBatch: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'local-id',
                },
                type: {
                  type: 'string',
                  enum: [
                    'logbook_entry',
                    'goal',
                    'practice_plan',
                    'plan_occurrence',
                    'plan_template',
                    'user_preferences',
                  ],
                  example: 'logbook_entry',
                },
                data: {
                  type: 'object',
                },
                checksum: {
                  type: 'string',
                  example: 'hash',
                },
                version: {
                  type: 'integer',
                  example: 1,
                },
              },
            },
          },
          syncToken: {
            type: 'string',
            example: 'previous-token',
          },
        },
      },
      BatchSyncResult: {
        type: 'object',
        properties: {
          uploaded: {
            type: 'integer',
            example: 5,
          },
          downloaded: {
            type: 'integer',
            example: 3,
          },
          conflicts: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          newSyncToken: {
            type: 'string',
            example: 'new-token',
          },
        },
      },
      SyncStatus: {
        type: 'object',
        properties: {
          lastSyncTime: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00Z',
          },
          syncToken: {
            type: 'string',
            example: 'current-token',
          },
          pendingChanges: {
            type: 'integer',
            example: 0,
          },
          deviceCount: {
            type: 'integer',
            example: 2,
          },
        },
      },
      SyncConflict: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          conflicts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                entityId: {
                  type: 'string',
                },
                localVersion: {
                  type: 'integer',
                },
                remoteVersion: {
                  type: 'integer',
                },
              },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
          code: {
            type: 'integer',
            example: 400,
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'auth-token',
      },
    },
  },
}
