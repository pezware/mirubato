import { transformLegacyEntries } from './transformLegacyEntry'

// Migrate data from the original frontend localStorage keys
export function migrateLegacyData() {
  const newEntriesKey = 'mirubato:logbook:entries'
  const newGoalsKey = 'mirubato:logbook:goals'

  // Check if we already have data in the new format
  const existingData = localStorage.getItem(newEntriesKey)
  if (existingData) {
    try {
      const parsed = JSON.parse(existingData)
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`Already have ${parsed.length} entries in new format`)
        return // Already migrated or has new data
      }
    } catch {
      // Continue with migration
    }
  }

  // Original frontend analytics module uses these keys
  const analyticsEntriesKey = 'mirubato_logbook_entries'
  const analyticsGoalsKey = 'mirubato_goals'

  // Check analytics module keys first (most likely to exist)
  const analyticsEntries = localStorage.getItem(analyticsEntriesKey)
  if (analyticsEntries) {
    try {
      const entries = JSON.parse(analyticsEntries)
      if (Array.isArray(entries) && entries.length > 0) {
        // Transform entries to new format
        const transformed = transformLegacyEntries(entries)
        localStorage.setItem(newEntriesKey, JSON.stringify(transformed))
        console.log(
          `✅ Migrated ${transformed.length} entries from analytics module`
        )
      }
    } catch (error) {
      console.warn('Failed to parse analytics entries:', error)
    }
  }

  // Check for goals
  const analyticsGoals = localStorage.getItem(analyticsGoalsKey)
  if (analyticsGoals) {
    try {
      const goals = JSON.parse(analyticsGoals)
      if (Array.isArray(goals) && goals.length > 0) {
        localStorage.setItem(newGoalsKey, JSON.stringify(goals))
        console.log(`✅ Migrated ${goals.length} goals from analytics module`)
      }
    } catch (error) {
      console.warn('Failed to parse analytics goals:', error)
    }
  }

  // Check for individual entries stored by modules (EventDrivenStorage pattern)
  const allKeys = Object.keys(localStorage)
  const entryKeys = allKeys.filter(key =>
    key.startsWith('mirubato:logbook:entry_')
  )

  if (entryKeys.length > 0 && !analyticsEntries) {
    const entries = []

    for (const key of entryKeys) {
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const parsed = JSON.parse(data)
          // Module storage wraps data in {value: actualData, _metadata: {...}}
          const entry = parsed.value || parsed
          if (entry) {
            entries.push(entry)
          }
        }
      } catch (error) {
        console.warn(`Failed to parse entry ${key}:`, error)
      }
    }

    if (entries.length > 0) {
      // Sort by timestamp if available
      entries.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime()
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime()
        return timeB - timeA // Newest first
      })

      // Transform entries to new format
      const transformed = transformLegacyEntries(entries)
      localStorage.setItem(newEntriesKey, JSON.stringify(transformed))
      console.log(
        `✅ Migrated ${transformed.length} individual entries from module storage`
      )
    }
  }

  // Try legacy keys as fallback
  const legacyKeys = [
    'mirubato:logbook',
    'logbook',
    'mirubato_logbook',
    'mirubato-logbook',
    'practice_sessions',
    'practiceLogbook',
  ]

  if (!localStorage.getItem(newEntriesKey)) {
    for (const key of legacyKeys) {
      const legacyData = localStorage.getItem(key)
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData)

          // Handle different legacy formats
          let entries = []

          if (Array.isArray(parsed)) {
            entries = parsed
          } else if (parsed.entries && Array.isArray(parsed.entries)) {
            entries = parsed.entries
          } else if (parsed.logbook && Array.isArray(parsed.logbook)) {
            entries = parsed.logbook
          } else if (parsed.data && Array.isArray(parsed.data)) {
            entries = parsed.data
          }

          if (entries.length > 0) {
            // Transform entries to new format
            const transformed = transformLegacyEntries(entries)
            localStorage.setItem(newEntriesKey, JSON.stringify(transformed))
            console.log(
              `✅ Migrated ${transformed.length} entries from legacy key: ${key}`
            )
            break
          }
        } catch (error) {
          console.warn(`Failed to parse legacy data from key ${key}:`, error)
        }
      }
    }
  }

  // Initialize with empty arrays if no data found
  if (!localStorage.getItem(newEntriesKey)) {
    localStorage.setItem(newEntriesKey, JSON.stringify([]))
    console.log('📝 Initialized empty entries array')
  }

  if (!localStorage.getItem(newGoalsKey)) {
    localStorage.setItem(newGoalsKey, JSON.stringify([]))
    console.log('📝 Initialized empty goals array')
  }
}

// Debug helper to inspect localStorage
export function debugLocalStorage() {
  console.log('=== LocalStorage Debug ===')
  const relevantKeys = [
    'mirubato:logbook:entries',
    'mirubato:logbook:goals',
    'mirubato_logbook_entries',
    'mirubato_goals',
    'mirubato:logbook',
    'logbook',
    'mirubato_logbook',
  ]

  relevantKeys.forEach(key => {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        const parsed = JSON.parse(value)
        console.log(
          `${key}: ${Array.isArray(parsed) ? parsed.length + ' items' : 'object'}`,
          parsed
        )
      } catch {
        console.log(`${key}: [invalid JSON]`, value)
      }
    }
  })

  // Check for individual entries
  const allKeys = Object.keys(localStorage)
  const entryKeys = allKeys.filter(key =>
    key.startsWith('mirubato:logbook:entry_')
  )
  if (entryKeys.length > 0) {
    console.log(`Found ${entryKeys.length} individual entry keys`)
  }
}
