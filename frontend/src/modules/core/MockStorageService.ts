import { IStorageService } from './types'

/**
 * Mock storage service for testing - provides same interface as StorageService
 * but uses in-memory storage instead of event-driven architecture
 */
export class MockStorageService implements IStorageService {
  private storage: Map<string, unknown> = new Map()

  async get<T>(key: string): Promise<T | null> {
    return (this.storage.get(key) as T) || null
  }

  async set<T>(key: string, value: T, _ttl?: number): Promise<void> {
    this.storage.set(key, value)
    // Ignore TTL in mock
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key)
  }

  async clear(): Promise<void> {
    this.storage.clear()
  }

  async getKeys(): Promise<string[]> {
    return Array.from(this.storage.keys())
  }

  // Test utilities
  getStorageSize(): number {
    return this.storage.size
  }

  getAllData(): Record<string, unknown> {
    return Object.fromEntries(this.storage)
  }

  destroy(): void {
    this.storage.clear()
  }
}
