import { BidirectionalSync } from '../BidirectionalSync'
import { StorageModule } from '../../../modules/infrastructure/StorageModule'
import { EventBus } from '../../../modules/core/EventBus'
import { LogbookEntry, Goal, Instrument } from '../../../modules/logger/types'
import { CloudEntry, CloudGoal } from '../BidirectionalSync'

// Mock dependencies
jest.mock('../../../modules/infrastructure/StorageModule')
jest.mock('../../../modules/core/EventBus')

describe('BidirectionalSync', () => {
  let sync: BidirectionalSync
  let mockStorageModule: jest.Mocked<StorageModule>
  let mockEventBus: jest.Mocked<EventBus>
  const userId = 'test-user-id'

  beforeEach(() => {
    mockStorageModule = new StorageModule() as jest.Mocked<StorageModule>
    mockEventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>

    // Reset mocks
    jest.clearAllMocks()
    mockStorageModule.saveLocal = jest.fn().mockResolvedValue(undefined)

    sync = new BidirectionalSync(mockStorageModule, mockEventBus, userId)
  })

  describe('performSync', () => {
    it('should sync new local entries to cloud', async () => {
      const localEntries: LogbookEntry[] = [
        {
          id: 'local-1',
          userId,
          timestamp: Date.now(),
          duration: 1800,
          type: 'practice',
          instrument: Instrument.PIANO,
          pieces: [{ id: 'piece-1', title: 'Test Piece' }],
          techniques: ['scales'],
          goals: [],
          notes: 'Test notes',
          mood: 'satisfied',
          tags: ['test'],
        },
      ]

      const cloudEntries: CloudEntry[] = []

      const result = await sync.performSync(localEntries, [], cloudEntries, [])

      expect(result.localToCloud.entries).toBe(1)
      expect(result.cloudToLocal.entries).toBe(0)
      expect(result.conflicts.entries).toBe(0)

      // Should save the entry locally
      expect(mockStorageModule.saveLocal).toHaveBeenCalledWith(
        'logbook:local-1',
        expect.objectContaining({ id: 'local-1' })
      )
    })

    it('should sync new cloud entries to local', async () => {
      const localEntries: LogbookEntry[] = []

      const cloudEntries: CloudEntry[] = [
        {
          id: 'cloud-1',
          timestamp: new Date().toISOString(),
          duration: 2700,
          type: 'PRACTICE',
          instrument: 'GUITAR',
          pieces: [{ title: 'Cloud Piece' }],
          techniques: ['arpeggios'],
          goalIds: [],
          notes: 'Cloud notes',
          mood: 'FRUSTRATED',
          tags: ['cloud'],
        },
      ]

      const result = await sync.performSync(localEntries, [], cloudEntries, [])

      expect(result.localToCloud.entries).toBe(0)
      expect(result.cloudToLocal.entries).toBe(1)
      expect(result.conflicts.entries).toBe(0)

      // Should save the cloud entry locally
      expect(mockStorageModule.saveLocal).toHaveBeenCalledWith(
        'logbook:cloud-1',
        expect.objectContaining({
          id: 'cloud-1',
          type: 'practice', // Should be lowercased
          mood: 'frustrated', // Should be lowercased
        })
      )
    })

    it('should detect and resolve conflicts', async () => {
      const timestamp = Date.now()

      const localEntries: LogbookEntry[] = [
        {
          id: 'entry-1',
          userId,
          timestamp,
          duration: 1800,
          type: 'practice',
          instrument: Instrument.PIANO,
          pieces: [{ id: 'piece-2', title: 'Local Version' }],
          techniques: ['scales'],
          goals: [],
          notes: 'Local notes',
          mood: 'satisfied',
          tags: ['local'],
        },
      ]

      const cloudEntries: CloudEntry[] = [
        {
          id: 'entry-1', // Same ID
          timestamp: new Date(timestamp).toISOString(),
          duration: 2700, // Different duration
          type: 'PRACTICE',
          instrument: Instrument.PIANO,
          pieces: [{ title: 'Cloud Version' }], // Different title
          techniques: ['arpeggios'], // Different techniques
          goalIds: [],
          notes: 'Cloud notes', // Different notes
          mood: 'FRUSTRATED', // Different mood
          tags: ['cloud'], // Different tags
          updatedAt: new Date(timestamp + 1000).toISOString(), // Newer
        },
      ]

      const result = await sync.performSync(localEntries, [], cloudEntries, [])

      expect(result.conflicts.entries).toBe(1)

      // Should save the merged entry (cloud version since it's newer)
      expect(mockStorageModule.saveLocal).toHaveBeenCalledWith(
        'logbook:entry-1',
        expect.objectContaining({
          id: 'entry-1',
          duration: 2700, // Cloud value
          notes: 'Cloud notes', // Cloud value
        })
      )
    })

    it('should handle goals sync', async () => {
      const localGoals: Goal[] = [
        {
          id: 'goal-1',
          userId,
          title: 'Practice daily',
          description: 'Local goal',
          targetDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          progress: 50,
          milestones: [],
          status: 'active',
          linkedEntries: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      const cloudGoals: CloudGoal[] = [
        {
          id: 'goal-2',
          title: 'Learn new piece',
          description: 'Cloud goal',
          targetDate: new Date(
            Date.now() + 60 * 24 * 60 * 60 * 1000
          ).toISOString(),
          milestones: [{ id: 'm1', title: 'First movement', completed: false }],
        },
      ]

      const result = await sync.performSync([], localGoals, [], cloudGoals)

      expect(result.localToCloud.goals).toBe(1)
      expect(result.cloudToLocal.goals).toBe(1)

      // Should save both goals
      expect(mockStorageModule.saveLocal).toHaveBeenCalledWith(
        'goal:goal-1',
        expect.objectContaining({ id: 'goal-1' })
      )
      expect(mockStorageModule.saveLocal).toHaveBeenCalledWith(
        'goal:goal-2',
        expect.objectContaining({ id: 'goal-2' })
      )
    })

    it('should emit events for synced entities', async () => {
      const localEntries: LogbookEntry[] = [
        {
          id: 'entry-1',
          userId,
          timestamp: Date.now(),
          duration: 1800,
          type: 'practice',
          instrument: Instrument.PIANO,
          pieces: [],
          techniques: [],
          goals: [],
          notes: '',
          tags: [],
        },
      ]

      await sync.performSync(localEntries, [], [], [])

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logger:entry:synced',
          data: expect.objectContaining({
            entry: expect.objectContaining({ id: 'entry-1' }),
          }),
        })
      )
    })

    it('should preserve IDs to prevent duplicates', async () => {
      const localEntries: LogbookEntry[] = [
        {
          id: 'shared-id',
          userId,
          timestamp: Date.now(),
          duration: 1800,
          type: 'practice',
          instrument: Instrument.PIANO,
          pieces: [],
          techniques: [],
          goals: [],
          notes: 'Version 1',
          tags: [],
        },
      ]

      const cloudEntries: CloudEntry[] = [
        {
          id: 'shared-id', // Same ID
          timestamp: new Date().toISOString(),
          duration: 1800,
          type: 'PRACTICE',
          instrument: Instrument.PIANO,
          pieces: [],
          techniques: [],
          goalIds: [],
          notes: 'Version 2',
          mood: undefined,
          tags: [],
          updatedAt: new Date(Date.now() + 1000).toISOString(), // Newer
        },
      ]

      await sync.performSync(localEntries, [], cloudEntries, [])

      // Should only save once (the merged version)
      expect(mockStorageModule.saveLocal).toHaveBeenCalledTimes(1)
      expect(mockStorageModule.saveLocal).toHaveBeenCalledWith(
        'logbook:shared-id',
        expect.objectContaining({
          id: 'shared-id',
          notes: 'Version 2', // Newer cloud version
        })
      )
    })
  })
})
