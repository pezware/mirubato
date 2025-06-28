import { describe, it, expect } from 'vitest'
import { sanitizeForD1 } from '../../../utils/sanitizeForD1'

describe('sanitizeForD1', () => {
  it('should convert undefined to null', () => {
    expect(sanitizeForD1(undefined)).toBe(null)
  })

  it('should preserve null values', () => {
    expect(sanitizeForD1(null)).toBe(null)
  })

  it('should preserve primitive values', () => {
    expect(sanitizeForD1('string')).toBe('string')
    expect(sanitizeForD1(123)).toBe(123)
    expect(sanitizeForD1(true)).toBe(true)
    expect(sanitizeForD1(false)).toBe(false)
  })

  it('should sanitize objects with undefined values', () => {
    const input = {
      name: 'test',
      value: undefined,
      nested: {
        prop: 'value',
        empty: undefined,
      },
    }

    const expected = {
      name: 'test',
      value: null,
      nested: {
        prop: 'value',
        empty: null,
      },
    }

    expect(sanitizeForD1(input)).toEqual(expected)
  })

  it('should sanitize arrays with undefined values', () => {
    const input = [1, undefined, 'test', null, { value: undefined }]
    const expected = [1, null, 'test', null, { value: null }]

    expect(sanitizeForD1(input)).toEqual(expected)
  })

  it('should handle nested arrays and objects', () => {
    const input = {
      array: [1, undefined, { nested: undefined }],
      object: {
        array: [undefined, 2, 3],
        value: undefined,
      },
    }

    const expected = {
      array: [1, null, { nested: null }],
      object: {
        array: [null, 2, 3],
        value: null,
      },
    }

    expect(sanitizeForD1(input)).toEqual(expected)
  })

  it('should handle circular references', () => {
    const obj: any = { name: 'test' }
    obj.circular = obj

    const result = sanitizeForD1(obj) as any
    expect(result.name).toBe('test')
    expect(result.circular).toEqual({})
  })

  it('should sanitize a real LogbookEntry example', () => {
    const entry = {
      id: 'entry_123',
      timestamp: '2025-06-27T10:00:00Z',
      duration: 30,
      type: 'PRACTICE',
      instrument: 'PIANO',
      pieces: [
        {
          title: 'Moonlight Sonata',
          composer: 'Beethoven',
          measures: undefined,
          tempo: undefined,
        },
      ],
      techniques: [],
      goalIds: [],
      notes: undefined,
      mood: undefined,
      tags: [],
      metadata: undefined,
      createdAt: '2025-06-27T10:00:00Z',
      updatedAt: '2025-06-27T10:00:00Z',
    }

    const sanitized = sanitizeForD1(entry) as any

    expect(sanitized.notes).toBe(null)
    expect(sanitized.mood).toBe(null)
    expect(sanitized.metadata).toBe(null)
    expect(sanitized.pieces[0].measures).toBe(null)
    expect(sanitized.pieces[0].tempo).toBe(null)
  })
})
