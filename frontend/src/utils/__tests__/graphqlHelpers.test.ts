import { describe, it, expect } from '@jest/globals'
import { removeUndefinedValues, validateGraphQLInput } from '../graphqlHelpers'

describe('graphqlHelpers', () => {
  describe('removeUndefinedValues', () => {
    it('should remove undefined values from flat object', () => {
      const input = {
        name: 'John',
        age: undefined,
        email: 'john@example.com',
        phone: undefined,
      }

      const result = removeUndefinedValues(input)

      expect(result).toEqual({
        name: 'John',
        email: 'john@example.com',
      })
    })

    it('should keep null values', () => {
      const input = {
        name: 'John',
        age: null,
        email: undefined,
      }

      const result = removeUndefinedValues(input)

      expect(result).toEqual({
        name: 'John',
        age: null,
      })
    })

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John',
          age: undefined,
          address: {
            street: '123 Main St',
            city: undefined,
            country: 'USA',
          },
        },
        settings: undefined,
      }

      const result = removeUndefinedValues(input)

      expect(result).toEqual({
        user: {
          name: 'John',
          address: {
            street: '123 Main St',
            country: 'USA',
          },
        },
      })
    })

    it('should handle arrays without modifying them', () => {
      const input = {
        items: [1, 2, undefined, 4],
        tags: ['a', 'b', 'c'],
        empty: undefined,
      }

      const result = removeUndefinedValues(input)

      expect(result).toEqual({
        items: [1, 2, undefined, 4], // Arrays are not modified
        tags: ['a', 'b', 'c'],
      })
    })

    it('should handle Date objects', () => {
      const date = new Date('2023-01-01')
      const input = {
        createdAt: date,
        updatedAt: undefined,
        deletedAt: null,
      }

      const result = removeUndefinedValues(input)

      expect(result).toEqual({
        createdAt: date,
        deletedAt: null,
      })
    })
  })

  describe('validateGraphQLInput', () => {
    it('should validate required fields', () => {
      const input = {
        name: 'John',
        email: 'john@example.com',
        age: undefined,
      }

      const result = validateGraphQLInput(input, ['name', 'email'])

      expect(result).toEqual({
        name: 'John',
        email: 'john@example.com',
      })
    })

    it('should throw error if required field is missing', () => {
      const input = {
        name: 'John',
        age: undefined,
        email: undefined,
      }

      expect(() => {
        validateGraphQLInput(input, ['name', 'email'])
      }).toThrow("Required field 'email' is missing or empty")
    })

    it('should throw error if required field is null', () => {
      const input = {
        name: 'John',
        email: null,
      }

      expect(() => {
        validateGraphQLInput(input, ['name', 'email'])
      }).toThrow("Required field 'email' is missing or empty")
    })

    it('should throw error if required field is empty string', () => {
      const input = {
        name: 'John',
        email: '',
      }

      expect(() => {
        validateGraphQLInput(input, ['name', 'email'])
      }).toThrow("Required field 'email' is missing or empty")
    })
  })
})
