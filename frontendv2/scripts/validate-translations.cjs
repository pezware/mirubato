#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

// Configuration
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales')
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh-TW', 'zh-CN']
const NAMESPACES = [
  'common',
  'auth',
  'errors',
  'logbook',
  'reports',
  'scorebook',
  'toolbox',
]
const REFERENCE_LANGUAGE = 'en' // English as the reference language

// Results storage
const results = {
  missingKeys: {},
  extraKeys: {},
  emptyValues: {},
  statistics: {},
}

// Helper to load JSON file
function loadJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    console.error(chalk.red(`Error loading ${filePath}:`), error.message)
    return null
  }
}

// Helper to get all keys from nested object
function getAllKeys(obj, prefix = '') {
  let keys = []
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (
      typeof obj[key] === 'object' &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys = keys.concat(getAllKeys(obj[key], fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

// Helper to get value by dot notation key
function getValueByKey(obj, key) {
  return key.split('.').reduce((acc, part) => acc && acc[part], obj)
}

// Validate translations for a namespace
function validateNamespace(namespace) {
  console.log(chalk.blue(`\nValidating namespace: ${namespace}`))

  // Load reference language file
  const referencePath = path.join(
    LOCALES_DIR,
    REFERENCE_LANGUAGE,
    `${namespace}.json`
  )
  const referenceData = loadJsonFile(referencePath)

  if (!referenceData) {
    console.error(chalk.red(`Could not load reference file for ${namespace}`))
    return
  }

  const referenceKeys = getAllKeys(referenceData)
  results.statistics[namespace] = {
    referenceKeyCount: referenceKeys.length,
    languages: {},
  }

  // Check each language
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang === REFERENCE_LANGUAGE) return

    const langPath = path.join(LOCALES_DIR, lang, `${namespace}.json`)
    const langData = loadJsonFile(langPath)

    if (!langData) {
      console.error(chalk.red(`Could not load ${lang} file for ${namespace}`))
      return
    }

    const langKeys = getAllKeys(langData)
    const namespaceKey = `${namespace}:${lang}`

    // Initialize results for this namespace/language
    results.missingKeys[namespaceKey] = []
    results.extraKeys[namespaceKey] = []
    results.emptyValues[namespaceKey] = []

    // Check for missing keys
    referenceKeys.forEach(key => {
      if (!langKeys.includes(key)) {
        results.missingKeys[namespaceKey].push(key)
      } else {
        // Check for empty values
        const value = getValueByKey(langData, key)
        if (value === '' || value === null || value === undefined) {
          results.emptyValues[namespaceKey].push(key)
        }
      }
    })

    // Check for extra keys (keys in translation that aren't in reference)
    langKeys.forEach(key => {
      if (!referenceKeys.includes(key)) {
        results.extraKeys[namespaceKey].push(key)
      }
    })

    // Store statistics
    results.statistics[namespace].languages[lang] = {
      totalKeys: langKeys.length,
      missingKeys: results.missingKeys[namespaceKey].length,
      extraKeys: results.extraKeys[namespaceKey].length,
      emptyValues: results.emptyValues[namespaceKey].length,
      completeness: (
        ((langKeys.length - results.missingKeys[namespaceKey].length) /
          referenceKeys.length) *
        100
      ).toFixed(2),
    }
  })
}

// Generate summary report
function generateReport() {
  console.log(chalk.bold.green('\n\n📊 Translation Validation Report'))
  console.log(chalk.gray('='.repeat(60)))

  let hasIssues = false

  // Summary by namespace
  NAMESPACES.forEach(namespace => {
    const stats = results.statistics[namespace]
    if (!stats) return

    console.log(
      chalk.bold.blue(
        `\n${namespace.toUpperCase()} (${stats.referenceKeyCount} keys)`
      )
    )

    SUPPORTED_LANGUAGES.forEach(lang => {
      if (lang === REFERENCE_LANGUAGE) return

      const langStats = stats.languages[lang]
      if (!langStats) return

      const namespaceKey = `${namespace}:${lang}`
      const missing = results.missingKeys[namespaceKey].length
      const extra = results.extraKeys[namespaceKey].length
      const empty = results.emptyValues[namespaceKey].length

      let status = chalk.green('✓')
      let statusText = 'Complete'

      if (missing > 0 || empty > 0) {
        status = chalk.red('✗')
        statusText = chalk.red('Issues found')
        hasIssues = true
      } else if (extra > 0) {
        status = chalk.yellow('⚠')
        statusText = chalk.yellow('Extra keys')
        hasIssues = true
      }

      console.log(
        `  ${status} ${lang}: ${langStats.completeness}% complete - ${statusText}`
      )

      if (missing > 0) {
        console.log(chalk.red(`     Missing: ${missing} keys`))
      }
      if (empty > 0) {
        console.log(chalk.yellow(`     Empty: ${empty} values`))
      }
      if (extra > 0) {
        console.log(chalk.blue(`     Extra: ${extra} keys`))
      }
    })
  })

  // Detailed issues
  if (hasIssues) {
    console.log(chalk.bold.red('\n\n📋 Detailed Issues'))
    console.log(chalk.gray('='.repeat(60)))

    // Missing keys
    const missingKeysExist = Object.values(results.missingKeys).some(
      arr => arr.length > 0
    )
    if (missingKeysExist) {
      console.log(chalk.bold.red('\n🔴 Missing Keys:'))
      Object.entries(results.missingKeys).forEach(([key, keys]) => {
        if (keys.length > 0) {
          const [namespace, lang] = key.split(':')
          console.log(chalk.yellow(`\n  ${namespace} (${lang}):`))
          keys.slice(0, 5).forEach(k => console.log(`    - ${k}`))
          if (keys.length > 5) {
            console.log(chalk.gray(`    ... and ${keys.length - 5} more`))
          }
        }
      })
    }

    // Empty values
    const emptyValuesExist = Object.values(results.emptyValues).some(
      arr => arr.length > 0
    )
    if (emptyValuesExist) {
      console.log(chalk.bold.yellow('\n⚠️  Empty Values:'))
      Object.entries(results.emptyValues).forEach(([key, keys]) => {
        if (keys.length > 0) {
          const [namespace, lang] = key.split(':')
          console.log(chalk.yellow(`\n  ${namespace} (${lang}):`))
          keys.slice(0, 5).forEach(k => console.log(`    - ${k}`))
          if (keys.length > 5) {
            console.log(chalk.gray(`    ... and ${keys.length - 5} more`))
          }
        }
      })
    }

    // Extra keys (optional, less critical)
    const extraKeysExist = Object.values(results.extraKeys).some(
      arr => arr.length > 0
    )
    if (extraKeysExist) {
      console.log(chalk.bold.blue('\n🔵 Extra Keys (not in reference):'))
      Object.entries(results.extraKeys).forEach(([key, keys]) => {
        if (keys.length > 0) {
          const [namespace, lang] = key.split(':')
          console.log(chalk.blue(`\n  ${namespace} (${lang}):`))
          keys.slice(0, 3).forEach(k => console.log(`    - ${k}`))
          if (keys.length > 3) {
            console.log(chalk.gray(`    ... and ${keys.length - 3} more`))
          }
        }
      })
    }
  } else {
    console.log(
      chalk.bold.green('\n\n✅ All translations are complete and valid!')
    )
  }

  // Export option
  console.log(chalk.gray('\n\n' + '='.repeat(60)))
  console.log(
    chalk.gray('Run with --json flag to export detailed results to JSON file')
  )

  return hasIssues
}

// Export results to JSON
function exportResults() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `translation-validation-${timestamp}.json`
  const filepath = path.join(__dirname, filename)

  fs.writeFileSync(filepath, JSON.stringify(results, null, 2))
  console.log(chalk.green(`\n📄 Detailed results exported to: ${filename}`))
}

// Main execution
function main() {
  console.log(chalk.bold.cyan('🌐 Translation Validation Tool'))
  console.log(
    chalk.gray(
      `Validating ${SUPPORTED_LANGUAGES.length} languages across ${NAMESPACES.length} namespaces\n`
    )
  )

  // Validate each namespace
  NAMESPACES.forEach(validateNamespace)

  // Generate report
  const hasIssues = generateReport()

  // Export if requested
  if (process.argv.includes('--json')) {
    exportResults()
  }

  // Exit with error code if issues found
  if (hasIssues && !process.argv.includes('--no-fail')) {
    process.exit(1)
  }
}

// Run the validation
main()
