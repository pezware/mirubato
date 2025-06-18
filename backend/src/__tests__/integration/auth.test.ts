import { GraphQLSchema, execute, parse } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { typeDefs } from '../../schema'
import { resolvers } from '../../resolvers'
import {
  createMockKV,
  mockUser,
  createTestContext,
} from '../../test-utils/graphql'
import { createMockDB, MockD1Database } from '../../test-utils/db'
import type { GraphQLContext } from '../../types/context'
import type { D1Database } from '@cloudflare/workers-types'

describe('Authentication Integration Tests', () => {
  let schema: GraphQLSchema
  let mockDB: MockD1Database
  let mockKV: ReturnType<typeof createMockKV>

  beforeAll(() => {
    schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })
  })

  beforeEach(() => {
    mockDB = createMockDB() as unknown as MockD1Database
    mockKV = createMockKV()
  })

  afterEach(() => {
    mockDB.clearMockData()
  })

  // Helper function to execute GraphQL queries
  const executeQuery = async (
    query: string,
    variables?: any,
    contextOverrides?: Partial<GraphQLContext>
  ) => {
    const context = createTestContext({
      env: {
        DB: mockDB as unknown as D1Database,
        MIRUBATO_MAGIC_LINKS: mockKV,
        JWT_SECRET: 'test-secret',
        ENVIRONMENT: 'development',
      },
      ...contextOverrides,
    })

    return execute({
      schema,
      document: parse(query),
      variableValues: variables,
      contextValue: context,
    })
  }

  describe('requestMagicLink mutation', () => {
    const REQUEST_MAGIC_LINK = `
      mutation RequestMagicLink($email: String!) {
        requestMagicLink(email: $email) {
          success
          message
        }
      }
    `

    it('should send magic link for valid email', async () => {
      const result = await executeQuery(REQUEST_MAGIC_LINK, {
        email: 'test@example.com',
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.requestMagicLink).toEqual({
        success: true,
        message: 'Magic link sent to your email',
      })
    })

    it('should reject invalid email', async () => {
      const result = await executeQuery(REQUEST_MAGIC_LINK, {
        email: 'invalid-email',
      })

      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('Invalid email')
    })
  })

  describe('verifyMagicLink mutation', () => {
    const VERIFY_MAGIC_LINK = `
      mutation VerifyMagicLink($token: String!) {
        verifyMagicLink(token: $token) {
          success
          user {
            id
            email
          }
          accessToken
          refreshToken
        }
      }
    `

    it('should verify valid magic link and return tokens', async () => {
      // Set up magic link in KV
      const token = 'valid-magic-link-token-1234567890ab'
      await mockKV.put(`magic_link:${token}`, 'test@example.com', {
        expirationTtl: 900,
      })

      // Set up user in DB
      mockDB.setMockData('users', [mockUser])

      const result = await executeQuery(VERIFY_MAGIC_LINK, { token })

      expect(result.errors).toBeUndefined()
      expect(result.data?.verifyMagicLink.success).toBe(true)
      expect(result.data?.verifyMagicLink.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
      })
      expect(result.data?.verifyMagicLink.accessToken).toBeTruthy()
      expect(result.data?.verifyMagicLink.refreshToken).toBeTruthy()
    })

    it('should reject invalid token', async () => {
      const result = await executeQuery(VERIFY_MAGIC_LINK, {
        token: 'invalid-token',
      })

      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('Invalid or expired')
    })
  })

  describe('Protected queries', () => {
    const ME_QUERY = `
      query Me {
        me {
          id
          email
          displayName
        }
      }
    `

    it('should return user data when authenticated', async () => {
      const result = await executeQuery(ME_QUERY, undefined, {
        user: mockUser,
      })

      expect(result.errors).toBeUndefined()
      expect(result.data?.me).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
      })
    })

    it('should return null when not authenticated', async () => {
      const result = await executeQuery(ME_QUERY)

      expect(result.errors).toBeUndefined()
      expect(result.data?.me).toBeNull()
    })
  })
})
