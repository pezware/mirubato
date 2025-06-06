import { useState, useEffect } from 'react'
import { createLogger } from '../utils/logger'

const logger = createLogger('VersionInfo')

interface VersionData {
  buildTime: string
  commitHash: string
  branch: string
  shortHash: string
}

export function VersionInfo() {
  const [version, setVersion] = useState<VersionData | null>(null)

  useEffect(() => {
    // Fetch version info
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(err => logger.debug('Failed to load version info', { error: err }))
  }, [])

  if (!version) return null

  return (
    <div className="fixed bottom-0 right-0 p-2 text-xs text-gray-300">
      <div className="opacity-30 hover:opacity-70 transition-opacity duration-300">
        <div>
          {version.shortHash} ({version.branch})
        </div>
        <div className="text-[10px]">
          Built: {new Date(version.buildTime).toLocaleString()}
        </div>
      </div>
    </div>
  )
}
