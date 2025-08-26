import chalk from 'chalk'
import inquirer from 'inquirer'
import { Environment } from '../types/index.js'

export class SafetyManager {
  private isDryRun: boolean = true
  private requireConfirmation: boolean = true
  private environment: Environment | null = null

  constructor() {
    this.isDryRun = process.env.DEFAULT_DRY_RUN !== 'false'
    this.requireConfirmation =
      process.env.REQUIRE_PRODUCTION_CONFIRMATION !== 'false'
  }

  setEnvironment(env: Environment) {
    this.environment = env
  }

  setDryRun(dryRun: boolean) {
    this.isDryRun = dryRun
  }

  async confirmEnvironment(): Promise<boolean> {
    if (!this.environment) {
      console.error(chalk.red('❌ No environment selected'))
      return false
    }

    const envColor = this.getEnvironmentColor()

    console.log('\n' + '='.repeat(60))
    console.log(
      envColor.bold(`🔧 ENVIRONMENT: ${this.environment.name.toUpperCase()}`)
    )
    console.log(envColor(`API URL: ${this.environment.apiUrl}`))
    console.log(envColor(`Frontend URL: ${this.environment.frontendUrl}`))

    if (this.isDryRun) {
      console.log(chalk.cyan.bold('🔒 DRY RUN MODE - No changes will be made'))
    } else {
      console.log(chalk.yellow.bold('⚠️  LIVE MODE - Changes will be applied'))
    }
    console.log('='.repeat(60) + '\n')

    if (this.environment.name === 'production' && this.requireConfirmation) {
      const { confirmProd } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmProd',
          message: chalk.red.bold(
            '⚠️  You are about to modify PRODUCTION data. Are you absolutely sure?'
          ),
          default: false,
        },
      ])

      if (!confirmProd) {
        console.log(chalk.yellow('Operation cancelled'))
        return false
      }

      // Double confirmation for production
      const { confirmProdAgain } = await inquirer.prompt([
        {
          type: 'input',
          name: 'confirmProdAgain',
          message: chalk.red.bold('Type "PRODUCTION" to confirm:'),
          validate: input =>
            input === 'PRODUCTION' || 'Please type PRODUCTION to confirm',
        },
      ])

      if (confirmProdAgain !== 'PRODUCTION') {
        console.log(chalk.yellow('Operation cancelled'))
        return false
      }
    }

    return true
  }

  async confirmAction(action: string, details?: string): Promise<boolean> {
    if (this.isDryRun) {
      console.log(chalk.cyan(`[DRY RUN] Would execute: ${action}`))
      if (details) {
        console.log(chalk.gray(details))
      }
      return true
    }

    const envColor = this.getEnvironmentColor()

    console.log('\n' + '-'.repeat(40))
    console.log(envColor.bold(`Action: ${action}`))
    if (details) {
      console.log(chalk.gray(details))
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Do you want to proceed?',
        default: false,
      },
    ])

    return confirm
  }

  async confirmRowByRow<T>(
    items: T[],
    getDescription: (item: T) => string,
    action: string
  ): Promise<T[]> {
    const approved: T[] = []

    console.log(
      chalk.yellow(`\n📝 Reviewing ${items.length} items for ${action}\n`)
    )

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const description = getDescription(item)

      console.log(chalk.cyan(`\n[${i + 1}/${items.length}]`))
      console.log(description)

      if (this.isDryRun) {
        console.log(chalk.cyan('[DRY RUN] Would be processed'))
        approved.push(item)
        continue
      }

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What do you want to do?',
          choices: [
            { name: '✅ Approve', value: 'approve' },
            { name: '⏭️  Skip', value: 'skip' },
            { name: '🛑 Stop review', value: 'stop' },
          ],
        },
      ])

      if (action === 'approve') {
        approved.push(item)
        console.log(chalk.green('✅ Approved'))
      } else if (action === 'skip') {
        console.log(chalk.yellow('⏭️  Skipped'))
      } else {
        console.log(chalk.red('🛑 Stopped review'))
        break
      }
    }

    console.log(
      chalk.green(
        `\n✅ Approved ${approved.length} out of ${items.length} items`
      )
    )
    return approved
  }

  private getEnvironmentColor() {
    switch (this.environment?.name) {
      case 'production':
        return chalk.red
      case 'staging':
        return chalk.yellow
      case 'local':
        return chalk.green
      default:
        return chalk.white
    }
  }

  getDryRunStatus(): boolean {
    return this.isDryRun
  }

  getEnvironmentName(): string {
    return this.environment?.name || 'unknown'
  }
}
