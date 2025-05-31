import { UserService } from '../../../services/user'
import { createMockDB, MockD1Database } from '../../../test-utils/db'
import type { D1Database } from '@cloudflare/workers-types'

describe('UserService', () => {
  let userService: UserService
  let mockDB: MockD1Database

  beforeEach(() => {
    mockDB = createMockDB() as unknown as MockD1Database
    userService = new UserService(mockDB as unknown as D1Database)
  })

  afterEach(() => {
    mockDB.clearMockData()
  })

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        display_name: 'Test User',
        primary_instrument: 'PIANO',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockDB.setMockData('users', [mockUser])
      mockDB.setMockData('user_preferences', [
        {
          user_id: 'user_123',
          preferences: JSON.stringify({
            theme: 'DARK',
            notationSize: 'LARGE',
            practiceReminders: false,
            dailyGoalMinutes: 45,
          }),
        },
      ])

      const result = await userService.getUserById('user_123')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('user_123')
      expect(result?.email).toBe('test@example.com')
      expect(result?.preferences.theme).toBe('DARK')
      expect(result?.preferences.dailyGoalMinutes).toBe(45)
    })

    it('should return null when user not found', async () => {
      mockDB.setMockData('users', [])

      const result = await userService.getUserById('nonexistent')

      expect(result).toBeNull()
    })

    it('should return default preferences when none stored', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        display_name: null,
        primary_instrument: 'PIANO',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockDB.setMockData('users', [mockUser])
      mockDB.setMockData('user_preferences', [])

      const result = await userService.getUserById('user_123')

      expect(result).toBeTruthy()
      expect(result?.preferences).toEqual({
        theme: 'LIGHT',
        notationSize: 'MEDIUM',
        practiceReminders: true,
        dailyGoalMinutes: 30,
      })
    })
  })

  describe('createUser', () => {
    it('should create user with email only', async () => {
      const result = await userService.createUser({
        email: 'new@example.com',
      })

      expect(result).toBeTruthy()
      expect(result.email).toBe('new@example.com')
      expect(result.displayName).toBeUndefined()
      expect(result.primaryInstrument).toBe('PIANO')
      expect(result.id).toMatch(/^user_/)
    })

    it('should create user with display name', async () => {
      const result = await userService.createUser({
        email: 'new@example.com',
        displayName: 'New User',
      })

      expect(result.displayName).toBe('New User')
    })
  })

  describe('updateUser', () => {
    beforeEach(() => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        display_name: 'Test User',
        primary_instrument: 'PIANO',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockDB.setMockData('users', [mockUser])
      mockDB.setMockData('user_preferences', [
        {
          user_id: 'user_123',
          preferences: JSON.stringify({
            theme: 'LIGHT',
            notationSize: 'MEDIUM',
            practiceReminders: true,
            dailyGoalMinutes: 30,
          }),
        },
      ])
    })

    it('should update display name', async () => {
      const result = await userService.updateUser('user_123', {
        displayName: 'Updated Name',
      })

      expect(result.displayName).toBe('Updated Name')
    })

    it('should update primary instrument', async () => {
      const result = await userService.updateUser('user_123', {
        primaryInstrument: 'GUITAR',
      })

      expect(result.primaryInstrument).toBe('GUITAR')
    })

    it('should update preferences', async () => {
      const result = await userService.updateUser('user_123', {
        preferences: {
          theme: 'DARK',
          dailyGoalMinutes: 60,
        },
      })

      expect(result.preferences.theme).toBe('DARK')
      expect(result.preferences.dailyGoalMinutes).toBe(60)
      expect(result.preferences.notationSize).toBe('MEDIUM') // Unchanged
    })

    it('should throw error when user not found', async () => {
      // Clear the mock data to ensure user doesn't exist
      mockDB.clearMockData()

      await expect(
        userService.updateUser('nonexistent', { displayName: 'Test' })
      ).rejects.toThrow('User not found')
    })
  })

  describe('getUserStats', () => {
    it('should calculate stats from practice sessions', async () => {
      mockDB.setMockData('practice_sessions', [
        {
          user_id: 'user_123',
          started_at: '2024-01-01T10:00:00Z',
          completed_at: '2024-01-01T10:30:00Z',
          accuracy_percentage: 0.85,
        },
        {
          user_id: 'user_123',
          started_at: '2024-01-02T10:00:00Z',
          completed_at: '2024-01-02T10:45:00Z',
          accuracy_percentage: 0.9,
        },
      ])

      const stats = await userService.getUserStats('user_123')

      expect(stats.totalPracticeTime).toBe(4500) // 30 + 45 minutes in seconds
      expect(stats.accuracyAverage).toBe(0.88) // Average of 0.85 and 0.90
    })

    it('should return zero stats for new user', async () => {
      mockDB.setMockData('practice_sessions', [])

      const stats = await userService.getUserStats('user_123')

      expect(stats.totalPracticeTime).toBe(0)
      expect(stats.consecutiveDays).toBe(0)
      expect(stats.piecesCompleted).toBe(0)
      expect(stats.accuracyAverage).toBe(0)
    })
  })
})
