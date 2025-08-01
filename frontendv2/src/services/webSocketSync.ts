/**
 * WebSocket-based real-time sync service for Mirubato
 * Handles real-time synchronization of practice entries across devices
 */

import type { LogbookEntry } from '../api/logbook'

export interface SyncEvent {
  type:
    | 'ENTRY_CREATED'
    | 'ENTRY_UPDATED'
    | 'ENTRY_DELETED'
    | 'BULK_SYNC'
    | 'SYNC_REQUEST'
    | 'CONFLICT_DETECTED'
  userId?: string
  timestamp: string
  entry?: LogbookEntry
  entries?: LogbookEntry[]
  entryId?: string
  lastSyncTime?: string
}

export interface WebSocketSyncOptions {
  maxReconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
  enableLogging?: boolean
}

export type SyncEventHandler = (event: SyncEvent) => void

export class WebSocketSync {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private reconnectInterval: number
  private heartbeatInterval: number
  private heartbeatTimer: NodeJS.Timeout | null = null
  private enableLogging: boolean
  private eventHandlers: Map<string, SyncEventHandler[]> = new Map()
  private offlineQueue: SyncEvent[] = []
  private isConnected = false

  // Connection details
  private userId: string | null = null
  private authToken: string | null = null
  private wsUrl: string | null = null

  constructor(options: WebSocketSyncOptions = {}) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5
    this.reconnectInterval = options.reconnectInterval ?? 1000
    this.heartbeatInterval = options.heartbeatInterval ?? 30000
    this.enableLogging =
      options.enableLogging ?? process.env.NODE_ENV === 'development'
  }

  /**
   * Connect to WebSocket sync server
   */
  async connect(userId: string, authToken: string): Promise<boolean> {
    this.userId = userId
    this.authToken = authToken

    // Determine WebSocket URL based on environment
    const baseUrl = this.getWebSocketUrl()
    this.wsUrl = `${baseUrl}/sync/ws?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(authToken)}`

    return this.establishConnection()
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.log('🔌 Disconnecting WebSocket')

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }

    this.isConnected = false
    this.reconnectAttempts = 0
  }

  /**
   * Send sync event to server
   */
  send(event: SyncEvent): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(event)
      this.ws.send(message)
      this.log('📤 Sent sync event:', event.type)
    } else {
      // Queue for later when connection is restored
      this.log('📦 Queuing offline event:', event.type)
      this.offlineQueue.push(event)
    }
  }

  /**
   * Add event listener for specific sync event types
   */
  on(eventType: string, handler: SyncEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }

  /**
   * Remove event listener
   */
  off(eventType: string, handler: SyncEventHandler): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus():
    | 'connected'
    | 'connecting'
    | 'disconnected'
    | 'reconnecting' {
    if (this.isConnected) return 'connected'
    if (this.ws?.readyState === WebSocket.CONNECTING) return 'connecting'
    if (this.reconnectAttempts > 0) return 'reconnecting'
    return 'disconnected'
  }

  /**
   * Get queued offline events count
   */
  getOfflineQueueSize(): number {
    return this.offlineQueue.length
  }

  private async establishConnection(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.wsUrl) {
        reject(new Error('WebSocket URL not set'))
        return
      }

      this.log('🔗 Connecting to WebSocket:', this.wsUrl)
      this.ws = new WebSocket(this.wsUrl)

      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          this.ws.close()
          reject(new Error('WebSocket connection timeout'))
        }
      }, 10000) // 10 second timeout

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout)
        this.log('✅ WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0

        // Start heartbeat
        this.startHeartbeat()

        // Send initial sync request
        this.send({
          type: 'SYNC_REQUEST',
          timestamp: new Date().toISOString(),
          lastSyncTime: this.getLastSyncTime(),
        })

        // Send queued offline events
        this.flushOfflineQueue()

        resolve(true)
      }

      this.ws.onmessage = event => {
        try {
          const syncEvent: SyncEvent = JSON.parse(event.data)
          this.handleIncomingSync(syncEvent)
        } catch (error) {
          this.log('❌ Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = event => {
        clearTimeout(connectionTimeout)
        this.isConnected = false

        if (this.heartbeatTimer) {
          clearInterval(this.heartbeatTimer)
          this.heartbeatTimer = null
        }

        this.log('🔌 WebSocket disconnected:', event.code, event.reason)

        // Don't reconnect if it was a clean close
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect()
        }

        if (this.reconnectAttempts === 0) {
          resolve(false)
        }
      }

      this.ws.onerror = error => {
        clearTimeout(connectionTimeout)
        this.log('❌ WebSocket error:', error)

        if (this.reconnectAttempts === 0) {
          reject(error)
        }
      }
    })
  }

  private handleIncomingSync(event: SyncEvent): void {
    this.log('📥 Received sync event:', event.type)

    // Update last sync time
    this.setLastSyncTime(event.timestamp)

    // Emit to event handlers
    const handlers = this.eventHandlers.get(event.type) || []
    const allHandlers = this.eventHandlers.get('*') || []

    const combinedHandlers = handlers.concat(allHandlers)
    combinedHandlers.forEach(handler => {
      try {
        handler(event)
      } catch (error) {
        this.log('❌ Error in sync event handler:', error)
      }
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('❌ Max reconnection attempts reached')
      return
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    )

    this.reconnectAttempts++
    this.log(
      `🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    )

    setTimeout(() => {
      if (this.userId && this.authToken) {
        this.establishConnection().catch(error => {
          this.log('❌ Reconnection failed:', error)
        })
      }
    }, delay)
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })
        )
      }
    }, this.heartbeatInterval)
  }

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return

    this.log(`📤 Sending ${this.offlineQueue.length} queued events`)

    const events = [...this.offlineQueue]
    this.offlineQueue = []

    events.forEach(event => this.send(event))
  }

  private getWebSocketUrl(): string {
    // In development, use local WebSocket server
    if (process.env.NODE_ENV === 'development') {
      return 'ws://localhost:8787'
    }

    // In production, use Cloudflare Workers WebSocket
    const currentHost = window.location.host
    if (currentHost.includes('localhost')) {
      return 'ws://sync-mirubato.localhost:8787'
    }

    if (currentHost.includes('staging')) {
      return 'wss://sync-staging.mirubato.com'
    }

    return 'wss://sync.mirubato.com'
  }

  private getLastSyncTime(): string {
    return (
      localStorage.getItem('mirubato:lastSyncTime') || new Date(0).toISOString()
    )
  }

  private setLastSyncTime(timestamp: string): void {
    localStorage.setItem('mirubato:lastSyncTime', timestamp)
  }

  private log(...args: unknown[]): void {
    if (this.enableLogging) {
      console.log('[WebSocketSync]', ...args)
    }
  }
}

// Singleton instance
let webSocketSyncInstance: WebSocketSync | null = null

export function getWebSocketSync(): WebSocketSync {
  if (!webSocketSyncInstance) {
    webSocketSyncInstance = new WebSocketSync({
      enableLogging: process.env.NODE_ENV === 'development',
    })
  }
  return webSocketSyncInstance
}

export function resetWebSocketSync(): void {
  if (webSocketSyncInstance) {
    webSocketSyncInstance.disconnect()
    webSocketSyncInstance = null
  }
}
