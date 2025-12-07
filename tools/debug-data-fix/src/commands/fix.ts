import chalk from 'chalk'
import ora from 'ora'
import { nanoid } from 'nanoid'
import { D1Service } from '../services/d1Service.js'
import { BackupService } from '../services/backupService.js'
import { DuplicateDetector } from '../detectors/duplicateDetector.js'
import { ScoreIdDetector } from '../detectors/scoreIdDetector.js'
import { logger } from '../utils/logger.js'
import type { LogbookEntry, RepertoireItem, SyncData } from '../types/index.js'

export default async function fixCommand(
  type: string,
  options: any,
  command: any
) {
  const { environment, safety } = command
  const { user, batchSize, interactive, autoBackup } = options

  if (!user) {
    console.error(chalk.red('❌ User ID required for fix operations'))
    console.log(chalk.yellow('Please specify --user <userId>'))
    return
  }

  const transactionId = `tx_${nanoid()}`
  logger.setTransactionId(transactionId)
  logger.info(`Starting fix operation: ${type}`, { transactionId, user })

  const d1 = new D1Service(environment.d1DatabaseId, environment.name)
  const backupService = new BackupService()

  const spinner = ora('Preparing fix operation...').start()

  try {
    // Create backup if enabled
    if (autoBackup) {
      spinner.text = 'Creating backup...'
      const syncData = await d1.getSyncData(user)
      const backupFile = await backupService.createBackup(
        syncData,
        'sync_data',
        environment.name,
        `Pre-fix backup for ${type}`
      )
      logger.info(`Created backup: ${backupFile}`)
    }

    switch (type) {
      case 'duplicates': {
        await fixDuplicates(
          d1,
          backupService,
          safety,
          user,
          batchSize,
          interactive,
          spinner
        )
        break
      }

      case 'score-ids': {
        await fixScoreIds(
          d1,
          backupService,
          safety,
          user,
          batchSize,
          interactive,
          spinner
        )
        break
      }

      case 'orphans': {
        await fixOrphans(
          d1,
          backupService,
          safety,
          user,
          batchSize,
          interactive,
          spinner
        )
        break
      }

      default:
        spinner.fail(`Unknown fix type: ${type}`)
        return
    }

    spinner.succeed('Fix operation completed')
    logger.info('Fix operation completed successfully', { transactionId })
  } catch (error) {
    spinner.fail('Fix operation failed')
    logger.error(`Fix operation error: ${error}`, { transactionId })
    console.error(chalk.red(`\n❌ Error: ${error}`))

    // Note: Automatic rollback is not possible - each wrangler CLI call is a separate connection.
    // The transaction ID and backup files can be used for manual recovery if needed.
    console.log(
      chalk.yellow(`\n⚠️  Transaction ID for manual recovery: ${transactionId}`)
    )
    console.log(
      chalk.gray(
        'Check the backup files in the backups directory for recovery options.'
      )
    )

    process.exit(1)
  }
}

async function fixDuplicates(
  d1: D1Service,
  backupService: BackupService,
  safety: any,
  userId: string,
  batchSize: number,
  interactive: boolean,
  spinner: any
) {
  spinner.text = 'Finding duplicates...'

  const syncData = await d1.getSyncData(userId, 'logbook')
  const entries: LogbookEntry[] = syncData.map(r => JSON.parse(r.data))

  const detector = new DuplicateDetector()
  const duplicates = detector.detectDuplicates(entries)

  if (duplicates.length === 0) {
    spinner.succeed('No duplicates found')
    return
  }

  spinner.stop()
  console.log(chalk.yellow(`\n🔍 Found ${duplicates.length} duplicates\n`))

  // Group duplicates
  const groups = new Map<string, any[]>()
  for (const dup of duplicates) {
    if (!groups.has(dup.duplicateOf)) {
      groups.set(dup.duplicateOf, [])
    }
    groups.get(dup.duplicateOf)!.push(dup)
  }

  let fixedCount = 0
  let skippedCount = 0

  for (const [originalId, dups] of groups) {
    if (interactive) {
      const original = entries.find(e => e.id === originalId)
      if (!original) continue

      console.log(chalk.cyan(`\nOriginal: ${originalId}`))
      console.log(`  Date: ${new Date(original.timestamp).toLocaleString()}`)
      console.log(`  Pieces: ${original.pieces.map(p => p.title).join(', ')}`)

      const toFix = await safety.confirmRowByRow(
        dups,
        (dup: any) => {
          return (
            `  Duplicate: ${dup.entry.id} (${(dup.confidence * 100).toFixed(0)}% confidence)\n` +
            `    Reason: ${dup.reason}`
          )
        },
        'remove duplicate'
      )

      for (const dup of toFix) {
        if (!safety.getDryRunStatus()) {
          // Find the sync_data record for this duplicate
          const record = syncData.find(r => {
            const data = JSON.parse(r.data)
            return data.id === dup.entry.id
          })

          if (record) {
            await d1.deleteSyncData(record.id)
            fixedCount++
            logger.auditLog('delete_duplicate', record, null, userId)
          }
        } else {
          console.log(chalk.cyan('[DRY RUN] Would delete duplicate'))
          fixedCount++
        }
      }

      skippedCount += dups.length - toFix.length
    } else {
      // Non-interactive mode - fix high confidence duplicates only
      for (const dup of dups) {
        if (dup.confidence >= 0.9) {
          if (!safety.getDryRunStatus()) {
            const record = syncData.find(r => {
              const data = JSON.parse(r.data)
              return data.id === dup.entry.id
            })

            if (record) {
              await d1.deleteSyncData(record.id)
              fixedCount++
            }
          } else {
            fixedCount++
          }
        } else {
          skippedCount++
        }
      }
    }

    // Batch size limit
    if (fixedCount >= batchSize) {
      console.log(chalk.yellow(`\n⚠️  Reached batch size limit (${batchSize})`))
      break
    }
  }

  console.log(chalk.green(`\n✅ Fixed ${fixedCount} duplicates`))
  if (skippedCount > 0) {
    console.log(chalk.yellow(`⏭️  Skipped ${skippedCount} duplicates`))
  }
}

