import { ApolloServer } from '@apollo/server'
import { typeDefs } from '../../schema'
import { resolvers } from '../../resolvers'
import {
  executeGraphQLQuery,
  createMockContext,
  mockUser,
} from '../../test-utils/graphql'
import { createMockDB, MockD1Database } from '../../test-utils/db'
import type { GraphQLContext } from '../../types/context'
import type { D1Database } from '@cloudflare/workers-types'

describe('Authentication Integration Tests', () => {
  let server: ApolloServer<GraphQLContext>
  let mockDB: MockD1Database

  beforeAll(() => {
    server = new ApolloServer<GraphQLContext>({
      typeDefs,
      resolvers,
    })
  })

  beforeEach(() => {
    mockDB = createMockDB() as unknown as MockD1Database
  })

  afterEach(() => {
    mockDB.clearMockData()
  })

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
      const result = await executeGraphQLQuery(server, REQUEST_MAGIC_LINK, {
        email: 'test@example.com',
      })

      expect(result.body.singleResult.errors).toBeUndefined()
      expect(result.body.singleResult.data?.requestMagicLink).toEqual({
        success: true,
        message: 'Magic link sent to your email',
      })
    })

    it('should reject invalid email', async () => {
      const result = await executeGraphQLQuery(server, REQUEST_MAGIC_LINK, {
        email: 'invalid-email',
      })

      expect(result.body.singleResult.errors).toBeDefined()
      expect(result.body.singleResult.errors?.[0].message).toContain(
        'Invalid email'
      )
    })
  })

  describe('verifyMagicLink mutation', () => {
    const VERIFY_MAGIC_LINK = `
      mutation VerifyMagicLink($token: String!) {
        verifyMagicLink(token: $token) {
          accessToken
          refreshToken
          expiresIn
          user {
            id
            email
            primaryInstrument
          }
        }
      }
    `

    it('should verify valid magic link and return tokens', async () => {
      // Set up mock data
      const mockContext = createMockContext()
      const email = 'test@example.com'

      // Store magic link in KV
      await mockContext.env.CACHE.put('magic_link:valid-token', email)

      // Mock user doesn't exist yet
      mockDB.setMockData('users', [])

      const result = await executeGraphQLQuery(
        server,
        VERIFY_MAGIC_LINK,
        { token: 'valid-token' },
        { env: { ...mockContext.env, DB: mockDB as unknown as D1Database } }
      )

      expect(result.body.singleResult.errors).toBeUndefined()
      const data = result.body.singleResult.data?.verifyMagicLink

      expect(data).toBeTruthy()
      expect(data.accessToken).toBeTruthy()
      expect(data.refreshToken).toBeTruthy()
      expect(data.expiresIn).toBe(900)
      expect(data.user.email).toBe(email)
      expect(data.user.primaryInstrument).toBe('PIANO')
    })

    it('should reject invalid token', async () => {
      const result = await executeGraphQLQuery(server, VERIFY_MAGIC_LINK, {
        token: 'invalid-token',
      })

      expect(result.body.singleResult.errors).toBeDefined()
      expect(result.body.singleResult.errors?.[0].message).toContain(
        'Invalid or expired'
      )
    })
  })

  describe('Protected queries', () => {
    const ME_QUERY = `
      query Me {
        me {
          id
          email
          displayName
          primaryInstrument
        }
      }
    `

    it('should return user data when authenticated', async () => {
      // Set up authenticated context
      mockDB.setMockData('users', [
        {
          id: mockUser.id,
          email: mockUser.email,
          display_name: mockUser.displayName,
          primary_instrument: mockUser.primaryInstrument,
          created_at: mockUser.createdAt,
          updated_at: mockUser.updatedAt,
        },
      ])
      mockDB.setMockData('user_preferences', [
        {
          user_id: mockUser.id,
          preferences: JSON.stringify(mockUser.preferences),
        },
      ])

      const result = await executeGraphQLQuery(
        server,
        ME_QUERY,
        {},
        {
          user: mockUser,
          env: { DB: mockDB as unknown as D1Database } as GraphQLContext['env'],
        }
      )

      expect(result.body.singleResult.errors).toBeUndefined()
      expect(result.body.singleResult.data?.me).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        primaryInstrument: mockUser.primaryInstrument,
      })
    })

    it('should return null when not authenticated', async () => {
      const result = await executeGraphQLQuery(server, ME_QUERY, {})

      expect(result.body.singleResult.errors).toBeUndefined()
      expect(result.body.singleResult.data?.me).toBeNull()
    })
  })
})
