/**
 * Simple logger utility for Mirubato application
 * Provides structured logging with different levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  minLevel: LogLevel
  prefix?: string
}

class Logger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel:
        process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
      prefix: '[Mirubato]',
      ...config,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.minLevel
  }

  private formatMessage(
    level: string,
    message: string,
    context?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString()
    const prefix = this.config.prefix || ''
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `${timestamp} ${prefix} [${level}] ${message}${contextStr}`
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (
      this.shouldLog(LogLevel.DEBUG) &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.log(this.formatMessage('DEBUG', message, context))
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context))
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context))
    }
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        ...(error instanceof Error
          ? {
              errorMessage: error.message,
              errorStack: error.stack,
            }
          : {
              error: String(error),
            }),
      }
      console.error(this.formatMessage('ERROR', message, errorContext))
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: `${this.config.prefix} [${prefix}]`,
    })
  }
}

// Export singleton instance for general use
export const logger = new Logger()

// Export factory function for creating component-specific loggers
export const createLogger = (prefix: string): Logger => {
  return logger.child(prefix)
}
