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
    | 'PIECE_ADDED'
    | 'PIECE_UPDATED'
    | 'PIECE_REMOVED'
    | 'PIECE_DISSOCIATED'
    | 'BULK_SYNC'
    | 'REPERTOIRE_BULK_SYNC'
    | 'SYNC_REQUEST'
    | 'SYNC_RESPONSE'
    | 'CONFLICT_DETECTED'
  userId?: string
  timestamp: string
  entry?: LogbookEntry
  entries?: LogbookEntry[]
  entryId?: string
  piece?: unknown // RepertoireItem - avoiding circular dependency
  pieces?: unknown[] // RepertoireItem[]
  scoreId?: string
  lastSyncTime?: string
  lastSeq?: number
  seq?: number
  message?: string
  error?: string
}

export interface WebSocketSyncOptions {
  maxReconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
  enableLogging?: boolean
  disableReconnect?: boolean
}

export type SyncEventHandler = (event: SyncEvent) => void
export type WebSocketFactory = (url: string) => WebSocket

const LAST_SEQ_KEY = 'mirubato:lastSeq'

export class WebSocketSync {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private reconnectInterval: number
  private heartbeatInterval: number
  private heartbeatTimer: NodeJS.Timeout | null = null
  private enableLogging: boolean
  private disableReconnect: boolean
  private eventHandlers: Map<string, SyncEventHandler[]> = new Map()
  private offlineQueue: SyncEvent[] = []
  private isConnected = false
  private webSocketFactory: WebSocketFactory

  // Connection details
  private userId: string | null = null
  private authToken: string | null = null
  private wsUrl: string | null = null

