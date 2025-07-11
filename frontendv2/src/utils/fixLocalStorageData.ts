/**
 * Fix localStorage data where array fields might be stored as strings
 */
export function fixLocalStorageData() {
  const ENTRIES_KEY = 'mirubato:logbook:entries'
  const BACKUP_KEY = 'mirubato:logbook:entries:backup'

  try {
    const stored = localStorage.getItem(ENTRIES_KEY)
    if (!stored) return

    // Create a backup before attempting to fix
    localStorage.setItem(BACKUP_KEY, stored)
    console.log('Created backup of entries before fixing')

    const entries = JSON.parse(stored)
    if (!Array.isArray(entries)) return

    let hasChanges = false

    // Fix each entry
    const fixedEntries = entries.map(entry => {
      let changed = false
      const fixed = { ...entry }

      // Fix pieces if it's a string
      if (typeof fixed.pieces === 'string') {
        try {
          fixed.pieces = JSON.parse(fixed.pieces)
          changed = true
        } catch (_e) {
          fixed.pieces = []
          changed = true
        }
      } else if (!Array.isArray(fixed.pieces)) {
        fixed.pieces = []
        changed = true
      }

      // Fix techniques if it's a string
      if (typeof fixed.techniques === 'string') {
        try {
          fixed.techniques = JSON.parse(fixed.techniques)
          changed = true
        } catch (_e) {
          fixed.techniques = []
          changed = true
        }
      } else if (!Array.isArray(fixed.techniques)) {
        fixed.techniques = []
        changed = true
      }

      // Fix tags if it's a string
      if (typeof fixed.tags === 'string') {
        try {
          fixed.tags = JSON.parse(fixed.tags)
          changed = true
        } catch (_e) {
          fixed.tags = []
          changed = true
        }
      } else if (!Array.isArray(fixed.tags)) {
        fixed.tags = []
        changed = true
      }

      // Fix goalIds if it's a string
      if (typeof fixed.goalIds === 'string') {
        try {
          fixed.goalIds = JSON.parse(fixed.goalIds)
          changed = true
        } catch (_e) {
          fixed.goalIds = []
          changed = true
        }
      } else if (!Array.isArray(fixed.goalIds)) {
        fixed.goalIds = []
        changed = true
      }

      if (changed) {
        hasChanges = true
        console.log(
          `Fixed entry ${entry.id} - converted string arrays to proper arrays`
        )
      }

      return fixed
    })

    if (hasChanges) {
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(fixedEntries))
      console.log('✅ Fixed localStorage entries with string arrays')
    }
  } catch (error) {
    console.error('Failed to fix localStorage data:', error)
    // DO NOT clear data on error - this causes data loss!
    // Keep the original data even if we can't fix it
    console.log(
      'Error fixing localStorage data, but keeping original data to prevent loss'
    )
  }
}

/**
 * Attempts to recover entries from backup if main entries are missing
 */
export function recoverFromBackup() {
  const ENTRIES_KEY = 'mirubato:logbook:entries'
  const BACKUP_KEY = 'mirubato:logbook:entries:backup'

  const currentEntries = localStorage.getItem(ENTRIES_KEY)
  const backup = localStorage.getItem(BACKUP_KEY)

  if (!currentEntries && backup) {
    console.log('No entries found but backup exists, recovering...')
    localStorage.setItem(ENTRIES_KEY, backup)
    return true
  }

  if (backup) {
    try {
      const currentCount = currentEntries
        ? JSON.parse(currentEntries).length
        : 0
      const backupCount = JSON.parse(backup).length
      console.log(
        `Current entries: ${currentCount}, Backup entries: ${backupCount}`
      )

      if (backupCount > currentCount) {
        console.log(
          'Backup has more entries than current, consider manual recovery'
        )
        console.log(
          'Run: localStorage.setItem("mirubato:logbook:entries", localStorage.getItem("mirubato:logbook:entries:backup"))'
        )
      }
    } catch (e) {
      console.error('Error checking backup:', e)
    }
  }

  return false
}
