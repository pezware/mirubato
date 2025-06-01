import { gql } from '@apollo/client'

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      displayName
      primaryInstrument
      createdAt
      updatedAt
      preferences {
        theme
        notificationSettings {
          practiceReminders
          emailUpdates
        }
        practiceSettings {
          defaultSessionDuration
          defaultTempo
          metronomeSoundEnabled
        }
      }
      stats {
        totalPracticeTime
        consecutiveDays
        lastPracticeDate
        averageAccuracy
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
    updateUserPreferences(preferences: $preferences) {
      theme
      notificationSettings {
        practiceReminders
        emailUpdates
      }
      practiceSettings {
        defaultSessionDuration
        defaultTempo
        metronomeSoundEnabled
      }
    }
  }
`
