import { EventDrivenStorage } from './eventDrivenStorage'
import { EventBus } from './EventBus'
import { LocalStorageAdapter } from '../infrastructure/adapters/LocalStorageAdapter'

// Mock the EventBus
jest.mock('./EventBus', () => ({
  EventBus: {
    getInstance: jest.fn(() => ({
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    })),
  },
}))

// Mock LocalStorageAdapter
jest.mock('../infrastructure/adapters/LocalStorageAdapter')

describe('EventDrivenStorage', () => {
  let storage: EventDrivenStorage
  let mockEventBus: any
  let mockAdapter: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock event bus
    mockEventBus = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    }
    ;(EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus)

    // Setup mock adapter
    mockAdapter = {
      initialize: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
      getName: jest.fn().mockReturnValue('LocalStorageAdapter'),
      isAvailable: jest.fn().mockReturnValue(true),
      getStorageInfo: jest.fn().mockResolvedValue({
        used: 1000,
        quota: 5000,
        available: 4000,
      }),
    }
    ;(LocalStorageAdapter as jest.Mock).mockImplementation(() => mockAdapter)

    storage = new EventDrivenStorage()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Initialization', () => {
    it('should initialize with LocalStorageAdapter by default', async () => {
      await storage.initialize()

      expect(LocalStorageAdapter).toHaveBeenCalled()
      expect(mockAdapter.initialize).toHaveBeenCalled()
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:initialized', {
        adapter: 'LocalStorageAdapter',
      })
    })

    it('should subscribe to storage request events on initialization', async () => {
      await storage.initialize()

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'storage:request',
        expect.any(Function)
      )
    })

    it('should handle initialization errors', async () => {
      const initError = new Error('Init failed')
      mockAdapter.initialize.mockRejectedValue(initError)

      await expect(storage.initialize()).rejects.toThrow('Init failed')

      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:error', {
        operation: 'initialize',
        error: initError,
      })
    })

    it('should not reinitialize if already initialized', async () => {
      await storage.initialize()
      mockAdapter.initialize.mockClear()
      mockEventBus.emit.mockClear()

      await storage.initialize()

      expect(mockAdapter.initialize).not.toHaveBeenCalled()
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'storage:initialized',
        expect.any(Object)
      )
    })
  })

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await storage.initialize()
      mockEventBus.emit.mockClear()
    })

    describe('set', () => {
      it('should store data and emit success event', async () => {
        const key = 'test-key'
        const value = { data: 'test' }

        await storage.set(key, value)

        expect(mockAdapter.set).toHaveBeenCalledWith(key, value)
        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:set:success', {
          key,
          value,
        })
        expect(mockEventBus.emit).toHaveBeenCalledWith('data:created', {
          key,
          type: 'storage',
          data: value,
        })
      })

      it('should handle set errors', async () => {
        const key = 'test-key'
        const value = { data: 'test' }
        const setError = new Error('Storage full')
        mockAdapter.set.mockRejectedValue(setError)

        await expect(storage.set(key, value)).rejects.toThrow('Storage full')

        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:set:error', {
          key,
          error: setError,
        })
      })

      it('should emit update event if key already exists', async () => {
        const key = 'existing-key'
        const value = { data: 'updated' }
        mockAdapter.get.mockResolvedValue({ data: 'original' })

        await storage.set(key, value)

        expect(mockEventBus.emit).toHaveBeenCalledWith('data:updated', {
          key,
          type: 'storage',
          data: value,
        })
      })
    })

    describe('get', () => {
      it('should retrieve data and emit success event', async () => {
        const key = 'test-key'
        const value = { data: 'test' }
        mockAdapter.get.mockResolvedValue(value)

        const result = await storage.get(key)

        expect(result).toEqual(value)
        expect(mockAdapter.get).toHaveBeenCalledWith(key)
        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:get:success', {
          key,
          value,
        })
      })

      it('should emit miss event when key not found', async () => {
        const key = 'missing-key'
        mockAdapter.get.mockResolvedValue(null)

        const result = await storage.get(key)

        expect(result).toBeNull()
        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:get:miss', {
          key,
        })
      })

      it('should handle get errors', async () => {
        const key = 'test-key'
        const getError = new Error('Read failed')
        mockAdapter.get.mockRejectedValue(getError)

        await expect(storage.get(key)).rejects.toThrow('Read failed')

        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:get:error', {
          key,
          error: getError,
        })
      })
    })

    describe('delete', () => {
      it('should delete data and emit success event', async () => {
        const key = 'test-key'

        await storage.delete(key)

        expect(mockAdapter.delete).toHaveBeenCalledWith(key)
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'storage:delete:success',
          {
            key,
          }
        )
        expect(mockEventBus.emit).toHaveBeenCalledWith('data:deleted', {
          key,
          type: 'storage',
        })
      })

      it('should handle delete errors', async () => {
        const key = 'test-key'
        const deleteError = new Error('Delete failed')
        mockAdapter.delete.mockRejectedValue(deleteError)

        await expect(storage.delete(key)).rejects.toThrow('Delete failed')

        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:delete:error', {
          key,
          error: deleteError,
        })
      })
    })

    describe('clear', () => {
      it('should clear all data and emit success event', async () => {
        await storage.clear()

        expect(mockAdapter.clear).toHaveBeenCalled()
        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:clear:success')
        expect(mockEventBus.emit).toHaveBeenCalledWith('data:cleared', {
          type: 'storage',
        })
      })

      it('should handle clear errors', async () => {
        const clearError = new Error('Clear failed')
        mockAdapter.clear.mockRejectedValue(clearError)

        await expect(storage.clear()).rejects.toThrow('Clear failed')

        expect(mockEventBus.emit).toHaveBeenCalledWith('storage:clear:error', {
          error: clearError,
        })
      })
    })

    describe('list', () => {
      it('should list keys matching prefix', async () => {
        const keys = ['test:1', 'test:2', 'other:1']
        mockAdapter.list.mockResolvedValue(keys)

        const result = await storage.list('test:')

        expect(result).toEqual(['test:1', 'test:2'])
        expect(mockAdapter.list).toHaveBeenCalledWith('test:')
      })

      it('should return all keys when no prefix provided', async () => {
        const keys = ['test:1', 'test:2', 'other:1']
        mockAdapter.list.mockResolvedValue(keys)

        const result = await storage.list()

        expect(result).toEqual(keys)
        expect(mockAdapter.list).toHaveBeenCalledWith('')
      })
    })
  })

  describe('Event-Driven Requests', () => {
    let storageRequestHandler: any

    beforeEach(async () => {
      await storage.initialize()
      // Capture the storage request handler
      storageRequestHandler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'storage:request'
      )?.[1]
      mockEventBus.emit.mockClear()
    })

    it('should handle get requests via events', async () => {
      const requestId = 'req-123'
      const key = 'test-key'
      const value = { data: 'test' }
      mockAdapter.get.mockResolvedValue(value)

      await storageRequestHandler({
        id: requestId,
        operation: 'get',
        key,
      })

      expect(mockAdapter.get).toHaveBeenCalledWith(key)
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:response', {
        id: requestId,
        success: true,
        value,
      })
    })

    it('should handle set requests via events', async () => {
      const requestId = 'req-456'
      const key = 'test-key'
      const value = { data: 'test' }

      await storageRequestHandler({
        id: requestId,
        operation: 'set',
        key,
        value,
      })

      expect(mockAdapter.set).toHaveBeenCalledWith(key, value)
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:response', {
        id: requestId,
        success: true,
      })
    })

    it('should handle delete requests via events', async () => {
      const requestId = 'req-789'
      const key = 'test-key'

      await storageRequestHandler({
        id: requestId,
        operation: 'delete',
        key,
      })

      expect(mockAdapter.delete).toHaveBeenCalledWith(key)
      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:response', {
        id: requestId,
        success: true,
      })
    })

    it('should handle errors in event requests', async () => {
      const requestId = 'req-error'
      const key = 'test-key'
      const error = new Error('Request failed')
      mockAdapter.get.mockRejectedValue(error)

      await storageRequestHandler({
        id: requestId,
        operation: 'get',
        key,
      })

      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:response', {
        id: requestId,
        success: false,
        error: error.message,
      })
    })

    it('should handle invalid operations', async () => {
      const requestId = 'req-invalid'

      await storageRequestHandler({
        id: requestId,
        operation: 'invalid',
        key: 'test',
      })

      expect(mockEventBus.emit).toHaveBeenCalledWith('storage:response', {
        id: requestId,
        success: false,
        error: 'Invalid operation: invalid',
      })
    })
  })

  describe('Storage Info and Management', () => {
    beforeEach(async () => {
      await storage.initialize()
    })

    it('should get storage info', async () => {
      const storageInfo = {
        used: 2000,
        quota: 10000,
        available: 8000,
      }
      mockAdapter.getStorageInfo.mockResolvedValue(storageInfo)

      const result = await storage.getStorageInfo()

      expect(result).toEqual(storageInfo)
      expect(mockAdapter.getStorageInfo).toHaveBeenCalled()
    })

    it('should get adapter name', () => {
      const name = storage.getAdapterName()

      expect(name).toBe('LocalStorageAdapter')
      expect(mockAdapter.getName).toHaveBeenCalled()
    })

    it('should check if storage is available', () => {
      const isAvailable = storage.isAvailable()

      expect(isAvailable).toBe(true)
      expect(mockAdapter.isAvailable).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from events on destroy', async () => {
      await storage.initialize()

      const handler = mockEventBus.on.mock.calls.find(
        call => call[0] === 'storage:request'
      )?.[1]

      storage.destroy()

      expect(mockEventBus.off).toHaveBeenCalledWith('storage:request', handler)
    })

    it('should handle destroy when not initialized', () => {
      expect(() => storage.destroy()).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await storage.initialize()
    })

    it('should handle circular reference in stored data', async () => {
      const circular: any = { prop: 'value' }
      circular.self = circular

      // Should not throw when storing circular reference
      // (adapter should handle serialization)
      await expect(storage.set('circular', circular)).resolves.not.toThrow()
    })

    it('should handle very large keys', async () => {
      const longKey = 'x'.repeat(1000)
      const value = { data: 'test' }

      await storage.set(longKey, value)

      expect(mockAdapter.set).toHaveBeenCalledWith(longKey, value)
    })

    it('should handle undefined and null values', async () => {
      await storage.set('undefined-key', undefined)
      expect(mockAdapter.set).toHaveBeenCalledWith('undefined-key', undefined)

      await storage.set('null-key', null)
      expect(mockAdapter.set).toHaveBeenCalledWith('null-key', null)
    })

    it('should handle concurrent operations', async () => {
      const operations = []

      // Launch multiple operations concurrently
      for (let i = 0; i < 10; i++) {
        operations.push(storage.set(`key-${i}`, { value: i }))
      }

      await Promise.all(operations)

      // All operations should complete
      expect(mockAdapter.set).toHaveBeenCalledTimes(10)
    })
  })
})
