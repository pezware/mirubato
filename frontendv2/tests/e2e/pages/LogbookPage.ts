import { Page, expect } from '@playwright/test'

export class LogbookPage {
  constructor(private page: Page) {}

  // Locators
  private get newEntryTab() {
    return this.page.locator('[data-testid="new-entry-tab"]')
  }

  private get overviewTab() {
    return this.page.locator('[data-testid="overview-tab"]')
  }

  private get piecesTab() {
    return this.page.locator('[data-testid="pieces-tab"]')
  }

  private get entryForm() {
    return this.page.locator('[data-testid="logbook-entry-form"]')
  }

  private get durationInput() {
    return this.page.locator('[data-testid="duration-input"]')
  }

  private get notesTextarea() {
    return this.page.locator('[data-testid="notes-textarea"]')
  }

  private get saveEntryButton() {
    return this.page.locator('[data-testid="save-entry-button"]')
  }

  private get exportJsonButton() {
    return this.page.locator('[data-testid="export-json-button"]')
  }

  private get exportCsvButton() {
    return this.page.locator('[data-testid="export-csv-button"]')
  }

  private get entries() {
    return this.page.locator('[data-testid="logbook-entry"]')
  }

  private getMoodButton(
    mood: 'frustrated' | 'neutral' | 'satisfied' | 'excited'
  ) {
    return this.page.locator(`[data-testid="mood-button-${mood}"]`)
  }

  // Helper to wait for autocomplete to settle
  private async waitForAutocomplete() {
    // Wait for any network requests to complete
    await this.page
      .waitForLoadState('networkidle', { timeout: 2000 })
      .catch(() => {})
    // Wait for debounce using evaluate instead of fixed timeout
    await this.page.evaluate(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )
  }

  // Navigation
  async navigate() {
    await this.page.goto('/logbook')
    await this.page.waitForLoadState('networkidle')
    // Wait for the enhanced reports component to load
    await this.page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 10000,
    })
  }

  async switchToNewEntryTab() {
    await this.newEntryTab.click()
    await this.entryForm.waitFor({ state: 'visible' })
  }

  async switchToOverviewTab() {
    await this.overviewTab.click()
    // Wait for tab content to load
    await this.page
      .waitForLoadState('networkidle', { timeout: 2000 })
      .catch(() => {})
    // Or wait for any existing entries to be visible
    await this.page
      .waitForSelector('[data-testid="logbook-entry"], text="Total Practice"', {
        state: 'visible',
        timeout: 1000,
      })
      .catch(() => {})
  }

  async switchToPiecesTab() {
    await this.piecesTab.click()
  }

  // Entry creation
  async createEntry(data: {
    duration: number
    title: string
    composer?: string
    notes?: string
    mood?: 'frustrated' | 'neutral' | 'satisfied' | 'excited'
  }) {
    // Switch to new entry tab if not already there
    const isFormVisible = await this.entryForm
      .isVisible({ timeout: 1000 })
      .catch(() => false)
    if (!isFormVisible) {
      await this.switchToNewEntryTab()
    }

    // Fill duration
    await this.durationInput.clear()
    await this.durationInput.fill(data.duration.toString())

    // Fill piece title
    const titleInput = this.page.locator('[data-testid="piece-title-input"]')
    await titleInput.fill(data.title)
    await this.waitForAutocomplete()
    await titleInput.press('Escape') // Close autocomplete dropdown

    // Fill composer if provided
    if (data.composer) {
      const composerInput = this.page.locator('[data-testid="composer-input"]')
      await composerInput.fill(data.composer)
      await this.waitForAutocomplete()
      await composerInput.press('Escape') // Close autocomplete dropdown
    }

    // Fill notes if provided
    if (data.notes) {
      await this.notesTextarea.fill(data.notes)
    }

    // Select mood if provided
    if (data.mood) {
      await this.getMoodButton(data.mood).click()
    }

    // Save the entry
    await this.saveEntryButton.click()

    // Wait for save to complete
    await this.waitForSaveConfirmation()
  }

  // Wait helpers
  async waitForSaveConfirmation() {
    // Wait for either success message or for the form to reset
    await Promise.race([
      this.page
        .waitForSelector('text=saved', { state: 'visible', timeout: 5000 })
        .catch(() => {}),
      this.page
        .waitForSelector('text=success', { state: 'visible', timeout: 5000 })
        .catch(() => {}),
      // Or wait for the duration field to reset to default
      this.page
        .waitForFunction(
          () => {
            const input = document.querySelector(
              '[data-testid="duration-input"]'
            ) as HTMLInputElement
            return input && input.value === '30'
          },
          { timeout: 5000 }
        )
        .catch(() => {}),
    ])
  }

  async waitForEntries(minCount: number = 1) {
    await this.page.waitForFunction(
      count => {
        const entries = document.querySelectorAll(
          '[data-testid="logbook-entry"]'
        )
        return entries.length >= count
      },
      minCount,
      { timeout: 10000 }
    )
  }

  // Verification helpers
  async verifyEntryCount(expectedCount: number) {
    await this.waitForEntries(expectedCount)
    const count = await this.entries.count()
    expect(count).toBe(expectedCount)
  }

  async verifyEntryContainsText(text: string) {
    const entry = this.entries.filter({ hasText: text })
    await expect(entry).toBeVisible()
  }

  async getEntryByIndex(index: number) {
    return this.entries.nth(index)
  }

  async expandEntry(index: number) {
    const entry = await this.getEntryByIndex(index)
    await entry.click()
    // Wait for expansion animation using requestAnimationFrame
    await this.page.evaluate(() => {
      return new Promise(resolve => {
        let start: number | null = null
        function frame(timestamp: number) {
          if (!start) start = timestamp
          if (timestamp - start < 300) {
            requestAnimationFrame(frame)
          } else {
            resolve(undefined)
          }
        }
        requestAnimationFrame(frame)
      })
    })
  }

  // Export functionality
  async exportAsJson() {
    // Set up download promise before clicking
    const downloadPromise = this.page.waitForEvent('download')
    await this.exportJsonButton.click()
    const download = await downloadPromise
    return download
  }

  async exportAsCsv() {
    // Set up download promise before clicking
    const downloadPromise = this.page.waitForEvent('download')
    await this.exportCsvButton.click()
    const download = await downloadPromise
    return download
  }

  // Data helpers
  async getStoredEntries() {
    return await this.page.evaluate(() => {
      const stored = localStorage.getItem('mirubato:logbook:entries')
      return stored ? JSON.parse(stored) : []
    })
  }

  async clearAllEntries() {
    await this.page.evaluate(() => {
      localStorage.removeItem('mirubato:logbook:entries')
    })
  }
}
