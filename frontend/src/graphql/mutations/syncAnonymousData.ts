import { gql } from '@apollo/client'

export const SYNC_ANONYMOUS_DATA = gql`
  mutation SyncAnonymousData($input: SyncAnonymousDataInput!) {
    syncAnonymousData(input: $input) {
      success
      syncedSessions
      syncedLogs
      syncedEntries
      syncedGoals
      errors
    }
  }
`
