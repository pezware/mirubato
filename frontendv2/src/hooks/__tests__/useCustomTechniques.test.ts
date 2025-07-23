import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCustomTechniques } from '../useCustomTechniques'

// Create an in-memory storage mock
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
  }
}

describe('useCustomTechniques', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    // Create a fresh localStorage mock for each test
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
  })

  it('should start with empty custom techniques', () => {
    const { result } = renderHook(() => useCustomTechniques())
    expect(result.current.customTechniques).toEqual([])
  })

  it('should load custom techniques from localStorage', () => {
    // Seed localStorage
    localStorage.setItem(
      'mirubato:custom-techniques',
      JSON.stringify(['tremolo', 'glissando'])
    )

    const { result } = renderHook(() => useCustomTechniques())
    expect(result.current.customTechniques).toEqual(['tremolo', 'glissando'])
  })

  it('should add a new custom technique', () => {
    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('legato')
    })

    expect(result.current.customTechniques).toEqual(['legato'])
    expect(localStorage.getItem('mirubato:custom-techniques')).toBe(
      JSON.stringify(['legato'])
    )
  })

  it('should not add duplicate techniques', () => {
    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('staccato')
      result.current.addCustomTechnique('staccato')
    })

    expect(result.current.customTechniques).toEqual(['staccato'])
  })

  it('should normalize techniques to lowercase', () => {
    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('Tremolo')
      result.current.addCustomTechnique('GLISSANDO')
      result.current.addCustomTechnique('VibraTO')
    })

    expect(result.current.customTechniques).toEqual([
      'tremolo',
      'glissando',
      'vibrato',
    ])
  })

  it('should prevent case-insensitive duplicates', () => {
    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('tremolo')
      result.current.addCustomTechnique('Tremolo')
      result.current.addCustomTechnique('TREMOLO')
      result.current.addCustomTechnique('TrEmOlO')
    })

    // Should only have one entry
    expect(result.current.customTechniques).toEqual(['tremolo'])
    expect(localStorage.getItem('mirubato:custom-techniques')).toBe(
      JSON.stringify(['tremolo'])
    )
  })

  it('should trim whitespace from techniques', () => {
    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('  vibrato  ')
    })

    expect(result.current.customTechniques).toEqual(['vibrato'])
  })

  it('should not add empty techniques', () => {
    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('')
      result.current.addCustomTechnique('   ')
    })

    expect(result.current.customTechniques).toEqual([])
  })

  it('should remove a custom technique', () => {
    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('technique1')
      result.current.addCustomTechnique('technique2')
      result.current.addCustomTechnique('technique3')
    })

    expect(result.current.customTechniques).toHaveLength(3)

    act(() => {
      result.current.removeCustomTechnique('technique2')
    })

    expect(result.current.customTechniques).toEqual([
      'technique1',
      'technique3',
    ])
    expect(localStorage.getItem('mirubato:custom-techniques')).toBe(
      JSON.stringify(['technique1', 'technique3'])
    )
  })

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw errors
    const originalSetItem = localStorage.setItem
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() => useCustomTechniques())

    act(() => {
      result.current.addCustomTechnique('technique')
    })

    // Should still update state even if localStorage fails
    expect(result.current.customTechniques).toEqual(['technique'])
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to save custom techniques:',
      expect.any(Error)
    )

    // Restore
    localStorage.setItem = originalSetItem
    consoleError.mockRestore()
  })
})
