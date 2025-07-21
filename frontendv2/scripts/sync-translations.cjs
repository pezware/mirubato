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
  'repertoire',
]
const REFERENCE_LANGUAGE = 'en'

// Helper to load JSON file
function loadJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    console.error(chalk.red(`Error loading ${filePath}:`), error.message)
    return null
  }
}

// Helper to save JSON file with pretty formatting
function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
}

// Deep merge objects, preserving existing translations
function deepMerge(target, source, path = '') {
  const result = { ...target }

  for (const key in source) {
    const currentPath = path ? `${path}.${key}` : key

    if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      // If target doesn't have this key, create empty object
      if (!result[key]) {
        result[key] = {}
      }
      // Recursively merge
      result[key] = deepMerge(result[key], source[key], currentPath)
    } else {
      // Only add if key doesn't exist in target
      if (!(key in result)) {
        result[key] = `[NEEDS TRANSLATION] ${source[key]}`
        console.log(chalk.yellow(`  Added: ${currentPath}`))
      }
    }
  }

  return result
}

// Remove keys that don't exist in reference
function removeExtraKeys(target, reference, path = '') {
  const result = {}

  for (const key in reference) {
    const currentPath = path ? `${path}.${key}` : key

    if (key in target) {
      if (
        typeof reference[key] === 'object' &&
        reference[key] !== null &&
        !Array.isArray(reference[key])
      ) {
        result[key] = removeExtraKeys(target[key], reference[key], currentPath)
      } else {
        result[key] = target[key]
      }
    }
  }

  // Check for removed keys
  for (const key in target) {
    if (!(key in reference)) {
      const currentPath = path ? `${path}.${key}` : key
      console.log(chalk.red(`  Removed: ${currentPath}`))
    }
  }

  return result
}

// Sort object keys recursively
function sortObjectKeys(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return obj
  }

  const sorted = {}
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = sortObjectKeys(obj[key])
    })

  return sorted
}

// Sync translations for a namespace
function syncNamespace(namespace, options = {}) {
  console.log(chalk.blue(`\nSyncing namespace: ${namespace}`))

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

  let changesMade = false

  // Sync each language
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang === REFERENCE_LANGUAGE) return

    console.log(chalk.cyan(`  ${lang}:`))

    const langPath = path.join(LOCALES_DIR, lang, `${namespace}.json`)
    let langData = loadJsonFile(langPath)

    if (!langData) {
      // Create new file if it doesn't exist
      console.log(chalk.green(`    Creating new file`))
      langData = {}
    }

    // Store original for comparison
    const originalData = JSON.stringify(langData)

    // Add missing keys
    langData = deepMerge(langData, referenceData)

    // Remove extra keys if requested
    if (options.removeExtra) {
      langData = removeExtraKeys(langData, referenceData)
    }

    // Sort keys if requested
    if (options.sortKeys) {
      langData = sortObjectKeys(langData)
    }

    // Check if changes were made
    if (JSON.stringify(langData) !== originalData) {
      changesMade = true

      if (!options.dryRun) {
        saveJsonFile(langPath, langData)
        console.log(chalk.green(`    ✓ Updated`))
      } else {
        console.log(chalk.yellow(`    ⚠ Would update (dry run)`))
      }
    } else {
      console.log(chalk.gray(`    No changes needed`))
    }
  })

  return changesMade
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    dryRun: args.includes('--dry-run'),
    removeExtra: args.includes('--remove-extra'),
    sortKeys: args.includes('--sort-keys'),
    namespace: null,
  }

  // Check for specific namespace
  const namespaceIndex = args.findIndex(arg => arg === '--namespace')
  if (namespaceIndex !== -1 && args[namespaceIndex + 1]) {
    options.namespace = args[namespaceIndex + 1]
  }

  return options
}

// Main execution
function main() {
  const options = parseArgs()

  console.log(chalk.bold.cyan('🔄 Translation Sync Tool'))
  console.log(
    chalk.gray('Syncing translations with reference language (English)\n')
  )

  if (options.dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No files will be modified\n'))
  }

  if (options.removeExtra) {
    console.log(
      chalk.red('⚠️  Will remove keys not present in reference language\n')
    )
  }

  let changesMade = false

  // Sync specific namespace or all
  if (options.namespace) {
    if (!NAMESPACES.includes(options.namespace)) {
      console.error(chalk.red(`Invalid namespace: ${options.namespace}`))
      console.log(chalk.gray(`Available namespaces: ${NAMESPACES.join(', ')}`))
      process.exit(1)
    }
    changesMade = syncNamespace(options.namespace, options)
  } else {
    // Sync all namespaces
    NAMESPACES.forEach(namespace => {
      if (syncNamespace(namespace, options)) {
        changesMade = true
      }
    })
  }

  // Summary
  console.log(chalk.gray('\n' + '='.repeat(60)))

  if (changesMade) {
    if (options.dryRun) {
      console.log(
        chalk.yellow('Changes would be made. Run without --dry-run to apply.')
      )
    } else {
      console.log(chalk.green('✅ Translations synchronized successfully!'))
      console.log(
        chalk.gray(
          '\nKeys marked with [NEEDS TRANSLATION] require translation.'
        )
      )
    }
  } else {
    console.log(chalk.green('✅ All translations are already in sync!'))
  }

  // Help text
  console.log(chalk.gray('\nOptions:'))
  console.log(
    chalk.gray(
      '  --dry-run        Show what would be changed without modifying files'
    )
  )
  console.log(
    chalk.gray(
      '  --remove-extra   Remove keys not present in reference language'
    )
  )
  console.log(chalk.gray('  --sort-keys      Sort all keys alphabetically'))
  console.log(chalk.gray('  --namespace <n>  Sync only specific namespace'))
}

// Run the sync
main()
