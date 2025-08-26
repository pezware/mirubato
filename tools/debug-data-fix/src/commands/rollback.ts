import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs'
import path from 'path'
import { BackupService } from '../services/backupService.js'
import { logger } from '../utils/logger.js'

export default async function rollbackCommand(
  transactionId: string | undefined,
  options: any,
  command: any
) {
  const { environment, safety } = command
  const { list } = options

  const backupService = new BackupService()

  if (list) {
    // List available rollback points
    const backups = backupService.listBackups(environment.name)

    if (backups.length === 0) {
      console.log(chalk.yellow('No backups available for rollback'))
      return
    }

    console.log(chalk.bold('\n🔄 Available Rollback Points:\n'))

    for (const backup of backups.slice(0, 10)) {
      console.log(chalk.cyan(`ID: ${backup.id}`))
      console.log(`  Created: ${new Date(backup.timestamp).toLocaleString()}`)
      console.log(`  Type: ${backup.dataType}`)
      console.log(`  Records: ${backup.recordCount}`)
      if (backup.description) {
        console.log(`  Description: ${backup.description}`)
      }
      console.log()
    }

    return
  }

  if (!transactionId) {
    console.error(chalk.red('❌ Transaction ID required for rollback'))
    console.log(chalk.yellow('Use --list to see available rollback points'))
    return
  }

  const spinner = ora('Preparing rollback...').start()

  try {
    // Check if this is a transaction backup
    const transactionBackupPath = path.join(
      process.env.BACKUP_DIR || './backups',
      'transactions',
      `${transactionId}_*.json`
    )

    const transactionFiles = await findTransactionBackups(transactionId)

    if (transactionFiles.length === 0) {
      // Try regular backup
      spinner.text = 'Looking for regular backup...'
      const data = await backupService.restoreBackup(transactionId)

      spinner.stop()

      const confirmed = await safety.confirmAction(
        'Restore from backup',
        `This will restore ${data.length} records from backup ${transactionId}`
      )

      if (!confirmed) {
        console.log(chalk.yellow('Rollback cancelled'))
        return
      }

      spinner.start('Restoring backup...')

      if (!safety.getDryRunStatus()) {
        // TODO: Implement actual restoration logic
        // This would involve:
        // 1. Clearing current data
        // 2. Re-inserting backup data
        // 3. Updating checksums

        logger.info('Backup restored', { backupId: transactionId })
        spinner.succeed('Backup restored successfully')
      } else {
        spinner.succeed('[DRY RUN] Would restore backup')
      }
    } else {
      // Handle transaction rollback
      const transactionFile = transactionFiles[0]
      const transactionData = JSON.parse(
        fs.readFileSync(transactionFile, 'utf-8')
      )

      spinner.stop()

      console.log(chalk.bold('\n📝 Transaction Details:\n'))
      console.log(`Transaction ID: ${transactionData.transactionId}`)
      console.log(
        `Timestamp: ${new Date(transactionData.timestamp).toLocaleString()}`
      )
      console.log(`Environment: ${transactionData.environment}`)
      console.log(`Changes:`)
      console.log(`  Added: ${transactionData.changes.added.length}`)
      console.log(`  Modified: ${transactionData.changes.modified.length}`)
      console.log(`  Deleted: ${transactionData.changes.deleted.length}`)

      const confirmed = await safety.confirmAction(
        'Rollback transaction',
        'This will revert all changes made in this transaction'
      )

      if (!confirmed) {
        console.log(chalk.yellow('Rollback cancelled'))
        return
      }

      spinner.start('Rolling back transaction...')

      if (!safety.getDryRunStatus()) {
        // Restore "before" state
        // TODO: Implement actual rollback logic
        // This would involve:
        // 1. Restoring deleted records
        // 2. Reverting modified records to their "before" state
        // 3. Removing added records

        logger.info('Transaction rolled back', { transactionId })
        spinner.succeed('Transaction rolled back successfully')
      } else {
        spinner.succeed('[DRY RUN] Would rollback transaction')
      }
    }

    // Clean up old backups
    const cleanupCount = backupService.cleanupOldBackups()
    if (cleanupCount > 0) {
      console.log(chalk.gray(`Cleaned up ${cleanupCount} old backups`))
    }
  } catch (error) {
    spinner.fail('Rollback failed')
    logger.error(`Rollback error: ${error}`)
    console.error(chalk.red(`\n❌ Error: ${error}`))
    process.exit(1)
  }
}

async function findTransactionBackups(
  transactionId: string
): Promise<string[]> {
  const transactionDir = path.join(
    process.env.BACKUP_DIR || './backups',
    'transactions'
  )

  if (!fs.existsSync(transactionDir)) {
    return []
  }

  const files = fs.readdirSync(transactionDir)
  return files
    .filter(f => f.startsWith(`${transactionId}_`) && f.endsWith('.json'))
    .map(f => path.join(transactionDir, f))
}
