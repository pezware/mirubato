import { execSync } from 'child_process'
import { copyFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Run TypeScript compiler
console.log('Building TypeScript...')
execSync('tsc', { stdio: 'inherit' })

// Copy version.json to dist if it exists
const versionSrc = join(__dirname, 'src', 'version.json')
const versionDest = join(__dirname, 'dist', 'version.json')

if (existsSync(versionSrc)) {
  console.log('Copying version.json to dist...')
  copyFileSync(versionSrc, versionDest)
}

console.log('Build complete!')
