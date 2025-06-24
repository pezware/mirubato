import { describe, it, expect } from 'vitest'
import { generateId, calculateChecksum } from './database'

describe('Database Utility Functions', () => {
  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('test')
      const id2 = generateId('test')

      expect(id1).toMatch(/^test_[\w-]+$/)
      expect(id2).toMatch(/^test_[\w-]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should generate ID without prefix', () => {
      const id = generateId()

      expect(id).toMatch(/^[\w-]+$/)
      expect(id.length).toBeGreaterThan(0)
    })
  })

  describe('calculateChecksum', () => {
    it('should generate consistent checksums', async () => {
      const data = { id: 'test', value: 42, nested: { array: [1, 2, 3] } }

      const checksum1 = await calculateChecksum(data)
      const checksum2 = await calculateChecksum(data)

      expect(checksum1).toBe(checksum2)
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
    })

    it('should generate different checksums for different data', async () => {
      const data1 = { id: 'test1' }
      const data2 = { id: 'test2' }

      const checksum1 = await calculateChecksum(data1)
      const checksum2 = await calculateChecksum(data2)

      console.log('Checksum 1:', checksum1)
      console.log('Checksum 2:', checksum2)

      expect(checksum1).toMatch(/^[a-f0-9]{64}$/)
      expect(checksum2).toMatch(/^[a-f0-9]{64}$/)
      expect(checksum1).not.toBe(checksum2)
    })

    it('should handle complex objects consistently', async () => {
      const complexData = {
        timestamp: '2025-06-23T22:32:52.797Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: [{ title: 'Piece 1' }, { title: 'Piece 2' }],
        techniques: ['technique1', 'technique2'],
        metadata: { source: 'test', nested: { deep: true } },
      }

      const checksum = await calculateChecksum(complexData)
      expect(checksum).toMatch(/^[a-f0-9]{64}$/)

      // Ensure order doesn't matter for objects
      const reorderedData = {
        metadata: complexData.metadata,
        duration: complexData.duration,
        timestamp: complexData.timestamp,
        techniques: complexData.techniques,
        pieces: complexData.pieces,
        type: complexData.type,
        instrument: complexData.instrument,
      }

      const reorderedChecksum = await calculateChecksum(reorderedData)
      expect(reorderedChecksum).toBe(checksum)
    })
  })
})
