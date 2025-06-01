import { useState, useEffect } from 'react'

interface VersionData {
  buildTime: string
  commitHash: string
  branch: string
  shortHash: string
}

export function VersionInfo() {
  const [version, setVersion] = useState<VersionData | null>(null)
  const [backendVersion, setBackendVersion] = useState<string>('unknown')

  useEffect(() => {
    // Fetch frontend version
    fetch('/version.json')
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(err => console.error('Failed to load version info:', err))

    // Fetch backend version
    const backendUrl =
      import.meta.env.VITE_GRAPHQL_ENDPOINT?.replace('/graphql', '/health') ||
      '/health'
    fetch(backendUrl)
      .then(res => {
        const version = res.headers.get('X-Version')
        if (version) setBackendVersion(version)
        return res.json()
      })
      .then(data => {
        if (data.version && data.version !== 'unknown') {
          setBackendVersion(data.version)
        }
      })
      .catch(err => console.error('Failed to fetch backend version:', err))
  }, [])

  if (!version) return null

  return (
    <div className="fixed bottom-0 right-0 p-2 text-xs text-gray-500 bg-white/80 backdrop-blur-sm rounded-tl-lg shadow-sm">
      <div>
        Frontend: {version.shortHash} ({version.branch})
      </div>
      <div>Backend: {backendVersion}</div>
      <div className="text-[10px] text-gray-400">
        Built: {new Date(version.buildTime).toLocaleString()}
      </div>
    </div>
  )
}
