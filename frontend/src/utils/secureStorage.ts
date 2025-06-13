/**
 * Secure storage utility for sensitive data
 *
 * This module provides encryption for sensitive data stored in the browser.
 * Note: While this adds a layer of security, it's not a replacement for
 * proper server-side security. Tokens should have short lifetimes and
 * be validated server-side.
 */

import { nanoid } from 'nanoid'

// In a production app, this would be generated server-side
// and stored more securely. For now, we generate a unique key
// per session and store it in sessionStorage.
const getOrCreateEncryptionKey = (): string => {
  const KEY_NAME = 'mirubato_enc_key'
  let key = sessionStorage.getItem(KEY_NAME)

  if (!key) {
    // Generate a random key for this session
    key = nanoid(32)
    sessionStorage.setItem(KEY_NAME, key)
    return key
  }

  return key
}

/**
 * Simple XOR encryption for obfuscation
 * This is NOT cryptographically secure but prevents casual inspection
 * of tokens in localStorage/sessionStorage
 */
const xorEncrypt = (text: string, key: string): string => {
  const result: number[] = []
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(String.fromCharCode(...result))
}

const xorDecrypt = (encoded: string, key: string): string => {
  try {
    const text = atob(encoded)
    const result: number[] = []
    for (let i = 0; i < text.length; i++) {
      result.push(text.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return String.fromCharCode(...result)
  } catch {
    return ''
  }
}

export interface SecureStorageOptions {
  /** Whether to use sessionStorage (temporary) or localStorage (persistent) */
  persistent?: boolean
  /** Time-to-live in milliseconds */
  ttl?: number
}

export interface StoredItem<T> {
  data: T
  expiresAt?: number
}

export class SecureStorage {
  private key: string

  constructor() {
    this.key = getOrCreateEncryptionKey()
  }

  /**
   * Store sensitive data with encryption
   */
  setItem<T>(name: string, value: T, options: SecureStorageOptions = {}): void {
    const { persistent = false, ttl } = options
    const storage = persistent ? localStorage : sessionStorage

    const item: StoredItem<T> = {
      data: value,
      expiresAt: ttl ? Date.now() + ttl : undefined,
    }

    const serialized = JSON.stringify(item)
    const encrypted = xorEncrypt(serialized, this.key)

    storage.setItem(`secure_${name}`, encrypted)
  }

  /**
   * Retrieve and decrypt sensitive data
   */
  getItem<T>(name: string, persistent = false): T | null {
    const storage = persistent ? localStorage : sessionStorage
    const encrypted = storage.getItem(`secure_${name}`)

    if (!encrypted) {
      return null
    }

    try {
      const decrypted = xorDecrypt(encrypted, this.key)
      const item: StoredItem<T> = JSON.parse(decrypted)

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.removeItem(name, persistent)
        return null
      }

      return item.data
    } catch {
      // If decryption fails, remove the corrupted item
      this.removeItem(name, persistent)
      return null
    }
  }

  /**
   * Remove sensitive data
   */
  removeItem(name: string, persistent = false): void {
    const storage = persistent ? localStorage : sessionStorage
    storage.removeItem(`secure_${name}`)
  }

  /**
   * Clear all secure storage
   */
  clear(): void {
    // Clear from both storages
    const storages = [localStorage, sessionStorage]

    storages.forEach(storage => {
      const keysToRemove: string[] = []

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith('secure_')) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key))
    })
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage()

// Token-specific helpers
export const tokenStorage = {
  setAccessToken(token: string, expiresIn?: number): void {
    secureStorage.setItem('access_token', token, {
      persistent: true, // Use localStorage to persist across browser sessions
      ttl: expiresIn ? expiresIn * 1000 : 7 * 24 * 60 * 60 * 1000, // Default 7 days
    })
  },

  getAccessToken(): string | null {
    return secureStorage.getItem<string>('access_token', true)
  },

  setRefreshToken(token: string): void {
    secureStorage.setItem('refresh_token', token, {
      persistent: true, // Persist refresh tokens
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    })
  },

  getRefreshToken(): string | null {
    return secureStorage.getItem<string>('refresh_token', true)
  },

  clearTokens(): void {
    secureStorage.removeItem('access_token', true)
    secureStorage.removeItem('refresh_token', true)
  },
}
