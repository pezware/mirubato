/**
 * SyncCoordinator Durable Object
 * Handles real-time synchronization for practice log entries and repertoire pieces
 */

import {
  validateSyncEvent,
  sanitizeEntry,
  ResponseEventSchema,
  type LogbookEntrySchema,
  type RepertoireItemSchema,
} from './schemas'
import { z } from 'zod'

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
    | 'PING'
  userId?: string
  timestamp: string
  entry?: any // LogbookEntry
  entries?: any[] // LogbookEntry[]
  entryId?: string
  piece?: any // RepertoireItem
  pieces?: any[] // RepertoireItem[]
  scoreId?: string
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
    const authenticated = url.searchParams.get('authenticated')
    const email = url.searchParams.get('email')

    // Ensure this request came through authentication
    if (!authenticated || authenticated !== 'true') {
      console.error('WebSocket connection attempt without authentication')
      return new Response('Unauthorized', { status: 401 })
    }

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

    let rawEvent: any
    try {
      rawEvent = JSON.parse(data)
    } catch (error) {
      console.error(`❌ Invalid JSON from ${clientId}:`, data)
      this.sendToClient(clientId, {
        type: 'ERROR',
        error: 'Invalid JSON format',
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Validate the sync event
    const event = validateSyncEvent(rawEvent)
    if (!event) {
      console.error(`❌ Invalid sync event from ${clientId}:`, rawEvent)
      this.sendToClient(clientId, {
        type: 'ERROR',
        error: 'Invalid sync event format',
        timestamp: new Date().toISOString(),
      })
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

      case 'PIECE_ADDED':
      case 'PIECE_UPDATED':
      case 'PIECE_REMOVED':
      case 'PIECE_DISSOCIATED':
        // Broadcast repertoire change to other clients
        await this.handlePieceChange(clientId, event)
        break

      default:
        console.warn(`⚠️ Unknown event type: ${event.type}`)
    }
  }

  private async handleSyncRequest(
    clientId: string,
    event: SyncEvent
  ): Promise<void> {
    const client = this.clients.get(clientId)
    if (!client) return

    console.log(
      `🔄 Sync request from ${clientId}, lastSyncTime: ${event.lastSyncTime}`
    )

    // Fetch recent changes from database
    if (this.env.DB) {
      try {
        const lastSyncTime = event.lastSyncTime
          ? new Date(event.lastSyncTime).getTime()
          : Date.now() - 7 * 24 * 60 * 60 * 1000 // Default to last 7 days

        const results = await this.env.DB.prepare(
          `
          SELECT entity_id, data, updated_at 
          FROM sync_data 
          WHERE user_id = ? 
            AND entity_type = 'logbook_entry'
            AND datetime(updated_at) > datetime(?, 'unixepoch', 'subsec')
            AND deleted_at IS NULL
          ORDER BY updated_at DESC
          LIMIT 100
        `
        )
          .bind(client.userId, lastSyncTime / 1000) // Convert to seconds for SQLite
          .all()

        if (results.results && results.results.length > 0) {
          const entries = results.results
            .map((row: any) => {
              try {
                return JSON.parse(row.data)
              } catch {
                return null
              }
            })
            .filter(Boolean)

          if (entries.length > 0) {
            // Send bulk sync event with recent entries
            this.sendToClient(clientId, {
              type: 'BULK_SYNC',
              entries,
              timestamp: new Date().toISOString(),
            })
            console.log(`📦 Sent ${entries.length} entries to ${clientId}`)
            return
          }
        }
      } catch (error) {
        console.error('Failed to fetch sync data:', error)
      }
    }

    // Fallback response if no data or error
    this.sendToClient(clientId, {
      type: 'SYNC_RESPONSE',
      timestamp: new Date().toISOString(),
      message: 'No new data to sync',
    })
  }

  private async handleEntryChange(
    senderId: string,
    event: SyncEvent
  ): Promise<void> {
    const sender = this.clients.get(senderId)
    if (!sender) return

    // Sanitize entry data if present
    if ('entry' in event && event.entry) {
      const sanitized = sanitizeEntry(event.entry)
      if (!sanitized) {
        console.error(`❌ Failed to sanitize entry from ${senderId}`)
        this.sendToClient(senderId, {
          type: 'ERROR',
          error: 'Invalid entry data',
          timestamp: new Date().toISOString(),
        })
        return
      }
      event.entry = sanitized
    }

    console.log(
      `📤 Broadcasting ${event.type} from ${senderId} to ${this.clients.size - 1} other clients`
    )

    // Save to database for persistence and recovery
    try {
      await this.saveEntryToDatabase(event, sender.userId)
    } catch (error) {
      console.error(`❌ Failed to save entry to database:`, error)
      // Continue broadcasting even if database save fails
    }

    // Broadcast to all other clients of the same user
    for (const [clientId, client] of this.clients) {
      if (clientId !== senderId && client.userId === sender.userId) {
        this.sendToClient(clientId, event)
      }
    }
  }

  private async saveEntryToDatabase(
    event: SyncEvent,
    userId: string
  ): Promise<void> {
    if (!this.env.DB) {
      console.warn('⚠️ Database not configured, skipping persistence')
      return
    }

    try {
      if (event.type === 'ENTRY_CREATED' || event.type === 'ENTRY_UPDATED') {
        const entry = event.entry as any
        if (!entry) return

        // Ensure user_id is set
        if (!entry.user_id) {
          entry.user_id = userId
        }

        // Save to sync_data table
        await this.env.DB.prepare(
          `
          INSERT INTO sync_data (
            id, user_id, entity_type, entity_id, data, 
            checksum, device_id, version, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, entity_type, entity_id) 
          DO UPDATE SET 
            data = excluded.data,
            checksum = excluded.checksum,
            device_id = excluded.device_id,
            updated_at = CURRENT_TIMESTAMP,
            version = sync_data.version + 1
        `
        )
          .bind(
            `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate ID
            userId,
            'logbook_entry',
            entry.id,
            JSON.stringify(entry),
            this.calculateChecksum(entry),
            entry.device_id || 'sync-worker',
            1
          )
          .run()

        console.log(`✅ Saved entry ${entry.id} to database`)
      } else if (event.type === 'ENTRY_DELETED') {
        const entryId = event.entryId
        if (!entryId) return

        // Mark as deleted in sync_data
        await this.env.DB.prepare(
          `
          UPDATE sync_data 
          SET deleted_at = ?
          WHERE user_id = ? AND entity_type = ? AND entity_id = ?
        `
        )
          .bind(new Date().toISOString(), userId, 'logbook_entry', entryId)
          .run()

        console.log(`✅ Marked entry ${entryId} as deleted in database`)
      }
    } catch (error) {
      console.error('Database operation failed:', error)
      throw error
    }
  }

  private calculateChecksum(data: any): string {
    // Simple checksum for now - can be improved
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  private async handlePieceChange(
    senderId: string,
    event: SyncEvent
  ): Promise<void> {
    const sender = this.clients.get(senderId)
    if (!sender) return

    console.log(
      `🎵 Broadcasting ${event.type} from ${senderId} to ${this.clients.size - 1} other clients`
    )

    // Save repertoire changes to database for persistence
    try {
      await this.saveRepertoireToDatabase(event, sender.userId)
    } catch (error) {
      console.error(`❌ Failed to save repertoire change to database:`, error)
      // Continue broadcasting even if database save fails
    }

    // Broadcast to all other clients of the same user
    for (const [clientId, client] of this.clients) {
      if (clientId !== senderId && client.userId === sender.userId) {
        this.sendToClient(clientId, event)
      }
    }
  }

  private async saveRepertoireToDatabase(
    event: SyncEvent,
    userId: string
  ): Promise<void> {
    if (!this.env.DB) {
      console.warn(
        '⚠️ Database not configured, skipping repertoire persistence'
      )
      return
    }

    try {
      const entityType = 'repertoire_item'
      let entityId: string | undefined
      let data: any = {}
      let isDelete = false

      switch (event.type) {
        case 'PIECE_ADDED':
          entityId = event.piece?.scoreId
          data = event.piece
          break
        case 'PIECE_UPDATED':
          entityId = event.piece?.scoreId
          data = event.piece
          break
        case 'PIECE_REMOVED':
        case 'PIECE_DISSOCIATED':
          entityId = event.scoreId || event.piece?.scoreId
          isDelete = true
          break
        default:
          console.warn(`⚠️ Unknown repertoire event type: ${event.type}`)
          return
      }

      if (!entityId) {
        console.error('❌ No entity ID found for repertoire event')
        return
      }

      if (isDelete) {
        // Mark as deleted in sync_data
        await this.env.DB.prepare(
          `
          UPDATE sync_data 
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND entity_type = ? AND entity_id = ?
        `
        )
          .bind(userId, entityType, entityId)
          .run()

        console.log(`✅ Marked repertoire item ${entityId} as deleted`)
      } else {
        // Insert or update repertoire item
        await this.env.DB.prepare(
          `
          INSERT INTO sync_data (
            id, user_id, entity_type, entity_id, data, 
            checksum, device_id, version, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, entity_type, entity_id) 
          DO UPDATE SET 
            data = excluded.data,
            checksum = excluded.checksum,
            device_id = excluded.device_id,
            updated_at = CURRENT_TIMESTAMP,
            version = sync_data.version + 1
        `
        )
          .bind(
            `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            entityType,
            entityId,
            JSON.stringify(data),
            this.calculateChecksum(data),
            data.device_id || 'sync-worker',
            1
          )
          .run()

        console.log(`✅ Saved repertoire item ${entityId} to database`)
      }
    } catch (error) {
      console.error('Repertoire database operation failed:', error)
      throw error
    }
  }

  private sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId)
    if (!client) {
      console.warn(`⚠️ Attempt to send to unknown client: ${clientId}`)
      return
    }

    if (client.websocket.readyState === WebSocket.OPEN) {
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
