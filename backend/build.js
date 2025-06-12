import { execSync } from 'child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Helper to recursively list directory contents
function listDirectory(dir, prefix = '') {
  if (!existsSync(dir)) return

  const items = readdirSync(dir)
  items.forEach(item => {
    const fullPath = join(dir, item)
    const stats = statSync(fullPath)
    console.log(`${prefix}${item}${stats.isDirectory() ? '/' : ''}`)
    if (stats.isDirectory() && item !== 'node_modules') {
      listDirectory(fullPath, prefix + '  ')
    }
  })
}

// Ensure dist directory exists
const distDir = join(__dirname, 'dist')
if (!existsSync(distDir)) {
  console.log('Creating dist directory...')
  mkdirSync(distDir, { recursive: true })
}

// Clean dist directory first
console.log('Cleaning dist directory...')
try {
  execSync(`rm -rf ${distDir}/*`, { stdio: 'inherit' })
} catch (error) {
  // Directory might be empty, that's ok
}

// Run TypeScript compiler
console.log('Building TypeScript...')
console.log('Current working directory:', process.cwd())
console.log('Build script directory:', __dirname)

try {
  // Change to backend directory to ensure correct relative paths
  process.chdir(__dirname)
  execSync('npx tsc', { stdio: 'inherit' })
} catch (error) {
  console.error('TypeScript compilation failed!')
  process.exit(1)
}

// List dist directory contents
console.log('\nDist directory structure:')
listDirectory(distDir)

// Verify index.js was created
const indexPath = join(distDir, 'index.js')
if (!existsSync(indexPath)) {
  console.error('\nError: dist/index.js was not created!')

  // Check if TypeScript created a nested structure
  const possiblePaths = [
    join(distDir, 'src', 'index.js'),
    join(distDir, 'backend', 'src', 'index.js'),
  ]

  let foundPath = null
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      foundPath = path
      break
    }
  }

  if (foundPath) {
    console.log(`Found index.js at: ${foundPath}`)
    console.log('Moving entire backend/src directory contents to dist/...')

    try {
      // Move all files from backend/src to dist/
      const srcDir = dirname(foundPath)
      console.log(`Moving files from: ${srcDir} to: ${distDir}`)

      // Use shell command to move all files while preserving structure
      execSync(`cp -r ${srcDir}/* ${distDir}/`, { stdio: 'inherit' })

      // Clean up the nested backend directory
      execSync(`rm -rf ${join(distDir, 'backend')}`, { stdio: 'inherit' })

      // Also clean up any shared directory that might have been copied
      if (existsSync(join(distDir, 'shared'))) {
        execSync(`rm -rf ${join(distDir, 'shared')}`, { stdio: 'inherit' })
      }

      console.log('Successfully moved all files to dist/')
    } catch (error) {
      console.error('Failed to move files:', error)
      process.exit(1)
    }
  } else {
    console.error('Could not find index.js in any expected location')
    console.error('Searched paths:', possiblePaths)
    process.exit(1)
  }
}

// Copy version.json to dist if it exists
const versionSrc = join(__dirname, 'src', 'version.json')
const versionDest = join(__dirname, 'dist', 'version.json')

if (existsSync(versionSrc)) {
  console.log('Copying version.json to dist...')
  copyFileSync(versionSrc, versionDest)
} else {
  console.log('Warning: version.json not found in src/')
}

console.log('\nBuild complete!')
console.log(`Main entry point: ${indexPath}`)

// Final verification - check that key files exist
const requiredFiles = [
  'index.js',
  'resolvers/index.js',
  'schema/index.js',
  'utils/auth.js',
  'utils/rateLimiter.js',
  'middleware/logging.js',
  'config/cors.js',
]

console.log('\nVerifying build output...')
let allFilesExist = true
for (const file of requiredFiles) {
  const filePath = join(distDir, file)
  if (!existsSync(filePath)) {
    console.error(`✗ Missing required file: ${file}`)
    allFilesExist = false
  } else {
    console.log(`✓ ${file}`)
  }
}

if (!allFilesExist) {
  console.error('\nFINAL CHECK FAILED: Some required files are missing!')
  process.exit(1)
} else {
  console.log('\n✓ Build output verified - all required files present')

  // Clean up any compiled files in shared directory to prevent Jest issues
  console.log('\nCleaning up shared directory...')
  try {
    execSync(
      'rm -f ../shared/types/*.js ../shared/types/*.js.map ../shared/types/*.d.ts ../shared/types/*.d.ts.map',
      { stdio: 'inherit' }
    )
    console.log('✓ Cleaned up compiled files from shared directory')
  } catch (error) {
    // Files might not exist, that's ok
  }
}
