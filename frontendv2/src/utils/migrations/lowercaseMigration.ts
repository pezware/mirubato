/**
 * Migration utility to convert uppercase enum values to lowercase in localStorage
 * This runs once per user to ensure smooth transition during the lowercase migration
 */

const MIGRATION_KEY = 'mirubato:lowercase-migration-v1'

interface MigratableEntry {
  type?: string
  instrument?: string
  mood?: string | null
  [key: string]: unknown
}

/**
 * Migrates a single entry from uppercase to lowercase enums
 */
const migrateEntry = (entry: MigratableEntry): MigratableEntry => ({
  ...entry,
  type: entry.type?.toLowerCase(),
  instrument: entry.instrument?.toLowerCase(),
  mood: entry.mood?.toLowerCase() || null,
})

/**
 * Runs the lowercase migration for all localStorage data
 * This function is idempotent - it can be safely called multiple times
 */
export const runLowercaseMigration = (): void => {
  // Check if migration already ran
  if (localStorage.getItem(MIGRATION_KEY)) {
    console.log('[Migration] Lowercase migration already completed')
    return
  }

  console.log('[Migration] Starting lowercase migration...')

  try {
    // Migrate logbook entries
    const entriesKey = 'mirubato:logbook:entries'
    const storedEntries = localStorage.getItem(entriesKey)

    if (storedEntries) {
      try {
        const entries = JSON.parse(storedEntries) as MigratableEntry[]
        const migratedEntries = entries.map(migrateEntry)
        localStorage.setItem(entriesKey, JSON.stringify(migratedEntries))
        console.log(`[Migration] Migrated ${entries.length} logbook entries`)
      } catch (error) {
        console.error('[Migration] Failed to migrate logbook entries:', error)
      }
    }

    // Migrate goals if they exist in localStorage
    const goalsKey = 'mirubato:logbook:goals'
    const storedGoals = localStorage.getItem(goalsKey)

    if (storedGoals) {
      try {
        const goals = JSON.parse(storedGoals) as Array<{
          status?: string
          [key: string]: unknown
        }>
        const migratedGoals = goals.map(goal => ({
          ...goal,
          status: goal.status?.toLowerCase(),
        }))
        localStorage.setItem(goalsKey, JSON.stringify(migratedGoals))
        console.log(`[Migration] Migrated ${goals.length} goals`)
      } catch (error) {
        console.error('[Migration] Failed to migrate goals:', error)
      }
    }

    // Migrate auto-logging config
    const autoLoggingKey = 'mirubato:auto-logging:config'
    const storedConfig = localStorage.getItem(autoLoggingKey)

    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig) as {
          defaultInstrument?: string
          [key: string]: unknown
        }
        if (config.defaultInstrument) {
          config.defaultInstrument = config.defaultInstrument.toLowerCase()
          localStorage.setItem(autoLoggingKey, JSON.stringify(config))
          console.log('[Migration] Migrated auto-logging config')
        }
      } catch (error) {
        console.error(
          '[Migration] Failed to migrate auto-logging config:',
          error
        )
      }
    }

    // Mark migration as complete
    localStorage.setItem(MIGRATION_KEY, new Date().toISOString())
    console.log('[Migration] Lowercase migration completed successfully')
  } catch (error) {
    console.error('[Migration] Critical error during migration:', error)
    // Don't mark as complete if there was a critical error
  }
}

/**
 * Checks if the lowercase migration has been completed
 */
export const isLowercaseMigrationComplete = (): boolean => {
  return localStorage.getItem(MIGRATION_KEY) !== null
}

/**
 * Resets the migration status (useful for testing)
 */
export const resetLowercaseMigration = (): void => {
  localStorage.removeItem(MIGRATION_KEY)
  console.log('[Migration] Reset lowercase migration status')
}
