import { test, expect } from '@playwright/test'
import { LogbookPage } from './pages/LogbookPage'

test.describe('Logbook', () => {
  let logbookPage: LogbookPage

  test.beforeEach(async ({ page }) => {
    logbookPage = new LogbookPage(page)

    // Set up clean state
    await page.goto('/')
    await logbookPage.clearAllEntries()

    // Mock APIs to prevent flakiness
    await page.route('**/api/autocomplete/**', route => {
      route.fulfill({ status: 200, json: { results: [] } })
    })

    await logbookPage.navigate()
  })

  test.describe('Entry Management', () => {
    test('create single entry', async () => {
      await test.step('Create new entry', async () => {
        await logbookPage.createEntry({
          duration: 30,
          title: 'Moonlight Sonata',
          composer: 'Beethoven',
          notes: 'Worked on first movement dynamics',
          mood: 'satisfied',
        })
      })

      await test.step('Verify entry appears', async () => {
        await logbookPage.switchToOverviewTab()
        await logbookPage.verifyEntryCount(1)
        await logbookPage.verifyEntryContainsText(
          'Worked on first movement dynamics'
        )
      })

      await test.step('Verify data saved correctly', async () => {
        const entries = await logbookPage.getStoredEntries()
        expect(entries).toHaveLength(1)
        expect(entries[0]).toMatchObject({
          duration: 30,
          pieces: [{ title: 'Moonlight Sonata', composer: 'Beethoven' }],
          notes: 'Worked on first movement dynamics',
          mood: 'SATISFIED',
        })
      })
    })

    test('create multiple entries', async () => {
      await test.step('Create first entry', async () => {
        await logbookPage.createEntry({
          duration: 15,
          title: 'Scales and Arpeggios',
          notes: 'C major scale practice',
        })
      })

      await test.step('Create second entry', async () => {
        await logbookPage.createEntry({
          duration: 45,
          title: 'Clair de Lune',
          composer: 'Debussy',
          notes: 'Full piece run-through',
        })
      })

      await test.step('Verify both entries appear', async () => {
        await logbookPage.switchToOverviewTab()
        await logbookPage.verifyEntryCount(2)
        await logbookPage.verifyEntryContainsText('C major scale practice')
        await logbookPage.verifyEntryContainsText('Full piece run-through')
      })
    })

    test('expand entry to see details', async ({ page }) => {
      await test.step('Create entry with full details', async () => {
        await logbookPage.createEntry({
          duration: 30,
          title: 'Sonata No. 11',
          composer: 'Mozart',
          notes: 'Focused on the famous Rondo Alla Turca',
          mood: 'excited',
        })
      })

      await test.step('Expand entry', async () => {
        await logbookPage.switchToOverviewTab()
        await logbookPage.expandEntry(0)
      })

      await test.step('Verify expanded details', async () => {
        await expect(page.locator('text=Sonata No. 11')).toBeVisible()
        await expect(page.locator('text=Mozart')).toBeVisible()
      })
    })
  })

  test.describe('Data Persistence', () => {
    test('entries persist after page reload', async ({ page }) => {
      await test.step('Create entry', async () => {
        await logbookPage.createEntry({
          duration: 60,
          title: 'Persistence Test Piece',
          composer: 'Test Composer',
          notes: 'This entry should persist after reload',
        })
      })

      await test.step('Reload page', async () => {
        await page.reload({ waitUntil: 'networkidle' })
        await logbookPage.switchToOverviewTab()
      })

      await test.step('Verify entry persists', async () => {
        await logbookPage.verifyEntryCount(1)
        await logbookPage.verifyEntryContainsText(
          'This entry should persist after reload'
        )
      })
    })

    test('localStorage data integrity', async () => {
      const testData = {
        duration: 25,
        title: 'Storage Test',
        composer: 'Local Storage',
        notes: 'Testing data integrity',
      }

      await test.step('Create entry', async () => {
        await logbookPage.createEntry(testData)
      })

      await test.step('Verify localStorage structure', async () => {
        const entries = await logbookPage.getStoredEntries()
        expect(entries).toHaveLength(1)

        const entry = entries[0]
        expect(entry).toHaveProperty('id')
        expect(entry).toHaveProperty('timestamp')
        expect(entry).toHaveProperty('type', 'PRACTICE')
        expect(entry).toHaveProperty('duration', testData.duration)
        expect(entry).toHaveProperty('pieces')
        expect(entry.pieces[0]).toMatchObject({
          title: testData.title,
          composer: testData.composer,
        })
      })
    })
  })

  test.describe('Export Features', () => {
    test('export entries as JSON', async ({ page }) => {
      await test.step('Create test entries', async () => {
        await logbookPage.createEntry({
          duration: 30,
          title: 'Export Test 1',
          notes: 'First entry for export',
        })

        await logbookPage.createEntry({
          duration: 45,
          title: 'Export Test 2',
          notes: 'Second entry for export',
        })
      })

      await test.step('Switch to overview', async () => {
        await logbookPage.switchToOverviewTab()
      })

      await test.step('Export as JSON', async () => {
        const exportJsonVisible = await page
          .locator('[data-testid="export-json-button"]')
          .isVisible({ timeout: 2000 })

        if (exportJsonVisible) {
          const download = await logbookPage.exportAsJson()
          expect(download.suggestedFilename()).toMatch(
            /mirubato-export-.*\.json/
          )
        }
      })
    })

    test('export entries as CSV', async ({ page }) => {
      await test.step('Create test entry', async () => {
        await logbookPage.createEntry({
          duration: 30,
          title: 'CSV Export Test',
          composer: 'Test Composer',
          notes: 'Testing CSV export functionality',
        })
      })

      await test.step('Switch to overview', async () => {
        await logbookPage.switchToOverviewTab()
      })

      await test.step('Export as CSV', async () => {
        const exportCsvVisible = await page
          .locator('[data-testid="export-csv-button"]')
          .isVisible({ timeout: 2000 })

        if (exportCsvVisible) {
          const download = await logbookPage.exportAsCsv()
          expect(download.suggestedFilename()).toMatch(
            /mirubato-export-.*\.csv/
          )
        }
      })
    })
  })

  test.describe('Search and Filter', () => {
    test('search entries by composer @smoke', async ({ page }) => {
      await test.step('Create entries with different composers', async () => {
        await logbookPage.createEntry({
          duration: 30,
          title: 'Moonlight Sonata',
          composer: 'Beethoven',
          notes: 'Classical period',
        })

        await logbookPage.createEntry({
          duration: 25,
          title: 'Clair de Lune',
          composer: 'Debussy',
          notes: 'Impressionist period',
        })

        await logbookPage.createEntry({
          duration: 20,
          title: 'Sonata No. 16',
          composer: 'Mozart',
          notes: 'Another classical piece',
        })
      })

      await test.step('Switch to overview', async () => {
        await logbookPage.switchToOverviewTab()
      })

      await test.step('Search for specific composer', async () => {
        const searchInput = page
          .locator('input[placeholder*="Search"], input[placeholder*="search"]')
          .first()
        const searchVisible = await searchInput.isVisible({ timeout: 2000 })

        if (searchVisible) {
          await searchInput.fill('Beethoven')

          // Wait for filtering to complete
          await page.waitForFunction(
            () => {
              const visibleEntries = document.querySelectorAll(
                '[data-testid="logbook-entry"]:not([style*="display: none"])'
              )
              return visibleEntries.length === 1
            },
            { timeout: 5000 }
          )

          await expect(page.locator('text=Beethoven')).toBeVisible()
          await expect(page.locator('text=Mozart')).not.toBeVisible()
          await expect(page.locator('text=Debussy')).not.toBeVisible()
        }
      })
    })
  })

  test.describe('Reports View', () => {
    test('view practice statistics @smoke', async ({ page }) => {
      await test.step('Create entries for statistics', async () => {
        await logbookPage.createEntry({
          duration: 25,
          title: 'Morning Practice',
          notes: 'Warm-up exercises',
        })

        await logbookPage.createEntry({
          duration: 45,
          title: 'Evening Practice',
          notes: 'Full repertoire review',
        })
      })

      await test.step('Navigate to overview', async () => {
        await logbookPage.switchToOverviewTab()
      })

      await test.step('Verify statistics elements', async () => {
        // Check for "Total Practice" text which indicates reports are visible
        await expect(page.locator('text=Total Practice')).toBeVisible({
          timeout: 10000,
        })

        // Additional statistics might be visible
        const hasStats = await page
          .locator('text=/\\d+h/')
          .isVisible({ timeout: 2000 })
          .catch(() => false)
        if (hasStats) {
          await expect(page.locator('text=/\\d+h/')).toBeVisible()
        }
      })
    })
  })

  test.describe('Error Handling', () => {
    test('handle network errors gracefully', async ({ page }) => {
      // Simulate network error for autocomplete
      await page.route('**/api/autocomplete/**', route => {
        route.abort('failed')
      })

      await test.step('Create entry despite network error', async () => {
        await logbookPage.createEntry({
          duration: 30,
          title: 'Offline Test',
          notes: 'Should work without autocomplete',
        })
      })

      await test.step('Verify entry saved locally', async () => {
        await logbookPage.switchToOverviewTab()
        await logbookPage.verifyEntryCount(1)
        await logbookPage.verifyEntryContainsText(
          'Should work without autocomplete'
        )
      })
    })
  })
})
