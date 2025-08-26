import chalk from 'chalk'
import ora from 'ora'
import { table } from 'table'
import { D1Service } from '../services/d1Service.js'
import { DuplicateDetector } from '../detectors/duplicateDetector.js'
import { ScoreIdDetector } from '../detectors/scoreIdDetector.js'
import { logger } from '../utils/logger.js'
import type { LogbookEntry, RepertoireItem, DataIssue } from '../types/index.js'

export default async function validateCommand(options: any, command: any) {
  const { environment, safety } = command
  const { user, scope } = options

  logger.info(`Starting validation for environment: ${environment.name}`, {
    user,
    scope,
  })

  const d1 = new D1Service(environment.d1DatabaseId, environment.name)
  const issues: DataIssue[] = []

  const spinner = ora('Connecting to database...').start()

  try {
    // Get user ID if not provided
    let userId = user
    if (!userId) {
      spinner.text = 'Fetching users...'
      const users = await d1.getUsers()

      if (users.length === 0) {
        spinner.fail('No users found in database')
        return
      }

      spinner.stop()

      // Let user select
      const inquirer = await import('inquirer')
      const { selectedUser } = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'selectedUser',
          message: 'Select a user to validate:',
          choices: users.map(u => ({
            name: `${u.email} (${u.id})`,
            value: u.id,
          })),
        },
      ])
      userId = selectedUser
      spinner.start()
    }

    spinner.text = 'Fetching user data...'

    // Fetch sync data
    const syncData = await d1.getSyncData(userId)
    spinner.succeed(`Fetched ${syncData.length} sync records`)

    // Parse logbook entries and repertoire
    const logbookEntries: LogbookEntry[] = []
    const repertoireItems: RepertoireItem[] = []

    for (const record of syncData) {
      try {
        const data = JSON.parse(record.data)

        if (record.entity_type === 'logbook') {
          logbookEntries.push(data)
        } else if (record.entity_type === 'repertoire') {
          repertoireItems.push(data)
        }
      } catch (e) {
        issues.push({
          type: 'checksum',
          severity: 'high',
          description: `Invalid JSON in sync_data record ${record.id}`,
          affectedRecords: [record.id],
          suggestedFix: 'Manual review required',
        })
      }
    }

    console.log(
      chalk.blue(`\n📚 Found ${logbookEntries.length} logbook entries`)
    )
    console.log(
      chalk.blue(`🎼 Found ${repertoireItems.length} repertoire items\n`)
    )

    // Run validations based on scope
    if (scope === 'all' || scope === 'duplicates') {
      spinner.start('Checking for duplicates...')

      const duplicateDetector = new DuplicateDetector()
      const duplicates = duplicateDetector.detectDuplicates(logbookEntries)

      if (duplicates.length > 0) {
        issues.push({
          type: 'duplicate',
          severity: 'medium',
          description: `Found ${duplicates.length} duplicate entries`,
          affectedRecords: duplicates.map(d => d.entry.id),
          suggestedFix: 'Run fix duplicates command',
        })

        spinner.warn(`Found ${duplicates.length} duplicates`)
        console.log(duplicateDetector.generateReport(duplicates))
      } else {
        spinner.succeed('No duplicates found')
      }
    }

    if (scope === 'all' || scope === 'scoreIds') {
      spinner.start('Checking score ID formats...')

      const scoreIdDetector = new ScoreIdDetector()
      const mismatches = scoreIdDetector.detectMismatches(
        logbookEntries,
        repertoireItems
      )

      if (mismatches.length > 0) {
        issues.push({
          type: 'scoreId',
          severity: 'low',
          description: `Found ${mismatches.length} score ID format inconsistencies`,
          affectedRecords: [
            ...new Set(mismatches.flatMap(m => m.affectedEntries)),
          ],
          suggestedFix: 'Run fix score-ids command',
        })

        spinner.warn(`Found ${mismatches.length} score ID issues`)
        console.log(scoreIdDetector.generateReport(mismatches))
      } else {
        spinner.succeed('Score IDs are consistent')
      }

      // Check for problematic titles
      const problematic = scoreIdDetector.detectProblematicTitles(
        logbookEntries,
        repertoireItems
      )
      if (problematic.length > 0) {
        console.log(
          chalk.yellow(
            `\n⚠️  Found ${problematic.length} pieces with dashes in titles:`
          )
        )
        for (const p of problematic.slice(0, 5)) {
          console.log(`  "${p.title}" by ${p.composer}`)
          console.log(chalk.gray(`    Current: ${p.currentId}`))
          console.log(chalk.green(`    Suggested: ${p.suggestedId}`))
        }
      }
    }

    if (scope === 'all' || scope === 'orphans') {
      spinner.start('Checking for orphaned records...')

      const orphans = await d1.getOrphanedRecords(userId)

      if (orphans.length > 0) {
        issues.push({
          type: 'orphan',
          severity: 'high',
          description: `Found ${orphans.length} orphaned records`,
          affectedRecords: orphans.map(o => o.id),
          suggestedFix: 'Run fix orphans command',
        })

        spinner.warn(`Found ${orphans.length} orphans`)
      } else {
        spinner.succeed('No orphaned records found')
      }
    }

    // Generate summary report
    console.log(chalk.bold('\n📋 Validation Summary'))
    console.log('='.repeat(50))

    if (issues.length === 0) {
      console.log(chalk.green('✅ No issues found! Data is clean.'))
    } else {
      const tableData = [['Type', 'Severity', 'Description', 'Affected', 'Fix']]

      for (const issue of issues) {
        tableData.push([
          issue.type,
          issue.severity === 'critical'
            ? chalk.red(issue.severity)
            : issue.severity === 'high'
              ? chalk.yellow(issue.severity)
              : issue.severity === 'medium'
                ? chalk.blue(issue.severity)
                : chalk.gray(issue.severity),
          issue.description,
          issue.affectedRecords.length.toString(),
          issue.suggestedFix || 'N/A',
        ])
      }

      console.log(table(tableData))

      // Count by severity
      const critical = issues.filter(i => i.severity === 'critical').length
      const high = issues.filter(i => i.severity === 'high').length
      const medium = issues.filter(i => i.severity === 'medium').length
      const low = issues.filter(i => i.severity === 'low').length

      console.log(chalk.bold('\nIssues by Severity:'))
      if (critical > 0) console.log(chalk.red(`  Critical: ${critical}`))
      if (high > 0) console.log(chalk.yellow(`  High: ${high}`))
      if (medium > 0) console.log(chalk.blue(`  Medium: ${medium}`))
      if (low > 0) console.log(chalk.gray(`  Low: ${low}`))

      console.log(
        chalk.yellow('\n💡 Tip: Run fix commands to resolve these issues')
      )
    }
  } catch (error) {
    spinner.fail('Validation failed')
    logger.error(`Validation error: ${error}`)
    console.error(chalk.red(`\n❌ Error: ${error}`))
    process.exit(1)
  }
}
