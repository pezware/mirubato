// Debug script to inspect localStorage for logbook entries

console.log('=== MIRUBATO LOCALSTORAGE DEBUG ===')

// Get all localStorage keys
const allKeys = []
for (let i = 0; i < localStorage.length; i++) {
  allKeys.push(localStorage.key(i))
}

console.log('All localStorage keys:', allKeys)

// Filter for mirubato keys
const mirubatolKeys = allKeys.filter(key => key && key.startsWith('mirubato'))
console.log('Mirubato-specific keys:', mirubatolKeys)

// Look specifically for logbook entries
const logbookKeys = allKeys.filter(key => key && key.includes('logbook'))
console.log('Logbook-related keys:', logbookKeys)

// Look for any practice-related keys
const practiceKeys = allKeys.filter(key => key && key.includes('practice'))
console.log('Practice-related keys:', practiceKeys)

// Check specific patterns used by the modules
const moduleKeys = allKeys.filter(key => key && key.startsWith('mirubato:'))
console.log('Module storage keys (mirubato:*):', moduleKeys)

// Inspect each mirubato key
mirubatolKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key)
    console.log(`\n${key}:`, JSON.parse(value))
  } catch (e) {
    console.log(`\n${key}: (failed to parse)`, localStorage.getItem(key))
  }
})

moduleKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key)
    const parsed = JSON.parse(value)
    console.log(`\n${key}:`, parsed)

    // If it's wrapped with metadata, show the actual value
    if (parsed && parsed.value && parsed._metadata) {
      console.log(`  → Actual value:`, parsed.value)
    }
  } catch (e) {
    console.log(`\n${key}: (failed to parse)`, localStorage.getItem(key))
  }
})

// Get analytics data if it exists
console.log('\n=== ANALYTICS DATA ===')
const analyticsData = localStorage.getItem('mirubato_logbook_entries')
if (analyticsData) {
  try {
    const entries = JSON.parse(analyticsData)
    console.log('Direct logbook entries:', entries)
  } catch (e) {
    console.log('Failed to parse logbook entries')
  }
} else {
  console.log('No direct logbook entries found')
}

// Check if there are any practice sessions
const practiceSessionsData = localStorage.getItem('mirubato_practice_sessions')
if (practiceSessionsData) {
  try {
    const sessions = JSON.parse(practiceSessionsData)
    console.log('Practice sessions:', sessions)
    console.log('Number of practice sessions:', sessions.length)
  } catch (e) {
    console.log('Failed to parse practice sessions')
  }
} else {
  console.log('No practice sessions found')
}

console.log('\n=== END DEBUG ===')
