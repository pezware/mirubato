import { StorageModule, LocalStorageAdapter } from './StorageModule'
import { EventBus } from '../core'

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    get length() {
      return Object.keys(store).length
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    localStorageMock.clear()
    adapter = new LocalStorageAdapter('test')
  })

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      const testData = { name: 'test', value: 123 }
      await adapter.set('testKey', testData)

      const retrieved = await adapter.get('testKey')
      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', async () => {
      const result = await adapter.get('nonExistent')
      expect(result).toBeNull()
    })

    it('should remove values', async () => {
      await adapter.set('testKey', { data: 'test' })
      await adapter.remove('testKey')

      const result = await adapter.get('testKey')
      expect(result).toBeNull()
    })

    it('should clear all values with namespace', async () => {
      await adapter.set('key1', { data: 1 })
      await adapter.set('key2', { data: 2 })

      // Add a key outside namespace
      localStorageMock.setItem('other:key', 'value')

      await adapter.clear()

      const keys = await adapter.getKeys()
      expect(keys).toHaveLength(0)
      expect(localStorageMock.getItem('other:key')).toBe('value')
    })

    it('should list all keys in namespace', async () => {
      await adapter.set('key1', { data: 1 })
      await adapter.set('key2', { data: 2 })
      await adapter.set('key3', { data: 3 })

      const keys = await adapter.getKeys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })
  })

  describe('TTL Support', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should expire values after TTL', async () => {
      await adapter.set('expiring', { data: 'test' }, 1000) // 1 second TTL

      // Value should exist immediately
      let result = await adapter.get('expiring')
      expect(result).toEqual({ data: 'test' })

      // Advance time past TTL
      jest.advanceTimersByTime(1001)

      // Value should be expired and removed
      result = await adapter.get('expiring')
      expect(result).toBeNull()
    })

    it('should not expire values without TTL', async () => {
      await adapter.set('permanent', { data: 'test' })

      jest.advanceTimersByTime(100000)

      const result = await adapter.get('permanent')
      expect(result).toEqual({ data: 'test' })
    })
  })

  describe('Metadata Tracking', () => {
    it('should track metadata for stored values', async () => {
      const testData = { content: 'test data' }
      await adapter.set('metaTest', testData)

      const metadata = await adapter.getMetadata('metaTest')
      expect(metadata).toBeTruthy()
      expect(metadata?.key).toBe('metaTest')
      expect(metadata?.size).toBeGreaterThan(0)
      expect(metadata?.createdAt).toBeTruthy()
      expect(metadata?.updatedAt).toBeTruthy()
      expect(metadata?.accessedAt).toBeTruthy()
    })

    it('should update accessedAt on get', async () => {
      jest.useFakeTimers()

      await adapter.set('accessTest', { data: 'test' })
      const metadata1 = await adapter.getMetadata('accessTest')
      const firstAccess = metadata1?.accessedAt

      jest.advanceTimersByTime(1000)

      await adapter.get('accessTest')
      const metadata2 = await adapter.getMetadata('accessTest')
      const secondAccess = metadata2?.accessedAt

      expect(secondAccess).toBeGreaterThan(firstAccess!)

      jest.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      localStorageMock.setItem('test:badJson', 'not valid json')

      const result = await adapter.get('badJson')
      expect(result).toBeNull()
    })

    it('should handle quota exceeded errors', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        const error: any = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        error.constructor = DOMException
        throw error
      })

      await expect(adapter.set('largeData', { data: 'test' })).rejects.toThrow(
        'Storage quota exceeded'
      )
    })
  })
})

