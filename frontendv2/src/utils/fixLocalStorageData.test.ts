import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fixLocalStorageData } from './fixLocalStorageData'

describe('fixLocalStorageData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should fix entries with string arrays', () => {
    const corruptedData = [
      {
        id: 'entry-1',
        pieces: '["Piece 1", "Piece 2"]',
        techniques: '["Scales"]',
        tags: '[]',
        goalIds: '["goal-1"]',
        metadata: '{"source": "manual"}',
      },
    ]

    localStorage.setItem(
      'mirubato:logbook:entries',
      JSON.stringify(corruptedData)
    )

    fixLocalStorageData()

    const fixedData = JSON.parse(
      localStorage.getItem('mirubato:logbook:entries') || '[]'
    )

    expect(fixedData[0].pieces).toEqual(['Piece 1', 'Piece 2'])
    expect(fixedData[0].techniques).toEqual(['Scales'])
    expect(fixedData[0].tags).toEqual([])
    expect(fixedData[0].goalIds).toEqual(['goal-1'])
    expect(fixedData[0].metadata).toEqual({ source: 'manual' })
  })

  it('should handle entries that are already correct', () => {
    const correctData = [
      {
        id: 'entry-1',
        pieces: ['Piece 1', 'Piece 2'],
        techniques: ['Scales'],
        tags: [],
        goalIds: ['goal-1'],
        metadata: { source: 'manual' },
      },
    ]

    localStorage.setItem(
      'mirubato:logbook:entries',
      JSON.stringify(correctData)
    )

    fixLocalStorageData()

    const data = JSON.parse(
      localStorage.getItem('mirubato:logbook:entries') || '[]'
    )

    expect(data).toEqual(correctData)
  })

  it('should handle invalid JSON strings gracefully', () => {
    const dataWithInvalidJSON = [
      {
        id: 'entry-1',
        pieces: 'invalid json [',
        techniques: ['already', 'an', 'array'],
        tags: null,
        goalIds: undefined,
        metadata: {},
      },
    ]

    localStorage.setItem(
      'mirubato:logbook:entries',
      JSON.stringify(dataWithInvalidJSON)
    )

    fixLocalStorageData()

    const fixedData = JSON.parse(
      localStorage.getItem('mirubato:logbook:entries') || '[]'
    )

    expect(fixedData[0].pieces).toEqual([]) // Should default to empty array
    expect(fixedData[0].techniques).toEqual(['already', 'an', 'array'])
    expect(fixedData[0].tags).toEqual([]) // null should become empty array
    expect(fixedData[0].goalIds).toEqual([]) // undefined should become empty array
  })

  it('should not modify localStorage if no entries exist', () => {
    const spy = vi.spyOn(localStorage, 'setItem')

    fixLocalStorageData()

    expect(spy).not.toHaveBeenCalled()
  })

  it('should handle empty entries array', () => {
    localStorage.setItem('mirubato:logbook:entries', '[]')
    const spy = vi.spyOn(localStorage, 'setItem')

    fixLocalStorageData()

    expect(spy).not.toHaveBeenCalled()
  })

  it('should fix multiple corrupted entries', () => {
    const multipleCorruptedEntries = [
      {
        id: 'entry-1',
        pieces: '["Piece 1"]',
        techniques: '[]',
        tags: '["morning", "productive"]',
        goalIds: '[]',
        metadata: '{}',
      },
      {
        id: 'entry-2',
        pieces: ['Already', 'Good'],
        techniques: '["Sight reading"]',
        tags: [],
        goalIds: '["goal-2", "goal-3"]',
        metadata: { source: 'auto' },
      },
    ]

    localStorage.setItem(
      'mirubato:logbook:entries',
      JSON.stringify(multipleCorruptedEntries)
    )

    fixLocalStorageData()

    const fixedData = JSON.parse(
      localStorage.getItem('mirubato:logbook:entries') || '[]'
    )

    expect(fixedData[0].pieces).toEqual(['Piece 1'])
    expect(fixedData[0].tags).toEqual(['morning', 'productive'])
    expect(fixedData[1].pieces).toEqual(['Already', 'Good'])
    expect(fixedData[1].techniques).toEqual(['Sight reading'])
    expect(fixedData[1].goalIds).toEqual(['goal-2', 'goal-3'])
  })

  it('should handle corrupted localStorage data gracefully', () => {
    localStorage.setItem('mirubato:logbook:entries', 'not valid json at all')

    // Should not throw
    expect(() => fixLocalStorageData()).not.toThrow()
  })

  it('should preserve other entry properties', () => {
    const dataWithOtherProps = [
      {
        id: 'entry-1',
        timestamp: '2025-01-15T10:00:00Z',
        duration: 30,
        type: 'PRACTICE',
        instrument: 'PIANO',
        pieces: '["Piece 1"]',
        techniques: '[]',
        tags: '[]',
        goalIds: '[]',
        metadata: '{}',
        notes: 'Great session',
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      },
    ]

    localStorage.setItem(
      'mirubato:logbook:entries',
      JSON.stringify(dataWithOtherProps)
    )

    fixLocalStorageData()

    const fixedData = JSON.parse(
      localStorage.getItem('mirubato:logbook:entries') || '[]'
    )

    expect(fixedData[0].id).toBe('entry-1')
    expect(fixedData[0].timestamp).toBe('2025-01-15T10:00:00Z')
    expect(fixedData[0].duration).toBe(30)
    expect(fixedData[0].notes).toBe('Great session')
    expect(fixedData[0].pieces).toEqual(['Piece 1'])
  })
})
