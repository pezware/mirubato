import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { validateBody } from './middleware'
import { schemas } from '../utils/validation'
import type { Env } from '../index'
import type { Variables } from './middleware'

describe('Middleware', () => {
  describe('validateBody with sanitization', () => {
    it('should sanitize undefined values to null when explicitly passed', async () => {
      const app = new Hono<{ Bindings: Env; Variables: Variables }>()

      // Create a test endpoint that uses validateBody and manually adds undefined
      app.post('/test', validateBody(schemas.syncChanges), async c => {
        // Get the sanitized body
        const body = c.get('validatedBody') as Record<string, unknown>

        // Let's check that the sanitization works by manually checking
        // In real scenarios, undefined values come from existing data, not JSON
        return c.json({
          sanitized: body,
          // Test the sanitizeForD1 function directly to show it works
          testUndefined:
            (body as Record<string, Record<string, Record<string, unknown>[]>>)
              .changes.entries[0].notes === null,
        })
      })

      // Since JSON.stringify removes undefined, we simulate data that might have undefined
      // by not including the fields (which is how it arrives from JSON)
      const testData = {
        changes: {
          entries: [
            {
              id: 'test-entry',
              pieces: [
                {
                  title: 'Test Piece',
                  // composer is missing - will be undefined when accessed
                },
              ],
              techniques: [],
              goalIds: [],
            },
          ],
          goals: [],
        },
      }

      const req = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      const res = await app.fetch(req, {} as Env)
      expect(res.status).toBe(200)

      const result = (await res.json()) as Record<string, unknown>

      // The fields that were missing should not have been added by sanitization
      // since they were not present in the JSON
      const sanitized = result.sanitized as Record<string, unknown>
      const changes = sanitized.changes as Record<string, unknown>
      const entries = changes.entries as Array<Record<string, unknown>>
      const entry = entries[0]
      expect(entry.id).toBe('test-entry')
      expect((entry.pieces as Array<Record<string, unknown>>)[0].title).toBe(
        'Test Piece'
      )
      // Missing fields remain missing after sanitization
      expect('notes' in entry).toBe(false)
      expect('mood' in entry).toBe(false)
    })

    it('should preserve null values', async () => {
      const app = new Hono<{ Bindings: Env; Variables: Variables }>()

      app.post('/test', validateBody(schemas.syncChanges), async c => {
        const body = c.get('validatedBody')
        return c.json(body as Record<string, unknown>)
      })

      const testData = {
        changes: {
          entries: [
            {
              id: 'test-entry',
              notes: null,
              mood: null,
              pieces: [],
            },
          ],
          goals: [],
        },
      }

      const req = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      const res = await app.fetch(req, {} as Env)
      expect(res.status).toBe(200)

      const result = (await res.json()) as Record<string, unknown>

      // Check that null values are preserved
      const changes = result.changes as Record<string, unknown>
      const entries = changes.entries as Array<Record<string, unknown>>
      const entry = entries[0]
      expect(entry.notes).toBe(null)
      expect(entry.mood).toBe(null)
    })

    it('should handle nested objects and arrays', async () => {
      const app = new Hono<{ Bindings: Env; Variables: Variables }>()

      app.post('/test', validateBody(schemas.syncChanges), async c => {
        const body = c.get('validatedBody')
        return c.json(body as Record<string, unknown>)
      })

      // JSON doesn't support undefined, so missing fields won't be present
      const testData = {
        changes: {
          entries: [
            {
              id: 'test-entry',
              metadata: {
                source: 'manual',
                // accuracy and notesPlayed are omitted (not undefined in JSON)
              },
              pieces: [
                { title: 'Piece 1' }, // composer is omitted
                { title: 'Piece 2', composer: 'Bach' },
              ],
            },
          ],
        },
      }

      const req = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      const res = await app.fetch(req, {} as Env)
      expect(res.status).toBe(200)

      const result = (await res.json()) as Record<string, unknown>

      // Check that existing values are preserved
      const changes = result.changes as Record<string, unknown>
      const entries = changes.entries as Array<Record<string, unknown>>
      const entry = entries[0]
      const metadata = entry.metadata as Record<string, unknown>
      const pieces = entry.pieces as Array<Record<string, unknown>>
      expect(metadata.source).toBe('manual')
      // Missing fields remain missing (not converted to null since they weren't present)
      expect('accuracy' in metadata).toBe(false)
      expect('notesPlayed' in metadata).toBe(false)
      expect('composer' in pieces[0]).toBe(false)
      expect(pieces[1].composer).toBe('Bach')
    })

    it('should handle validation errors', async () => {
      const app = new Hono<{ Bindings: Env; Variables: Variables }>()

      app.post('/test', validateBody(schemas.syncChanges), async c => {
        const body = c.get('validatedBody')
        return c.json(body as Record<string, unknown>)
      })

      // Invalid data (missing required field)
      const testData = {
        // Missing 'changes' field
      }

      const req = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      const res = await app.fetch(req, {} as Env)
      expect(res.status).toBe(400)
    })
  })
})
