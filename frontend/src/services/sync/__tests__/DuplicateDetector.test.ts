import { DuplicateDetector } from '../DuplicateDetector'
import { SyncableEntity } from '../types'

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector

  beforeEach(() => {
    detector = new DuplicateDetector()
  })

  describe('ID-based deduplication', () => {
    it('should not consider entities with different IDs as duplicates', async () => {
      const entities: SyncableEntity[] = [
        {
          id: 'entry-1',
          localId: 'entry-1',
          entityType: 'logbookEntry',
          data: {
            date: '2024-01-15',
            duration: 30,
            notes: 'Morning practice',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncVersion: 1,
          checksum: 'hash1',
          syncStatus: 'synced',
          deviceId: 'device1',
        },
        {
          id: 'entry-2',
          localId: 'entry-2',
          entityType: 'logbookEntry',
          data: {
            date: '2024-01-15', // Same date, but different ID
            duration: 45,
            notes: 'Evening practice',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncVersion: 1,
          checksum: 'hash2',
          syncStatus: 'synced',
          deviceId: 'device1',
        },
      ]

      const merged = await detector.detectAndMerge(entities)

      // Both entries should be kept since they have different IDs
      expect(merged).toHaveLength(2)
      expect(merged.find(e => e.id === 'entry-1')).toBeDefined()
      expect(merged.find(e => e.id === 'entry-2')).toBeDefined()
    })

    it('should merge entities with the same ID', async () => {
      const entities: SyncableEntity[] = [
        {
          id: 'entry-1',
          localId: 'entry-1',
          entityType: 'logbookEntry',
          data: {
            date: '2024-01-15',
            duration: 30,
            notes: 'Morning practice',
          },
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000,
          syncVersion: 1,
          checksum: 'hash1',
          syncStatus: 'synced',
          deviceId: 'device1',
        },
        {
          id: 'entry-1', // Same ID
          localId: 'entry-1',
          entityType: 'logbookEntry',
          data: {
            date: '2024-01-15',
            duration: 45, // Updated duration
            notes: 'Morning practice (updated)',
          },
          createdAt: Date.now() - 1000,
          updatedAt: Date.now(), // Newer update
          syncVersion: 2,
          checksum: 'hash2',
          syncStatus: 'synced',
          deviceId: 'device2',
        },
      ]

      const merged = await detector.detectAndMerge(entities)

      // Should have only one entry after merging
      expect(merged).toHaveLength(1)
      expect(merged[0].id).toBe('entry-1')
      // Should keep the newer data
      expect((merged[0].data as any).duration).toBe(45)
      expect(merged[0].syncVersion).toBe(2)
    })

    it('should find duplicates based on ID', () => {
      const entities: SyncableEntity[] = [
        {
          id: 'goal-1',
          localId: 'goal-1',
          entityType: 'goal',
          data: { title: 'Practice 30 min daily' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncVersion: 1,
          checksum: 'hash1',
          syncStatus: 'synced',
        },
        {
          id: 'goal-1', // Duplicate ID
          localId: 'goal-1',
          entityType: 'goal',
          data: { title: 'Practice 30 min daily' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncVersion: 2,
          checksum: 'hash2',
          syncStatus: 'synced',
        },
        {
          id: 'goal-2', // Different ID
          localId: 'goal-2',
          entityType: 'goal',
          data: { title: 'Learn new piece' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncVersion: 1,
          checksum: 'hash3',
          syncStatus: 'synced',
        },
      ]

      const duplicates = detector.findDuplicates(entities)

      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].entities).toHaveLength(2)
      expect(duplicates[0].entities[0].id).toBe('goal-1')
      expect(duplicates[0].entities[1].id).toBe('goal-1')
    })
  })

  describe('merge behavior', () => {
    it('should prefer synced status over pending', () => {
      const duplicates: SyncableEntity[] = [
        {
          id: 'session-1',
          localId: 'session-1',
          entityType: 'practiceSession',
          data: { duration: 30 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          syncVersion: 1,
          checksum: 'hash1',
          syncStatus: 'pending',
          remoteId: undefined,
        },
        {
          id: 'session-1',
          localId: 'session-1',
          entityType: 'practiceSession',
          data: { duration: 30 },
          createdAt: Date.now(),
          updatedAt: Date.now() - 1000, // Older
          syncVersion: 1,
          checksum: 'hash1',
          syncStatus: 'synced',
          remoteId: 'remote-123',
        },
      ]

      const merged = detector.mergeDuplicates(duplicates)

      // Should keep the remote ID from synced entity
      expect(merged.remoteId).toBe('remote-123')
      // But mark as pending since one is pending
      expect(merged.syncStatus).toBe('pending')
    })

    it('should use newest update time', () => {
      const now = Date.now()
      const duplicates: SyncableEntity[] = [
        {
          id: 'entry-1',
          localId: 'entry-1',
          entityType: 'logbookEntry',
          data: { notes: 'Old notes' },
          createdAt: now - 2000,
          updatedAt: now - 1000,
          syncVersion: 1,
          checksum: 'hash1',
          syncStatus: 'synced',
        },
        {
          id: 'entry-1',
          localId: 'entry-1',
          entityType: 'logbookEntry',
          data: { notes: 'New notes' },
          createdAt: now - 2000,
          updatedAt: now, // Newer
          syncVersion: 2,
          checksum: 'hash2',
          syncStatus: 'synced',
        },
      ]

      const merged = detector.mergeDuplicates(duplicates)

      expect((merged.data as any).notes).toBe('New notes')
      expect(merged.updatedAt).toBe(now)
      expect(merged.syncVersion).toBe(2)
    })
  })
})
