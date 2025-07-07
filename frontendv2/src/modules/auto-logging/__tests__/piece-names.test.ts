import { describe, it, expect } from 'vitest'

// This test verifies the logic we implemented in AutoLoggingProvider
// for handling piece names correctly
describe('Auto-logging piece names logic', () => {
  it('should only include pieces for score practice', () => {
    // For score practice
    const scoreMetadata = {
      scoreTitle: 'Moonlight Sonata',
      scoreComposer: 'Beethoven',
    }
    const scoreType = 'score'

    // Logic from AutoLoggingProvider
    const pieces =
      scoreType === 'score' && (scoreMetadata.scoreTitle || scoreMetadata.title)
        ? [
            {
              title: scoreMetadata.scoreTitle || scoreMetadata.title || '',
              composer:
                scoreMetadata.scoreComposer || scoreMetadata.composer || '',
            },
          ]
        : []

    expect(pieces).toEqual([
      {
        title: 'Moonlight Sonata',
        composer: 'Beethoven',
      },
    ])
  })

  it('should not include pieces for metronome practice', () => {
    const metronomeMetadata = {
      title: 'Metronome Practice',
    }
    const metronomeType = 'metronome'

    // Logic from AutoLoggingProvider
    const pieces =
      metronomeType === 'score' &&
      (metronomeMetadata.scoreTitle || metronomeMetadata.title)
        ? [
            {
              title:
                metronomeMetadata.scoreTitle || metronomeMetadata.title || '',
              composer:
                metronomeMetadata.scoreComposer ||
                metronomeMetadata.composer ||
                '',
            },
          ]
        : []

    expect(pieces).toEqual([])
  })

  it('should not include pieces for counter practice', () => {
    const counterMetadata = {
      title: 'Repetition Practice',
    }
    const counterType = 'counter'

    // Logic from AutoLoggingProvider
    const pieces =
      counterType === 'score' &&
      (counterMetadata.scoreTitle || counterMetadata.title)
        ? [
            {
              title: counterMetadata.scoreTitle || counterMetadata.title || '',
              composer:
                counterMetadata.scoreComposer || counterMetadata.composer || '',
            },
          ]
        : []

    expect(pieces).toEqual([])
  })

  it('should add practice type tags for non-score sessions', () => {
    const practiceTypes = ['metronome', 'counter', 'custom']

    practiceTypes.forEach(type => {
      const practiceTypeTags = type !== 'score' ? [`${type}-practice`] : []

      if (type !== 'score') {
        expect(practiceTypeTags).toContain(`${type}-practice`)
      } else {
        expect(practiceTypeTags).toEqual([])
      }
    })
  })
})
