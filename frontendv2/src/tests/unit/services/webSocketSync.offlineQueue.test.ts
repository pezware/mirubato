import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSocketSync, type SyncEvent } from '../../../services/webSocketSync'
import { createMockWebSocketFactory } from '../../mocks/webSocketMock'
import type { LogbookEntry } from '../../../api/logbook'

const OFFLINE_KEY = 'mirubato:ws:offlineQueue'

describe('WebSocketSync offline queue persistence', () => {
  let mockFactory: ReturnType<typeof createMockWebSocketFactory>

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockFactory = createMockWebSocketFactory()
  })

  afterEach(() => {
    mockFactory.clear()
  })

  it('persists offline mutation events and flushes after reconnect (across instances)', async () => {
    // Instance A: offline
    const wsA = new WebSocketSync(
      { enableLogging: false, disableReconnect: true },
      mockFactory.factory
    )

    // Queue one mutation event while disconnected
    const event: SyncEvent = {
      type: 'ENTRY_CREATED',
      timestamp: new Date().toISOString(),
      entry: { id: 'entry-1' } as LogbookEntry,
    }
    wsA.send(event)

    // Persisted in localStorage
    const raw = localStorage.getItem(OFFLINE_KEY)
    expect(raw).toBeTruthy()
    const stored = JSON.parse(raw!) as Array<{
      event: SyncEvent
      queuedAt: string
    }>
    expect(stored.length).toBe(1)
    expect(stored[0].event.type).toBe('ENTRY_CREATED')
    expect((stored[0].event.entry as LogbookEntry).id).toBe('entry-1')

    // Simulate reload: Instance B loads persisted queue
    const wsB = new WebSocketSync(
      { enableLogging: false, disableReconnect: true },
      mockFactory.factory
    )

    // Connect and trigger open
    const connectPromise = wsB.connect('user-123', 'token')
    const mockWs = mockFactory.getLastInstance()
    mockWs!.triggerOpen()
    await connectPromise

    // Queue should be flushed; only SYNC_REQUEST + one event
    const sent = mockWs!.getSentMessages()
    expect(sent.some(isSyncRequest)).toBeTruthy()
    const payloads = sent
      .filter(isTypedMessage)
      .filter(m => m.type !== 'SYNC_REQUEST')
    expect(payloads.length).toBe(1)
    expect(payloads[0]).toEqual(event)
  })

  it('deduplicates by type+entity and keeps the latest event', async () => {
    const ws = new WebSocketSync(
      { enableLogging: false, disableReconnect: true },
      mockFactory.factory
    )

    const earlier = new Date(Date.now() - 60_000).toISOString()
    const later = new Date().toISOString()

    const e1: SyncEvent = {
      type: 'ENTRY_UPDATED',
      timestamp: earlier,
      entry: { id: 'same' } as LogbookEntry,
    }
    const e2: SyncEvent = {
      type: 'ENTRY_UPDATED',
      timestamp: later,
      entry: { id: 'same' } as LogbookEntry,
    }

    ws.send(e1)
    ws.send(e2)

    // Only one stored entry, the later one
    const raw = localStorage.getItem(OFFLINE_KEY)
    expect(raw).toBeTruthy()
    const stored = JSON.parse(raw!) as Array<{
      event: SyncEvent
      queuedAt: string
    }>
    expect(stored.length).toBe(1)
    expect(stored[0].event.timestamp).toBe(later)

    // Connect and ensure only one update is sent
    const connectPromise = ws.connect('user-123', 'token')
    const mockWs = mockFactory.getLastInstance()
    mockWs!.triggerOpen()
    await connectPromise

    const sent = mockWs!.getSentMessages()
    const updates = sent
      .filter(isTypedMessage)
      .filter(m => m.type === 'ENTRY_UPDATED')
    expect(updates.length).toBe(1)
    const firstUpdate = updates[0]
    if (!hasEntryId(firstUpdate)) throw new Error('Unexpected message shape')
    expect(firstUpdate.entry.id).toBe('same')
  })

  it('does not persist non-mutation events', () => {
    const ws = new WebSocketSync(
      { enableLogging: false, disableReconnect: true },
      mockFactory.factory
    )

    const nonMutation: SyncEvent = {
      type: 'CONFLICT_DETECTED',
      timestamp: new Date().toISOString(),
    }
    ws.send(nonMutation)

    expect(ws.getOfflineQueueSize()).toBe(0)
    expect(localStorage.getItem(OFFLINE_KEY)).toBeNull()
  })

  it('prunes very old events via TTL on load', async () => {
    // Seed storage with an ancient event
    const ancient: SyncEvent = {
      type: 'ENTRY_CREATED',
      timestamp: '1970-01-01T00:00:00.000Z',
      entry: { id: 'ancient' } as LogbookEntry,
    }
    localStorage.setItem(
      OFFLINE_KEY,
      JSON.stringify([{ event: ancient, queuedAt: new Date().toISOString() }])
    )

    const ws = new WebSocketSync(
      { enableLogging: false, disableReconnect: true },
      mockFactory.factory
    )

    // Connect and open; TTL-pruned queue should send only SYNC_REQUEST
    const connectPromise = ws.connect('user-123', 'token')
    const mockWs = mockFactory.getLastInstance()
    mockWs!.triggerOpen()
    await connectPromise

    const sent = mockWs!.getSentMessages()
    const nonSyncMessages = sent
      .filter(isTypedMessage)
      .filter(m => m.type !== 'SYNC_REQUEST')
    expect(nonSyncMessages.length).toBe(0)
    expect(ws.getOfflineQueueSize()).toBe(0)
  })
})

// Type guards for test introspection on WebSocket messages
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

function isTypedMessage(x: unknown): x is { type: string } {
  if (!isRecord(x)) return false
  return typeof x['type'] === 'string'
}

function isSyncRequest(x: unknown): boolean {
  return isTypedMessage(x) && x.type === 'SYNC_REQUEST'
}

function hasEntryId(x: unknown): x is { entry: { id: string } } {
  if (!isRecord(x)) return false
  const entry = x['entry']
  if (!isRecord(entry)) return false
  return typeof entry['id'] === 'string'
}
