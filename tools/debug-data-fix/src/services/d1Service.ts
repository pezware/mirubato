import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger.js'
import { SyncData } from '../types/index.js'
import chalk from 'chalk'

const execAsync = promisify(exec)

export class D1Service {
  private databaseId: string
  private environment: string

  constructor(databaseId: string, environment: string) {
    this.databaseId = databaseId
    this.environment = environment
  }

  /**
   * Escapes a string value for safe use in SQL queries
   * Prevents SQL injection by escaping single quotes
   */
  private escapeSqlString(value: string): string {
    return value.replace(/'/g, "''")
  }

  async query<T = any>(sql: string): Promise<T[]> {
    try {
      logger.debug(`Executing D1 query: ${sql}`)

      // Properly escape SQL for shell command - escape backslashes first, then quotes
      const escapedSql = sql.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const command = `wrangler d1 execute ${this.databaseId} --command "${escapedSql}" --env ${this.environment} --json`

      const { stdout, stderr } = await execAsync(command)

      if (stderr && !stderr.includes('warning')) {
        logger.error(`D1 query error: ${stderr}`)
        throw new Error(stderr)
      }

      const result = JSON.parse(stdout)

      if (result.error) {
        throw new Error(result.error)
      }

      logger.debug(`D1 query returned ${result.result?.length || 0} rows`)
      return result.result || []
    } catch (error) {
      logger.error(`D1 query failed: ${error}`)
      throw error
    }
  }

  async getSyncData(userId: string, entityType?: string): Promise<SyncData[]> {
    let sql = `
      SELECT * FROM sync_data 
      WHERE user_id = '${this.escapeSqlString(userId)}' 
      AND deleted_at IS NULL
    `

    if (entityType) {
      sql += ` AND entity_type = '${this.escapeSqlString(entityType)}'`
    }

    sql += ' ORDER BY updated_at DESC'

    return this.query<SyncData>(sql)
  }

  async getSyncDataById(id: string): Promise<SyncData | null> {
    const sql = `SELECT * FROM sync_data WHERE id = '${this.escapeSqlString(id)}' LIMIT 1`
    const results = await this.query<SyncData>(sql)
    return results[0] || null
  }

  async updateSyncData(
    id: string,
    updates: Partial<SyncData>
  ): Promise<boolean> {
    const updateClauses: string[] = []

    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        updateClauses.push(`${key} = NULL`)
      } else if (typeof value === 'string') {
        updateClauses.push(`${key} = '${this.escapeSqlString(value)}'`)
      } else {
        updateClauses.push(`${key} = ${value}`)
      }
    }

    updateClauses.push(`updated_at = CURRENT_TIMESTAMP`)

    const sql = `
      UPDATE sync_data 
      SET ${updateClauses.join(', ')}
      WHERE id = '${this.escapeSqlString(id)}'
    `

    try {
      await this.query(sql)
      logger.info(`Updated sync_data record: ${id}`)
      return true
    } catch (error) {
      logger.error(`Failed to update sync_data: ${error}`)
      return false
    }
  }

  async deleteSyncData(id: string, hard: boolean = false): Promise<boolean> {
    const sql = hard
      ? `DELETE FROM sync_data WHERE id = '${this.escapeSqlString(id)}'`
      : `UPDATE sync_data SET deleted_at = CURRENT_TIMESTAMP WHERE id = '${this.escapeSqlString(id)}'`

    try {
      await this.query(sql)
      logger.info(
        `${hard ? 'Deleted' : 'Soft deleted'} sync_data record: ${id}`
      )
      return true
    } catch (error) {
      logger.error(`Failed to delete sync_data: ${error}`)
      return false
    }
  }

  async findDuplicates(userId: string): Promise<
    Array<{
      checksum: string
      entity_type: string
      count: number
      ids: string[]
    }>
  > {
    const sql = `
      SELECT 
        checksum,
        entity_type,
        COUNT(*) as count,
        GROUP_CONCAT(id) as ids
      FROM sync_data
      WHERE user_id = '${this.escapeSqlString(userId)}'
        AND deleted_at IS NULL
      GROUP BY checksum, entity_type
      HAVING COUNT(*) > 1
    `

    const results = await this.query<any>(sql)

    return results.map(row => ({
      checksum: row.checksum,
      entity_type: row.entity_type,
      count: row.count,
      ids: row.ids ? row.ids.split(',') : [],
    }))
  }

  // Note: Transaction methods removed. The wrangler CLI executes each query
  // as a separate connection, so BEGIN/COMMIT/ROLLBACK don't work across calls.
  // Each query() call is atomic but multi-query transactions are not supported.

  async getUsers(): Promise<Array<{ id: string; email: string }>> {
    const sql = `SELECT id, email FROM users ORDER BY created_at DESC`
    return this.query(sql)
  }

  async getDuplicateStats(userId?: string): Promise<any> {
    let sql = `
      SELECT 
        user_id,
        entity_type,
        COUNT(*) as total_entries,
        COUNT(DISTINCT checksum) as unique_checksums,
        COUNT(*) - COUNT(DISTINCT checksum) as potential_duplicates,
        MAX(updated_at) as last_update
      FROM sync_data
      WHERE deleted_at IS NULL
    `

    if (userId) {
      sql += ` AND user_id = '${this.escapeSqlString(userId)}'`
    }

    sql += `
      GROUP BY user_id, entity_type
      HAVING COUNT(*) > COUNT(DISTINCT checksum)
    `

    return this.query(sql)
  }

  async getOrphanedRecords(userId: string): Promise<any[]> {
    // Find references to non-existent scores
    const sql = `
      SELECT 
        sd.*,
        'orphaned_reference' as issue_type
      FROM sync_data sd
      WHERE sd.user_id = '${this.escapeSqlString(userId)}'
        AND sd.deleted_at IS NULL
        AND sd.entity_type = 'logbook'
        AND json_extract(sd.data, '$.scoreId') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM sync_data sd2
          WHERE sd2.user_id = sd.user_id
            AND sd2.entity_type = 'score'
            AND sd2.entity_id = json_extract(sd.data, '$.scoreId')
            AND sd2.deleted_at IS NULL
        )
    `

    return this.query(sql)
  }

  async exportUserData(userId: string, outputFile: string): Promise<void> {
    const command = `wrangler d1 export ${this.databaseId} --output ${outputFile} --env ${this.environment}`

    try {
      const { stdout, stderr } = await execAsync(command)

      if (stderr && !stderr.includes('warning')) {
        throw new Error(stderr)
      }

      console.log(chalk.green(`✅ Exported database to ${outputFile}`))
      logger.info(`Exported D1 database to ${outputFile}`)
    } catch (error) {
      logger.error(`Failed to export database: ${error}`)
      throw error
    }
  }
}
