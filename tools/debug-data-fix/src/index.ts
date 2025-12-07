#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { config } from './utils/config.js'
import { logger } from './utils/logger.js'
import { SafetyManager } from './utils/safety.js'
import validateCommand from './commands/validate.js'
import investigateCommand from './commands/investigate.js'
import fixCommand from './commands/fix.js'
import rollbackCommand from './commands/rollback.js'

const program = new Command()
const safety = new SafetyManager()

// ASCII Art Banner
const banner = chalk.cyan(`
╔══════════════════════════════════════════════╗
║     Mirubato Debug & Data Fix Tool v1.0     ║
║         Handle with care - Data is sacred    ║
╚══════════════════════════════════════════════╝
`)

program
  .name('mirubato-debug')
  .description('CLI tool for debugging and fixing data issues in Mirubato')
  .version('1.0.0')
  .hook('preAction', async (thisCommand, actionCommand) => {
    console.log(banner)

    // Select environment
    const options = actionCommand.opts()
    let environment = options.env

    if (!environment) {
      const { selectedEnv } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedEnv',
          message: 'Select environment:',
          choices: [
            { name: chalk.green('Local'), value: 'local' },
            { name: chalk.yellow('Staging'), value: 'staging' },
            { name: chalk.red('Production'), value: 'production' },
          ],
        },
      ])
      environment = selectedEnv
    }

    const env = config.getEnvironment(environment)
    if (!env) {
      console.error(chalk.red(`❌ Invalid environment: ${environment}`))
      process.exit(1)
    }

    safety.setEnvironment(env)
    safety.setDryRun(options.dryRun ?? config.isDryRunDefault())
    logger.setEnvironment(environment)

    // Confirm environment
    const confirmed = await safety.confirmEnvironment()
    if (!confirmed) {
      process.exit(0)
    }

    // Pass environment and safety through options
    options.environment = env
    options.safety = safety
  })

// Global options
program
  .option('-e, --env <environment>', 'Environment (local/staging/production)')
  .option(
    '-d, --dry-run',
    'Run in dry-run mode (no changes)',
    config.isDryRunDefault()
  )
  .option('-y, --yes', 'Skip confirmation prompts (dangerous!)', false)
  .option('-v, --verbose', 'Verbose output', false)

// Commands
program
  .command('validate')
  .description('Validate data integrity')
  .option('-u, --user <userId>', 'User ID to validate')
  .option(
    '-s, --scope <scope>',
    'Scope of validation (all/duplicates/scoreIds/orphans)',
    'all'
  )
  .action(validateCommand)

program
  .command('investigate')
  .description('Investigate data issues')
  .argument(
    '<type>',
    'Type of investigation (duplicates/score-ids/orphans/user)'
  )
  .option('-u, --user <userId>', 'User ID to investigate')
  .option('-l, --limit <number>', 'Limit number of results', '10')
  .option('-o, --output <file>', 'Output results to file')
  .action(investigateCommand)

program
  .command('fix')
  .description('Fix data issues (requires confirmation)')
  .argument('<type>', 'Type of fix (duplicates/score-ids/orphans)')
  .option('-u, --user <userId>', 'User ID to fix')
  .option('-b, --batch-size <number>', 'Batch size for processing', '10')
  .option('-i, --interactive', 'Interactive mode (review each fix)', true)
  .option('--auto-backup', 'Automatically create backups', true)
  .action(fixCommand)

program
  .command('rollback')
  .description(
    'View backup/transaction details (automatic rollback not supported)'
  )
  .argument('[transactionId]', 'Backup or transaction ID to inspect')
  .option('-l, --list', 'List available backups')
  .action(rollbackCommand)

// Utility commands
program
  .command('backup')
  .description('Manage backups')
  .option('-c, --create', 'Create a backup')
  .option('-l, --list', 'List backups')
  .option('-r, --restore <backupId>', 'Restore a backup')
  .option('--cleanup', 'Clean up old backups')
  .action(async options => {
    const { BackupService } = await import('./services/backupService.js')
    const backupService = new BackupService()

    if (options.list) {
      const backups = backupService.listBackups()
      console.log(chalk.bold('\n📦 Available Backups:'))
      for (const backup of backups.slice(0, 20)) {
        console.log(`  ${backup.id}`)
        console.log(chalk.gray(`    Created: ${backup.timestamp}`))
        console.log(chalk.gray(`    Environment: ${backup.environment}`))
        console.log(chalk.gray(`    Records: ${backup.recordCount}`))
      }
    } else if (options.cleanup) {
      const count = backupService.cleanupOldBackups()
      console.log(chalk.green(`✅ Cleaned up ${count} old backups`))
    }
  })

program
  .command('stats')
  .description('Show database statistics')
  .option('-u, --user <userId>', 'User ID for stats')
  .action(async (options, command) => {
    const { D1Service } = await import('./services/d1Service.js')
    const d1 = new D1Service(
      command.environment.d1DatabaseId,
      command.environment.name
    )

    const spinner = ora('Fetching statistics...').start()

    try {
      const stats = await d1.getDuplicateStats(options.user)
      spinner.succeed('Statistics fetched')

      console.log(chalk.bold('\n📊 Database Statistics:'))
      console.table(stats)
    } catch (error) {
      spinner.fail('Failed to fetch statistics')
      logger.error(`Stats command failed: ${error}`)
    }
  })

// Error handling
program.exitOverride()

try {
  await program.parseAsync(process.argv)
} catch (error: any) {
  if (error.code === 'commander.help') {
    process.exit(0)
  }

  console.error(chalk.red('\n❌ Error:'), error.message)
  logger.error('CLI error', error)
  process.exit(1)
}

// Handle uncaught errors
process.on('unhandledRejection', (error: any) => {
  console.error(chalk.red('\n❌ Unhandled error:'), error.message)
  logger.error('Unhandled rejection', error)
  process.exit(1)
})
