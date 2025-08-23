import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSocketSync, type SyncEvent } from '../../../services/webSocketSync'
import { createMockWebSocketFactory } from '../../mocks/webSocketMock'
import type { LogbookEntry } from '../../../api/logbook'

describe('WebSocketSync', () => {
  let webSocketSync: WebSocketSync
  let mockFactory: ReturnType<typeof createMockWebSocketFactory>

  beforeEach(() => {
    // Clear and reset localStorage mock
    localStorage.clear()
    vi.clearAllMocks() // Clear mock call history

    // Create mock factory
    mockFactory = createMockWebSocketFactory()

    // Create new instance with mock factory and shorter intervals for testing
    webSocketSync = new WebSocketSync(
      {
        maxReconnectAttempts: 3,
        reconnectInterval: 50,
        heartbeatInterval: 100,
        enableLogging: false,
        disableReconnect: true, // Disable by default for tests
      },
      mockFactory.factory
    )
  })

  afterEach(() => {
    // Disconnect and cleanup
    if (webSocketSync) {
      webSocketSync.disconnect()
    }
    // Clear mock instances
    mockFactory.clear()
    // Clear all timers
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should connect successfully with valid credentials', async () => {
      const userId = 'test-user-123'
      const authToken = 'valid-token'

      // Start connection
      const connectPromise = webSocketSync.connect(userId, authToken)

      // Get the mock and trigger open
      const mockWs = mockFactory.getLastInstance()
      expect(mockWs).toBeDefined()
      mockWs!.triggerOpen()

      // Wait for connection to complete
      const result = await connectPromise

      expect(result).toBe(true)
      expect(webSocketSync.getConnectionStatus()).toBe('connected')
    })

    it('should handle connection failure', async () => {
      const userId = 'test-user-123'
      const authToken = 'valid-token'

      // Start connection
      const connectPromise = webSocketSync.connect(userId, authToken)

      // Get the mock and trigger error then close
      const mockWs = mockFactory.getLastInstance()
      expect(mockWs).toBeDefined()
      mockWs!.triggerError('Connection failed')
      mockWs!.triggerClose(1006, 'Connection failed')

      // Wait for connection to complete
      const result = await connectPromise

      expect(result).toBe(false)
      expect(webSocketSync.getConnectionStatus()).toBe('disconnected')
    })

    it('should disconnect cleanly', async () => {
      const userId = 'test-user-123'
      const authToken = 'valid-token'

      // Connect first
      const connectPromise = webSocketSync.connect(userId, authToken)
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      expect(webSocketSync.getConnectionStatus()).toBe('connected')

      // Now disconnect
      webSocketSync.disconnect()
      expect(webSocketSync.getConnectionStatus()).toBe('disconnected')
    })

    it('should construct correct WebSocket URL for different environments', () => {
      // Test development environment
      process.env.NODE_ENV = 'development'
      const devSync = new WebSocketSync({}, mockFactory.factory)
      const devUrl = (
        devSync as unknown as { getWebSocketUrl: () => string }
      ).getWebSocketUrl()
      expect(devUrl).toBe('ws://localhost:8787')

      // Test production environment
      process.env.NODE_ENV = 'production'
      Object.defineProperty(window, 'location', {
        value: { host: 'mirubato.com' },
        writable: true,
      })
      const prodSync = new WebSocketSync({}, mockFactory.factory)
      const prodUrl = (
        prodSync as unknown as { getWebSocketUrl: () => string }
      ).getWebSocketUrl()
      expect(prodUrl).toBe('wss://sync.mirubato.com')
    })
  })

  describe('Event Handling', () => {
    it('should register and trigger event handlers', async () => {
      const handler = vi.fn()

      webSocketSync.on('ENTRY_CREATED', handler)

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Simulate receiving a message
      const event: SyncEvent = {
        type: 'ENTRY_CREATED',
        timestamp: new Date().toISOString(),
        entry: { id: 'entry-1', title: 'Test Entry' } as LogbookEntry,
      }
      mockWs!.triggerMessage(JSON.stringify(event))

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('should remove event handlers', async () => {
      const handler = vi.fn()

      webSocketSync.on('ENTRY_UPDATED', handler)
      webSocketSync.off('ENTRY_UPDATED', handler)

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Simulate receiving a message
      const event: SyncEvent = {
        type: 'ENTRY_UPDATED',
        timestamp: new Date().toISOString(),
        entry: { id: 'entry-1', title: 'Updated Entry' } as LogbookEntry,
      }
      mockWs!.triggerMessage(JSON.stringify(event))

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle wildcard event handlers', async () => {
      const handler = vi.fn()

      webSocketSync.on('*', handler)

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Simulate different event types
      const event1: SyncEvent = {
        type: 'ENTRY_CREATED',
        timestamp: new Date().toISOString(),
      }
      const event2: SyncEvent = {
        type: 'ENTRY_DELETED',
        timestamp: new Date().toISOString(),
        entryId: 'entry-1',
      }

      mockWs!.triggerMessage(JSON.stringify(event1))
      mockWs!.triggerMessage(JSON.stringify(event2))

      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenCalledWith(event1)
      expect(handler).toHaveBeenCalledWith(event2)
    })
  })

  describe('Message Sending', () => {
    it('should send messages when connected', async () => {
      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      const sendSpy = vi.spyOn(mockWs!, 'send')

      const event: SyncEvent = {
        type: 'ENTRY_CREATED',
        timestamp: new Date().toISOString(),
        entry: { id: 'entry-1' } as LogbookEntry,
      }

      webSocketSync.send(event)

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(event))
    })

    it('should queue messages when disconnected', () => {
      const event: SyncEvent = {
        type: 'ENTRY_CREATED',
        timestamp: new Date().toISOString(),
        entry: { id: 'entry-1' } as LogbookEntry,
      }

      webSocketSync.send(event)

      expect(webSocketSync.getOfflineQueueSize()).toBe(1)
    })

    it('should flush offline queue on reconnection', async () => {
      // Queue messages while offline
      const event1: SyncEvent = {
        type: 'ENTRY_CREATED',
        timestamp: new Date().toISOString(),
        entry: { id: 'entry-1' } as LogbookEntry,
      }
      const event2: SyncEvent = {
        type: 'ENTRY_UPDATED',
        timestamp: new Date().toISOString(),
        entry: { id: 'entry-2' } as LogbookEntry,
      }

      webSocketSync.send(event1)
      webSocketSync.send(event2)
      expect(webSocketSync.getOfflineQueueSize()).toBe(2)

      // Connect and trigger open
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Queue should be flushed immediately after connection
      expect(webSocketSync.getOfflineQueueSize()).toBe(0)

      // Check that messages were sent
      const sentMessages = mockWs!.getSentMessages()
      // Should have SYNC_REQUEST plus the two queued events
      expect(sentMessages.length).toBe(3)
      expect(sentMessages[0].type).toBe('SYNC_REQUEST')
      expect(sentMessages[1]).toEqual(event1)
      expect(sentMessages[2]).toEqual(event2)
    })
  })

  describe('Reconnection Logic', () => {
    it('should attempt to reconnect on disconnection', async () => {
      // Create instance with reconnection enabled
      webSocketSync = new WebSocketSync(
        {
          maxReconnectAttempts: 3,
          reconnectInterval: 50,
          heartbeatInterval: 1000,
          enableLogging: false,
          disableReconnect: false, // Enable reconnection for this test
        },
        mockFactory.factory
      )

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Track reconnect attempts before disconnection
      const initialAttempts = (
        webSocketSync as unknown as {
          reconnectAttempts: number
          heartbeatTimer: NodeJS.Timeout | null
        }
      ).reconnectAttempts
      expect(initialAttempts).toBe(0)

      // Simulate unexpected disconnection
      mockWs!.triggerClose(1006, 'Connection lost')

      // Wait for reconnection to be scheduled
      await new Promise(resolve => setTimeout(resolve, 60))

      // Should be attempting to reconnect
      expect(
        (
          webSocketSync as unknown as {
            reconnectAttempts: number
            heartbeatTimer: NodeJS.Timeout | null
          }
        ).reconnectAttempts
      ).toBeGreaterThan(initialAttempts)
    })

    it('should use exponential backoff for reconnection', async () => {
      // Create instance with reconnection enabled
      webSocketSync = new WebSocketSync(
        {
          maxReconnectAttempts: 3,
          reconnectInterval: 50,
          enableLogging: false,
          disableReconnect: false, // Enable reconnection
        },
        mockFactory.factory
      )

      // Connect initially
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Simulate disconnection
      mockWs!.triggerClose(1006, 'Connection lost')

      // Wait for first attempt (50ms)
      await new Promise(resolve => setTimeout(resolve, 60))
      expect(
        (
          webSocketSync as unknown as {
            reconnectAttempts: number
            heartbeatTimer: NodeJS.Timeout | null
          }
        ).reconnectAttempts
      ).toBe(1)

      // Get new mock (second instance) and fail it
      const secondMockWs = mockFactory.getInstance(1)
      if (secondMockWs) {
        secondMockWs.triggerError('Connection failed')
        secondMockWs.triggerClose(1006, 'Connection failed')
      }

      // Wait for second attempt (should be 100ms later due to exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 110))
      expect(
        (
          webSocketSync as unknown as {
            reconnectAttempts: number
            heartbeatTimer: NodeJS.Timeout | null
          }
        ).reconnectAttempts
      ).toBe(2)
    })

    it('should stop reconnecting after max attempts', async () => {
      // Create instance with 2 max attempts
      webSocketSync = new WebSocketSync(
        {
          maxReconnectAttempts: 2,
          reconnectInterval: 50,
          enableLogging: false,
          disableReconnect: false, // Enable reconnection
        },
        mockFactory.factory
      )

      // Start connection and fail it immediately
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerError('Connection failed')
      mockWs!.triggerClose(1006, 'Connection failed')
      await connectPromise.catch(() => {}) // Ignore connection error

      // Wait for all reconnection attempts to complete
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(
        (
          webSocketSync as unknown as {
            reconnectAttempts: number
            heartbeatTimer: NodeJS.Timeout | null
          }
        ).reconnectAttempts
      ).toBeLessThanOrEqual(2)
    })
  })

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeat pings', async () => {
      // Create instance with short heartbeat for testing
      webSocketSync = new WebSocketSync(
        {
          maxReconnectAttempts: 3,
          reconnectInterval: 100,
          heartbeatInterval: 100, // Short interval for testing
          enableLogging: false,
          disableReconnect: true,
        },
        mockFactory.factory
      )

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      const sendSpy = vi.spyOn(mockWs!, 'send')

      // Clear initial SYNC_REQUEST call
      sendSpy.mockClear()

      // Wait for heartbeat to trigger
      await new Promise(resolve => setTimeout(resolve, 150))

      // Check if PING was sent
      const calls = sendSpy.mock.calls
      const pingCall = calls.find(call => {
        try {
          const data = JSON.parse(call[0] as string)
          return data.type === 'PING'
        } catch {
          return false
        }
      })

      expect(pingCall).toBeDefined()
    })

    it('should stop heartbeat on disconnection', async () => {
      // Create instance with short heartbeat for testing
      webSocketSync = new WebSocketSync(
        {
          maxReconnectAttempts: 3,
          reconnectInterval: 100,
          heartbeatInterval: 100, // Short interval for testing
          enableLogging: false,
          disableReconnect: true,
        },
        mockFactory.factory
      )

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Wait for at least one heartbeat
      await new Promise(resolve => setTimeout(resolve, 150))

      // Now disconnect and verify heartbeat timer is cleared
      webSocketSync.disconnect()

      // Heartbeat timer should be cleared
      expect(
        (
          webSocketSync as unknown as {
            reconnectAttempts: number
            heartbeatTimer: NodeJS.Timeout | null
          }
        ).heartbeatTimer
      ).toBeNull()
    })
  })

  describe('Sync State Management', () => {
    it('should update last sync time from incoming events', async () => {
      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      const timestamp = new Date().toISOString()
      const event: SyncEvent = {
        type: 'ENTRY_CREATED',
        timestamp,
        entry: { id: 'entry-1' } as LogbookEntry,
      }

      mockWs!.triggerMessage(JSON.stringify(event))

      const storedTime = localStorage.getItem('mirubato:lastSyncTime')
      expect(storedTime).toBe(timestamp)
    })

    it('should send SYNC_REQUEST on connection', async () => {
      const lastSyncTime = new Date(Date.now() - 3600000).toISOString()
      localStorage.setItem('mirubato:lastSyncTime', lastSyncTime)

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      const messages = mockWs!.getSentMessages()
      const syncRequest = messages.find(msg => msg.type === 'SYNC_REQUEST')

      expect(syncRequest).toBeDefined()
      expect(syncRequest.lastSyncTime).toBe(lastSyncTime)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', async () => {
      const errorHandler = vi.fn()
      webSocketSync.on('ERROR', errorHandler)

      // Connect
      const connectPromise = webSocketSync.connect('user-123', 'token')
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerOpen()
      await connectPromise

      // Send malformed JSON
      mockWs!.triggerMessage('{ invalid json }')

      // Should not crash and continue working
      const validEvent: SyncEvent = {
        type: 'ENTRY_CREATED',
        timestamp: new Date().toISOString(),
      }
      mockWs!.triggerMessage(JSON.stringify(validEvent))

      // Valid event should still be processed
      const handler = vi.fn()
      webSocketSync.on('ENTRY_CREATED', handler)
      mockWs!.triggerMessage(JSON.stringify(validEvent))
      expect(handler).toHaveBeenCalled()
    })

    it('should handle connection errors', async () => {
      const userId = 'test-user-123'
      const authToken = 'valid-token'

      // Start connection
      const connectPromise = webSocketSync.connect(userId, authToken)

      // Get the mock and trigger error
      const mockWs = mockFactory.getLastInstance()
      mockWs!.triggerError('Connection failed')
      mockWs!.triggerClose(1006, 'Connection failed')

      const result = await connectPromise
      expect(result).toBe(false)
    })
  })
})
