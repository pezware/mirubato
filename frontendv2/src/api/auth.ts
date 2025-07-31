import { apiClient } from './client'

export interface User {
  id: string
  email: string
  displayName?: string
  authProvider: 'magic_link' | 'google'
  role?: 'user' | 'teacher' | 'admin'
  createdAt: string
}

export interface AuthResponse {
  success: boolean
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export const authApi = {
  // Request magic link
  requestMagicLink: async (email: string) => {
    const response = await apiClient.post('/api/auth/request-magic-link', {
      email,
    })
    return response.data
  },

  // Verify magic link token
  verifyMagicLink: async (token: string) => {
    const response = await apiClient.post<AuthResponse>(
      '/api/auth/verify-magic-link',
      { token }
    )

    // Store tokens and user info in localStorage
    if (response.data.accessToken) {
      localStorage.setItem('auth-token', response.data.accessToken)
      localStorage.setItem('refresh-token', response.data.refreshToken)
      localStorage.setItem('mirubato:user', JSON.stringify(response.data.user))
    }

    return response.data
  },

  // Google OAuth login
  googleLogin: async (credential: string) => {
    const response = await apiClient.post<AuthResponse>('/api/auth/google', {
      credential,
    })

    // Store tokens and user info in localStorage
    if (response.data.accessToken) {
      localStorage.setItem('auth-token', response.data.accessToken)
      localStorage.setItem('refresh-token', response.data.refreshToken)
      localStorage.setItem('mirubato:user', JSON.stringify(response.data.user))
    }

    return response.data
  },

  // Refresh access token
  refreshToken: async () => {
    const response = await apiClient.post('/api/auth/refresh')

    if (response.data.accessToken) {
      localStorage.setItem('auth-token', response.data.accessToken)
    }

    return response.data
  },

  // Logout
  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout')
    } finally {
      // Clear tokens and user info regardless of API response
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')
      localStorage.removeItem('mirubato:user')
    }
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await apiClient.get<User>('/api/user/me')
    return response.data
  },
}
