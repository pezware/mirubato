# WebSocket Protocol Specification

## Overview

Mirubato uses WebSocket connections for real-time data synchronization across devices, replacing the previous 30-second polling mechanism. The WebSocket service runs on Cloudflare Workers with Durable Objects for stateful connection management.

## Architecture

### Infrastructure

```
┌──────────────┐     WebSocket      ┌─────────────────┐     Durable Object    ┌──────────────┐
│   Client     │ ◄─────────────────► │  Sync Worker    │ ◄──────────────────► │ Sync Room DO │
│  (Browser)   │                     │  (CF Worker)    │                      │  (Stateful)  │
└──────────────┘                     └─────────────────┘                      └──────────────┘
                                              │                                        │
                                              ▼                                        ▼
                                      ┌──────────────┐                        ┌──────────────┐
                                      │  D1 Database │                        │   D1 State   │
                                      └──────────────┘                        └──────────────┘
```

### Connection URL

```typescript
// Production
wss://sync.mirubato.com/sync

// Staging
wss://sync-staging.mirubato.com/sync

// Local development
ws://localhost:9798/sync
```

## Connection Lifecycle

### 1. Connection Establishment

```typescript
// Client connection
const ws = new WebSocket(`${WS_URL}/sync?token=${jwtToken}`)

// Server authentication
export class SyncRoom extends DurableObject {
  async handleWebSocket(request: Request) {
    const token = new URL(request.url).searchParams.get('token')
    const user = await validateJWT(token)

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const pair = new WebSocketPair()
    this.handleSession(pair[1], user)

    return new Response(null, {
      status: 101,
      webSocket: pair[0],
    })
  }
}
```

### 2. Heartbeat & Keep-Alive

```typescript
// Client-side ping
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }))
  }
}, 30000) // Every 30 seconds

// Server-side pong
if (message.type === 'ping') {
  ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
}

// Connection timeout handling
const IDLE_TIMEOUT = 60000 // 1 minute
let lastActivity = Date.now()

// Close idle connections
if (Date.now() - lastActivity > IDLE_TIMEOUT) {
  ws.close(1000, 'Idle timeout')
}
```

### 3. Reconnection Strategy

```typescript
class WebSocketClient {
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // Start with 1 second

  async connect() {
    try {
      this.ws = new WebSocket(this.url)
      this.setupEventHandlers()
    } catch (error) {
      this.handleReconnect()
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('max_reconnect_exceeded')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    )

    setTimeout(() => this.connect(), delay)
  }

  private handleOpen = () => {
    this.reconnectAttempts = 0
    this.reconnectDelay = 1000
    this.syncPendingChanges()
  }
}
```

## Message Protocol

### Message Format

```typescript
interface WSMessage {
  id: string // Unique message ID
  type: MessageType // Message type
  timestamp: number // Unix timestamp
  data?: any // Payload
  error?: WSError // Error details
}

enum MessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',

  // Sync operations
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response',
  SYNC_UPDATE = 'sync_update',
  SYNC_DELETE = 'sync_delete',
  SYNC_CONFLICT = 'sync_conflict',

  // Subscriptions
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',

  // Broadcast
  BROADCAST = 'broadcast',

  // Errors
  ERROR = 'error',
}
```

### Sync Messages

#### Sync Request

```typescript
// Client → Server
{
  id: "msg_123",
  type: "sync_request",
  timestamp: 1701388800000,
  data: {
    entityType: "logbook",
    entityId: "entry_456",
    operation: "update",
    payload: {
      duration: 3600,
      notes: "Updated notes"
    },
    version: 2,
    clientVersion: 1
  }
}

// Server → Client (Success)
{
  id: "msg_123",
  type: "sync_response",
  timestamp: 1701388801000,
  data: {
    success: true,
    entityType: "logbook",
    entityId: "entry_456",
    serverVersion: 3,
    mergedData: { ... }
  }
}

// Server → Client (Conflict)
{
  id: "msg_123",
  type: "sync_conflict",
  timestamp: 1701388801000,
  data: {
    entityType: "logbook",
    entityId: "entry_456",
    localVersion: 2,
    serverVersion: 3,
    localData: { ... },
    serverData: { ... },
    suggestedResolution: "server" // or "local" or "merge"
  }
}
```

#### Broadcast Updates

```typescript
// Server → All Clients (except sender)
{
  id: "broadcast_789",
  type: "broadcast",
  timestamp: 1701388802000,
  data: {
    userId: "user_123",
    entityType: "logbook",
    entityId: "entry_456",
    operation: "update",
    payload: { ... }
  }
}
```

## Real-time Sync Implementation

### Client-Side Sync Manager