async function fixScoreIds(
  d1: D1Service,
  backupService: BackupService,
  safety: any,
  userId: string,
  batchSize: number,
  interactive: boolean,
  spinner: any
) {
  spinner.text = 'Analyzing score IDs...'

  const syncData = await d1.getSyncData(userId)
  const entries: LogbookEntry[] = []
  const repertoire: RepertoireItem[] = []

  for (const record of syncData) {
    const data = JSON.parse(record.data)
    if (record.entity_type === 'logbook') {
      entries.push(data)
    } else if (record.entity_type === 'repertoire') {
      repertoire.push(data)
    }
  }

  const detector = new ScoreIdDetector()
  const mismatches = detector.detectMismatches(entries, repertoire)

  if (mismatches.length === 0) {
    spinner.succeed('No score ID issues found')
    return
  }

  spinner.stop()
  console.log(chalk.yellow(`\n🆔 Found ${mismatches.length} score ID issues\n`))

  let fixedCount = 0

  for (const mismatch of mismatches.slice(0, batchSize)) {
    console.log(chalk.cyan(`\nMismatch: ${mismatch.oldId} → ${mismatch.newId}`))
    console.log(
      `  Affects: ${mismatch.affectedEntries.length} entries, ${mismatch.affectedRepertoire.length} repertoire items`
    )

    const shouldFix = interactive
      ? await safety.confirmAction(
          `Fix score ID format`,
          `Convert "${mismatch.oldId}" to "${mismatch.newId}"`
        )
      : true

    if (shouldFix && !safety.getDryRunStatus()) {
      // Update affected records
      for (const record of syncData) {
        const data = JSON.parse(record.data)
        let updated = false

        if (
          record.entity_type === 'logbook' &&
          mismatch.affectedEntries.includes(data.id)
        ) {
          // Update scoreId and pieces
          if (data.scoreId === mismatch.oldId) {
            data.scoreId = mismatch.newId
            updated = true
          }

          for (const piece of data.pieces) {
            if (piece.id === mismatch.oldId) {
              piece.id = mismatch.newId
              updated = true
            }
          }
        } else if (
          record.entity_type === 'repertoire' &&
          data.scoreId === mismatch.oldId
        ) {
          data.scoreId = mismatch.newId
          updated = true
        }

        if (updated) {
          await d1.updateSyncData(record.id, {
            data: JSON.stringify(data),
            checksum: nanoid(), // Generate new checksum
          })
          fixedCount++
          logger.auditLog(
            'fix_score_id',
            { scoreId: mismatch.oldId },
            { scoreId: mismatch.newId },
            userId
          )
        }
      }
    }
  }

  console.log(chalk.green(`\n✅ Fixed ${fixedCount} score ID issues`))
}

async function fixOrphans(
  d1: D1Service,
  backupService: BackupService,
  safety: any,
  userId: string,
  batchSize: number,
  interactive: boolean,
  spinner: any
) {
  spinner.text = 'Finding orphaned records...'

  const orphans = await d1.getOrphanedRecords(userId)

  if (orphans.length === 0) {
    spinner.succeed('No orphaned records found')
    return
  }

  spinner.stop()
  console.log(chalk.yellow(`\n🔗 Found ${orphans.length} orphaned records\n`))

  let fixedCount = 0

  for (const orphan of orphans.slice(0, batchSize)) {
    const data = JSON.parse(orphan.data)

    console.log(chalk.cyan(`\nOrphan: ${orphan.entity_id}`))
    console.log(`  References non-existent score: ${data.scoreId}`)
    console.log(`  Date: ${new Date(data.timestamp).toLocaleString()}`)

    if (interactive) {
      const inquirer = await import('inquirer')
      const { action } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'How to fix this orphan?',
          choices: [
            { name: 'Remove score reference', value: 'remove' },
            { name: 'Delete entire entry', value: 'delete' },
            { name: 'Skip', value: 'skip' },
          ],
        },
      ])

      if (!safety.getDryRunStatus()) {
        if (action === 'remove') {
          // Remove scoreId reference
          data.scoreId = null
          data.scoreTitle = null
          data.scoreComposer = null

          await d1.updateSyncData(orphan.id, {
            data: JSON.stringify(data),
            checksum: nanoid(),
          })
          fixedCount++
          logger.auditLog('remove_orphan_reference', orphan, data, userId)
        } else if (action === 'delete') {
          await d1.deleteSyncData(orphan.id)
          fixedCount++
          logger.auditLog('delete_orphan', orphan, null, userId)
        }
      } else {
        console.log(chalk.cyan(`[DRY RUN] Would ${action} orphan`))
        if (action !== 'skip') fixedCount++
      }
    } else {
      // Non-interactive: remove score references
      if (!safety.getDryRunStatus()) {
        data.scoreId = null
        data.scoreTitle = null
        data.scoreComposer = null

        await d1.updateSyncData(orphan.id, {
          data: JSON.stringify(data),
          checksum: nanoid(),
        })
        fixedCount++
      } else {
        fixedCount++
      }
    }
  }

  console.log(chalk.green(`\n✅ Fixed ${fixedCount} orphaned records`))
}
