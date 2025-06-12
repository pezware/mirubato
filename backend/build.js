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
    console.log('Moving to expected location...')

    try {
      // Use fs operations instead of shell commands for better cross-platform support
      const content = readFileSync(foundPath)
      writeFileSync(indexPath, content)
      console.log('Successfully moved index.js to dist/')
    } catch (error) {
      console.error('Failed to move index.js:', error)
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

// Final verification
if (!existsSync(indexPath)) {
  console.error('\nFINAL CHECK FAILED: dist/index.js still does not exist!')
  process.exit(1)
} else {
  console.log('✓ Build output verified')
}
