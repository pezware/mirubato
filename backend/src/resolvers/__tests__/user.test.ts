import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, createMockUser } from '../../testUtils/mockContext'
import { userResolvers } from '../user'
import type { GraphQLContext } from '../../types/context'
import { UserService } from '../../services/user'

// Mock UserService instance
const mockUserService = {
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserStats: vi.fn(),
}

// Mock the UserService class
vi.mock('../../services/user', () => ({
  UserService: vi.fn().mockImplementation(() => mockUserService),
}))

describe('User Resolvers', () => {
  let ctx: GraphQLContext

  beforeEach(() => {
    // Reset all mock functions
    Object.values(mockUserService).forEach(mockFn => mockFn.mockReset())

    ctx = createMockContext({
      user: createMockUser(),
    })
  })

  describe('Query', () => {
    describe('me', () => {
      it('should return current authenticated user', async () => {
        const mockUser = createMockUser({
          id: 'current-user-123',
          email: 'current@example.com',
        })
        ctx.user = mockUser

        const result = await userResolvers.Query.me(null, {}, ctx)

        expect(result).toEqual(mockUser)
      })

      it('should return null for unauthenticated user', async () => {
        ctx.user = null

        const result = await userResolvers.Query.me(null, {}, ctx)

        expect(result).toBeNull()
      })
    })

    describe('user', () => {
      it('should return user by ID', async () => {
        const targetUser = createMockUser({
          id: 'target-user-456',
          email: 'target@example.com',
        })

        mockUserService.getUserById.mockResolvedValue(targetUser)

        const result = await userResolvers.Query.user(
          null,
          { id: 'target-user-456' },
          ctx
        )

        expect(result).toEqual(targetUser)
        expect(mockUserService.getUserById).toHaveBeenCalledWith(
          'target-user-456'
        )
      })

      it('should return null when user not found', async () => {
        mockUserService.getUserById.mockResolvedValue(null)

        const result = await userResolvers.Query.user(
          null,
          { id: 'non-existent' },
          ctx
        )

        expect(result).toBeNull()
      })
    })
  })

  describe('Mutation', () => {
    describe('updateUser', () => {
      it('should update authenticated user', async () => {
        const updates = {
          displayName: 'New Name',
          primaryInstrument: 'GUITAR',
          preferences: {
            theme: 'DARK',
            notationSize: 'LARGE',
            practiceReminders: false,
            dailyGoalMinutes: 60,
          },
        }

        const updatedUser = {
          ...ctx.user,
          ...updates,
        }

        mockUserService.updateUser.mockResolvedValue(updatedUser)

        const result = await userResolvers.Mutation.updateUser(
          null,
          { input: updates },
          ctx
        )

        expect(result).toEqual(updatedUser)
        expect(mockUserService.updateUser).toHaveBeenCalledWith(
          ctx.user!.id,
          updates
        )
      })

      it('should throw error for unauthenticated user', async () => {
        ctx.user = null

        await expect(
          userResolvers.Mutation.updateUser(
            null,
            { input: { displayName: 'Test' } },
            ctx
          )
        ).rejects.toThrow('Authentication required')
      })

      it('should handle partial updates', async () => {
        const partialUpdate = {
          displayName: 'Just Name Update',
        }

        const updatedUser = {
          ...ctx.user,
          displayName: 'Just Name Update',
        }

        mockUserService.updateUser.mockResolvedValue(updatedUser)

        const result = await userResolvers.Mutation.updateUser(
          null,
          { input: partialUpdate },
          ctx
        )

        expect(result).toEqual(updatedUser)
        expect(mockUserService.updateUser).toHaveBeenCalledWith(
          ctx.user!.id,
          partialUpdate
        )
      })
    })

    describe('deleteAccount', () => {
      it('should delete authenticated user account', async () => {
        mockUserService.deleteUser.mockResolvedValue(true)

        const result = await userResolvers.Mutation.deleteAccount(null, {}, ctx)

        expect(result).toEqual({
          success: true,
          message: 'Account deleted successfully',
        })
        expect(mockUserService.deleteUser).toHaveBeenCalledWith(ctx.user!.id)
      })

      it('should throw error for unauthenticated user', async () => {
        ctx.user = null

        await expect(
          userResolvers.Mutation.deleteAccount(null, {}, ctx)
        ).rejects.toThrow('Authentication required')
      })

      it('should handle deletion errors', async () => {
        mockUserService.deleteUser.mockRejectedValue(
          new Error('Database error')
        )

        await expect(
          userResolvers.Mutation.deleteAccount(null, {}, ctx)
        ).rejects.toThrow('Database error')
      })
    })
  })

  describe('Field Resolvers', () => {
    describe('User.stats', () => {
      it('should fetch user stats', async () => {
        const mockStats = {
          totalPracticeTime: 36000, // 10 hours
          consecutiveDays: 7,
          piecesCompleted: 15,
          accuracyAverage: 92.5,
        }

        mockUserService.getUserStats.mockResolvedValue(mockStats)

        const user = createMockUser({ id: 'stats-user-123' })
        const result = await userResolvers.User.stats(user, {}, ctx)

        expect(result).toEqual(mockStats)
        expect(mockUserService.getUserStats).toHaveBeenCalledWith(
          'stats-user-123'
        )
      })

      it('should handle stats fetch errors', async () => {
        mockUserService.getUserStats.mockRejectedValue(new Error('Stats error'))

        const user = createMockUser({ id: 'error-user' })

        await expect(userResolvers.User.stats(user, {}, ctx)).rejects.toThrow(
          'Stats error'
        )
      })
    })

    describe('User.preferences', () => {
      it('should return user preferences from parent', async () => {
        const user = createMockUser({
          preferences: {
            theme: 'DARK',
            notationSize: 'SMALL',
            practiceReminders: false,
            dailyGoalMinutes: 45,
          },
        })

        const result = await userResolvers.User.preferences(user, {}, ctx)

        expect(result).toEqual(user.preferences)
      })

      it('should return default preferences if none exist', async () => {
        const user = { ...createMockUser(), preferences: undefined }

        const result = await userResolvers.User.preferences(
          user as any,
          {},
          ctx
        )

        expect(result).toEqual({
          theme: 'LIGHT',
          notationSize: 'MEDIUM',
          practiceReminders: true,
          dailyGoalMinutes: 30,
        })
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle full user profile update flow', async () => {
      const initialUser = createMockUser({
        id: 'update-flow-user',
        displayName: 'Original Name',
        primaryInstrument: 'PIANO',
      })

      ctx.user = initialUser

      // First update: change name
      const nameUpdate = { displayName: 'Updated Name' }
      const afterNameUpdate = { ...initialUser, ...nameUpdate }
      mockUserService.updateUser.mockResolvedValueOnce(afterNameUpdate)

      let result = await userResolvers.Mutation.updateUser(
        null,
        { input: nameUpdate },
        ctx
      )
      expect(result.displayName).toBe('Updated Name')

      // Second update: change instrument and preferences
      const instrumentUpdate = {
        primaryInstrument: 'GUITAR',
        preferences: {
          theme: 'DARK',
          notationSize: 'LARGE',
          practiceReminders: true,
          dailyGoalMinutes: 90,
        },
      }
      const afterInstrumentUpdate = { ...afterNameUpdate, ...instrumentUpdate }
      mockUserService.updateUser.mockResolvedValueOnce(afterInstrumentUpdate)

      result = await userResolvers.Mutation.updateUser(
        null,
        { input: instrumentUpdate },
        ctx
      )
      expect(result.primaryInstrument).toBe('GUITAR')
      expect(result.preferences.theme).toBe('DARK')
      expect(result.preferences.dailyGoalMinutes).toBe(90)
    })

    it('should handle concurrent user queries', async () => {
      const users = [
        createMockUser({ id: 'user-1', email: 'user1@example.com' }),
        createMockUser({ id: 'user-2', email: 'user2@example.com' }),
        createMockUser({ id: 'user-3', email: 'user3@example.com' }),
      ]

      // Mock service to return different users
      mockUserService.getUserById
        .mockResolvedValueOnce(users[0])
        .mockResolvedValueOnce(users[1])
        .mockResolvedValueOnce(users[2])

      // Execute queries concurrently
      const results = await Promise.all([
        userResolvers.Query.user(null, { id: 'user-1' }, ctx),
        userResolvers.Query.user(null, { id: 'user-2' }, ctx),
        userResolvers.Query.user(null, { id: 'user-3' }, ctx),
      ])

      expect(results).toHaveLength(3)
      expect(results[0]?.id).toBe('user-1')
      expect(results[1]?.id).toBe('user-2')
      expect(results[2]?.id).toBe('user-3')
    })
  })
})
