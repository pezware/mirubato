import { logger } from '../utils/logger.js'
import type { LogbookEntry, RepertoireItem } from '../types/index.js'
import chalk from 'chalk'

export class ApiService {
  private apiUrl: string
  private apiToken: string | undefined
  private environment: string

  constructor(
    apiUrl: string,
    apiToken: string | undefined,
    environment: string
  ) {
    this.apiUrl = apiUrl
    this.apiToken = apiToken
    this.environment = environment
  }

  /**
   * Check if API token is configured
   */
  isConfigured(): boolean {
    if (!this.apiToken) {
      logger.warn(
        'API token not configured for environment: ' + this.environment
      )
      return false
    }
    return true
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('API token not configured')
    }

    const url = `${this.apiUrl}${endpoint}`

    const headers = {
      'Content-Type': 'application/json',
      'X-Admin-Token': this.apiToken!,
      'X-Admin-Operation': 'data-fix',
      ...options.headers,
    }

    try {
      logger.debug(`API request: ${options.method || 'GET'} ${url}`)

      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      logger.error(`API request failed: ${error}`)
      throw error
    }
  }

  /**
   * Admin endpoint to get all users
   */
  async getAllUsers(): Promise<
    Array<{ id: string; email: string; stats: any }>
  > {
    return this.request<Array<{ id: string; email: string; stats: any }>>(
      '/admin/users',
      { method: 'GET' }
    )
  }

  /**
   * Admin endpoint to get user data
   */
  async getUserData(userId: string): Promise<{
    user: any
    logbook: LogbookEntry[]
    repertoire: RepertoireItem[]
    syncData: any[]
  }> {
    return this.request<{
      user: any
      logbook: LogbookEntry[]
      repertoire: RepertoireItem[]
      syncData: any[]
    }>(`/admin/users/${userId}/data`, { method: 'GET' })
  }

  /**
   * Admin endpoint to fix duplicate entries
   */
  async fixDuplicates(
    userId: string,
    duplicateIds: string[],
    keepId: string
  ): Promise<{ success: boolean; merged: number }> {
    return this.request<{ success: boolean; merged: number }>(
      `/admin/users/${userId}/fix-duplicates`,
      {
        method: 'POST',
        body: JSON.stringify({ duplicateIds, keepId }),
      }
    )
  }

  /**
   * Admin endpoint to fix score IDs
   */
  async fixScoreIds(
    userId: string,
    mappings: Array<{ oldId: string; newId: string }>
  ): Promise<{ success: boolean; updated: number }> {
    return this.request<{ success: boolean; updated: number }>(
      `/admin/users/${userId}/fix-score-ids`,
      {
        method: 'POST',
        body: JSON.stringify({ mappings }),
      }
    )
  }

  /**
   * Admin endpoint to remove orphaned references
   */
  async fixOrphans(
    userId: string,
    orphanIds: string[],
    action: 'remove_reference' | 'delete_entry'
  ): Promise<{ success: boolean; fixed: number }> {
    return this.request<{ success: boolean; fixed: number }>(
      `/admin/users/${userId}/fix-orphans`,
      {
        method: 'POST',
        body: JSON.stringify({ orphanIds, action }),
      }
    )
  }

  /**
   * Admin endpoint to validate data integrity
   */
  async validateUserData(userId: string): Promise<{
    valid: boolean
    issues: Array<{
      type: string
      severity: string
      description: string
      count: number
    }>
  }> {
    return this.request<{
      valid: boolean
      issues: Array<{
        type: string
        severity: string
        description: string
        count: number
      }>
    }>(`/admin/users/${userId}/validate`, { method: 'GET' })
  }

  /**
   * Admin endpoint to export user data
   */
  async exportUserData(
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const response = await this.request<any>(
      `/admin/users/${userId}/export?format=${format}`,
      { method: 'GET' }
    )

    logger.info(`Exported user data for ${userId} in ${format} format`)
    return response
  }

  /**
   * Admin endpoint to restore user data from backup
   */
  async restoreUserData(
    userId: string,
    backupData: any
  ): Promise<{ success: boolean; restored: number }> {
    return this.request<{ success: boolean; restored: number }>(
      `/admin/users/${userId}/restore`,
      {
        method: 'POST',
        body: JSON.stringify({ data: backupData }),
      }
    )
  }

  /**
   * Test API connection and token validity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('/admin/health', {
        method: 'GET',
      })

      if (response.status === 'ok') {
        console.log(chalk.green('✅ API connection successful'))
        return true
      }

      console.log(chalk.red('❌ API connection failed'))
      return false
    } catch (error) {
      console.log(chalk.red('❌ API connection error:', error))
      return false
    }
  }
}

/**
 * Note: The admin endpoints referenced above need to be implemented in the API service.
 * These endpoints should:
 * 1. Verify the X-Admin-Token header
 * 2. Check that the token has appropriate permissions
 * 3. Log all admin operations for audit purposes
 * 4. Implement rate limiting for admin operations
 *
 * Example implementation in the API service:
 *
 * app.use('/admin/*', async (c, next) => {
 *   const adminToken = c.req.header('X-Admin-Token')
 *   const validToken = await verifyAdminToken(adminToken, c.env)
 *
 *   if (!validToken) {
 *     return c.json({ error: 'Unauthorized' }, 401)
 *   }
 *
 *   // Log admin operation
 *   await logAdminOperation(c.req, adminToken)
 *
 *   await next()
 * })
 */
