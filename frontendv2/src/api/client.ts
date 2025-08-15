import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { getOrCreateDeviceId, generateIdempotencyKey } from '../utils/deviceId'

// Determine API URL based on environment
const getApiUrl = () => {
  const hostname = window.location.hostname

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  ) {
    return import.meta.env.VITE_API_URL || 'http://api-mirubato.localhost:9797'
  } else if (hostname.includes('staging')) {
    return 'https://api-staging.mirubato.com'
  } else {
    return 'https://api.mirubato.com'
  }
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and idempotency headers
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth-token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add idempotency headers for write operations that need duplicate prevention
    if (
      config.method &&
      ['post', 'put', 'patch'].includes(config.method.toLowerCase())
    ) {
      // Add device ID for all write operations
      config.headers['X-Device-ID'] = getOrCreateDeviceId()

      // Add idempotency key for sync operations and entry creation
      if (config.url && isIdempotentOperation(config.url)) {
        const idempotencyKey = generateIdempotencyKey(
          config.method.toUpperCase(),
          config.url,
          config.data
        )
        config.headers['X-Idempotency-Key'] = idempotencyKey

        // Debug logging for sync operations
        if (config.url.includes('/sync/') || config.url.includes('/logbook')) {
          console.log(
            `[API] Adding idempotency key: ${idempotencyKey} for ${config.method} ${config.url}`
          )
        }
      }
    }

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Helper function to determine if an operation needs idempotency protection
function isIdempotentOperation(url: string): boolean {
  const idempotentPaths = [
    '/api/sync/push',
    '/api/logbook',
    '/api/goals',
    '/api/repertoire',
  ]

  return idempotentPaths.some(path => url.includes(path))
}

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')
      localStorage.removeItem('mirubato:user')

      // Update auth store to reflect the logged out state
      // Import dynamically to avoid circular dependencies
      const { useAuthStore } = await import('../stores/authStore')
      const { useLogbookStore } = await import('../stores/logbookStore')

      // Update auth state
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        isAuthInitialized: true,
      })

      // Switch to local mode to preserve user data
      const logbookStore = useLogbookStore.getState()
      if (logbookStore?.setLocalMode) {
        logbookStore.setLocalMode(true)
      }

      // Redirect to login if not on public pages or allowed paths
      const publicPaths = ['/', '/auth/verify']
      const allowedPaths = ['/logbook', '/repertoire'] // These pages work offline
      const currentPath = window.location.pathname

      // Don't redirect if on public paths or allowed offline paths
      if (
        !publicPaths.includes(currentPath) &&
        !allowedPaths.some(path => currentPath.startsWith(path))
      ) {
        window.location.href = '/'
      }
    }

    return Promise.reject(error)
  }
)

// Helper function for SWR
export const fetcher = (url: string) => apiClient.get(url).then(res => res.data)
