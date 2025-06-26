// Script to check if there's any legacy data that needs migration
// Run this in the browser console on the production site

;(function checkLegacyData() {
  console.log('=== Checking for Legacy Data ===\n')

  // Current keys used by frontendv2
  const currentKeys = ['mirubato:logbook:entries', 'mirubato:logbook:goals']

  // Legacy keys that migrateLegacyData looks for
  const legacyKeys = [
    'mirubato_logbook_entries', // Analytics module
    'mirubato_goals', // Analytics module
    'mirubato:logbook', // Various legacy formats
    'logbook',
    'mirubato_logbook',
    'mirubato-logbook',
    'practice_sessions',
    'practiceLogbook',
  ]

  // Check current data
  console.log('Current data:')
  currentKeys.forEach(key => {
    const value = localStorage.getItem(key)
    if (value) {
      try {
        const parsed = JSON.parse(value)
        console.log(
          `✅ ${key}: ${Array.isArray(parsed) ? parsed.length + ' items' : 'exists'}`
        )
      } catch (e) {
        console.log(`⚠️ ${key}: Invalid JSON`)
      }
    } else {
      console.log(`❌ ${key}: Not found`)
    }
  })

  // Check for legacy data
  console.log('\nLegacy data that would be migrated:')
  let hasLegacyData = false

  legacyKeys.forEach(key => {
    const value = localStorage.getItem(key)
    if (value) {
      hasLegacyData = true
      try {
        const parsed = JSON.parse(value)
        console.log(
          `🔄 ${key}: ${Array.isArray(parsed) ? parsed.length + ' items' : 'exists'} (NEEDS MIGRATION)`
        )
      } catch (e) {
        console.log(`🔄 ${key}: Invalid JSON (NEEDS MIGRATION)`)
      }
    }
  })

  // Check for individual entry keys
  const allKeys = Object.keys(localStorage)
  const entryKeys = allKeys.filter(key =>
    key.startsWith('mirubato:logbook:entry_')
  )
  if (entryKeys.length > 0) {
    hasLegacyData = true
    console.log(
      `🔄 Found ${entryKeys.length} individual entry keys (NEEDS MIGRATION)`
    )
  }

  if (!hasLegacyData) {
    console.log('✅ No legacy data found!')
  }

  console.log('\n=== Recommendation ===')
  if (hasLegacyData) {
    console.log('⚠️ Legacy data exists. Keep migrateLegacyData.ts for now.')
    console.log('Run migrateLegacyData() to migrate the data.')
  } else {
    console.log(
      '✅ No legacy data found. migrateLegacyData.ts can likely be removed.'
    )
    console.log(
      "However, keep it for a few more weeks in case users haven't visited since migration."
    )
  }
})()
