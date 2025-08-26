import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger.js'
import { config } from '../utils/config.js'
import chalk from 'chalk'

export interface BackupMetadata {
  id: string
  timestamp: string
  environment: string
  dataType: string
  recordCount: number
  description?: string
}

export class BackupService {
  private backupDir: string

  constructor() {
    this.backupDir = config.getBackupDir()
    this.ensureBackupDirectory()
  }

  private ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
      logger.info(`Created backup directory: ${this.backupDir}`)
    }
  }

  async createBackup(
    data: any[],
    dataType: string,
    environment: string,
    description?: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `${environment}_${dataType}_${timestamp}`
    const backupFile = path.join(this.backupDir, `${backupId}.json`)

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      environment,
      dataType,
      recordCount: data.length,
      description,
    }

    const backup = {
      metadata,
      data,
    }

    try {
      fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
      logger.info(`Created backup: ${backupId}`, {
        file: backupFile,
        records: data.length,
      })

      // Also save metadata separately for quick lookup
      this.saveBackupMetadata(metadata)

      console.log(chalk.green(`✅ Backup created: ${backupFile}`))
      return backupFile
    } catch (error) {
      logger.error(`Failed to create backup: ${error}`)
      throw new Error(`Backup creation failed: ${error}`)
    }
  }

  private saveBackupMetadata(metadata: BackupMetadata) {
    const metadataFile = path.join(this.backupDir, 'metadata.json')
    let allMetadata: BackupMetadata[] = []

    if (fs.existsSync(metadataFile)) {
      const content = fs.readFileSync(metadataFile, 'utf-8')
      allMetadata = JSON.parse(content)
    }

    allMetadata.push(metadata)
    fs.writeFileSync(metadataFile, JSON.stringify(allMetadata, null, 2))
  }

  async restoreBackup(backupId: string): Promise<any[]> {
    const backupFile = path.join(this.backupDir, `${backupId}.json`)

    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    try {
      const content = fs.readFileSync(backupFile, 'utf-8')
      const backup = JSON.parse(content)

      logger.info(`Restored backup: ${backupId}`, {
        records: backup.data.length,
        metadata: backup.metadata,
      })

      return backup.data
    } catch (error) {
      logger.error(`Failed to restore backup: ${error}`)
      throw new Error(`Backup restoration failed: ${error}`)
    }
  }

  listBackups(environment?: string, dataType?: string): BackupMetadata[] {
    const metadataFile = path.join(this.backupDir, 'metadata.json')

    if (!fs.existsSync(metadataFile)) {
      return []
    }

    const content = fs.readFileSync(metadataFile, 'utf-8')
    let backups: BackupMetadata[] = JSON.parse(content)

    if (environment) {
      backups = backups.filter(b => b.environment === environment)
    }

    if (dataType) {
      backups = backups.filter(b => b.dataType === dataType)
    }

    // Sort by timestamp descending
    backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    return backups
  }

  cleanupOldBackups(daysToKeep?: number) {
    const days = daysToKeep || config.getKeepBackupsDays()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const backups = this.listBackups()
    let deletedCount = 0

    for (const backup of backups) {
      const backupDate = new Date(backup.timestamp)
      if (backupDate < cutoffDate) {
        const backupFile = path.join(this.backupDir, `${backup.id}.json`)
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile)
          deletedCount++
          logger.info(`Deleted old backup: ${backup.id}`)
        }
      }
    }

    if (deletedCount > 0) {
      console.log(chalk.yellow(`🗑️  Cleaned up ${deletedCount} old backups`))

      // Update metadata file
      const remainingBackups = this.listBackups()
      const metadataFile = path.join(this.backupDir, 'metadata.json')
      fs.writeFileSync(metadataFile, JSON.stringify(remainingBackups, null, 2))
    }

    return deletedCount
  }

  async createTransactionBackup(
    transactionId: string,
    before: any[],
    after: any[],
    environment: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(
      this.backupDir,
      'transactions',
      `${transactionId}_${timestamp}.json`
    )

    // Ensure transaction directory exists
    const transactionDir = path.join(this.backupDir, 'transactions')
    if (!fs.existsSync(transactionDir)) {
      fs.mkdirSync(transactionDir, { recursive: true })
    }

    const transactionData = {
      transactionId,
      timestamp,
      environment,
      before,
      after,
      changes: this.calculateChanges(before, after),
    }

    fs.writeFileSync(backupFile, JSON.stringify(transactionData, null, 2))
    logger.info(`Created transaction backup: ${transactionId}`, {
      file: backupFile,
    })

    return backupFile
  }

  private calculateChanges(before: any[], after: any[]): any {
    const beforeMap = new Map(before.map(item => [item.id, item]))
    const afterMap = new Map(after.map(item => [item.id, item]))

    return {
      added: after.filter(item => !beforeMap.has(item.id)),
      modified: after.filter(item => {
        const original = beforeMap.get(item.id)
        return original && JSON.stringify(original) !== JSON.stringify(item)
      }),
      deleted: before.filter(item => !afterMap.has(item.id)),
    }
  }
}
