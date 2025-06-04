/**
 * Mock storage service for testing - provides same interface as StorageService
 * but uses in-memory storage instead of event-driven architecture
 */
export class MockStorageService {
  private storage: Map<string, any> = new Map()

  async get<T>(key: string): Promise<T | null> {
    return this.storage.get(key) || null
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

  getAllData(): Record<string, any> {
    return Object.fromEntries(this.storage)
  }

  destroy(): void {
    this.storage.clear()
  }
}
