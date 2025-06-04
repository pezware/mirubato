import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EventBus } from '../modules/core/EventBus'
import { StorageModule } from '../modules/infrastructure/StorageModule'
import { SyncModule } from '../modules/infrastructure/SyncModule'
import { PracticeSessionModule } from '../modules/practice/PracticeSessionModule'
import { PerformanceTrackingModule } from '../modules/performance/PerformanceTrackingModule'
import { ProgressAnalyticsModule } from '../modules/analytics/ProgressAnalyticsModule'
import type { ModuleHealth, ModuleInterface } from '../modules/core/types'
import type { ProgressReport } from '../modules/analytics/types'
import { endpoints } from '../config/endpoints'
import { env } from '../config/env'
import { version } from '../config/version'
// import environments from '../../../config/environments.json'

interface ModuleStatus {
  name: string
  version: string
  health: ModuleHealth
  instance: ModuleInterface
}

interface BackendHealth {
  status: string
  timestamp: number
  version: string
  environment: string
}

export default function Debug() {
  const [modules, setModules] = useState<ModuleStatus[]>([])
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null)
  const [corsDebug, setCorsDebug] = useState<any>(null)
  const [analyticsPreview, setAnalyticsPreview] =
    useState<ProgressReport | null>(null)
  const [storageInfo, setStorageInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    initializeDebugInfo()
  }, [])

  const initializeDebugInfo = async () => {
    try {
      // Get module instances
      const eventBus = EventBus.getInstance()
      const storageModule = new StorageModule()
      const syncModule = new SyncModule(storageModule)
      const practiceModule = new PracticeSessionModule({}, storageModule)
      const performanceModule = new PerformanceTrackingModule({}, storageModule)
      const analyticsModule = new ProgressAnalyticsModule(
        eventBus,
        undefined,
        storageModule
      )

      // Collect module status
      const moduleList: ModuleStatus[] = [
        {
          name: 'EventBus',
          version: '1.0.0',
          health: { status: 'green', lastCheck: Date.now() },
          instance: eventBus as any,
        },
        {
          name: storageModule.name,
          version: storageModule.version,
          health: storageModule.getHealth(),
          instance: storageModule,
        },
        {
          name: syncModule.name,
          version: syncModule.version,
          health: syncModule.getHealth(),
          instance: syncModule,
        },
        {
          name: practiceModule.name,
          version: practiceModule.version,
          health: practiceModule.getHealth(),
          instance: practiceModule,
        },
        {
          name: performanceModule.name,
          version: performanceModule.version,
          health: performanceModule.getHealth(),
          instance: performanceModule,
        },
        {
          name: analyticsModule.name,
          version: analyticsModule.version,
          health: analyticsModule.getHealth(),
          instance: analyticsModule,
        },
      ]
      setModules(moduleList)

      // Fetch backend health
      try {
        const healthResponse = await fetch(endpoints.health)
        if (healthResponse.ok) {
          const health = await healthResponse.json()
          setBackendHealth(health)
        }
      } catch (error) {
        console.error('Failed to fetch backend health:', error)
      }

      // Fetch CORS debug info
      try {
        const debugEndpoint = endpoints.graphql.replace(
          '/graphql',
          '/debug/cors'
        )
        const corsResponse = await fetch(debugEndpoint)
        if (corsResponse.ok) {
          const corsInfo = await corsResponse.json()
          setCorsDebug(corsInfo)
        }
      } catch (error) {
        console.error('Failed to fetch CORS debug:', error)
      }

      // Get analytics preview (mock user for now)
      try {
        await analyticsModule.initialize()
        const report = await analyticsModule.getProgressReport('debug-user', {
          start: Date.now() - 7 * 24 * 60 * 60 * 1000,
          end: Date.now(),
        })
        setAnalyticsPreview(report)
      } catch (error) {
        console.error('Failed to get analytics preview:', error)
      }

      // Get storage info
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        setStorageInfo({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
        })
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to initialize debug info:', error)
      setIsLoading(false)
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'green':
        return 'bg-green-500'
      case 'yellow':
        return 'bg-yellow-500'
      case 'red':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Debug Dashboard</h1>
          <p>Loading debug information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Debug Dashboard</h1>
          <Link
            to="/"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Back to App
          </Link>
        </div>

        {/* Environment Info */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">
            Environment Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Environment:</p>
              <p className="font-mono">{env.MODE}</p>
            </div>
            <div>
              <p className="text-gray-400">API URL:</p>
              <p className="font-mono">{endpoints.graphql}</p>
            </div>
            <div>
              <p className="text-gray-400">Frontend Version:</p>
              <p className="font-mono">
                {version.gitCommit !== 'unknown' ? (
                  <a
                    href={`https://github.com/pezware/mirubato/commit/${version.gitCommit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {version.gitCommit}
                  </a>
                ) : (
                  version.frontend
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Backend Version:</p>
              <p className="font-mono">{backendHealth?.version || 'Unknown'}</p>
            </div>
          </div>
        </section>

        {/* Module Health */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Module Health Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {modules.map(module => (
              <div
                key={module.name}
                className="bg-gray-700 rounded p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold">{module.name}</h3>
                  <p className="text-sm text-gray-400">v{module.version}</p>
                  {module.health.message && (
                    <p className="text-xs text-gray-500 mt-1">
                      {module.health.message}
                    </p>
                  )}
                </div>
                <div
                  className={`w-4 h-4 rounded-full ${getHealthColor(
                    module.health.status
                  )}`}
                  title={module.health.status}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Backend Health */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Backend Health</h2>
          {backendHealth ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Status:</p>
                <p className="font-mono">{backendHealth.status}</p>
              </div>
              <div>
                <p className="text-gray-400">Environment:</p>
                <p className="font-mono">{backendHealth.environment}</p>
              </div>
              <div>
                <p className="text-gray-400">Version:</p>
                <p className="font-mono">{backendHealth.version}</p>
              </div>
              <div>
                <p className="text-gray-400">Last Check:</p>
                <p className="font-mono">
                  {new Date(backendHealth.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Unable to fetch backend health</p>
          )}
        </section>

        {/* Storage Info */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Storage Information</h2>
          {storageInfo ? (
            <div>
              <div className="mb-4">
                <p className="text-gray-400">Storage Usage:</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ width: `${storageInfo.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm">
                    {storageInfo.percentage.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Used:</p>
                  <p className="font-mono">{formatBytes(storageInfo.usage)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Quota:</p>
                  <p className="font-mono">{formatBytes(storageInfo.quota)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Storage information not available</p>
          )}
        </section>

        {/* Analytics Preview */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Analytics Preview</h2>
          {analyticsPreview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400">Sessions:</p>
                  <p className="text-2xl font-bold">
                    {analyticsPreview.sessionsCompleted}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Practice Time:</p>
                  <p className="text-2xl font-bold">
                    {Math.round(analyticsPreview.totalPracticeTime / 60)}m
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Avg Accuracy:</p>
                  <p className="text-2xl font-bold">
                    {(analyticsPreview.averageAccuracy * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Improvement:</p>
                  <p className="text-2xl font-bold">
                    {analyticsPreview.improvementRate > 0 ? '+' : ''}
                    {analyticsPreview.improvementRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Weak Areas:</h3>
                {analyticsPreview.weakAreas.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {analyticsPreview.weakAreas.map((area, index) => (
                      <li key={index} className="text-gray-400">
                        {area.type} - {(area.accuracy * 100).toFixed(1)}%
                        accuracy
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400">No weak areas identified</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Milestones:</h3>
                {analyticsPreview.milestones.length > 0 ? (
                  <ul className="list-disc list-inside">
                    {analyticsPreview.milestones.map(milestone => (
                      <li key={milestone.id} className="text-gray-400">
                        {milestone.type} - Target: {milestone.criteria.target}
                        {milestone.achieved && ' ✓'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400">No milestones yet</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No analytics data available</p>
          )}
        </section>

        {/* CORS Debug */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">CORS Debug</h2>
          {corsDebug ? (
            <pre className="bg-gray-900 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(corsDebug, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">
              CORS debug information not available
            </p>
          )}
        </section>

        {/* Documentation Link */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Documentation</h2>
          <div className="flex gap-4">
            <a
              href="/docs"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded inline-block"
            >
              View Module Documentation
            </a>
            <a
              href={endpoints.graphql}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded inline-block"
            >
              GraphQL Playground
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
