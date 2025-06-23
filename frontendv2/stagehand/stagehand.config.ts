import { StagehandConfig } from '@browserbasehq/stagehand'

export const config: StagehandConfig = {
  // Model configuration
  modelName: 'gpt-4', // or 'claude-3-opus' if you prefer
  modelApiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,

  // Browser configuration
  browserOptions: {
    headless: process.env.CI === 'true',
    slowMo: process.env.CI ? 0 : 50,
  },

  // Test configuration
  testTimeout: 60000, // 1 minute timeout for AI-driven tests

  // Retry configuration
  retries: process.env.CI ? 3 : 1,

  // Screenshot configuration
  screenshotOnFailure: true,
  screenshotPath: './test-results/screenshots',

  // Custom selectors for Mirubato app
  customSelectors: {
    // Logbook specific selectors
    addEntryButton: 'button:has-text("Add Entry")',
    saveButton: 'button:has-text("Save")',
    deleteButton: 'button:has-text("Delete")',

    // Form fields
    durationInput: 'input[name="duration"]',
    instrumentSelect: 'select[name="instrument"]',
    notesTextarea: 'textarea[name="notes"]',

    // Navigation
    logbookLink: 'a[href="/logbook"]',
    homeLink: 'a[href="/"]',
  },
}

export default config
