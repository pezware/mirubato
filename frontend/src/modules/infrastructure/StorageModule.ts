import {
  ModuleInterface,
  ModuleHealth,
  EventBus,
  StorageRequestEvent,
  StorageResponseEvent,
  EventPayload,
  StorageReadEventData,
  StorageWriteEventData,
  StorageDeleteEventData,
  StorageGetKeysEventData,
  StorageResponseEventData,
} from '../core'
import { StorageAdapter, StorageConfig, StorageMetadata } from './types'

export class LocalStorageAdapter implements StorageAdapter {
  private namespace: string

  constructor(namespace: string = 'mirubato') {
    this.namespace = namespace
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key)
    const item = localStorage.getItem(fullKey)
    if (!item) return null

    try {
      const data = JSON.parse(item)

      // Check if data has expired
      if (data._metadata?.expiresAt && data._metadata.expiresAt < Date.now()) {
        await this.remove(key)
        return null
      }

      // Update accessed time
      if (data._metadata) {
        data._metadata.accessedAt = Date.now()
        localStorage.setItem(fullKey, JSON.stringify(data))
      }

      return data.value
    } catch (error) {
      console.error(`Error getting item ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const fullKey = this.getKey(key)
      const now = Date.now()

      const data = {
        value,
        _metadata: {
          key,
          size: JSON.stringify(value).length,
          createdAt: now,
          updatedAt: now,
          accessedAt: now,
          expiresAt: ttl ? now + ttl : undefined,
        } as StorageMetadata,
      }

      localStorage.setItem(fullKey, JSON.stringify(data))
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded')
      }
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.getKey(key)
    localStorage.removeItem(fullKey)
  }

  async clear(): Promise<void> {
    const keys = await this.getKeys()
    for (const key of keys) {
      await this.remove(key)
    }
  }

  async getKeys(): Promise<string[]> {
    const keys: string[] = []
    const prefix = `${this.namespace}:`

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length))
      }
    }

    return keys
  }

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    try {
      const fullKey = this.getKey(key)
      const item = localStorage.getItem(fullKey)
      if (!item) return null

      const data = JSON.parse(item)
      return data._metadata || null
    } catch (error) {
      return null
    }
  }
}

export class StorageModule implements ModuleInterface {
  name = 'Storage'
  version = '1.0.0'

  private adapter: StorageAdapter
  private eventBus: EventBus
  private config: StorageConfig
  private health: ModuleHealth = {
    status: 'gray',
    lastCheck: Date.now(),
  }

  constructor(config?: StorageConfig) {
    this.config = {
      namespace: 'mirubato',
      adapter: 'localStorage',
      ...config,
    }

    this.eventBus = EventBus.getInstance()

    // Create adapter based on config
    if (this.config.adapter === 'localStorage') {
      this.adapter = new LocalStorageAdapter(this.config.namespace)
    } else {
      // IndexedDB adapter would be implemented here
      throw new Error('IndexedDB adapter not yet implemented')
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:start',
        data: { module: this.name },
        metadata: { version: this.version },
      })

      // Subscribe to storage request events for event-driven access
      this.eventBus.subscribe(
        'storage:request',
        this.handleStorageRequest.bind(this)
      )

      // Subscribe to new event-driven storage events
      this.eventBus.subscribe('storage:read', this.handleStorageRead.bind(this))
      this.eventBus.subscribe(
        'storage:write',
        this.handleStorageWrite.bind(this)
      )
      this.eventBus.subscribe(
        'storage:delete',
        this.handleStorageDelete.bind(this)
      )
      this.eventBus.subscribe(
        'storage:getKeys',
        this.handleStorageGetKeys.bind(this)
      )

      // Test storage availability
      const testKey = '_storage_test'
      await this.adapter.set(testKey, { test: true })
      const testValue = await this.adapter.get(testKey)
      await this.adapter.remove(testKey)

      if (!testValue) {
        throw new Error('Storage test failed')
      }

      this.health = {
        status: 'green',
        message: 'Storage available and functioning',
        lastCheck: Date.now(),
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:complete',
        data: { module: this.name },
        metadata: { version: this.version },
      })
    } catch (error) {
      this.health = {
        status: 'red',
        message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: Date.now(),
      }

      await this.eventBus.publish({
        source: this.name,
        type: 'module:init:error',
        data: {
          module: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })

      throw error
    }
  }

  async shutdown(): Promise<void> {
    await this.eventBus.publish({
      source: this.name,
      type: 'module:shutdown:complete',
      data: { module: this.name },
      metadata: { version: this.version },
    })

    this.health = {
      status: 'gray',
      message: 'Module shut down',
      lastCheck: Date.now(),
    }
  }

  getHealth(): ModuleHealth {
    return { ...this.health }
  }

  // Event-driven storage request handler
  private async handleStorageRequest(event: EventPayload): Promise<void> {
    const request = event.data as StorageRequestEvent
    let response: StorageResponseEvent

    try {
      let data: unknown = undefined

      switch (request.operation) {
        case 'get':
          if (!request.key) throw new Error('Key is required for get operation')
          data = await this.adapter.get(request.key)
          break

        case 'set':
          if (!request.key) throw new Error('Key is required for set operation')
          await this.adapter.set(request.key, request.data, request.ttl)
          break

        case 'remove':
          if (!request.key)
            throw new Error('Key is required for remove operation')
          await this.adapter.remove(request.key)
          break

        case 'clear':
          await this.adapter.clear()
          break

        case 'getKeys':
          data = await this.adapter.getKeys()
          break

        default:
          throw new Error(`Unknown storage operation: ${request.operation}`)
      }

      response = {
        requestId: request.requestId,
        success: true,
        data,
      }
    } catch (error) {
      response = {
        requestId: request.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error',
      }
    }

    // Emit the response event
    await this.eventBus.publish({
      source: this.name,
      type: 'storage:response',
      data: response,
      metadata: { version: this.version },
    })
  }

  // Storage operations
  async saveLocal<T>(key: string, data: T): Promise<void> {
    try {
      await this.adapter.set(key, data, this.config.ttl)

      await this.eventBus.publish({
        source: this.name,
        type: 'data:create:success',
        data: { key, size: JSON.stringify(data).length },
        metadata: { version: this.version },
      })
    } catch (error) {
      await this.eventBus.publish({
        source: this.name,
        type: 'data:create:error',
        data: {
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })
      throw error
    }
  }

  async loadLocal<T>(key: string): Promise<T | null> {
    try {
      const data = await this.adapter.get<T>(key)

      if (data) {
        await this.eventBus.publish({
          source: this.name,
          type: 'data:read:success',
          data: { key },
          metadata: { version: this.version },
        })
      }

      return data
    } catch (error) {
      await this.eventBus.publish({
        source: this.name,
        type: 'data:read:error',
        data: {
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })
      throw error
    }
  }

  async deleteLocal(key: string): Promise<void> {
    try {
      await this.adapter.remove(key)

      await this.eventBus.publish({
        source: this.name,
        type: 'data:delete:success',
        data: { key },
        metadata: { version: this.version },
      })
    } catch (error) {
      await this.eventBus.publish({
        source: this.name,
        type: 'data:delete:error',
        data: {
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })
      throw error
    }
  }

  async clearLocal(): Promise<void> {
    try {
      await this.adapter.clear()

      await this.eventBus.publish({
        source: this.name,
        type: 'data:clear:success',
        data: {},
        metadata: { version: this.version },
      })
    } catch (error) {
      await this.eventBus.publish({
        source: this.name,
        type: 'data:clear:error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: { version: this.version },
      })
      throw error
    }
  }

  async getKeys(): Promise<string[]> {
    return this.adapter.getKeys()
  }

  // Cloud operations (stubbed for now)
  async saveCloud<T>(key: string, _data: T): Promise<void> {
    // This would integrate with the GraphQL API
    await this.eventBus.publish({
      source: this.name,
      type: 'data:sync:required',
      data: { key, operation: 'save' },
      metadata: { version: this.version },
    })
  }

  async loadCloud<T>(key: string): Promise<T | null> {
    // This would integrate with the GraphQL API
    await this.eventBus.publish({
      source: this.name,
      type: 'data:sync:required',
      data: { key, operation: 'load' },
      metadata: { version: this.version },
    })
    return null
  }

  async syncData(): Promise<void> {
    // This would be implemented by the Sync module
    await this.eventBus.publish({
      source: this.name,
      type: 'sync:request:initiated',
      data: {},
      metadata: { version: this.version },
    })
  }

  // Utility methods
  async getStorageInfo(): Promise<{
    used: number
    available: number
    quota: number
  }> {
    if (
      'navigator' in globalThis &&
      'storage' in navigator &&
      navigator.storage &&
      'estimate' in navigator.storage
    ) {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        quota: estimate.quota || 0,
      }
    }

    // Fallback for environments without storage estimate
    return {
      used: 0,
      available: 0,
      quota: 0,
    }
  }

  // New event-driven storage handlers
  private async handleStorageRead(event: EventPayload): Promise<void> {
    const request = event.data as StorageReadEventData
    let response: StorageResponseEventData

    try {
      const data = await this.adapter.get(request.key)
      response = {
        requestId: request.requestId,
        success: true,
        data: data !== null ? data : request.defaultValue,
      }
    } catch (error) {
      response = {
        requestId: request.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error',
      }
    }

    await this.eventBus.publish({
      source: this.name,
      type: 'storage:response',
      data: response,
      metadata: { version: this.version },
    })
  }

  private async handleStorageWrite(event: EventPayload): Promise<void> {
    const request = event.data as StorageWriteEventData
    let response: StorageResponseEventData

    try {
      await this.adapter.set(request.key, request.data, request.ttl)
      response = {
        requestId: request.requestId,
        success: true,
      }
    } catch (error) {
      response = {
        requestId: request.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error',
      }
    }

    await this.eventBus.publish({
      source: this.name,
      type: 'storage:response',
      data: response,
      metadata: { version: this.version },
    })
  }

  private async handleStorageDelete(event: EventPayload): Promise<void> {
    const request = event.data as StorageDeleteEventData
    let response: StorageResponseEventData

    try {
      await this.adapter.remove(request.key)
      response = {
        requestId: request.requestId,
        success: true,
      }
    } catch (error) {
      response = {
        requestId: request.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error',
      }
    }

    await this.eventBus.publish({
      source: this.name,
      type: 'storage:response',
      data: response,
      metadata: { version: this.version },
    })
  }

  private async handleStorageGetKeys(event: EventPayload): Promise<void> {
    const request = event.data as StorageGetKeysEventData
    let response: StorageResponseEventData

    try {
      const allKeys = await this.adapter.getKeys()
      const filteredKeys = request.prefix
        ? allKeys.filter(key => key.startsWith(request.prefix!))
        : allKeys

      response = {
        requestId: request.requestId,
        success: true,
        data: filteredKeys,
      }
    } catch (error) {
      response = {
        requestId: request.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error',
      }
    }

    await this.eventBus.publish({
      source: this.name,
      type: 'storage:response',
      data: response,
      metadata: { version: this.version },
    })
  }
}