```typescript
class WebSocketSync {
  private ws: WebSocket | null = null
  private pendingQueue: SyncMessage[] = []
  private syncInProgress = false

  async syncEntity(entityType: string, entityId: string, data: any) {
    const message: SyncMessage = {
      id: crypto.randomUUID(),
      type: MessageType.SYNC_REQUEST,
      timestamp: Date.now(),
      data: {
        entityType,
        entityId,
        operation: 'update',
        payload: data,
        version: await this.getLocalVersion(entityType, entityId),
      },
    }

    if (this.isConnected()) {
      this.send(message)
    } else {
      this.queueMessage(message)
    }
  }

  private queueMessage(message: SyncMessage) {
    this.pendingQueue.push(message)
    this.saveQueueToStorage()
  }

  private async processPendingQueue() {
    while (this.pendingQueue.length > 0) {
      const message = this.pendingQueue.shift()
      await this.send(message)
      await this.waitForAck(message.id, 5000)
    }
  }
}
```

### Server-Side Sync Handler

```typescript
export class SyncRoom extends DurableObject {
  private sessions: Map<string, Session> = new Map()

  async handleSyncRequest(ws: WebSocket, message: WSMessage) {
    const { entityType, entityId, operation, payload, version } = message.data

    // Get current server version
    const serverData = await this.getEntity(entityType, entityId)
    const serverVersion = serverData?.version || 0

    // Check for conflicts
    if (serverVersion > version) {
      // Conflict detected
      ws.send(
        JSON.stringify({
          id: message.id,
          type: MessageType.SYNC_CONFLICT,
          timestamp: Date.now(),
          data: {
            entityType,
            entityId,
            localVersion: version,
            serverVersion,
            localData: payload,
            serverData: serverData.data,
            suggestedResolution: this.suggestResolution(
              payload,
              serverData.data
            ),
          },
        })
      )
      return
    }

    // Apply update
    const updatedData = await this.applyUpdate(entityType, entityId, payload)

    // Send success response to sender
    ws.send(
      JSON.stringify({
        id: message.id,
        type: MessageType.SYNC_RESPONSE,
        timestamp: Date.now(),
        data: {
          success: true,
          entityType,
          entityId,
          serverVersion: updatedData.version,
          mergedData: updatedData.data,
        },
      })
    )

    // Broadcast to other clients
    this.broadcast(message.userId, {
      type: MessageType.BROADCAST,
      timestamp: Date.now(),
      data: {
        userId: message.userId,
        entityType,
        entityId,
        operation,
        payload: updatedData.data,
      },
    })
  }

  private broadcast(excludeUserId: string, message: WSMessage) {
    for (const [userId, session] of this.sessions) {
      if (
        userId !== excludeUserId &&
        session.ws.readyState === WebSocket.OPEN
      ) {
        session.ws.send(JSON.stringify(message))
      }
    }
  }
}
```

## Conflict Resolution

### Conflict Detection

```typescript
interface ConflictDetection {
  hasConflict(local: EntityVersion, server: EntityVersion): boolean
  suggestResolution(local: any, server: any): ResolutionStrategy
}

enum ResolutionStrategy {
  LOCAL = 'local', // Keep local changes
  SERVER = 'server', // Keep server changes
  MERGE = 'merge', // Merge both changes
  MANUAL = 'manual', // Require user intervention
}

class ConflictResolver {
  detectConflict(local: EntityVersion, server: EntityVersion): boolean {
    // Version-based conflict detection
    if (local.baseVersion !== server.version) {
      return true
    }

    // Timestamp-based conflict detection
    if (local.updatedAt < server.updatedAt - CLOCK_SKEW_TOLERANCE) {
      return true
    }

    return false
  }

  suggestResolution(
    entityType: string,
    local: any,
    server: any
  ): ResolutionStrategy {
    // Entity-specific resolution strategies
    switch (entityType) {
      case 'logbook':
        // For logbook entries, prefer the one with more content
        if (local.notes?.length > server.notes?.length) {
          return ResolutionStrategy.LOCAL
        }
        return ResolutionStrategy.SERVER

      case 'repertoire':
        // For repertoire, merge status changes
        return ResolutionStrategy.MERGE

      default:
        // Default to last-write-wins
        return local.updatedAt > server.updatedAt
          ? ResolutionStrategy.LOCAL
          : ResolutionStrategy.SERVER
    }
  }
}
```

### Merge Strategies

```typescript
class MergeStrategy {
  merge(entityType: string, local: any, server: any): any {
    switch (entityType) {
      case 'logbook':
        return this.mergeLogbookEntry(local, server)
      case 'repertoire':
        return this.mergeRepertoireItem(local, server)
      default:
        return this.defaultMerge(local, server)
    }
  }

  private mergeLogbookEntry(
    local: LogbookEntry,
    server: LogbookEntry
  ): LogbookEntry {
    return {
      ...server,
      // Prefer longer notes
      notes:
        local.notes.length > server.notes.length ? local.notes : server.notes,
      // Merge tags
      tags: [...new Set([...local.tags, ...server.tags])],
      // Keep most recent mood
      mood: local.updatedAt > server.updatedAt ? local.mood : server.mood,
      // Merge pieces
      pieces: this.mergePieces(local.pieces, server.pieces),
      updatedAt: Math.max(local.updatedAt, server.updatedAt),
    }
  }
}
```

