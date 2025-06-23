import axios, { type AxiosInstance, type AxiosError } from 'axios'

// Determine API URL based on environment
const getApiUrl = () => {
  const hostname = window.location.hostname

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return import.meta.env.VITE_API_URL || 'http://localhost:8787'
  } else if (hostname.includes('staging')) {
    return 'https://apiv2-staging.mirubato.com'
  } else {
    return 'https://apiv2.mirubato.com'
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

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth-token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')

      // Redirect to login if not on public pages
      const publicPaths = ['/', '/auth/verify']
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/'
      }
    }

    return Promise.reject(error)
  }
)

// Helper function for SWR
export const fetcher = (url: string) => apiClient.get(url).then(res => res.data)
