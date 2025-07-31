/**
 * Tests for the new IndexedDB-based change queue
 */

import {
  changeQueue,
  migrateFromLocalStorage,
  type ChangeRecord,
} from '../changeQueue'

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  databases: new Map(),
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

// Override global objects
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('ChangeQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('addChange', () => {
    it('should create a change record with generated ID and timestamp', async () => {
      // Mock IndexedDB behavior
      const mockDB = {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn(() => ({
              onsuccess: null,
              onerror: null,
            })),
          })),
        })),
      }

      // Mock successful DB initialization
      changeQueue['db'] = mockDB as IDBDatabase

      const changeData = {
        type: 'CREATED' as const,
        entityType: 'logbook_entry' as const,
        entityId: 'test-entry-id',
        data: { title: 'Test Entry' },
      }

      const changeId = await changeQueue.addChange(changeData)

      expect(changeId).toBeDefined()
      expect(typeof changeId).toBe('string')
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockDB = {
        transaction: jest.fn(() => {
          throw new Error('Database error')
        }),
      }

      changeQueue['db'] = mockDB as IDBDatabase

      const changeData = {
        type: 'CREATED' as const,
        entityType: 'logbook_entry' as const,
        entityId: 'test-entry-id',
        data: { title: 'Test Entry' },
      }

      await expect(changeQueue.addChange(changeData)).rejects.toThrow(
        'Database error'
      )
    })
  })

  describe('getAllPendingChanges', () => {
    it('should return empty array when no changes exist', async () => {
      const mockDB = {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            index: jest.fn(() => ({
              getAll: jest.fn(() => ({
                onsuccess: null,
                onerror: null,
                result: [],
              })),
            })),
          })),
        })),
      }

      changeQueue['db'] = mockDB as IDBDatabase

      const changes = await changeQueue.getAllPendingChanges()
      expect(changes).toEqual([])
    })
  })

  describe('getStats', () => {
    it('should calculate statistics correctly', async () => {
      const mockChanges = [
        {
          changeId: '1',
          type: 'CREATED',
          entityType: 'logbook_entry',
          entityId: 'entry1',
          timestamp: 1000,
          retryCount: 0,
        },
        {
          changeId: '2',
          type: 'UPDATED',
          entityType: 'logbook_entry',
          entityId: 'entry1',
          timestamp: 2000,
          retryCount: 1,
        },
        {
          changeId: '3',
          type: 'CREATED',
          entityType: 'goal',
          entityId: 'goal1',
          timestamp: 500,
          retryCount: 0,
        },
      ]

      // Mock getAllPendingChanges to return test data
      jest
        .spyOn(changeQueue, 'getAllPendingChanges')
        .mockResolvedValue(mockChanges as ChangeRecord[])

      const stats = await changeQueue.getStats()

      expect(stats.totalChanges).toBe(3)
      expect(stats.changesByType['CREATED_logbook_entry']).toBe(1)
      expect(stats.changesByType['UPDATED_logbook_entry']).toBe(1)
      expect(stats.changesByType['CREATED_goal']).toBe(1)
      expect(stats.oldestChange).toBe(500)
      expect(stats.failedChanges).toBe(1)
    })
  })
})

describe('migrateFromLocalStorage', () => {
  it('should migrate entries and goals from localStorage', async () => {
    const mockEntries = [
      {
        id: 'entry1',
        title: 'Test Entry 1',
        timestamp: '2024-01-01T00:00:00Z',
      },
      {
        id: 'entry2',
        title: 'Test Entry 2',
        timestamp: '2024-01-02T00:00:00Z',
      },
    ]

    const mockGoals = [
      {
        id: 'goal1',
        title: 'Test Goal 1',
        status: 'ACTIVE',
      },
    ]

    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'mirubato:logbook:entries') {
        return JSON.stringify(mockEntries)
      }
      if (key === 'mirubato:logbook:goals') {
        return JSON.stringify(mockGoals)
      }
      return null
    })

    // Mock addChange to track calls
    const addChangeSpy = jest
      .spyOn(changeQueue, 'addChange')
      .mockResolvedValue('mock-change-id')

    const result = await migrateFromLocalStorage()

    expect(result.entriesMigrated).toBe(2)
    expect(result.goalsMigrated).toBe(1)
    expect(addChangeSpy).toHaveBeenCalledTimes(3)

    // Verify the calls
    expect(addChangeSpy).toHaveBeenCalledWith({
      type: 'CREATED',
      entityType: 'logbook_entry',
      entityId: 'entry1',
      data: mockEntries[0],
    })

    expect(addChangeSpy).toHaveBeenCalledWith({
      type: 'CREATED',
      entityType: 'goal',
      entityId: 'goal1',
      data: mockGoals[0],
    })
  })

  it('should handle missing localStorage data gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)

    const result = await migrateFromLocalStorage()

    expect(result.entriesMigrated).toBe(0)
    expect(result.goalsMigrated).toBe(0)
  })

  it('should handle malformed localStorage data', async () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'mirubato:logbook:entries') {
        return 'invalid json'
      }
      return null
    })

    const result = await migrateFromLocalStorage()

    expect(result.entriesMigrated).toBe(0)
    expect(result.goalsMigrated).toBe(0)
  })
})