  constructor(
    options: WebSocketSyncOptions = {},
    webSocketFactory: WebSocketFactory = url => new WebSocket(url)
  ) {
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5
    this.reconnectInterval = options.reconnectInterval ?? 1000
    this.heartbeatInterval = options.heartbeatInterval ?? 30000
    this.enableLogging =
      options.enableLogging ?? process.env.NODE_ENV === 'development'
    this.disableReconnect = options.disableReconnect ?? false
    this.webSocketFactory = webSocketFactory

    // Load any persisted offline events on creation
    try {
      this.loadOfflineQueueFromDisk()
    } catch {
      // noop
    }
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
      if (!this.isMutationEvent(event)) {
        // Don't persist non-mutation/control messages
        this.log(
          '⏭️ Skipping offline queue for non-mutation event:',
          event.type
        )
        return
      }
      this.log('📦 Queuing offline event:', event.type)
      // Add to queue, then dedupe and persist
      this.offlineQueue.push(event)
      this.offlineQueue = this.pruneAndDedupeQueue(this.offlineQueue)
      this.persistOfflineQueue()
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
    if (this.reconnectAttempts > 0 && !this.disableReconnect)
      return 'reconnecting'
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

      // Track if promise has been resolved to prevent multiple resolutions
      let isResolved = false

      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          this.ws.close()
          if (!isResolved) {
            isResolved = true
            reject(new Error('WebSocket connection timeout'))
          }
        }
      }, 10000) // 10 second timeout

      // Create WebSocket using factory and IMMEDIATELY attach handlers to avoid race condition
      this.ws = this.webSocketFactory(this.wsUrl)

      // Attach all handlers immediately after creation
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout)
        this.log('✅ WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0

        // Start heartbeat
        this.startHeartbeat()

        // Check if we need to sync based on last sync time
        const lastSyncTime = this.getLastSyncTime()
        const lastSyncDate = new Date(lastSyncTime)
        const timeSinceLastSync = Date.now() - lastSyncDate.getTime()
        const thirtySeconds = 30 * 1000
        const lastSeq = this.getLastSeq()

        // Only send SYNC_REQUEST if:
        // 1. Last sync was more than 30 seconds ago, OR
        // 2. Last sync time appears invalid or from the future (clock skew), OR
        // 3. We have offline queued events
        if (
          Number.isNaN(timeSinceLastSync) ||
          timeSinceLastSync < 0 ||
          timeSinceLastSync > thirtySeconds ||
          this.offlineQueue.length > 0
        ) {
          this.log(
            `📊 Sending SYNC_REQUEST (last sync: ${Math.round(timeSinceLastSync / 1000)}s ago, lastSeq=${lastSeq})`
          )
          const payload: SyncEvent = {
            type: 'SYNC_REQUEST',
            timestamp: new Date().toISOString(),
          }
          // Only include lastSyncTime if valid and not from the future
          if (!Number.isNaN(timeSinceLastSync) && timeSinceLastSync >= 0) {
            payload.lastSyncTime = lastSyncTime
          }
          if (lastSeq > 0) {
            payload.lastSeq = lastSeq
          }
          this.send(payload)
        } else {
          this.log(
            `⏸️ Skipping SYNC_REQUEST (synced ${Math.round(timeSinceLastSync / 1000)}s ago, lastSeq=${lastSeq})`
          )
        }

        // Send queued offline events
        this.flushOfflineQueue()

        if (!isResolved) {
          isResolved = true
          resolve(true)
        }
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

        // Check if this is the initial connection attempt
        const isInitialAttempt = this.reconnectAttempts === 0

        // Don't reconnect if it was a clean close or reconnection is disabled
        if (
          !this.disableReconnect &&
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.scheduleReconnect()
        }

        // Only resolve if not already resolved and this was the initial attempt
        if (!isResolved && isInitialAttempt) {
          isResolved = true
          resolve(false)
        }
      }

      this.ws.onerror = error => {
        clearTimeout(connectionTimeout)
        this.log('❌ WebSocket error:', error)

        // Don't reject if already resolved (onclose might have been called)
        // WebSocket typically calls both onerror and onclose on failure
      }
    })
  }

  private handleIncomingSync(event: SyncEvent): void {
    this.log('📥 Received sync event:', event.type)
    this.maybeUpdateLastSeq(event)

    // Only update last sync time for data-carrying events
    // Skip control messages like WELCOME, PONG to avoid missing catch-up syncs
    const dataEvents = [
      'ENTRY_CREATED',
      'ENTRY_UPDATED',
      'ENTRY_DELETED',
      'BULK_SYNC',
      'PIECE_ADDED',
      'PIECE_UPDATED',
      'PIECE_REMOVED',
      'PIECE_DISSOCIATED',
      'REPERTOIRE_BULK_SYNC',
    ]

    if (dataEvents.includes(event.type)) {
      // Clamp to server-now when incoming timestamp is invalid or in the future
      const parsed = Date.parse(event.timestamp)
      const now = Date.now()
      const safeIso =
        Number.isFinite(parsed) && parsed <= now
          ? new Date(parsed).toISOString()
          : new Date(now).toISOString()
      this.setLastSyncTime(safeIso)
    }

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
    // Load persisted queue again in case other tabs added events
    this.loadOfflineQueueFromDisk()
    if (this.offlineQueue.length === 0) return

    this.log(`📤 Sending ${this.offlineQueue.length} queued events`)

    const events = [...this.offlineQueue]
    this.offlineQueue = []
    // Clear persisted queue before sending to avoid duplicates if the app closes mid-send
    this.clearPersistedOfflineQueue()

    events.forEach(event => this.send(event))
  }

  private getWebSocketUrl(): string {
    // In test environment, use a test URL
    if (process.env.NODE_ENV === 'test') {
      return 'ws://test.localhost:8787'
    }

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

  private getLastSeq(): number {
    const raw = localStorage.getItem(LAST_SEQ_KEY)
    if (!raw) return 0
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  }

  private setLastSeq(seq: number): void {
    if (!Number.isFinite(seq) || seq < 0) {
      return
    }
    const current = this.getLastSeq()
    if (seq <= current) {
      return
    }
    localStorage.setItem(LAST_SEQ_KEY, String(seq))
  }

  private maybeUpdateLastSeq(event: SyncEvent): void {
    const candidates: number[] = []

    if (typeof event.seq === 'number' && Number.isFinite(event.seq)) {
      candidates.push(event.seq)
    }

    if (typeof event.lastSeq === 'number' && Number.isFinite(event.lastSeq)) {
      candidates.push(event.lastSeq)
    }

    if (candidates.length === 0) {
      return
    }

    const highest = Math.max(...candidates)
    this.setLastSeq(highest)
  }

  // --- Offline queue persistence helpers ---
  private getOfflineQueueKey(): string {
    return 'mirubato:ws:offlineQueue'
  }

  private isMutationEvent(event: SyncEvent): boolean {
    const mutationTypes = new Set([
      'ENTRY_CREATED',
      'ENTRY_UPDATED',
      'ENTRY_DELETED',
      'PIECE_ADDED',
      'PIECE_UPDATED',
      'PIECE_REMOVED',
      'PIECE_DISSOCIATED',
    ])
    return mutationTypes.has(event.type)
  }

  private getEntityKey(event: SyncEvent): string | null {
    switch (event.type) {
      case 'ENTRY_CREATED':
      case 'ENTRY_UPDATED':
        return event.entry?.id || null
      case 'ENTRY_DELETED':
        return event.entryId || null
      case 'PIECE_ADDED':
      case 'PIECE_UPDATED':
        // Try multiple fields for robustness
        return (
          (
            event as unknown as {
              piece?: { scoreId?: string; score_id?: string }
            }
          ).piece?.scoreId ||
          (event as unknown as { piece?: { score_id?: string } }).piece
            ?.score_id ||
          null
        )
      case 'PIECE_REMOVED':
      case 'PIECE_DISSOCIATED':
        return event.scoreId || null
      default:
        return null
    }
  }

  private pruneAndDedupeQueue(events: SyncEvent[]): SyncEvent[] {
    // TTL: 48 hours
    const TTL_MS = 48 * 60 * 60 * 1000
    const now = Date.now()

    // Dedupe by type + entity key keeping the latest by timestamp
    const map = new Map<string, SyncEvent>()
    for (const e of events) {
      const keyEntity = this.getEntityKey(e)
      if (!keyEntity) continue
      const key = `${e.type}:${keyEntity}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, e)
        continue
      }

      const existingTs = new Date(existing.timestamp).getTime() || 0
      const currentTs = new Date(e.timestamp).getTime() || 0
      if (currentTs >= existingTs) {
        map.set(key, e)
      }
    }

    // Prune by TTL
    const pruned = Array.from(map.values()).filter(e => {
      const ts = new Date(e.timestamp).getTime() || 0
      return now - ts <= TTL_MS
    })

    // Limit queue size to avoid unbounded growth
    const MAX = 200
    if (pruned.length > MAX) {
      // Keep the most recent MAX events
      pruned.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      return pruned.slice(0, MAX)
    }
    return pruned
  }

  private loadOfflineQueueFromDisk(): void {
    try {
      const raw = localStorage.getItem(this.getOfflineQueueKey())
      if (!raw) return
      const stored: Array<{ event: SyncEvent; queuedAt: string }> =
        JSON.parse(raw)
      // Validate shape and rebuild events
      const events = stored
        .map(item => item?.event)
        .filter(Boolean) as SyncEvent[]
      this.offlineQueue = this.pruneAndDedupeQueue(events)
    } catch (e) {
      this.log('⚠️ Failed to load offline queue:', e)
      // If corrupted, clear it
      this.clearPersistedOfflineQueue()
    }
  }

  private persistOfflineQueue(): void {
    try {
      const wrapped = this.offlineQueue.map(ev => ({
        event: ev,
        queuedAt: new Date().toISOString(),
      }))
      localStorage.setItem(this.getOfflineQueueKey(), JSON.stringify(wrapped))
    } catch (e) {
      this.log('⚠️ Failed to persist offline queue:', e)
    }
  }

  private clearPersistedOfflineQueue(): void {
    try {
      localStorage.removeItem(this.getOfflineQueueKey())
    } catch {
      // noop
    }
  }

  // Expose a safe reset for auth transitions (e.g., logout)
  public resetOfflineQueue(): void {
    this.offlineQueue = []
    this.clearPersistedOfflineQueue()
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
    // Clear any persisted events to avoid cross-user leakage after logout
    webSocketSyncInstance.resetOfflineQueue()
    webSocketSyncInstance.disconnect()
    webSocketSyncInstance = null
  }
}
