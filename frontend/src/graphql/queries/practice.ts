import { gql } from '@apollo/client'

export const GET_LOGBOOK_ENTRIES = gql`
  query GetLogbookEntries(
    $userId: ID
    $startDate: DateTime
    $endDate: DateTime
    $category: String
    $limit: Int
    $offset: Int
  ) {
    logbookEntries(
      userId: $userId
      startDate: $startDate
      endDate: $endDate
      category: $category
      limit: $limit
      offset: $offset
    ) {
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

export const GET_GOALS = gql`
  query GetGoals($userId: ID, $status: String, $limit: Int, $offset: Int) {
    goals(userId: $userId, status: $status, limit: $limit, offset: $offset) {
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
  mutation SyncAnonymousData(
    $sessions: [PracticeSessionInput!]!
    $logs: [PracticeLogInput!]!
    $entries: [LogbookEntryInput!]!
    $goals: [GoalInput!]!
  ) {
    syncAnonymousData(
      sessions: $sessions
      logs: $logs
      entries: $entries
      goals: $goals
    ) {
      syncedSessions
      syncedLogs
      syncedEntries
      syncedGoals
    }
  }
`
