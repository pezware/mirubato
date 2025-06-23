// Debug script to run in browser console
// Copy and paste this into the browser console to debug localStorage

;(function debugLocalStorage() {
  console.log('=== Mirubato LocalStorage Debug ===\n')

  // Check all relevant keys
  const keysToCheck = [
    'mirubato:logbook:entries',
    'mirubato:logbook:goals',
    'mirubato_logbook_entries',
    'mirubato_goals',
    'mirubato:logbook',
    'logbook',
    'mirubato_logbook',
    'practice_sessions',
    'practiceLogbook',
  ]

  console.log('Checking standard keys:')
  keysToCheck.forEach(key => {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          console.log(`✅ ${key}: ${parsed.length} items`)
          if (parsed.length > 0) {
            console.log('   Sample:', parsed[0])
          }
        } else {
          console.log(`✅ ${key}: Object with keys:`, Object.keys(parsed))
        }
      } catch (e) {
        console.log(`⚠️ ${key}: Invalid JSON (${value.substring(0, 50)}...)`)
      }
    }
  })

  // Check for individual entry keys
  console.log('\nChecking individual entry keys:')
  const allKeys = Object.keys(localStorage)
  const entryKeys = allKeys.filter(key =>
    key.startsWith('mirubato:logbook:entry_')
  )

  if (entryKeys.length > 0) {
    console.log(`Found ${entryKeys.length} individual entry keys`)

    // Show a sample
    const sampleKey = entryKeys[0]
    const sampleValue = localStorage.getItem(sampleKey)
    try {
      const parsed = JSON.parse(sampleValue)
      console.log('Sample entry:', sampleKey, parsed)
    } catch (e) {
      console.log('Sample entry (raw):', sampleKey, sampleValue)
    }
  }

  // Check all keys that contain 'mirubato' or 'logbook'
  console.log('\nAll keys containing "mirubato" or "logbook":')
  const relevantKeys = allKeys.filter(
    key =>
      key.toLowerCase().includes('mirubato') ||
      key.toLowerCase().includes('logbook') ||
      key.toLowerCase().includes('practice')
  )
  relevantKeys.forEach(key => {
    if (
      !keysToCheck.includes(key) &&
      !key.startsWith('mirubato:logbook:entry_')
    ) {
      console.log(`🔍 ${key}`)
    }
  })

  // Migration helper
  console.log('\n=== Migration Helper ===')
  console.log('To manually migrate data to frontendv2, run:')
  console.log('migrateLegacyData() // If the function is available')
  console.log('Or copy this to migrate mirubato_logbook_entries:')
  console.log(`
const oldData = localStorage.getItem('mirubato_logbook_entries');
if (oldData) {
  localStorage.setItem('mirubato:logbook:entries', oldData);
  console.log('✅ Migrated!');
}
  `)
})()
