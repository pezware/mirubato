/**
 * Fix localStorage data where array fields might be stored as strings
 */
export function fixLocalStorageData() {
  const ENTRIES_KEY = 'mirubato:logbook:entries'

  try {
    const stored = localStorage.getItem(ENTRIES_KEY)
    if (!stored) return

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
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
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
    // If there's any error, clear the data to force a fresh sync
    localStorage.removeItem(ENTRIES_KEY)
    console.log(
      'Cleared localStorage entries due to error - will sync fresh data'
    )
  }
}
