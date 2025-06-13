import { gql } from '@apollo/client'

export const REQUEST_MAGIC_LINK = gql`
  mutation RequestMagicLink($email: String!) {
    requestMagicLink(email: $email) {
      success
      message
    }
  }
`

export const VERIFY_MAGIC_LINK = gql`
  mutation VerifyMagicLink($token: String!) {
    verifyMagicLink(token: $token) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        email
        displayName
        primaryInstrument
        hasCloudStorage
        createdAt
        updatedAt
      }
    }
  }
`

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
      expiresIn
      user {
        id
        email
        displayName
        primaryInstrument
        hasCloudStorage
        createdAt
        updatedAt
      }
    }
  }
`

export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`
