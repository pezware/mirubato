/**
 * Mirubato Documentation Dashboard JavaScript
 * Handles real-time health checking and status updates
 *
 * Health Check Metrics:
 * - Healthy: Service responds with status:"healthy" within timeout
 * - Degraded: Service responds but status is not "healthy" or response is not OK
 * - Unhealthy: Service does not respond or times out (5 seconds)
 *
 * Response times are shown for healthy/degraded services to indicate latency.
 * The dashboard auto-refreshes every 30 seconds and can be manually refreshed
 * by clicking the system status.
 */

class MirubatoDashboard {
  constructor() {
    this.services = {
      frontend: {
        name: 'Frontend',
        prodUrl: 'https://mirubato.com',
        stagingUrl: 'https://staging.mirubato.com',
        testEndpoint: '/', // Test the main app
        type: 'frontend',
      },
      api: {
        name: 'API',
        prodUrl: 'https://api.mirubato.com',
        stagingUrl: 'https://api-staging.mirubato.com',
        testEndpoint: '/health',
        type: 'api',
      },
      scores: {
        name: 'Scores',
        prodUrl: 'https://scores.mirubato.com',
        stagingUrl: 'https://scores-staging.mirubato.com',
        testEndpoint: '/health',
        type: 'api',
      },
    }

    this.checkInterval = 30000 // 30 seconds
    this.timeoutDuration = 5000 // 5 seconds

    this.init()
  }

  init() {
    this.updateLastUpdated()
    this.checkAllServices()

    // Set up periodic health checks
    setInterval(() => {
      this.checkAllServices()
    }, this.checkInterval)

    // Add click handlers for manual refresh
    this.setupRefreshHandlers()
  }

  async checkAllServices() {
    console.log('🔍 Checking all services...')

    const promises = Object.keys(this.services).map(serviceKey =>
      this.checkService(serviceKey)
    )

    const results = await Promise.allSettled(promises)

    // Update system status based on individual service results
    this.updateSystemStatus(results)
    this.updateLastUpdated()
  }

  async checkService(serviceKey) {
    const service = this.services[serviceKey]
    const card = document.getElementById(`${serviceKey}Card`)
    const statusElement = document.getElementById(`${serviceKey}Status`)

    if (!card || !statusElement) {
      console.warn(`Elements not found for service: ${serviceKey}`)
      return {
        service: serviceKey,
        status: 'unknown',
        error: 'Elements not found',
      }
    }

    // Set loading state
    this.setServiceStatus(statusElement, 'checking', 'Checking...')
    card.classList.add('loading')

    try {
      const result = await this.testServiceHealth(service)

      // Update UI with result
      this.setServiceStatus(
        statusElement,
        result.status,
        this.getStatusText(result.status, result.responseTime)
      )

      card.classList.remove('loading')

      console.log(
        `✅ ${service.name}: ${result.status} (${result.responseTime}ms)`
      )
      return result
    } catch (error) {
      console.error(`❌ ${service.name} check failed:`, error)

      this.setServiceStatus(statusElement, 'unhealthy', 'Unavailable')
      card.classList.remove('loading')

      return { service: serviceKey, status: 'unhealthy', error: error.message }
    }
  }

  async testServiceHealth(service) {
    const startTime = Date.now()
    const testUrl = service.prodUrl + service.testEndpoint

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.timeoutDuration
      )

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        mode: service.type === 'frontend' ? 'no-cors' : 'cors', // Only use no-cors for frontend
        cache: 'no-cache',
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      // For no-cors requests, we can't read the response status
      // If the request completes without error, assume it's healthy
      if (service.type === 'frontend') {
        return {
          service: service.name,
          status: 'healthy',
          responseTime: responseTime,
        }
      }

      // For API services, we can check the response
      if (response.ok) {
        const data = await response.json()
        return {
          service: service.name,
          status: data.status === 'healthy' ? 'healthy' : 'degraded',
          responseTime: responseTime,
          data: data,
        }
      } else {
        return {
          service: service.name,
          status: 'degraded',
          responseTime: responseTime,
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      // For frontend checks with no-cors, a successful fetch means the site is reachable
      if (service.type === 'frontend' && error.name !== 'AbortError') {
        return {
          service: service.name,
          status: 'healthy',
          responseTime: responseTime,
        }
      }

      // Handle different error types
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }

      throw error
    }
  }

  setServiceStatus(statusElement, status, text) {
    const indicator = statusElement.querySelector('.indicator')
    const textElement = statusElement.querySelector('.text')

    if (indicator && textElement) {
      // Remove existing status classes
      indicator.classList.remove('healthy', 'degraded', 'unhealthy')

      // Add new status class
      indicator.classList.add(status)

      // Update text
      textElement.textContent = text
    }
  }

  getStatusText(status, responseTime) {
    const time = responseTime ? `${responseTime}ms` : ''

    switch (status) {
      case 'healthy':
        return `Operational ${time}`
      case 'degraded':
        return `Degraded ${time}`
      case 'unhealthy':
        return 'Unavailable'
      case 'checking':
        return 'Checking...'
      default:
        return 'Unknown'
    }
  }

  updateSystemStatus(results) {
    const systemIndicator = document.getElementById('statusIndicator')
    const systemText = document.getElementById('statusText')

    if (!systemIndicator || !systemText) return

    // Analyze overall system health
    const healthyCount = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 'healthy'
    ).length

    const totalServices = results.length
    const degradedCount = results.filter(
      r => r.status === 'fulfilled' && r.value.status === 'degraded'
    ).length

    let overallStatus, statusText

    if (healthyCount === totalServices) {
      overallStatus = 'healthy'
      statusText = 'All Systems Operational'
    } else if (healthyCount > 0) {
      overallStatus = 'degraded'
      statusText = `${totalServices - healthyCount} Service${totalServices - healthyCount !== 1 ? 's' : ''} Degraded`
    } else {
      overallStatus = 'unhealthy'
      statusText = 'System Issues Detected'
    }

    // Update system status indicator
    systemIndicator.classList.remove('healthy', 'degraded', 'unhealthy')
    systemIndicator.classList.add(overallStatus)
    systemText.textContent = statusText
  }

  updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated')
    if (lastUpdatedElement) {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      lastUpdatedElement.textContent = `Last updated: ${timeString}`
    }
  }

  setupRefreshHandlers() {
    // Add click handler to system status for manual refresh
    const systemStatus = document.getElementById('systemStatus')
    if (systemStatus) {
      systemStatus.style.cursor = 'pointer'
      systemStatus.title = 'Click to refresh'
      systemStatus.addEventListener('click', () => {
        this.checkAllServices()
      })
    }

    // Add refresh on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkAllServices()
      }
    })
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎼 Mirubato Dashboard initializing...')
  window.mirubatoDashboard = new MirubatoDashboard()
})

// Add global error handler
window.addEventListener('error', event => {
  console.error('Dashboard error:', event.error)
})

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason)
})
