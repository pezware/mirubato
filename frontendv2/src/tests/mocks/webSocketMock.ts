import { vi } from 'vitest'

export type WebSocketMockOptions = {
  autoConnect?: boolean
  connectionDelay?: number
  shouldFail?: boolean
  failureMessage?: string
}

/**
 * Controllable WebSocket mock for deterministic testing
 * Tests explicitly control when events fire, eliminating timing issues
 */
export class WebSocketMock implements WebSocket {
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3

  url: string
  readyState: number = this.CONNECTING
  bufferedAmount = 0
  extensions = ''
  protocol = ''
  binaryType: BinaryType = 'blob'

  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  private eventListeners = new Map<string, Set<EventListener>>()
  private messageQueue: string[] = []

  constructor(url: string, _protocols?: string | string[]) {
    this.url = url
  }

  // Control methods for tests to explicitly trigger events
  triggerOpen(): void {
    if (this.readyState !== this.CONNECTING) {
      throw new Error('WebSocket must be in CONNECTING state to open')
    }
    this.readyState = this.OPEN
    const event = new Event('open')
    this.dispatchEvent(event)
    if (this.onopen) this.onopen(event)
  }

  triggerError(message?: string): void {
    const error = new Event('error')
    Object.defineProperty(error, 'message', {
      value: message || 'WebSocket error',
    })
    this.dispatchEvent(error)
    if (this.onerror) this.onerror(error)
  }

  triggerClose(code = 1000, reason = 'Normal closure'): void {
    if (this.readyState === this.CLOSED) {
      return
    }
    this.readyState = this.CLOSED
    const event = new CloseEvent('close', { code, reason })
    this.dispatchEvent(event)
    if (this.onclose) this.onclose(event)
  }

  triggerMessage(data: unknown): void {
    if (this.readyState !== this.OPEN) {
      throw new Error('WebSocket must be open to receive messages')
    }
    const event = new MessageEvent('message', {
      data: typeof data === 'string' ? data : JSON.stringify(data),
    })
    this.dispatchEvent(event)
    if (this.onmessage) this.onmessage(event)
  }

  // Standard WebSocket methods
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== this.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.messageQueue.push(data.toString())
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === this.CLOSED || this.readyState === this.CLOSING) {
      return
    }
    this.readyState = this.CLOSING
    // In real WebSocket, close event is async, but for tests we make it synchronous
    this.triggerClose(code, reason)
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach(listener => listener(event))
    }
    return true
  }

  // Test helper methods
  getMessageQueue(): string[] {
    return [...this.messageQueue]
  }

  clearMessageQueue(): void {
    this.messageQueue = []
  }

  getSentMessages(): unknown[] {
    return this.messageQueue.map(msg => {
      try {
        return JSON.parse(msg)
      } catch {
        return msg
      }
    })
  }
}

// Track all WebSocket mock instances
const mockInstances: WebSocketMock[] = []

// Helper to install WebSocket mock globally
export function installWebSocketMock() {
  const originalWebSocket = global.WebSocket

  // Clear any previous instances
  mockInstances.length = 0

  global.WebSocket = vi.fn((url: string, protocols?: string | string[]) => {
    const instance = new WebSocketMock(url, protocols)
    mockInstances.push(instance)
    return instance
  }) as unknown as typeof WebSocket

  return () => {
    global.WebSocket = originalWebSocket
    mockInstances.length = 0
  }
}

// Helper to get mock instances for test control
export function getMockWebSocket(): WebSocketMock | null {
  return mockInstances[mockInstances.length - 1] || null
}

export function getAllMockWebSockets(): WebSocketMock[] {
  return [...mockInstances]
}

export function getMockWebSocketByIndex(index: number): WebSocketMock | null {
  return mockInstances[index] || null
}

// Create a mock factory that returns controllable WebSocket instances
export function createMockWebSocketFactory() {
  const instances: WebSocketMock[] = []

  const factory = vi.fn((url: string) => {
    const instance = new WebSocketMock(url)
    instances.push(instance)
    return instance as unknown as WebSocket
  })

  return {
    factory,
    getLastInstance: () => instances[instances.length - 1] || null,
    getAllInstances: () => [...instances],
    getInstance: (index: number) => instances[index] || null,
    clear: () => (instances.length = 0),
  }
}

// Helper to create a mock WebSocket sync service
export function createMockWebSocketSync() {
  let mockInstance: Record<string, unknown> | null = null

  return {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getConnectionStatus: vi.fn().mockReturnValue('disconnected'),
    getOfflineQueueSize: vi.fn().mockReturnValue(0),

    // Test helpers
    simulateConnect: () => {
      mockInstance?.getConnectionStatus.mockReturnValue('connected')
    },
    simulateDisconnect: () => {
      mockInstance?.getConnectionStatus.mockReturnValue('disconnected')
    },
    simulateMessage: (type: string, data: unknown) => {
      const handlers =
        (
          mockInstance?._handlers as Record<string, ((data: unknown) => void)[]>
        )?.[type] || []
      handlers.forEach(handler => handler(data))
    },

    getInstance: () => mockInstance,
    setInstance: (instance: Record<string, unknown>) => {
      mockInstance = instance
      mockInstance._handlers = {}

      // Override the 'on' method to track handlers
      mockInstance.on = vi.fn(
        (event: string, handler: (data: unknown) => void) => {
          const handlers = mockInstance._handlers as Record<
            string,
            ((data: unknown) => void)[]
          >
          if (!handlers[event]) {
            handlers[event] = []
          }
          handlers[event].push(handler)
        }
      )
    },
  }
}
