// Example: Integrating monitoring into the Frontend worker
// This shows how to add monitoring to the static asset serving worker

import { createMonitor, getAdaptiveSampleRate } from '@shared/monitoring'

// Track static asset serving performance
export function addMonitoringToFrontendWorker() {
  return {
    async fetch(request: Request, env: any): Promise<Response> {
      const monitor = createMonitor(env, request)
      const startTime = Date.now()

      try {
        const url = new URL(request.url)
        const pathname = url.pathname

        // Determine asset type
        const assetType = getAssetType(pathname)

        // Your existing frontend serving logic
        const response = await serveFrontendAssets(request, env)

        const responseTime = Date.now() - startTime

        // Use adaptive sampling for high-traffic assets
        const trafficRate = await getTrafficRate(env)
        const sampleRate = getAdaptiveSampleRate(trafficRate)

        // Track request with sampling
        await monitor.trackRequest(response.status, responseTime, {
          path: pathname,
          method: request.method,
          worker: 'frontend',
          asset_type: assetType,
          cache_status: response.headers.get('cf-cache-status') || 'unknown',
        })

        // Track cache performance
        const cacheStatus = response.headers.get('cf-cache-status')
        if (cacheStatus === 'HIT') {
          await monitor.trackBusiness('cache_hit', 1, {
            worker: 'frontend',
            asset_type: assetType,
          })
        } else if (cacheStatus === 'MISS') {
          await monitor.trackBusiness('cache_miss', 1, {
            worker: 'frontend',
            asset_type: assetType,
          })
        }

        // Track asset performance by type
        if (responseTime > 1000) {
          await monitor.trackPerformance('slow_asset', responseTime, {
            worker: 'frontend',
            asset_type: assetType,
            path: pathname,
            sample: 1.0, // Always track slow assets
          })
        }

        return response
      } catch (error) {
        await monitor.trackError(error as Error, {
          worker: 'frontend',
          url: request.url,
        })

        return new Response('Internal Server Error', { status: 500 })
      }
    },
  }
}

// Determine asset type from path
function getAssetType(pathname: string): string {
  if (pathname.endsWith('.js')) return 'javascript'
  if (pathname.endsWith('.css')) return 'stylesheet'
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image'
  if (pathname.match(/\.(woff|woff2|ttf|otf)$/)) return 'font'
  if (pathname.endsWith('.html') || pathname === '/') return 'html'
  return 'other'
}

// Get current traffic rate (requests per minute)
async function getTrafficRate(env: any): Promise<number> {
  // This could be tracked in KV or calculated from recent metrics
  const cached = await env.METRICS_CACHE?.get('traffic_rate')
  return cached ? parseInt(cached) : 100
}

// Placeholder for actual frontend serving logic
async function serveFrontendAssets(
  request: Request,
  env: any
): Promise<Response> {
  return new Response('Asset served', {
    headers: {
      'cf-cache-status': Math.random() > 0.7 ? 'HIT' : 'MISS',
    },
  })
}

// Example: Client-side performance monitoring integration
export const clientSideMonitoringScript = `
<script>
// Send performance metrics to monitoring endpoint
(function() {
  // Wait for page load
  window.addEventListener('load', function() {
    // Get navigation timing
    const perfData = performance.getEntriesByType('navigation')[0];
    
    // Send metrics to monitoring
    fetch('/api/client-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        ttfb: perfData.responseStart - perfData.requestStart,
        download: perfData.responseEnd - perfData.responseStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        domComplete: perfData.domComplete - perfData.fetchStart,
        loadComplete: perfData.loadEventEnd - perfData.fetchStart,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
      })
    }).catch(() => {}); // Fail silently
  });
  
  // Track Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      fetch('/api/client-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: 'lcp',
          value: lastEntry.renderTime || lastEntry.loadTime,
          url: window.location.pathname,
        })
      }).catch(() => {});
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      fetch('/api/client-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: 'fid',
          value: entry.processingStart - entry.startTime,
          url: window.location.pathname,
        })
      }).catch(() => {});
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
    
    // Send CLS on page unload
    window.addEventListener('beforeunload', () => {
      fetch('/api/client-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric: 'cls',
          value: clsValue,
          url: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => {});
    });
  }
})();
</script>
`

// Add to wrangler.toml:
/*
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "mirubato_metrics"

[observability.logs]
enabled = true
*/
