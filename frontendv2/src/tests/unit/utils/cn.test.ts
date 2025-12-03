import { describe, it, expect } from 'vitest'
import { cn } from '@mirubato/ui'

describe('cn utility', () => {
  it('should combine class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    const isTrue = true
    const isFalse = false
    expect(cn('base', isTrue && 'active', isFalse && 'inactive')).toBe(
      'base active'
    )
  })

  it('should handle undefined and null values', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end')
  })

  it('should handle empty strings', () => {
    expect(cn('base', '', 'end')).toBe('base end')
  })

  it('should handle arrays of classes', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3')
  })

  it('should handle nested arrays', () => {
    expect(cn(['class1', ['class2', 'class3']], 'class4')).toBe(
      'class1 class2 class3 class4'
    )
  })

  it('should handle objects with boolean values', () => {
    expect(
      cn({
        base: true,
        active: true,
        disabled: false,
      })
    ).toBe('base active')
  })

  it('should handle mixed types', () => {
    expect(
      cn(
        'base',
        ['array1', 'array2'],
        { active: true, inactive: false },
        undefined,
        null,
        ''
      )
    ).toBe('base array1 array2 active')
  })

  it('should handle numbers', () => {
    // clsx converts numbers to strings
    expect(cn('class', 123)).toBe('class 123')
  })

  it('should trim extra whitespace', () => {
    expect(cn('  class1  ', '  class2  ')).toBe('class1 class2')
  })

  it('should handle complex conditional logic', () => {
    const isActive = true
    const isDisabled = false
    const variant = 'primary'

    expect(
      cn(
        'btn',
        isActive && 'btn-active',
        isDisabled && 'btn-disabled',
        variant === 'primary' && 'btn-primary',
        variant === 'secondary' && 'btn-secondary'
      )
    ).toBe('btn btn-active btn-primary')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
  })

  it('should handle all falsy values', () => {
    expect(cn(false, null, undefined, 0, '')).toBe('') // clsx filters out falsy values
  })

  it('should handle duplicate class names with twMerge', () => {
    // twMerge keeps the last occurrence of conflicting Tailwind classes
    expect(cn('p-4', 'p-2')).toBe('p-2')
    // clsx doesn't deduplicate non-Tailwind classes
    expect(cn('class1', 'class2', 'class1')).toBe('class1 class2 class1')
  })

  it('should work with Tailwind classes', () => {
    expect(cn('px-4 py-2', 'bg-blue-500', 'hover:bg-blue-600', undefined)).toBe(
      'px-4 py-2 bg-blue-500 hover:bg-blue-600'
    )
  })
})
