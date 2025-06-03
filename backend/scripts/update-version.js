import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get git info
let commitHash = 'unknown'
let branch = 'unknown'
let shortHash = 'unknown'

try {
  commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  shortHash = commitHash.substring(0, 8)
  branch = execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf8',
  }).trim()
} catch (error) {
  console.warn('Could not get git info:', error.message)
}

const versionInfo = {
  buildTime: new Date().toISOString(),
  commitHash,
  branch,
  shortHash,
}

// Write JSON file to src directory
const jsonOutputPath = join(__dirname, '..', 'src', 'version.json')
writeFileSync(jsonOutputPath, JSON.stringify(versionInfo, null, 2))

// Also write a TypeScript file for more reliable importing
const tsOutputPath = join(__dirname, '..', 'src', 'version.ts')
const tsContent = `// Auto-generated version info
export const versionInfo = ${JSON.stringify(versionInfo, null, 2)} as const
`
writeFileSync(tsOutputPath, tsContent)

console.log('Version info updated:', versionInfo)
