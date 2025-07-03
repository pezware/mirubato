/**
 * Database models and types
 */

export interface DbUser {
  id: string
  email: string
  display_name: string | null
  primary_instrument?: string | null
  auth_provider: string
  google_id: string | null
  last_login_at?: string | null
  login_count?: number
  role?: string | null
  created_at: string
  updated_at: string
}

export interface DbSyncData {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  data: string
  checksum: string
  version: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DbSyncMetadata {
  user_id: string
  last_sync_token: string | null
  last_sync_time: string | null
  device_count: number
}
