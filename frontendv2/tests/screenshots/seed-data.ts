import { Page } from '@playwright/test'

/**
 * Seeds localStorage with sample practice data for screenshot capture
 * This ensures consistent and meaningful data is shown in screenshots
 */
export async function seedPracticeData(page: Page): Promise<void> {
  // Sample practice entries with realistic data
  const sampleEntries = [
    {
      id: 'entry-1',
      duration: 1500, // 25 minutes
      startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      pieces: [
        {
          id: 'piece-1',
          title: 'Clair de Lune',
          composer: 'Claude Debussy'
        }
      ],
      notes: 'Worked on the middle section arpeggios',
      type: 'repertoire',
      instrument: 'piano'
    },
    {
      id: 'entry-2',
      duration: 900, // 15 minutes
      startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
      pieces: [
        {
          id: 'piece-2',
          title: 'Scales & Arpeggios',
          composer: 'Technical Work'
        }
      ],
      notes: 'C major, G major, D major scales',
      type: 'technique',
      instrument: 'piano'
    },
    {
      id: 'entry-3',
      duration: 1800, // 30 minutes
      startTime: new Date(Date.now() - 86400000 * 3).toISOString(),
      pieces: [
        {
          id: 'piece-3',
          title: 'Moonlight Sonata',
          composer: 'Ludwig van Beethoven'
        }
      ],
      notes: 'First movement, focusing on dynamics',
      type: 'repertoire',
      instrument: 'piano'
    },
    {
      id: 'entry-4',
      duration: 2400, // 40 minutes
      startTime: new Date(Date.now() - 86400000 * 4).toISOString(),
      pieces: [
        {
          id: 'piece-4',
          title: 'Gymnopédie No. 1',
          composer: 'Erik Satie'
        }
      ],
      notes: 'Working on pedaling and voicing',
      type: 'repertoire',
      instrument: 'piano'
    },
    {
      id: 'entry-5',
      duration: 1200, // 20 minutes
      startTime: new Date(Date.now() - 86400000 * 5).toISOString(),
      pieces: [
        {
          id: 'piece-5',
          title: 'Hanon Exercises',
          composer: 'Charles-Louis Hanon'
        }
      ],
      notes: 'Exercises 1-10',
      type: 'technique',
      instrument: 'piano'
    }
  ]

  // Seed localStorage
  await page.evaluate((entries) => {
    localStorage.setItem('mirubato-logbook-entries', JSON.stringify(entries))
    localStorage.setItem('mirubato-logbook-version', '1')
  }, sampleEntries)
}

/**
 * Seeds sample repertoire/score data
 */
export async function seedRepertoireData(page: Page): Promise<void> {
  const sampleScores = [
    {
      id: 'score-1',
      title: 'Clair de Lune',
      composer: 'Claude Debussy',
      format: 'PDF',
      status: 'working',
      addedAt: new Date(Date.now() - 86400000 * 30).toISOString()
    },
    {
      id: 'score-2',
      title: 'Moonlight Sonata',
      composer: 'Ludwig van Beethoven',
      format: 'PDF',
      status: 'polished',
      addedAt: new Date(Date.now() - 86400000 * 60).toISOString()
    },
    {
      id: 'score-3',
      title: 'Gymnopédie No. 1',
      composer: 'Erik Satie',
      format: 'Image',
      status: 'learning',
      addedAt: new Date(Date.now() - 86400000 * 15).toISOString()
    }
  ]

  await page.evaluate((scores) => {
    localStorage.setItem('mirubato-scores', JSON.stringify(scores))
  }, sampleScores)
}

/**
 * Clears all seeded data
 */
export async function clearSeedData(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('mirubato-logbook-entries')
    localStorage.removeItem('mirubato-logbook-version')
    localStorage.removeItem('mirubato-scores')
  })
}
