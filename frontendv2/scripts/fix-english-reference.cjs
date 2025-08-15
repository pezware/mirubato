#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const LOCALES_DIR = path.join(__dirname, '../src/locales')
const LANGUAGES = ['es', 'fr', 'de', 'zh-TW', 'zh-CN']

// Function to get all keys from an object
function getAllKeys(obj, prefix = '') {
  let keys = []
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

// Function to get value by path
function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc && acc[key], obj)
}

// Function to set value by path
function setValueByPath(obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const parent = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {}
    return acc[key]
  }, obj)
  parent[lastKey] = value
}

// Function to sort object keys
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj

  const sorted = {}
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = sortObjectKeys(obj[key])
    })
  return sorted
}

// Process each namespace
const namespaces = fs
  .readdirSync(path.join(LOCALES_DIR, 'en'))
  .filter(file => file.endsWith('.json'))
  .map(file => file.replace('.json', ''))

console.log('Finding missing keys in English reference files...\n')

let totalMissingKeys = 0

namespaces.forEach(namespace => {
  const enPath = path.join(LOCALES_DIR, 'en', `${namespace}.json`)
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'))
  const enKeys = getAllKeys(enData)

  // Collect all keys from other languages
  const allKeysFromOtherLangs = new Set()
  const keyExamples = {}

  LANGUAGES.forEach(lang => {
    const langPath = path.join(LOCALES_DIR, lang, `${namespace}.json`)
    if (fs.existsSync(langPath)) {
      const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'))
      const langKeys = getAllKeys(langData)

      langKeys.forEach(key => {
        if (!enKeys.includes(key)) {
          allKeysFromOtherLangs.add(key)
          if (!keyExamples[key]) {
            keyExamples[key] = {
              [lang]: getValueByPath(langData, key),
            }
          } else {
            keyExamples[key][lang] = getValueByPath(langData, key)
          }
        }
      })
    }
  })

  const missingKeys = Array.from(allKeysFromOtherLangs).sort()

  if (missingKeys.length > 0) {
    console.log(
      `\n${namespace}.json - Missing ${missingKeys.length} keys in English:`
    )

    // Add missing keys to English file
    missingKeys.forEach(key => {
      console.log(`  ${key}:`)
      Object.entries(keyExamples[key]).forEach(([lang, value]) => {
        console.log(`    ${lang}: ${JSON.stringify(value)}`)
      })

      // Determine English value based on patterns
      let englishValue = determineEnglishValue(key, keyExamples[key])
      setValueByPath(enData, key, englishValue)
    })

    // Sort and save the updated English file
    const sortedData = sortObjectKeys(enData)
    fs.writeFileSync(enPath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8')

    totalMissingKeys += missingKeys.length
    console.log(
      `\n✅ Added ${missingKeys.length} missing keys to ${namespace}.json`
    )
  }
})

console.log(
  `\n✅ Total: Added ${totalMissingKeys} missing keys to English reference files`
)

// Function to determine English value based on key and examples
function determineEnglishValue(key, examples) {
  // Check if it's a single character (like filters.0-6)
  const keyParts = key.split('.')
  const lastPart = keyParts[keyParts.length - 1]

  // For single-digit keys that spell out words
  if (/^\d$/.test(lastPart)) {
    // Check Spanish for "Filtros" pattern
    if (examples.es) {
      const spanishLetters = ['F', 'i', 'l', 't', 'r', 'o', 's']
      const englishLetters = ['F', 'i', 'l', 't', 'e', 'r', 's']
      const index = parseInt(lastPart)
      if (examples.es === spanishLetters[index]) {
        return englishLetters[index]
      }
    }
  }

  // Common patterns
  const commonPatterns = {
    'sorting.ascending': 'Ascending',
    'sorting.descending': 'Descending',
    'sorting.primary': 'Primary',
    'sorting.secondary': 'Secondary',
    'sorting.sortBy': 'Sort by',
    'sorting.field': 'Field',
    'sorting.direction': 'Direction',
    'filters.6': 's', // Complete "Filters"
  }

  if (commonPatterns[key]) {
    return commonPatterns[key]
  }

  // If we have Traditional Chinese, it's often a good reference
  if (examples['zh-TW']) {
    // Map common Chinese patterns to English
    const chineseToEnglish = {
      升序: 'Ascending',
      降序: 'Descending',
      欄位: 'Field',
      方向: 'Direction',
      排序依據: 'Sort by',
    }

    const chineseValue = examples['zh-TW']
    if (chineseToEnglish[chineseValue]) {
      return chineseToEnglish[chineseValue]
    }
  }

  // Default: use the first available example with [NEEDS REVIEW] prefix
  const firstLang = Object.keys(examples)[0]
  return `[NEEDS REVIEW] ${examples[firstLang]}`
}
