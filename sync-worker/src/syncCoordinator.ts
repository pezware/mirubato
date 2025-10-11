/**
 * SyncCoordinator Durable Object
 * Handles real-time synchronization for practice log entries and repertoire pieces
 */

import {
  validateSyncEvent,
  sanitizeEntry,
  sanitizeRepertoireItem,
  ResponseEventSchema,
  type LogbookEntrySchema,
  type RepertoireItemSchema,
} from './schemas'
import { z } from 'zod'

const BULK_SYNC_CHUNK_SIZE = 250

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
  lastSeq?: number
  seq?: number
  message?: string
  error?: string
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

  private async getNextSequence(): Promise<number> {
    if (!this.env.DB) {
      throw new Error('Database not configured for sequence generation')
    }

    const updated = await this.env.DB.prepare(
      `
      UPDATE sync_sequence
      SET current_value = current_value + 1
      WHERE id = 1
      RETURNING current_value
    `
    ).first<{ current_value: number }>()

    if (updated && typeof updated.current_value === 'number') {
      return updated.current_value
    }

    const initialized = await this.env.DB.prepare(
      `
      INSERT INTO sync_sequence (id, current_value)
      VALUES (1, 1)
      ON CONFLICT(id) DO UPDATE SET current_value = current_value + 1
      RETURNING current_value
    `
    ).first<{ current_value: number }>()

    if (!initialized || typeof initialized.current_value !== 'number') {
      throw new Error('Failed to allocate sync sequence value')
    }

    return initialized.current_value
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

    const requestedLastSeq =
      typeof event.lastSeq === 'number' && event.lastSeq >= 0
        ? event.lastSeq
        : 0

    console.log(
      `🔄 Sync request from ${clientId}, lastSeq: ${requestedLastSeq}, lastSyncTime: ${event.lastSyncTime}`
    )

    // Determine baseline time safely (guard against invalid or future client clocks)
    let lastSyncTime = Date.now() - 7 * 24 * 60 * 60 * 1000 // Default to last 7 days
    if (event.lastSyncTime) {
      const parsed = Date.parse(event.lastSyncTime)
      if (Number.isFinite(parsed) && parsed <= Date.now()) {
        lastSyncTime = parsed
      }
    }

    // Fetch recent changes from database
    if (this.env.DB) {
      try {
        const { count: entriesSent, lastSeq: entrySeq } =
          await this.streamSyncData<
          z.infer<typeof LogbookEntrySchema>
        >({
          clientId,
          userId: client.userId,
          entityType: 'logbook_entry',
          eventType: 'BULK_SYNC',
          lastSeq: requestedLastSeq,
          fallbackSeconds: lastSyncTime / 1000,
          rowParser: row => {
            try {
              const parsed = JSON.parse(row.data)
              return sanitizeEntry(parsed)
            } catch (error) {
              console.error('Failed to parse logbook entry row:', error)
              return null
            }
          },
        })

        const { count: piecesSent, lastSeq: pieceSeq } =
          await this.streamSyncData<
          z.infer<typeof RepertoireItemSchema>
        >({
          clientId,
          userId: client.userId,
          entityType: 'repertoire_item',
          eventType: 'REPERTOIRE_BULK_SYNC',
          lastSeq: Math.max(requestedLastSeq, entrySeq),
          fallbackSeconds: lastSyncTime / 1000,
          rowParser: row => {
            try {
              const parsed = JSON.parse(row.data)
              return sanitizeRepertoireItem(parsed)
            } catch (error) {
              console.error('Failed to parse repertoire row:', error)
              return null
            }
          },
        })

        const highestSeq = Math.max(requestedLastSeq, entrySeq, pieceSeq)

        this.sendToClient(clientId, {
          type: 'SYNC_RESPONSE',
          timestamp: new Date().toISOString(),
          message:
            entriesSent === 0 && piecesSent === 0
              ? 'No new data to sync'
              : 'Sync complete',
          lastSeq: highestSeq,
        })
      } catch (error) {
        console.error('Failed to fetch sync data:', error)
        // Fallback response on error
        this.sendToClient(clientId, {
          type: 'SYNC_RESPONSE',
          timestamp: new Date().toISOString(),
          message: 'Error fetching sync data',
          lastSeq: requestedLastSeq,
        })
      }
    } else {
      // Fallback response if no database
      this.sendToClient(clientId, {
        type: 'SYNC_RESPONSE',
        timestamp: new Date().toISOString(),
        message: 'Sync not available',
        lastSeq: requestedLastSeq,
      })
    }
  }

  private async streamSyncData<T>(options: {
    clientId: string
    userId: string
    entityType: 'logbook_entry' | 'repertoire_item'
    eventType: 'BULK_SYNC' | 'REPERTOIRE_BULK_SYNC'
    lastSeq: number
    fallbackSeconds: number
    rowParser: (row: any) => T | null
  }): Promise<{ count: number; lastSeq: number }> {
    if (!this.env.DB) {
      return { count: 0, lastSeq: options.lastSeq }
    }

    const {
      clientId,
      userId,
      entityType,
      eventType,
      lastSeq,
      fallbackSeconds,
      rowParser,
    } = options

    let cursorSeq = Math.max(0, lastSeq)
    let totalSent = 0
    let chunkIndex = 0
    let highestSeq = cursorSeq
    let usedFallback = false

    while (true) {
      const query = await this.env.DB.prepare(
        `
        SELECT entity_id, data, seq
        FROM sync_data
        WHERE user_id = ?
          AND entity_type = ?
          AND deleted_at IS NULL
          AND seq > ?
        ORDER BY seq ASC
        LIMIT ?
      `
      )
        .bind(userId, entityType, cursorSeq, BULK_SYNC_CHUNK_SIZE)
        .all()

      let rows = (query.results as Array<any>) || []

      if (rows.length === 0 && !usedFallback && cursorSeq === lastSeq) {
        usedFallback = true
        const fallbackQuery = await this.env.DB.prepare(
          `
          SELECT entity_id, data, seq
          FROM sync_data
          WHERE user_id = ?
            AND entity_type = ?
            AND deleted_at IS NULL
            AND datetime(updated_at) > datetime(?, 'unixepoch', 'subsec')
          ORDER BY datetime(updated_at) ASC, entity_id ASC
          LIMIT ?
        `
        )
          .bind(userId, entityType, fallbackSeconds, BULK_SYNC_CHUNK_SIZE)
          .all()

        rows = (fallbackQuery.results as Array<any>) || []
      }

      if (rows.length === 0) {
        break
      }

      const payload: T[] = []
      let chunkMaxSeq = cursorSeq

      for (const row of rows) {
        const parsed = rowParser(row)
        if (!parsed) continue

        const rowSeq =
          typeof row.seq === 'number' && Number.isFinite(row.seq)
            ? row.seq
            : null
        if (rowSeq !== null) {
          chunkMaxSeq = Math.max(chunkMaxSeq, rowSeq)
        }

        payload.push(parsed)
      }

      if (payload.length > 0) {
        const timestamp = new Date().toISOString()
        if (eventType === 'BULK_SYNC') {
          this.sendToClient(clientId, {
            type: 'BULK_SYNC',
            entries: payload,
            timestamp,
            lastSeq: chunkMaxSeq,
          })
          console.log(
            `📦 Sent ${payload.length} entries (chunk ${chunkIndex}) to ${clientId} (seq ≤ ${chunkMaxSeq})`
          )
        } else {
          this.sendToClient(clientId, {
            type: 'REPERTOIRE_BULK_SYNC',
            pieces: payload,
            timestamp,
            lastSeq: chunkMaxSeq,
          })
          console.log(
            `🎵 Sent ${payload.length} repertoire pieces (chunk ${chunkIndex}) to ${clientId} (seq ≤ ${chunkMaxSeq})`
          )
        }

        totalSent += payload.length
        highestSeq = Math.max(highestSeq, chunkMaxSeq)
      }

      if (chunkMaxSeq === cursorSeq) {
        console.warn(
          `⚠️ Sync chunk did not advance sequence cursor for ${entityType}; stopping to avoid loop`
        )
        break
      }

      cursorSeq = chunkMaxSeq
      chunkIndex += 1

      if (rows.length < BULK_SYNC_CHUNK_SIZE) {
        break
      }
    }

    return { count: totalSent, lastSeq: highestSeq }
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

    let sequence: number | null = null
    // Save to database for persistence and recovery
    try {
      sequence = await this.saveEntryToDatabase(event, sender.userId)
    } catch (error) {
      console.error(`❌ Failed to save entry to database:`, error)
      // Continue broadcasting even if database save fails
    }

    // Normalize event timestamp to server time to avoid client clock skew issues
    try {
      event.timestamp = new Date().toISOString()
    } catch {
      // best-effort only
    }

    if (typeof sequence === 'number') {
      event.seq = sequence
      this.sendToClient(senderId, {
        type: 'SYNC_RESPONSE',
        timestamp: new Date().toISOString(),
        message: 'Mutation applied',
        lastSeq: sequence,
      })
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
  ): Promise<number | null> {
    if (!this.env.DB) {
      console.warn('⚠️ Database not configured, skipping persistence')
      return null
    }

    try {
      if (event.type === 'ENTRY_CREATED' || event.type === 'ENTRY_UPDATED') {
        const entry = event.entry as any
        if (!entry) return null

        // Ensure user_id is set
        if (!entry.user_id) {
          entry.user_id = userId
        }

        const seq = await this.getNextSequence()
        // Save to sync_data table
        await this.env.DB.prepare(
          `
          INSERT INTO sync_data (
            id, user_id, entity_type, entity_id, data,
            checksum, device_id, version, updated_at, seq
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
          ON CONFLICT (user_id, entity_type, entity_id) 
          DO UPDATE SET 
            data = excluded.data,
            checksum = excluded.checksum,
            device_id = excluded.device_id,
            updated_at = CURRENT_TIMESTAMP,
            version = sync_data.version + 1,
            seq = excluded.seq
        `
        )
          .bind(
            `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate ID
            userId,
            'logbook_entry',
            entry.id,
            JSON.stringify(entry),
            await this.calculateChecksum(entry),
            entry.device_id || 'sync-worker',
            1,
            seq
          )
          .run()

        console.log(`✅ Saved entry ${entry.id} to database`)

        // Update sync_metadata
        await this.updateSyncMetadata(userId, seq)
        return seq
      } else if (event.type === 'ENTRY_DELETED') {
        const entryId = event.entryId
        if (!entryId) return null

        const seq = await this.getNextSequence()

        // Mark as deleted in sync_data
        await this.env.DB.prepare(
          `
          UPDATE sync_data 
          SET deleted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP,
              seq = ?
          WHERE user_id = ? AND entity_type = ? AND entity_id = ?
        `
        )
          .bind(seq, userId, 'logbook_entry', entryId)
          .run()

        console.log(`✅ Marked entry ${entryId} as deleted in database`)

        // Update sync_metadata
        await this.updateSyncMetadata(userId, seq)
        return seq
      }
    } catch (error) {
      console.error('Database operation failed:', error)
      throw error
    }

    return null
  }

  private async calculateChecksum(data: any): Promise<string> {
    // Sort object keys to ensure consistent checksums regardless of key order
    const sortObject = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj.map(sortObject)

      const sorted: Record<string, unknown> = {}
      Object.keys(obj)
        .sort()
        .forEach(key => {
          sorted[key] = sortObject((obj as Record<string, unknown>)[key])
        })
      return sorted
    }

    const sortedData = sortObject(data)
    const jsonString = JSON.stringify(sortedData)
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(jsonString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async handlePieceChange(
    senderId: string,
    event: SyncEvent
  ): Promise<void> {
    const sender = this.clients.get(senderId)
    if (!sender) return

    // Sanitize piece data if present
    if ('piece' in event && event.piece) {
      const sanitized = sanitizeRepertoireItem(event.piece)
      if (!sanitized) {
        console.error(`❌ Failed to sanitize repertoire item from ${senderId}`)
        this.sendToClient(senderId, {
          type: 'ERROR',
          error: 'Invalid repertoire data',
          timestamp: new Date().toISOString(),
        })
        return
      }
      event.piece = sanitized
    }

    console.log(
      `🎵 Broadcasting ${event.type} from ${senderId} to ${this.clients.size - 1} other clients`
    )

    let sequence: number | null = null
    // Save repertoire changes to database for persistence
    try {
      sequence = await this.saveRepertoireToDatabase(event, sender.userId)
    } catch (error) {
      console.error(`❌ Failed to save repertoire change to database:`, error)
      // Continue broadcasting even if database save fails
    }

    // Normalize event timestamp to server time to avoid client clock skew issues
    try {
      event.timestamp = new Date().toISOString()
    } catch {
      // best-effort only
    }

    if (typeof sequence === 'number') {
      event.seq = sequence
      this.sendToClient(senderId, {
        type: 'SYNC_RESPONSE',
        timestamp: new Date().toISOString(),
        message: 'Mutation applied',
        lastSeq: sequence,
      })
    }

    // Broadcast to all other clients of the same user
    for (const [clientId, client] of this.clients) {
      if (clientId !== senderId && client.userId === sender.userId) {
        this.sendToClient(clientId, event)
      }
    }
  }

  private async updateSyncMetadata(
    userId: string,
    lastSeq?: number
  ): Promise<void> {
    if (!this.env.DB) return

    try {
      // Count connected devices for this user
      let deviceCount = 0
      for (const client of this.clients.values()) {
        if (client.userId === userId) {
          deviceCount++
        }
      }

      // Generate sync token based on current timestamp
      const syncToken =
        typeof lastSeq === 'number'
          ? `seq_${lastSeq}`
          : `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Update sync_metadata table
      await this.env.DB.prepare(
        `
        INSERT INTO sync_metadata (user_id, last_sync_token, last_sync_time, device_count)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET
          last_sync_token = excluded.last_sync_token,
          last_sync_time = CURRENT_TIMESTAMP,
          device_count = excluded.device_count
        `
      )
        .bind(userId, syncToken, deviceCount)
        .run()

      console.log(`📝 Updated sync_metadata for user ${userId}`)
    } catch (error) {
      console.error('Failed to update sync_metadata:', error)
      // Non-critical error, don't throw
    }
  }

  private async saveRepertoireToDatabase(
    event: SyncEvent,
    userId: string
  ): Promise<number | null> {
    if (!this.env.DB) {
      console.warn(
        '⚠️ Database not configured, skipping repertoire persistence'
      )
      return null
    }

    try {
      const entityType = 'repertoire_item'
      let entityId: string | undefined
      let data: any = {}
      let isDelete = false

      switch (event.type) {
        case 'PIECE_ADDED':
          // Check both scoreId and score_id, fallback to id
          entityId =
            event.piece?.scoreId || event.piece?.score_id || event.piece?.id
          data = event.piece
          break
        case 'PIECE_UPDATED':
          // Check both scoreId and score_id, fallback to id
          entityId =
            event.piece?.scoreId || event.piece?.score_id || event.piece?.id
          data = event.piece
          break
        case 'PIECE_REMOVED':
        case 'PIECE_DISSOCIATED':
          // Check all possible ID fields
          entityId =
            event.scoreId ||
            event.piece?.scoreId ||
            event.piece?.score_id ||
            event.piece?.id
          isDelete = true
          break
        default:
          console.warn(`⚠️ Unknown repertoire event type: ${event.type}`)
          return
      }

      if (!entityId) {
        console.error('❌ No entity ID found for repertoire event')
        return null
      }

      if (isDelete) {
        const seq = await this.getNextSequence()
        // Mark as deleted in sync_data
        await this.env.DB.prepare(
          `
          UPDATE sync_data 
          SET deleted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP,
              seq = ?
          WHERE user_id = ? AND entity_type = ? AND entity_id = ?
        `
        )
          .bind(seq, userId, entityType, entityId)
          .run()

        console.log(`✅ Marked repertoire item ${entityId} as deleted`)

        await this.updateSyncMetadata(userId, seq)
        return seq
      } else {
        const seq = await this.getNextSequence()
        // Insert or update repertoire item
        await this.env.DB.prepare(
          `
          INSERT INTO sync_data (
            id, user_id, entity_type, entity_id, data, 
            checksum, device_id, version, updated_at, seq
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
          ON CONFLICT (user_id, entity_type, entity_id) 
          DO UPDATE SET 
            data = excluded.data,
            checksum = excluded.checksum,
            device_id = excluded.device_id,
            updated_at = CURRENT_TIMESTAMP,
            version = sync_data.version + 1,
            seq = excluded.seq
        `
        )
          .bind(
            `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            entityType,
            entityId,
            JSON.stringify(data),
            await this.calculateChecksum(data),
            data.device_id || 'sync-worker',
            1,
            seq
          )
          .run()

        console.log(`✅ Saved repertoire item ${entityId} to database`)

        // Update sync_metadata
        await this.updateSyncMetadata(userId, seq)
        return seq
      }
    } catch (error) {
      console.error('Repertoire database operation failed:', error)
      throw error
    }

    return null
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