describe('StorageModule', () => {
  let storageModule: StorageModule
  let eventBus: EventBus
  let publishSpy: jest.SpyInstance

  beforeEach(() => {
    localStorageMock.clear()
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
    publishSpy = jest.spyOn(eventBus, 'publish')
    storageModule = new StorageModule({ namespace: 'test' })
  })

  afterEach(() => {
    EventBus.resetInstance()
  })

  describe('Module Lifecycle', () => {
    it('should initialize successfully', async () => {
      await storageModule.initialize()

      const health = storageModule.getHealth()
      expect(health.status).toBe('green')
      expect(health.message).toContain('Storage available')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:start',
          source: 'Storage',
        })
      )

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:complete',
          source: 'Storage',
        })
      )
    })

    it('should handle initialization failure', async () => {
      // Mock storage to fail
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage not available')
      })

      await expect(storageModule.initialize()).rejects.toThrow(
        'Storage not available'
      )

      const health = storageModule.getHealth()
      expect(health.status).toBe('red')
      expect(health.message).toContain('Initialization failed')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:init:error',
          source: 'Storage',
        })
      )
    })

    it('should shutdown properly', async () => {
      await storageModule.initialize()
      await storageModule.shutdown()

      const health = storageModule.getHealth()
      expect(health.status).toBe('gray')
      expect(health.message).toContain('shut down')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module:shutdown:complete',
          source: 'Storage',
        })
      )
    })
  })

  describe('Storage Operations', () => {
    beforeEach(async () => {
      await storageModule.initialize()
    })

    it('should save and load local data', async () => {
      const testData = { id: 1, name: 'Test User' }
      await storageModule.saveLocal('user', testData)

      const loaded = await storageModule.loadLocal('user')
      expect(loaded).toEqual(testData)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:create:success',
          source: 'Storage',
          data: expect.objectContaining({ key: 'user' }),
        })
      )
    })

    it('should delete local data', async () => {
      await storageModule.saveLocal('temp', { data: 'temporary' })
      await storageModule.deleteLocal('temp')

      const result = await storageModule.loadLocal('temp')
      expect(result).toBeNull()

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:delete:success',
          source: 'Storage',
          data: { key: 'temp' },
        })
      )
    })

    it('should clear all local data', async () => {
      await storageModule.saveLocal('key1', { data: 1 })
      await storageModule.saveLocal('key2', { data: 2 })

      await storageModule.clearLocal()

      const keys = await storageModule.getKeys()
      expect(keys).toHaveLength(0)

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:clear:success',
          source: 'Storage',
        })
      )
    })

    it('should get all keys', async () => {
      await storageModule.saveLocal('key1', { data: 1 })
      await storageModule.saveLocal('key2', { data: 2 })
      await storageModule.saveLocal('key3', { data: 3 })

      const keys = await storageModule.getKeys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })
  })

  describe('Cloud Operations', () => {
    beforeEach(async () => {
      await storageModule.initialize()
    })

    it('should emit sync required event for saveCloud', async () => {
      await storageModule.saveCloud('cloudKey', { data: 'cloud' })

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:sync:required',
          source: 'Storage',
          data: { key: 'cloudKey', operation: 'save' },
        })
      )
    })

    it('should emit sync required event for loadCloud', async () => {
      const result = await storageModule.loadCloud('cloudKey')
      expect(result).toBeNull() // Stubbed for now

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:sync:required',
          source: 'Storage',
          data: { key: 'cloudKey', operation: 'load' },
        })
      )
    })

    it('should initiate sync request', async () => {
      await storageModule.syncData()

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sync:request:initiated',
          source: 'Storage',
        })
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await storageModule.initialize()
    })

    it('should handle save errors', async () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Save failed')
      })

      await expect(
        storageModule.saveLocal('errorKey', { data: 'test' })
      ).rejects.toThrow('Save failed')

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:create:error',
          source: 'Storage',
          data: expect.objectContaining({
            key: 'errorKey',
            error: 'Save failed',
          }),
        })
      )
    })

    it('should handle load errors', async () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Load failed')
      })

      await expect(storageModule.loadLocal('errorKey')).rejects.toThrow(
        'Load failed'
      )

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data:read:error',
          source: 'Storage',
          data: expect.objectContaining({
            key: 'errorKey',
            error: 'Load failed',
          }),
        })
      )
    })
  })

  describe('Storage Info', () => {
    it('should get storage info when available', async () => {
      // Mock navigator.storage.estimate
      const mockEstimate = jest.fn().mockResolvedValue({
        usage: 1000,
        quota: 10000,
      })

      Object.defineProperty(navigator, 'storage', {
        value: { estimate: mockEstimate },
        writable: true,
        configurable: true,
      })

      const info = await storageModule.getStorageInfo()
      expect(info).toEqual({
        used: 1000,
        available: 9000,
        quota: 10000,
      })
    })

    it('should return zeros when storage estimate not available', async () => {
      // Remove navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const info = await storageModule.getStorageInfo()
      expect(info).toEqual({
        used: 0,
        available: 0,
        quota: 0,
      })
    })
  })

  describe('Configuration', () => {
    it('should use custom namespace', async () => {
      const customModule = new StorageModule({ namespace: 'custom' })
      await customModule.initialize()

      await customModule.saveLocal('test', { data: 'custom' })

      // Check that the key is stored with custom namespace
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('custom:test'),
        expect.any(String)
      )
    })

    it('should throw error for unsupported adapter', () => {
      expect(() => {
        new StorageModule({ adapter: 'indexedDB' as any })
      }).toThrow('IndexedDB adapter not yet implemented')
    })
  })
})
