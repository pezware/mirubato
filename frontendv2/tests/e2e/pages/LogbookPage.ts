import { Page, expect } from '@playwright/test'
import { waitForTabContent, waitForAnimations } from '../helpers/wait-helpers'

export class LogbookPage {
  constructor(private page: Page) {}

  // Locators
  private get newEntryTab() {
    return this.page.locator('[data-testid="newEntry-tab"]')
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

  // Helper to dismiss any UI prompts that might block interactions
  async dismissPrompts() {
    // Check for multiple variations of the repertoire prompt
    const repertoirePromptVariations = [
      'text="Add to Your Pieces?"',
      'text="Add to Your Repertoire?"',
      'text="You just practiced"', // Common part of the repertoire prompt
    ]

    for (const selector of repertoirePromptVariations) {
      const prompt = this.page.locator(selector)
      if (await prompt.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Try to find and click the dismiss button
        const dismissButtons = [
          'button:has-text("Not Now")',
          'button:has-text("Skip")',
          'button:has-text("Later")',
          'button[aria-label="Close"]',
        ]

        let dismissed = false
        for (const buttonSelector of dismissButtons) {
          const button = this.page.locator(buttonSelector).first()
          if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
            await button.click({ force: true })
            // Wait for prompt to start disappearing
            await prompt
              .waitFor({ state: 'hidden', timeout: 2000 })
              .catch(() => {})
            dismissed = true
            break
          }
        }

        // If no button found, try clicking outside the modal
        if (!dismissed) {
          await this.page.mouse.click(10, 10)
          // Wait for the prompt to disappear
          await prompt
            .waitFor({ state: 'hidden', timeout: 2000 })
            .catch(() => {})
        }
      }
    }

    // Dismiss any other toasts
    const toasts = this.page
      .locator('.fixed.bottom-4.right-4')
      .locator('text=/Practice logged|saved|success/i')
    const toastCount = await toasts.count()
    if (toastCount > 0) {
      await this.page.mouse.click(10, 10)
      // Wait for toasts to disappear
      await toasts
        .first()
        .waitFor({ state: 'hidden', timeout: 2000 })
        .catch(() => {})
    }
  }

  // Helper to wait for autocomplete to settle
  private async waitForAutocomplete() {
    // Wait for autocomplete dropdown to appear or disappear
    await this.page
      .waitForFunction(
        () => {
          const dropdown = document.querySelector('[role="listbox"]')
          return !dropdown || dropdown.children.length > 0
        },
        { timeout: 2000 }
      )
      .catch(() => {})
  }

  // Navigation
  async navigate() {
    await this.page.goto('/logbook', { waitUntil: 'domcontentloaded' })
    // Wait for the enhanced reports component to load
    await this.page.waitForSelector('[data-testid="overview-tab"]', {
      state: 'visible',
      timeout: 15000,
    })
    // Wait for initial data load
    await this.page
      .waitForLoadState('networkidle', { timeout: 5000 })
      .catch(() => {})
    await waitForAnimations(this.page)
  }

  async switchToNewEntryTab() {
    await waitForTabContent(this.page, 'newEntry-tab', 'logbook-entry-form')
  }

  async switchToOverviewTab() {
    await waitForTabContent(this.page, 'overview-tab', 'summary-stats')
  }

  async switchToPiecesTab() {
    // Click the repertoire tab
    await this.page.click('[data-testid="repertoire-tab"]')

    // Wait for tab to be active
    await this.page.waitForSelector(
      '[data-testid="repertoire-tab"][class*="border-morandi-purple-400"]',
      { state: 'visible', timeout: 5000 }
    )

    // Wait for content to load
    await this.page.waitForLoadState('networkidle')
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
      // Dismiss any prompts before clicking mood button
      await this.dismissPrompts()
      await this.getMoodButton(data.mood).click()
    }

    // Dismiss any existing toasts before saving
    const toasts = this.page.locator('.fixed.bottom-4.right-4')
    const toastCount = await toasts.count()
    if (toastCount > 0) {
      // Click outside to dismiss and wait for toasts to disappear
      await this.page.mouse.click(10, 10)
      await toasts
        .first()
        .waitFor({ state: 'hidden', timeout: 2000 })
        .catch(() => {})
    }

    // Save the entry with retry logic
    await this.saveEntryButton.click({ force: true })

    // Wait for save to complete
    await this.waitForSaveConfirmation()

    // Dismiss any prompts that appear after saving
    await this.dismissPrompts()
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
      this.page
        .waitForSelector('text=Practice logged', {
          state: 'visible',
          timeout: 5000,
        })
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

    // Immediately check for and dismiss any repertoire prompts
    await this.dismissPrompts()
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
    // First check if we're in the enhanced reports view
    const overviewTabVisible = await this.overviewTab
      .isVisible()
      .catch(() => false)
    if (overviewTabVisible) {
      // We're in enhanced reports, just check if the text is visible somewhere on the page
      await expect(this.page.locator(`text="${text}"`)).toBeVisible()
    } else {
      // Legacy view - check for entries
      const entry = this.entries.filter({ hasText: text })
      await expect(entry).toBeVisible()
    }
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
