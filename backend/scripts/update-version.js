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

// Write to src directory so it can be imported
const outputPath = join(__dirname, '..', 'src', 'version.json')
writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2))

console.log('Version info updated:', versionInfo)
