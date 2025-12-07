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
  const { environment } = command
  const { list } = options

  const backupService = new BackupService()

  if (list) {
    // List available backup points
    const backups = backupService.listBackups(environment.name)

    if (backups.length === 0) {
      console.log(chalk.yellow('No backups available'))
      return
    }

    console.log(chalk.bold('\n📦 Available Backups:\n'))

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

    console.log(chalk.gray('Note: Backups are for manual inspection only.'))
    console.log(
      chalk.gray(
        'Automatic restoration is not supported due to schema evolution and sync concerns.'
      )
    )

    return
  }

  if (!transactionId) {
    console.error(chalk.red('❌ Backup/Transaction ID required'))
    console.log(chalk.yellow('Use --list to see available backups'))
    return
  }

  const spinner = ora('Looking up backup...').start()

  try {
    const transactionFiles = await findTransactionBackups(transactionId)

    if (transactionFiles.length === 0) {
      // Try regular backup
      spinner.text = 'Looking for regular backup...'

      try {
        const data = await backupService.restoreBackup(transactionId)
        spinner.stop()

        console.log(chalk.bold('\n📦 Backup Details:\n'))
        console.log(`Backup ID: ${transactionId}`)
        console.log(`Records: ${data.length}`)
        console.log(
          `\nBackup file: ${path.join(process.env.BACKUP_DIR || './backups', `${transactionId}.json`)}`
        )

        console.log(
          chalk.yellow('\n⚠️  Automatic restoration is not supported.')
        )
        console.log(chalk.gray('Reasons:'))
        console.log(
          chalk.gray('  - Schema may have evolved since backup was created')
        )
        console.log(
          chalk.gray('  - Connected clients would re-sync their local data')
        )
        console.log(
          chalk.gray('  - Sequence counters would become inconsistent')
        )
        console.log(
          chalk.cyan(
            '\nInspect the backup file manually and use the fix command if corrections are needed.'
          )
        )
      } catch {
        spinner.fail(`Backup not found: ${transactionId}`)
        console.log(chalk.yellow('Use --list to see available backups'))
        return
      }
    } else {
      // Show transaction details
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
      console.log(`\nTransaction file: ${transactionFile}`)

      console.log(chalk.yellow('\n⚠️  Automatic rollback is not supported.'))
      console.log(
        chalk.gray('The transaction file preserves a record of what changed.')
      )
      console.log(
        chalk.cyan(
          'Review the file and apply manual corrections via the fix command if needed.'
        )
      )
    }

    // Clean up old backups
    const cleanupCount = backupService.cleanupOldBackups()
    if (cleanupCount > 0) {
      console.log(chalk.gray(`\nCleaned up ${cleanupCount} old backups`))
    }
  } catch (error) {
    spinner.fail('Failed to look up backup')
    logger.error(`Rollback command error: ${error}`)
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
