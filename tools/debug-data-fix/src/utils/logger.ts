import fs from 'fs'
import path from 'path'
import chalk from 'chalk'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  environment?: string
  transactionId?: string
}

export class Logger {
  private logFile: string
  private logLevel: LogLevel
  private transactionId?: string
  private environment?: string

  constructor() {
    const logDir = process.env.LOG_FILE
      ? path.dirname(process.env.LOG_FILE)
      : './logs'
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    this.logFile = process.env.LOG_FILE || './logs/debug-data-fix.log'
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
  }

  setTransactionId(id: string) {
    this.transactionId = id
  }

  setEnvironment(env: string) {
    this.environment = env
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data)
  }

  info(message: string, data?: any) {
    this.log('info', message, data)
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data)
  }

  error(message: string, data?: any) {
    this.log('error', message, data)
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      environment: this.environment,
      transactionId: this.transactionId,
    }

    // Write to file
    this.writeToFile(entry)

    // Console output
    if (this.shouldLog(level)) {
      this.writeToConsole(level, message, data)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentIndex = levels.indexOf(this.logLevel)
    const messageIndex = levels.indexOf(level)
    return messageIndex >= currentIndex
  }

  private writeToFile(entry: LogEntry) {
    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(this.logFile, line)
  }

  private writeToConsole(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    const prefix = `[${timestamp}]`

    switch (level) {
      case 'debug':
        console.log(chalk.gray(`${prefix} ${message}`))
        break
      case 'info':
        console.log(chalk.blue(`${prefix} ${message}`))
        break
      case 'warn':
        console.log(chalk.yellow(`${prefix} ⚠️  ${message}`))
        break
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`))
        break
    }

    if (data && level !== 'debug') {
      console.log(chalk.gray(JSON.stringify(data, null, 2)))
    }
  }

  startOperation(operation: string): string {
    const operationId = `op_${Date.now()}`
    this.info(`Starting operation: ${operation}`, { operationId })
    return operationId
  }

  endOperation(operationId: string, success: boolean, details?: any) {
    if (success) {
      this.info(`Operation completed successfully`, { operationId, ...details })
    } else {
      this.error(`Operation failed`, { operationId, ...details })
    }
  }

  auditLog(action: string, before: any, after: any, userId?: string) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      environment: this.environment,
      transactionId: this.transactionId,
      userId,
      before,
      after,
      changes: this.calculateChanges(before, after),
    }

    const auditFile = this.logFile.replace('.log', '-audit.log')
    fs.appendFileSync(auditFile, JSON.stringify(auditEntry) + '\n')

    this.info(`Audit log: ${action}`, { changes: auditEntry.changes })
  }

  private calculateChanges(before: any, after: any): any {
    const changes: any = {}

    if (!before || !after) {
      return { created: !before, deleted: !after }
    }

    for (const key in after) {
      if (before[key] !== after[key]) {
        changes[key] = {
          before: before[key],
          after: after[key],
        }
      }
    }

    for (const key in before) {
      if (!(key in after)) {
        changes[key] = {
          before: before[key],
          after: undefined,
        }
      }
    }

    return changes
  }
}

export const logger = new Logger()
