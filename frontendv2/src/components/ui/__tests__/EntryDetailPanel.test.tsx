import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { EntryDetailPanel } from '../EntryDetailPanel'
import type { LogbookEntry } from '@/api/logbook'

import '@/tests/mocks/i18n'

const buildEntry = (overrides: Partial<LogbookEntry> = {}): LogbookEntry => ({
  id: 'entry-1',
  timestamp: new Date('2024-01-01T12:00:00Z').toISOString(),
  duration: 30,
  type: 'practice',
  instrument: 'piano',
  pieces: [],
  techniques: [],
  goalIds: [],
  notes: 'Daily Warmup · Logged from practice plan',
  mood: null,
  tags: [],
  metadata: { source: 'practice_plan' },
  createdAt: new Date('2024-01-01T12:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
  ...overrides,
})

describe('EntryDetailPanel', () => {
  it('renders reflection responses when present in metadata', () => {
    const entry = buildEntry({
      metadata: {
        source: 'practice_plan',
        reflectionResponses: [
          { prompt: 'How did it go?', response: 'Felt great' },
          { prompt: 'What will you focus on next time?', response: 'Dynamics' },
        ],
      },
    })

    render(<EntryDetailPanel entry={entry} />)

    expect(
      screen.getByRole('heading', { name: /reflection/i, level: 4 })
    ).toBeInTheDocument()
    expect(screen.getByText('How did it go?')).toBeInTheDocument()
    expect(screen.getByText('Felt great')).toBeInTheDocument()
    expect(
      screen.getByText('What will you focus on next time?')
    ).toBeInTheDocument()
    expect(screen.getByText('Dynamics')).toBeInTheDocument()
  })
})
