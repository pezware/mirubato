import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Copy,
  ExternalLink,
  Check,
  GitBranch,
  Calendar,
  Package,
} from 'lucide-react'
import {
  getVersionInfo,
  getFormattedBuildDate,
  getGitHubCommitUrl,
} from '../utils/buildInfo'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import Button from './ui/Button'

interface VersionInfoProps {
  className?: string
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ className = '' }) => {
  const { t } = useTranslation(['about', 'common'])
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  const versionInfo = getVersionInfo()
  const formattedBuildDate = getFormattedBuildDate()
  const githubUrl = getGitHubCommitUrl()

  // Format version info for copying
  const getVersionText = () => {
    return [
      `Version: ${versionInfo.version}`,
      `Commit: ${versionInfo.gitCommit}`,
      `Branch: ${versionInfo.gitBranch}`,
      `Built: ${formattedBuildDate}`,
      `Environment: ${versionInfo.nodeEnv}`,
    ].join('\n')
  }

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(itemId)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  return (
    <div className={className}>
      {/* Version Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-morandi-stone-700">
            <Package className="h-5 w-5" />
            {t('about:version.title', 'Version Information')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Version */}
          <div className="flex items-center justify-between py-2 border-b border-morandi-stone-100">
            <span className="font-medium text-morandi-stone-600">
              {t('about:version.appVersion', 'App Version')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-inter text-sm bg-morandi-sage-100 text-morandi-sage-700 px-2 py-1 rounded">
                v{versionInfo.version}
              </span>
            </div>
          </div>

          {/* Git Commit */}
          <div className="flex items-center justify-between py-2 border-b border-morandi-stone-100">
            <span className="font-medium text-morandi-stone-600">
              {t('about:version.gitCommit', 'Git Commit')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-inter text-sm bg-morandi-stone-100 text-morandi-stone-700 px-2 py-1 rounded">
                {versionInfo.gitCommit}
              </span>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-morandi-sage-600 hover:text-morandi-sage-700 transition-colors"
                title={t('about:version.viewOnGithub', 'View on GitHub')}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Branch */}
          <div className="flex items-center justify-between py-2 border-b border-morandi-stone-100">
            <span className="font-medium text-morandi-stone-600">
              {t('about:version.branch', 'Branch')}
            </span>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-morandi-stone-500" />
              <span className="font-inter text-sm text-morandi-stone-700">
                {versionInfo.gitBranch}
              </span>
            </div>
          </div>

          {/* Build Date */}
          <div className="flex items-center justify-between py-2 border-b border-morandi-stone-100">
            <span className="font-medium text-morandi-stone-600">
              {t('about:version.buildDate', 'Build Date')}
            </span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-morandi-stone-500" />
              <span className="text-sm text-morandi-stone-700">
                {formattedBuildDate}
              </span>
            </div>
          </div>

          {/* Environment */}
          <div className="flex items-center justify-between py-2">
            <span className="font-medium text-morandi-stone-600">
              {t('about:version.environment', 'Environment')}
            </span>
            <span
              className={`text-sm px-2 py-1 rounded font-medium ${
                versionInfo.nodeEnv === 'production'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {versionInfo.nodeEnv}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Issue Reporting Helper */}
      <Card>
        <CardHeader>
          <CardTitle className="text-morandi-stone-700">
            {t('about:version.issueReporting', 'Issue Reporting')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-morandi-stone-600">
            {t(
              'about:version.issueReportingDescription',
              'When reporting issues on GitHub, please include this version information:'
            )}
          </p>

          <div className="bg-morandi-stone-50 p-3 rounded-lg border">
            <pre className="text-xs font-inter text-morandi-stone-700 whitespace-pre-wrap">
              {getVersionText()}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyToClipboard(getVersionText(), 'version-info')}
              className="flex items-center gap-2"
            >
              {copiedItem === 'version-info' ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('common:copied', 'Copied!')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t('about:version.copyVersionInfo', 'Copy Version Info')}
                </>
              )}
            </Button>

            <a
              href="https://github.com/pezware/mirubato/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="primary"
                size="sm"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {t('about:version.reportIssue', 'Report Issue')}
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VersionInfo
