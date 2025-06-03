import { EventBus } from './EventBus'
import { EventPriority } from './types'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    EventBus.resetInstance()
    eventBus = EventBus.getInstance()
  })

  afterEach(() => {
    EventBus.resetInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EventBus.getInstance()
      const instance2 = EventBus.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should create new instance after reset', () => {
      const instance1 = EventBus.getInstance()
      EventBus.resetInstance()
      const instance2 = EventBus.getInstance()
      expect(instance1).not.toBe(instance2)
    })
  })

  describe('Event Subscription', () => {
    it('should subscribe to events', () => {
      const callback = jest.fn()
      const subscriptionId = eventBus.subscribe('test:event', callback)

      expect(subscriptionId).toBeTruthy()
      expect(eventBus.getSubscriptionCount()).toBe(1)
    })

    it('should unsubscribe from events', () => {
      const callback = jest.fn()
      const subscriptionId = eventBus.subscribe('test:event', callback)

      const result = eventBus.unsubscribe(subscriptionId)

      expect(result).toBe(true)
      expect(eventBus.getSubscriptionCount()).toBe(0)
    })

    it('should return false when unsubscribing non-existent subscription', () => {
      const result = eventBus.unsubscribe('non-existent')
      expect(result).toBe(false)
    })

    it('should support multiple subscriptions to same event', () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()

      eventBus.subscribe('test:event', callback1)
      eventBus.subscribe('test:event', callback2)

      expect(eventBus.getSubscriptionCount()).toBe(2)
    })
  })

  describe('Event Publishing', () => {
    it('should publish events to subscribers', async () => {
      const callback = jest.fn()
      eventBus.subscribe('test:event', callback)

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: { message: 'hello' },
        metadata: { version: '1.0.0' },
      })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'test',
          type: 'test:event',
          data: { message: 'hello' },
          eventId: expect.any(String),
          timestamp: expect.any(Number),
        })
      )
    })

    it('should not call unsubscribed callbacks', async () => {
      const callback = jest.fn()
      const subscriptionId = eventBus.subscribe('test:event', callback)
      eventBus.unsubscribe(subscriptionId)

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle async callbacks', async () => {
      const asyncCallback = jest.fn().mockResolvedValue(undefined)
      eventBus.subscribe('test:event', asyncCallback)

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(asyncCallback).toHaveBeenCalled()
    })

    it('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockRejectedValue(new Error('Test error'))
      const normalCallback = jest.fn()

      eventBus.subscribe('test:event', errorCallback)
      eventBus.subscribe('test:event', normalCallback)

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(errorCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
    })
  })

  describe('Pattern Matching', () => {
    it('should support exact pattern matching', async () => {
      const callback = jest.fn()
      eventBus.subscribe('module:action:status', callback)

      await eventBus.publish({
        source: 'test',
        type: 'module:action:status',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(callback).toHaveBeenCalled()
    })

    it('should support wildcard patterns', async () => {
      const callback = jest.fn()
      eventBus.subscribe('session:*:success', callback)

      await eventBus.publish({
        source: 'test',
        type: 'session:start:success',
        data: {},
        metadata: { version: '1.0.0' },
      })

      await eventBus.publish({
        source: 'test',
        type: 'session:end:success',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(callback).toHaveBeenCalledTimes(2)
    })

    it('should not match incorrect patterns', async () => {
      const callback = jest.fn()
      eventBus.subscribe('session:*:success', callback)

      await eventBus.publish({
        source: 'test',
        type: 'session:start:failure',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Event Priority', () => {
    it('should execute callbacks in priority order', async () => {
      const callOrder: string[] = []

      eventBus.subscribe(
        'test:event',
        () => {
          callOrder.push('normal')
        },
        {
          priority: EventPriority.NORMAL,
        }
      )

      eventBus.subscribe(
        'test:event',
        () => {
          callOrder.push('critical')
        },
        {
          priority: EventPriority.CRITICAL,
        }
      )

      eventBus.subscribe(
        'test:event',
        () => {
          callOrder.push('high')
        },
        {
          priority: EventPriority.HIGH,
        }
      )

      eventBus.subscribe(
        'test:event',
        () => {
          callOrder.push('low')
        },
        {
          priority: EventPriority.LOW,
        }
      )

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(callOrder).toEqual(['critical', 'high', 'normal', 'low'])
    })
  })

  describe('Event Filtering', () => {
    it('should filter events based on custom filter', async () => {
      const callback = jest.fn()

      eventBus.subscribe('test:event', callback, {
        filter: payload => payload.data.important === true,
      })

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: { important: false },
        metadata: { version: '1.0.0' },
      })

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: { important: true },
        metadata: { version: '1.0.0' },
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Event History', () => {
    it('should maintain event history', async () => {
      await eventBus.publish({
        source: 'test',
        type: 'test:event1',
        data: {},
        metadata: { version: '1.0.0' },
      })

      await eventBus.publish({
        source: 'test',
        type: 'test:event2',
        data: {},
        metadata: { version: '1.0.0' },
      })

      const history = eventBus.getEventHistory()
      expect(history).toHaveLength(2)
      expect(history[0].type).toBe('test:event1')
      expect(history[1].type).toBe('test:event2')
    })

    it('should filter event history by source', async () => {
      await eventBus.publish({
        source: 'module1',
        type: 'test:event',
        data: {},
        metadata: { version: '1.0.0' },
      })

      await eventBus.publish({
        source: 'module2',
        type: 'test:event',
        data: {},
        metadata: { version: '1.0.0' },
      })

      const history = eventBus.getEventHistory({ source: 'module1' })
      expect(history).toHaveLength(1)
      expect(history[0].source).toBe('module1')
    })

    it('should filter event history by type pattern', async () => {
      await eventBus.publish({
        source: 'test',
        type: 'session:start:success',
        data: {},
        metadata: { version: '1.0.0' },
      })

      await eventBus.publish({
        source: 'test',
        type: 'session:end:success',
        data: {},
        metadata: { version: '1.0.0' },
      })

      await eventBus.publish({
        source: 'test',
        type: 'user:login:success',
        data: {},
        metadata: { version: '1.0.0' },
      })

      const history = eventBus.getEventHistory({ type: 'session:*:success' })
      expect(history).toHaveLength(2)
    })

    it('should filter event history by timestamp', async () => {
      await eventBus.publish({
        source: 'test',
        type: 'test:event1',
        data: {},
        metadata: { version: '1.0.0' },
      })

      await new Promise(resolve => setTimeout(resolve, 10))
      const midTime = Date.now()

      await eventBus.publish({
        source: 'test',
        type: 'test:event2',
        data: {},
        metadata: { version: '1.0.0' },
      })

      const history = eventBus.getEventHistory({ since: midTime })
      expect(history).toHaveLength(1)
      expect(history[0].type).toBe('test:event2')
    })

    it('should limit event history results', async () => {
      for (let i = 0; i < 10; i++) {
        await eventBus.publish({
          source: 'test',
          type: `test:event${i}`,
          data: {},
          metadata: { version: '1.0.0' },
        })
      }

      const history = eventBus.getEventHistory({ limit: 5 })
      expect(history).toHaveLength(5)
      expect(history[0].type).toBe('test:event5')
      expect(history[4].type).toBe('test:event9')
    })

    it('should clear event history', async () => {
      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: {},
        metadata: { version: '1.0.0' },
      })

      eventBus.clearHistory()
      const history = eventBus.getEventHistory()
      expect(history).toHaveLength(0)
    })

    it('should respect max history size', async () => {
      // Create a new instance with smaller history size for testing
      EventBus.resetInstance()
      const bus = EventBus.getInstance()
      // We need to use the public methods to trigger the history limit

      // Publish more events than max history size (1000)
      for (let i = 0; i < 1005; i++) {
        await bus.publish({
          source: 'test',
          type: `test:event${i}`,
          data: { index: i },
          metadata: { version: '1.0.0' },
        })
      }

      const history = bus.getEventHistory()
      expect(history.length).toBeLessThanOrEqual(1000)
      expect(history[0].data.index).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Complex Scenarios', () => {
    it('should handle multiple wildcard subscriptions correctly', async () => {
      const callback1 = jest.fn()
      const callback2 = jest.fn()
      const callback3 = jest.fn()

      eventBus.subscribe('*:start:*', callback1)
      eventBus.subscribe('session:*:success', callback2)
      eventBus.subscribe('session:start:success', callback3)

      await eventBus.publish({
        source: 'test',
        type: 'session:start:success',
        data: {},
        metadata: { version: '1.0.0' },
      })

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
      expect(callback3).toHaveBeenCalledTimes(1)
    })

    it('should handle priority and filtering together', async () => {
      const callOrder: string[] = []

      eventBus.subscribe(
        'test:event',
        () => {
          callOrder.push('high-filtered')
        },
        {
          priority: EventPriority.HIGH,
          filter: payload => payload.data.value > 5,
        }
      )

      eventBus.subscribe(
        'test:event',
        () => {
          callOrder.push('critical-all')
        },
        {
          priority: EventPriority.CRITICAL,
        }
      )

      eventBus.subscribe(
        'test:event',
        () => {
          callOrder.push('normal-filtered')
        },
        {
          priority: EventPriority.NORMAL,
          filter: payload => payload.data.value > 5,
        }
      )

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: { value: 10 },
        metadata: { version: '1.0.0' },
      })

      expect(callOrder).toEqual([
        'critical-all',
        'high-filtered',
        'normal-filtered',
      ])

      callOrder.length = 0

      await eventBus.publish({
        source: 'test',
        type: 'test:event',
        data: { value: 3 },
        metadata: { version: '1.0.0' },
      })

      expect(callOrder).toEqual(['critical-all'])
    })
  })
})