## Subscription Management

### Entity Subscriptions

```typescript
// Subscribe to specific entities
{
  type: "subscribe",
  data: {
    subscriptions: [
      { entityType: "logbook", entityId: "*" },  // All logbook entries
      { entityType: "repertoire", entityId: "rep_123" },  // Specific item
      { entityType: "goals", userId: "user_456" }  // User's goals
    ]
  }
}

// Server-side subscription handling
class SubscriptionManager {
  private subscriptions: Map<string, Set<Subscription>> = new Map()

  subscribe(userId: string, subscription: Subscription) {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set())
    }
    this.subscriptions.get(userId)!.add(subscription)
  }

  getSubscribers(entityType: string, entityId: string): string[] {
    const subscribers: string[] = []

    for (const [userId, subs] of this.subscriptions) {
      for (const sub of subs) {
        if (this.matchesSubscription(sub, entityType, entityId)) {
          subscribers.push(userId)
          break
        }
      }
    }

    return subscribers
  }

  private matchesSubscription(sub: Subscription, entityType: string, entityId: string): boolean {
    if (sub.entityType !== entityType) return false
    if (sub.entityId === '*') return true
    return sub.entityId === entityId
  }
}
```

## Error Handling

### Error Types

```typescript
enum WSErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTH_FAILED = 'AUTH_FAILED',
  SYNC_FAILED = 'SYNC_FAILED',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  SERVER_ERROR = 'SERVER_ERROR',
}

interface WSError {
  code: WSErrorCode
  message: string
  details?: any
  retryable: boolean
  retryAfter?: number
}

// Error message
{
  id: "error_123",
  type: "error",
  timestamp: 1701388800000,
  error: {
    code: "SYNC_FAILED",
    message: "Failed to sync entity",
    details: {
      entityType: "logbook",
      entityId: "entry_456",
      reason: "Version conflict"
    },
    retryable: true,
    retryAfter: 5000
  }
}
```

## Performance Optimization

### Message Batching

```typescript
class MessageBatcher {
  private batch: WSMessage[] = []
  private batchTimeout: number | null = null
  private maxBatchSize = 50
  private batchDelay = 100 // ms

  queue(message: WSMessage) {
    this.batch.push(message)

    if (this.batch.length >= this.maxBatchSize) {
      this.flush()
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), this.batchDelay)
    }
  }

  private flush() {
    if (this.batch.length === 0) return

    const batchMessage = {
      type: 'batch',
      messages: this.batch,
      timestamp: Date.now(),
    }

    this.send(batchMessage)
    this.batch = []

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }
  }
}
```

### Connection Pooling

```typescript
// Durable Object manages connection pool
class SyncRoom extends DurableObject {
  private connectionPool: Map<string, WebSocket[]> = new Map()
  private maxConnectionsPerUser = 5

  addConnection(userId: string, ws: WebSocket) {
    if (!this.connectionPool.has(userId)) {
      this.connectionPool.set(userId, [])
    }

    const connections = this.connectionPool.get(userId)!

    // Limit connections per user
    if (connections.length >= this.maxConnectionsPerUser) {
      const oldest = connections.shift()
      oldest?.close(1000, 'Connection limit exceeded')
    }

    connections.push(ws)
  }
}
```

## Monitoring & Debugging

### Connection Metrics

```typescript
interface ConnectionMetrics {
  connectedClients: number
  messagesPerSecond: number
  averageLatency: number
  errorRate: number
  reconnectionRate: number
}

// Track metrics in Durable Object
class SyncRoom extends DurableObject {
  private metrics: ConnectionMetrics = {
    connectedClients: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    errorRate: 0,
    reconnectionRate: 0,
  }

  async getMetrics(): Promise<ConnectionMetrics> {
    return {
      ...this.metrics,
      connectedClients: this.sessions.size,
    }
  }
}
```

### Debug Logging

```typescript
// Client-side debug mode
if (DEBUG_MODE) {
  ws.addEventListener('message', event => {
    console.log('[WS Received]', JSON.parse(event.data))
  })

  const originalSend = ws.send.bind(ws)
  ws.send = (data: string) => {
    console.log('[WS Sent]', JSON.parse(data))
    originalSend(data)
  }
}
```

## Related Documentation

- [REST API](./rest-api.md) - HTTP endpoints
- [Authentication](./authentication.md) - JWT validation
- [Sync Strategy](../02-database/sync-strategy.md) - Data synchronization
- [Real-time Features](../05-features/real-time.md) - Feature integration

---

_Last updated: December 2024 | Version 1.7.6_
