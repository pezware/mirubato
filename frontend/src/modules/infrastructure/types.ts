// Infrastructure module types

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
  getKeys(): Promise<string[]>
}

export interface StorageConfig {
  namespace?: string
  adapter?: 'localStorage' | 'indexedDB'
  maxSize?: number
  ttl?: number // Time to live in milliseconds
}

export interface StorageMetadata {
  key: string
  size: number
  createdAt: number
  updatedAt: number
  accessedAt: number
  expiresAt?: number
}

export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: unknown
  timestamp: number
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retryCount: number
  error?: string
}

export interface SyncConfig {
  maxRetries: number
  retryDelay: number
  batchSize: number
  syncInterval: number
}

export interface ConflictResolution<T = unknown> {
  strategy: 'lastWriteWins' | 'merge' | 'userChoice' | 'custom'
  resolver?: (local: T, remote: T) => T
}
