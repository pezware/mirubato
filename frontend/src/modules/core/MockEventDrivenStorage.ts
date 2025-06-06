/**
 * Mock implementation of EventDrivenStorage for testing
 */

import { EventDrivenStorage } from './eventDrivenStorage'

export class MockEventDrivenStorage extends EventDrivenStorage {
  private storage = new Map<string, unknown>()
  private mockKeys: string[] = []

  constructor() {
    super({ timeout: 100 }) // Shorter timeout for tests
  }

  // Override the read method to use in-memory storage
  async read<T>(key: string, defaultValue?: T): Promise<T | null> {
    const value = this.storage.get(key)
    return (value as T) ?? defaultValue ?? null
  }

  // Override the write method to use in-memory storage
  async write<T>(key: string, data: T): Promise<void> {
    this.storage.set(key, data)
    if (!this.mockKeys.includes(key)) {
      this.mockKeys.push(key)
    }
  }

  // Override the delete method to use in-memory storage
  async delete(key: string): Promise<void> {
    this.storage.delete(key)
    this.mockKeys = this.mockKeys.filter(k => k !== key)
  }

  // Override the getKeys method to use in-memory storage
  async getKeys(prefix?: string): Promise<string[]> {
    if (!prefix) {
      return [...this.mockKeys]
    }
    return this.mockKeys.filter(key => key.startsWith(prefix))
  }

  // Helper methods for testing
  clear(): void {
    this.storage.clear()
    this.mockKeys = []
  }

  // Get the internal storage for testing assertions
  getStorage(): Map<string, unknown> {
    return new Map(this.storage)
  }

  // Set initial data for testing
  setInitialData(data: Record<string, unknown>): void {
    Object.entries(data).forEach(([key, value]) => {
      this.storage.set(key, value)
      if (!this.mockKeys.includes(key)) {
        this.mockKeys.push(key)
      }
    })
  }
}
