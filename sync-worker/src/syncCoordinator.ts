/**
 * SyncCoordinator Durable Object
 * Handles real-time synchronization for practice log entries
 */

export interface SyncEvent {
  type:
    | 'ENTRY_CREATED'
    | 'ENTRY_UPDATED'
    | 'ENTRY_DELETED'
    | 'BULK_SYNC'
    | 'SYNC_REQUEST'
    | 'PING'
  userId?: string
  timestamp: string
  entry?: any // LogbookEntry
  entries?: any[] // LogbookEntry[]
  entryId?: string
  lastSyncTime?: string
}

export interface ClientInfo {
  websocket: WebSocket
  userId: string
  connectedAt: Date
  lastPing: Date
}

export class SyncCoordinator implements DurableObject {
  private clients = new Map<string, ClientInfo>()
  private storage: DurableObjectStorage
  private env: any // Env interface from main worker

  constructor(state: DurableObjectState, env: any) {
    this.storage = state.storage
    this.env = env
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    // Handle HTTP requests (for debugging/monitoring)
    if (url.pathname === '/status') {
      return new Response(
        JSON.stringify({
          connectedClients: this.clients.size,
          clients: Array.from(this.clients.values()).map(client => ({
            userId: client.userId,
            connectedAt: client.connectedAt.toISOString(),
            lastPing: client.lastPing.toISOString(),
          })),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return new Response('Missing userId', { status: 400 })
    }

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair())

    // Accept the WebSocket connection
    server.accept()

    // Generate unique client ID
    const clientId = `${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`

    // Store client info
    const clientInfo: ClientInfo = {
      websocket: server,
      userId,
      connectedAt: new Date(),
      lastPing: new Date(),
    }

    this.clients.set(clientId, clientInfo)

    console.log(
      `🔗 Client connected: ${clientId} (Total: ${this.clients.size})`
    )

    // Set up event handlers
    server.addEventListener('message', async event => {
      try {
        await this.handleMessage(clientId, event.data as string)
      } catch (error) {
        console.error(`❌ Error handling message from ${clientId}:`, error)
      }
    })

    server.addEventListener('close', event => {
      this.clients.delete(clientId)
      console.log(
        `🔌 Client disconnected: ${clientId} (Code: ${event.code}, Reason: ${event.reason})`
      )
    })

    server.addEventListener('error', event => {
      console.error(`❌ WebSocket error for ${clientId}:`, event)
      this.clients.delete(clientId)
    })

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'WELCOME',
      timestamp: new Date().toISOString(),
      message: 'Connected to Mirubato sync',
    })

    // Hibernation-friendly: Allow Cloudflare to hibernate this Durable Object
    // when there are no active operations
    server.addEventListener('close', () => {
      if (this.clients.size === 0) {
        console.log('🔋 All clients disconnected, ready for hibernation')
      }
    })

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private async handleMessage(clientId: string, data: string): Promise<void> {
    const client = this.clients.get(clientId)
    if (!client) {
      console.warn(`⚠️ Message from unknown client: ${clientId}`)
      return
    }

    let event: SyncEvent
    try {
      event = JSON.parse(data)
    } catch (error) {
      console.error(`❌ Invalid JSON from ${clientId}:`, data)
      return
    }

    // Update last ping time
    client.lastPing = new Date()

    console.log(`📥 Received ${event.type} from ${clientId}`)

    switch (event.type) {
      case 'PING':
        // Respond to heartbeat
        this.sendToClient(clientId, {
          type: 'PONG',
          timestamp: new Date().toISOString(),
        })
        break

      case 'SYNC_REQUEST':
        // Client requesting initial sync
        await this.handleSyncRequest(clientId, event)
        break

      case 'ENTRY_CREATED':
      case 'ENTRY_UPDATED':
      case 'ENTRY_DELETED':
        // Broadcast change to other clients
        await this.handleEntryChange(clientId, event)
        break

      default:
        console.warn(`⚠️ Unknown event type: ${event.type}`)
    }
  }

  private async handleSyncRequest(
    clientId: string,
    event: SyncEvent
  ): Promise<void> {
    // For Phase 1, we'll just acknowledge the sync request
    // In Phase 2, we could fetch recent changes from D1 and send them
    console.log(
      `🔄 Sync request from ${clientId}, lastSyncTime: ${event.lastSyncTime}`
    )

    this.sendToClient(clientId, {
      type: 'SYNC_RESPONSE',
      timestamp: new Date().toISOString(),
      message: 'Sync request acknowledged',
    })
  }

  private async handleEntryChange(
    senderId: string,
    event: SyncEvent
  ): Promise<void> {
    const sender = this.clients.get(senderId)
    if (!sender) return

    console.log(
      `📤 Broadcasting ${event.type} from ${senderId} to ${this.clients.size - 1} other clients`
    )

    // Broadcast to all other clients of the same user
    for (const [clientId, client] of this.clients) {
      if (clientId !== senderId && client.userId === sender.userId) {
        this.sendToClient(clientId, event)
      }
    }

    // TODO: Phase 2 - Save to D1 database
    // await this.saveToDatabase(event)
  }

  private sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId)
    if (!client) {
      console.warn(`⚠️ Attempt to send to unknown client: ${clientId}`)
      return
    }

    if (client.websocket.readyState === WebSocket.READY_STATE_OPEN) {
      try {
        client.websocket.send(JSON.stringify(data))
      } catch (error) {
        console.error(`❌ Failed to send to ${clientId}:`, error)
        // Remove broken connection
        this.clients.delete(clientId)
      }
    } else {
      console.warn(`⚠️ Attempt to send to closed WebSocket: ${clientId}`)
      this.clients.delete(clientId)
    }
  }

  private broadcast(data: any, excludeClientId?: string): void {
    for (const [clientId, client] of this.clients) {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, data)
      }
    }
  }

  // Cleanup disconnected clients periodically
  async alarm(): Promise<void> {
    const now = new Date()
    const staleThreshold = 5 * 60 * 1000 // 5 minutes

    for (const [clientId, client] of this.clients) {
      if (now.getTime() - client.lastPing.getTime() > staleThreshold) {
        console.log(`🧹 Cleaning up stale client: ${clientId}`)
        this.clients.delete(clientId)

        try {
          client.websocket.close(1000, 'Stale connection cleanup')
        } catch (error) {
          // Ignore errors when closing stale connections
        }
      }
    }

    // Schedule next cleanup if we still have clients
    if (this.clients.size > 0) {
      await this.storage.setAlarm(Date.now() + 60000) // 1 minute
    }
  }
}
