// Import package.json to get version
import packageJson from '../../package.json'
import versionJson from '../../../version.json'

// Type definitions for build-time constants
export interface BuildInfo {
  gitCommit: string
  gitBranch: string
  buildDate: string
  nodeEnv: string
}

export interface VersionInfo extends BuildInfo {
  version: string
  name: string
}

// Declare global variable injected by Vite
declare global {
  const __BUILD_INFO__: BuildInfo
}

// Get build information (injected at build time by Vite)
export const getBuildInfo = (): BuildInfo => {
  // In development, return fallback values if __BUILD_INFO__ is not available
  if (typeof __BUILD_INFO__ === 'undefined') {
    return {
      gitCommit: 'dev',
      gitBranch: 'development',
      buildDate: new Date().toISOString(),
      nodeEnv: 'development',
    }
  }

  return __BUILD_INFO__
}

// Get complete version information including package details
export const getVersionInfo = (): VersionInfo => {
  const buildInfo = getBuildInfo()
  return {
    ...buildInfo,
    version: versionJson.version,
    name: packageJson.name,
  }
}

// Helper functions for formatting build info
export const getFormattedBuildDate = (): string => {
  const buildInfo = getBuildInfo()
  const date = new Date(buildInfo.buildDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export const getGitHubCommitUrl = (): string => {
  const buildInfo = getBuildInfo()
  return `https://github.com/pezware/mirubato/commit/${buildInfo.gitCommit}`
}

export const getShortCommitHash = (): string => {
  const buildInfo = getBuildInfo()
  return buildInfo.gitCommit.slice(0, 7)
}
