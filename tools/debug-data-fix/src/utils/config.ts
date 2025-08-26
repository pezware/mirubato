import dotenv from 'dotenv'
import path from 'path'
import { Environment } from '../types/index.js'

dotenv.config()

export class Config {
  private environments: Map<string, Environment> = new Map()

  constructor() {
    this.loadEnvironments()
  }

  private loadEnvironments() {
    // Local environment
    this.environments.set('local', {
      name: 'local',
      apiUrl: process.env.API_URL_LOCAL || 'http://api-mirubato.localhost:9797',
      frontendUrl:
        process.env.FRONTEND_URL_LOCAL || 'http://www-mirubato.localhost:4000',
      color: 'green',
    })

    // Staging environment
    this.environments.set('staging', {
      name: 'staging',
      apiUrl: process.env.API_URL_STAGING || 'https://api-staging.mirubato.com',
      frontendUrl:
        process.env.FRONTEND_URL_STAGING || 'https://staging.mirubato.com',
      d1DatabaseId: process.env.D1_DATABASE_ID_STAGING,
      authToken: process.env.API_TOKEN_STAGING,
      color: 'yellow',
    })

    // Production environment
    this.environments.set('production', {
      name: 'production',
      apiUrl: process.env.API_URL_PRODUCTION || 'https://api.mirubato.com',
      frontendUrl:
        process.env.FRONTEND_URL_PRODUCTION || 'https://mirubato.com',
      d1DatabaseId: process.env.D1_DATABASE_ID_PRODUCTION,
      authToken: process.env.API_TOKEN_PRODUCTION,
      color: 'red',
    })
  }

  getEnvironment(name: string): Environment | undefined {
    return this.environments.get(name)
  }

  getAllEnvironments(): Environment[] {
    return Array.from(this.environments.values())
  }

  getBackupDir(): string {
    const dir = process.env.BACKUP_DIR || './backups'
    return path.resolve(dir)
  }

  getMaxBatchSize(): number {
    return parseInt(process.env.MAX_BATCH_SIZE || '10', 10)
  }

  getKeepBackupsDays(): number {
    return parseInt(process.env.KEEP_BACKUPS_DAYS || '30', 10)
  }

  isDryRunDefault(): boolean {
    return process.env.DEFAULT_DRY_RUN !== 'false'
  }

  requireProductionConfirmation(): boolean {
    return process.env.REQUIRE_PRODUCTION_CONFIRMATION !== 'false'
  }
}

export const config = new Config()
