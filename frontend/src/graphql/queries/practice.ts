import { gql } from '@apollo/client'

export const GET_LOGBOOK_ENTRIES = gql`
  query GetLogbookEntries(
    $filter: LogbookFilterInput
    $limit: Int
    $offset: Int
  ) {
    myLogbookEntries(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          id
          userId
          timestamp
          duration
          type
          instrument
          pieces {
            id
            title
            composer
            measures
            tempo
          }
          techniques
          goalIds
          notes
          mood
          tags
          metadata {
            source
            accuracy
            notesPlayed
            mistakeCount
          }
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

export const GET_GOALS = gql`
  query GetGoals($status: GoalStatus, $limit: Int, $offset: Int) {
    myGoals(status: $status, limit: $limit, offset: $offset) {
      edges {
        node {
          id
          userId
          title
          description
          targetDate
          progress
          status
          linkedEntries
          milestones {
            id
            title
            completed
          }
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

export const CREATE_LOGBOOK_ENTRY = gql`
  mutation CreateLogbookEntry($input: CreateLogbookEntryInput!) {
    createLogbookEntry(input: $input) {
      id
      userId
      title
      content
      category
      mood
      energyLevel
      focusLevel
      progressRating
      timestamp
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_LOGBOOK_ENTRY = gql`
  mutation UpdateLogbookEntry($id: ID!, $input: UpdateLogbookEntryInput!) {
    updateLogbookEntry(id: $id, input: $input) {
      id
      userId
      title
      content
      category
      mood
      energyLevel
      focusLevel
      progressRating
      timestamp
      createdAt
      updatedAt
    }
  }
`

export const DELETE_LOGBOOK_ENTRY = gql`
  mutation DeleteLogbookEntry($id: ID!) {
    deleteLogbookEntry(id: $id)
  }
`

export const CREATE_GOAL = gql`
  mutation CreateGoal($input: CreateGoalInput!) {
    createGoal(input: $input) {
      id
      userId
      title
      description
      targetValue
      currentValue
      unit
      deadline
      status
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_GOAL = gql`
  mutation UpdateGoal($id: ID!, $input: UpdateGoalInput!) {
    updateGoal(id: $id, input: $input) {
      id
      userId
      title
      description
      targetValue
      currentValue
      unit
      deadline
      status
      createdAt
      updatedAt
    }
  }
`

export const DELETE_GOAL = gql`
  mutation DeleteGoal($id: ID!) {
    deleteGoal(id: $id)
  }
`

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
