import { gql } from '@apollo/client'

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      displayName
      primaryInstrument
      hasCloudStorage
      createdAt
      updatedAt
      preferences {
        theme
        notationSize
        practiceReminders
        dailyGoalMinutes
        customSettings
      }
      stats {
        totalPracticeTime
        consecutiveDays
        piecesCompleted
        accuracyAverage
      }
    }
  }
`

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      email
      displayName
      primaryInstrument
      updatedAt
    }
  }
`

export const UPDATE_USER_PREFERENCES = gql`
  mutation UpdateUserPreferences($preferences: UserPreferencesInput!) {
    updateUser(input: { preferences: $preferences }) {
      id
      preferences {
        theme
        notationSize
        practiceReminders
        dailyGoalMinutes
        customSettings
      }
    }
  }
`
