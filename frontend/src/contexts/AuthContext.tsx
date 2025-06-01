import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { useApolloClient, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import {
  VERIFY_MAGIC_LINK,
  REFRESH_TOKEN,
  LOGOUT,
} from '../graphql/queries/auth'
import { GET_CURRENT_USER } from '../graphql/queries/user'
import {
  setAuthTokens,
  clearAuthTokens,
  isAuthenticated as checkIsAuthenticated,
} from '../lib/apollo/client'

interface User {
  id: string
  email: string
  displayName: string | null
  primaryInstrument: 'PIANO' | 'GUITAR'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const apolloClient = useApolloClient()
  const navigate = useNavigate()

  const [verifyMagicLink] = useMutation(VERIFY_MAGIC_LINK)
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN)
  const [logoutMutation] = useMutation(LOGOUT)

  // Check if user is already authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      if (checkIsAuthenticated()) {
        try {
          const { data } = await apolloClient.query({
            query: GET_CURRENT_USER,
            fetchPolicy: 'network-only',
          })
          if (data?.me) {
            setUser(data.me)
          }
        } catch (error) {
          console.error('Failed to fetch current user:', error)
          // Token might be invalid, clear it
          clearAuthTokens()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [apolloClient])

  const login = useCallback(
    async (token: string) => {
      try {
        setLoading(true)
        const { data } = await verifyMagicLink({
          variables: { token },
        })

        if (data?.verifyMagicLink) {
          const { authToken, refreshToken, user } = data.verifyMagicLink
          setAuthTokens(authToken, refreshToken)
          setUser(user)
          navigate('/practice')
        }
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [verifyMagicLink, navigate]
  )

  const logout = useCallback(async () => {
    try {
      await logoutMutation()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuthTokens()
      setUser(null)
      navigate('/')
    }
  }, [logoutMutation, navigate])

  const refreshAuth = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh-token')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const { data } = await refreshTokenMutation({
        variables: { refreshToken },
      })

      if (data?.refreshToken) {
        const { authToken, refreshToken: newRefreshToken } = data.refreshToken
        setAuthTokens(authToken, newRefreshToken)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      clearAuthTokens()
      setUser(null)
      navigate('/login')
      throw error
    }
  }, [refreshTokenMutation, navigate])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
