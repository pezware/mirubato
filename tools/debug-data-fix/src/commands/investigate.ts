import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs'
import { table } from 'table'
import { D1Service } from '../services/d1Service.js'
import { DuplicateDetector } from '../detectors/duplicateDetector.js'
import { ScoreIdDetector } from '../detectors/scoreIdDetector.js'
import { logger } from '../utils/logger.js'
import type { LogbookEntry, RepertoireItem } from '../types/index.js'

export default async function investigateCommand(
  type: string,
  options: any,
  command: any
) {
  const { environment } = command
  const { user, limit, output } = options

  logger.info(`Starting investigation: ${type}`, { user, limit })

  const d1 = new D1Service(environment.d1DatabaseId, environment.name)
  const spinner = ora('Investigating...').start()

  try {
    let results: any[] = []

    switch (type) {
      case 'duplicates': {
        spinner.text = 'Searching for duplicates...'

        if (!user) {
          spinner.fail('User ID required for duplicate investigation')
          console.log(chalk.yellow('Please specify --user <userId>'))
          return
        }

        const syncData = await d1.getSyncData(user, 'logbook')
        const entries: LogbookEntry[] = syncData.map(r => JSON.parse(r.data))

        const detector = new DuplicateDetector()
        const duplicates = detector.detectDuplicates(entries)

        spinner.succeed(`Found ${duplicates.length} potential duplicates`)

        // Group duplicates
        const groups = new Map<string, any[]>()
        for (const dup of duplicates) {
          if (!groups.has(dup.duplicateOf)) {
            groups.set(dup.duplicateOf, [])
          }
          groups.get(dup.duplicateOf)!.push(dup)
        }

        console.log(
          chalk.bold(`\n🔍 Duplicate Groups (showing first ${limit}):\n`)
        )

        let count = 0
        for (const [originalId, dups] of groups) {
          if (count >= parseInt(limit)) break

          const original = entries.find(e => e.id === originalId)
          if (original) {
            console.log(chalk.cyan(`Original Entry: ${originalId}`))
            console.log(
              `  Date: ${new Date(original.timestamp).toLocaleString()}`
            )
            console.log(
              `  Duration: ${Math.round(original.duration / 60)} minutes`
            )
            console.log(
              `  Pieces: ${original.pieces.map(p => p.title).join(', ')}`
            )

            console.log(chalk.yellow('  Duplicates:'))
            for (const dup of dups) {
              console.log(`    • ID: ${dup.entry.id}`)
              console.log(
                `      Confidence: ${(dup.confidence * 100).toFixed(0)}%`
              )
              console.log(`      Reason: ${dup.reason}`)
            }
            console.log()
          }
          count++
        }

        results = Array.from(groups.entries()).map(([id, dups]) => ({
          originalId: id,
          duplicates: dups.map(d => d.entry.id),
          count: dups.length,
        }))
        break
      }

      case 'score-ids': {
        spinner.text = 'Analyzing score ID formats...'

        const syncData = await d1.getSyncData(user || '')
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

        spinner.succeed(`Found ${mismatches.length} score ID issues`)

        console.log(chalk.bold('\n🆔 Score ID Mismatches:\n'))

        const tableData = [
          ['Old Format', 'New Format', 'Entries', 'Repertoire'],
        ]

        for (const mismatch of mismatches.slice(0, parseInt(limit))) {
          tableData.push([
            chalk.red(mismatch.oldId),
            chalk.green(mismatch.newId),
            mismatch.affectedEntries.length.toString(),
            mismatch.affectedRepertoire.length.toString(),
          ])
        }

        console.log(table(tableData))

        // Check for problematic titles
        const problematic = detector.detectProblematicTitles(
          entries,
          repertoire
        )
        if (problematic.length > 0) {
          console.log(
            chalk.bold('\n⚠️  Pieces with Dashes (require special handling):\n')
          )

          const dashTable = [['Title', 'Composer', 'Current ID', 'Should Be']]

          for (const p of problematic.slice(0, parseInt(limit))) {
            dashTable.push([
              p.title,
              p.composer || '-',
              chalk.yellow(p.currentId),
              chalk.green(p.suggestedId),
            ])
          }

          console.log(table(dashTable))
        }

        results = { mismatches, problematic }
        break
      }

      case 'orphans': {
        spinner.text = 'Finding orphaned records...'

        if (!user) {
          spinner.fail('User ID required for orphan investigation')
          console.log(chalk.yellow('Please specify --user <userId>'))
          return
        }

        const orphans = await d1.getOrphanedRecords(user)

        spinner.succeed(`Found ${orphans.length} orphaned records`)

        console.log(chalk.bold('\n🔗 Orphaned Records:\n'))

        for (const orphan of orphans.slice(0, parseInt(limit))) {
          const data = JSON.parse(orphan.data)
          console.log(chalk.red(`Entry ID: ${orphan.entity_id}`))
          console.log(`  References non-existent score: ${data.scoreId}`)
          console.log(
            `  Entry date: ${new Date(data.timestamp).toLocaleString()}`
          )
          if (data.scoreTitle) {
            console.log(`  Score title (cached): ${data.scoreTitle}`)
          }
          console.log()
        }

        results = orphans
        break
      }

      case 'user': {
        spinner.text = 'Fetching user statistics...'

        if (!user) {
          // Show all users
          const users = await d1.getUsers()
          spinner.succeed(`Found ${users.length} users`)

          console.log(chalk.bold('\n👤 Users in Database:\n'))

          const userTable = [['ID', 'Email', 'Created']]

          for (const u of users) {
            // Get stats for each user
            const syncData = await d1.getSyncData(u.id)
            const logbook = syncData.filter(
              r => r.entity_type === 'logbook'
            ).length
            const repertoire = syncData.filter(
              r => r.entity_type === 'repertoire'
            ).length

            userTable.push([
              u.id.substring(0, 8) + '...',
              u.email,
              `${logbook} entries, ${repertoire} pieces`,
            ])
          }

          console.log(table(userTable))
        } else {
          // Show specific user details
          const syncData = await d1.getSyncData(user)
          const stats = await d1.getDuplicateStats(user)

          spinner.succeed('User data fetched')

          console.log(chalk.bold(`\n👤 User: ${user}\n`))

          // Count by type
          const byType = new Map<string, number>()
          for (const record of syncData) {
            byType.set(
              record.entity_type,
              (byType.get(record.entity_type) || 0) + 1
            )
          }

          console.log(chalk.bold('Data Summary:'))
          for (const [type, count] of byType) {
            console.log(`  ${type}: ${count}`)
          }

          if (stats.length > 0) {
            console.log(chalk.bold('\nPotential Issues:'))
            for (const stat of stats) {
              console.log(
                `  ${stat.entity_type}: ${stat.potential_duplicates} potential duplicates`
              )
            }
          }
        }

        results = { user, syncData: syncData?.length }
        break
      }

      default:
        spinner.fail(`Unknown investigation type: ${type}`)
        return
    }

    // Save to file if requested
    if (output) {
      fs.writeFileSync(output, JSON.stringify(results, null, 2))
      console.log(chalk.green(`\n✅ Results saved to ${output}`))
      logger.info(`Investigation results saved to ${output}`)
    }
  } catch (error) {
    spinner.fail('Investigation failed')
    logger.error(`Investigation error: ${error}`)
    console.error(chalk.red(`\n❌ Error: ${error}`))
    process.exit(1)
  }
}
