# Performance Optimization Specification

## Purpose

Performance directly impacts user experience, engagement, and retention. This specification defines strategies for achieving and maintaining optimal performance across Mirubato's edge-first architecture, focusing on real-world music education workflows.

## Why Performance Matters for Musicians

Musicians practice in focused sessions where interruptions break concentration:

- **Loading delays** disrupt practice flow
- **Slow responses** frustrate during logging
- **Laggy interfaces** interfere with timing-critical tools
- **Failed syncs** cause data anxiety

Every millisecond matters when capturing the nuances of practice sessions.

## Performance Targets

### User-Centric Metrics

```typescript
interface PerformanceTargets {
  // Core Web Vitals
  LCP: 2.5 // Largest Contentful Paint (seconds)
  FID: 100 // First Input Delay (milliseconds)
  CLS: 0.1 // Cumulative Layout Shift (score)

  // Application-specific
  practiceLogSave: 500 // ms - Critical for flow
  scoreLoad: 2000 // ms - PDF rendering
  searchResults: 300 // ms - Instant feel
  syncComplete: 1000 // ms - Background operation
  metronomeLatency: 10 // ms - Audio precision

  // Perceived performance
  timeToInteractive: 3000 // ms - App usable
  offlineReady: 5000 // ms - Cache populated
}
```

### Technical Metrics

```typescript
interface TechnicalTargets {
  // API Performance
  api: {
    p50: 50 // ms - Median
    p95: 200 // ms - Most requests
    p99: 500 // ms - Tail latency
  }

  // Database Performance
  database: {
    simpleQuery: 10 // ms - SELECT by ID
    complexQuery: 100 // ms - JOINs and aggregations
    writeOperation: 50 // ms - INSERT/UPDATE
  }

  // Resource Usage
  resources: {
    bundleSize: 500 // KB - Initial JS
    memoryUsage: 50 // MB - Runtime
    cpuTime: 50 // ms - Per request
    cacheRatio: 0.8 // 80% cache hits
  }
}
```

## Frontend Performance

### 1. Bundle Optimization

**Purpose**: Minimize JavaScript payload and parse time.

**Implementation Strategy**:

```typescript
// Vite configuration for optimal bundling
export default defineConfig({
  build: {
    // Code splitting strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - rarely change
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui', 'clsx', 'tailwind-merge'],
          'data-vendor': ['zustand', 'immer', 'axios'],

          // Feature chunks - lazy loaded
          'pdf-viewer': ['pdfjs-dist'],
          'music-notation': ['vexflow', 'abcjs'],
          analytics: ['chart.js', 'date-fns'],
        },

        // Consistent chunk naming for caching
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk'
          return `js/${facadeModuleId}-[hash].js`
        },
      },
    },

    // Compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log
        drop_debugger: true, // Remove debugger
        pure_funcs: ['console.log', 'console.info'],
        passes: 2, // Extra compression pass
      },
      mangle: {
        safari10: true, // Safari compatibility
      },
    },

    // Tree shaking
    treeShake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
    },
  },
})
```

### 2. Lazy Loading & Code Splitting

**Purpose**: Load code only when needed.

**Route-based Splitting**:

```typescript
// Lazy load route components
const routes = [
  {
    path: '/',
    component: lazy(() => import('./pages/Home')),
    preload: true  // Preload critical routes
  },
  {
    path: '/logbook',
    component: lazy(() =>
      import(/* webpackPrefetch: true */ './pages/Logbook')
    )
  },
  {
    path: '/scorebook',
    component: lazy(() => import('./pages/Scorebook'))
  },
  {
    path: '/analytics',
    component: lazy(() => import('./pages/Analytics'))
  }
]

// Component-level splitting
const PDFViewer = lazy(() =>
  import(/* webpackChunkName: "pdf-viewer" */ './components/PDFViewer')
)

const MusicNotation = lazy(() =>
  import(/* webpackChunkName: "music-notation" */ './components/MusicNotation')
)

// Preload on hover/focus
function PreloadableLink({ to, children }) {
  const preload = () => {
    const route = routes.find(r => r.path === to)
    if (route?.component) {
      route.component.preload()
    }
  }

  return (
    <Link
      to={to}
      onMouseEnter={preload}
      onFocus={preload}
    >
      {children}
    </Link>
  )
}
```

### 3. React Performance Patterns

**Purpose**: Minimize unnecessary renders and computations.

**Optimization Techniques**:

```typescript
// Memoization strategies
const MemoizedComponent = memo(({ data }) => {
  // Expensive computations
  const processed = useMemo(() =>
    expensiveProcessing(data),
    [data]
  )

  // Stable callbacks
  const handleClick = useCallback((id) => {
    doSomething(id)
  }, [])

  // Virtualization for large lists
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5
  })

  return (
    <div ref={parentRef}>
      {rowVirtualizer.getVirtualItems().map(virtualRow => (
        <div key={virtualRow.index}>
          {data[virtualRow.index]}
        </div>
      ))}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.data.id === nextProps.data.id
})

// State colocation
function OptimizedForm() {
  // Local state for high-frequency updates
  const [localValue, setLocalValue] = useState('')

  // Debounced global state update
  const updateGlobal = useDebouncedCallback(
    (value) => globalStore.update(value),
    500
  )

  return (
    <input
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value)
        updateGlobal(e.target.value)
      }}
    />
  )
}
```

### 4. Asset Optimization

**Purpose**: Minimize network payload for images, fonts, and media.

**Image Optimization**:

```typescript
// Responsive image loading
function OptimizedImage({ src, alt }) {
  return (
    <picture>
      <source
        srcSet={`${src}?w=400 400w, ${src}?w=800 800w`}
        media="(max-width: 768px)"
        type="image/webp"
      />
      <source
        srcSet={`${src}?w=800 800w, ${src}?w=1600 1600w`}
        media="(min-width: 769px)"
        type="image/webp"
      />
      <img
        src={`${src}?w=800`}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  )
}

// Font optimization
const fontStrategy = {
  // Critical fonts - preload
  preload: [
    '/fonts/inter-var.woff2',      // UI font
    '/fonts/noto-serif-var.woff2'  // Music titles
  ],

  // Non-critical - lazy load
  lazy: [
    '/fonts/lexend-var.woff2'      // Headers
  ],

  // Font display strategy
  css: `
    @font-face {
      font-family: 'Inter';
      src: url('/fonts/inter-var.woff2') format('woff2');
      font-display: swap;  /* Show fallback immediately */
      unicode-range: U+0000-00FF; /* Latin only initially */
    }
  `
}
```

## Backend Performance

### 1. Edge Computing Optimization

**Purpose**: Leverage Cloudflare's global network for minimal latency.

**Edge Strategies**:

```typescript
class EdgeOptimization {
  // Smart routing based on user location
  async routeRequest(request: Request): Promise<Response> {
    const country = request.headers.get('CF-IPCountry')
    const colo = request.cf?.colo

    // Route to nearest data center
    if (this.isDataSensitive(request)) {
      // Keep in region for compliance
      return this.routeToRegion(country)
    }

    // Use closest edge for compute
    return this.handleAtEdge(request, colo)
  }

  // Cache at edge location
  async cacheAtEdge(key: string, data: any): Promise<void> {
    const cache = caches.default

    // Create cache response with proper headers
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'CDN-Cache-Control': 'max-age=7200',
        'X-Cache-Key': key,
        'X-Cache-Time': new Date().toISOString(),
      },
    })

    // Store in edge cache
    await cache.put(new Request(`https://cache.mirubato.com/${key}`), response)
  }

  // Coalesce duplicate requests
  private pendingRequests = new Map()

  async coalesceRequest(key: string, fetcher: () => Promise<any>) {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    // Start new request
    const promise = fetcher().finally(() => {
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, promise)
    return promise
  }
}
```

### 2. Database Query Optimization

**Purpose**: Minimize D1 query latency and resource usage.

**Query Optimization**:

```typescript
class QueryOptimizer {
  // Prepared statement caching
  private statements = new Map()

  async prepare(sql: string): Promise<D1PreparedStatement> {
    if (!this.statements.has(sql)) {
      this.statements.set(sql, db.prepare(sql))
    }
    return this.statements.get(sql)
  }

  // Batch operations
  async batchInsert(table: string, records: any[]): Promise<void> {
    const chunks = this.chunk(records, 100) // D1 batch limit

    for (const chunk of chunks) {
      const placeholders = chunk
        .map(
          () =>
            `(${Object.keys(chunk[0])
              .map(() => '?')
              .join(',')})`
        )
        .join(',')

      const sql = `
        INSERT INTO ${table} 
        (${Object.keys(chunk[0]).join(',')})
        VALUES ${placeholders}
      `

      const params = chunk.flatMap(record => Object.values(record))
      await db
        .prepare(sql)
        .bind(...params)
        .run()
    }
  }

  // Query result caching
  async cachedQuery<T>(
    sql: string,
    params: any[],
    ttl: number = 300
  ): Promise<T> {
    const cacheKey = this.getCacheKey(sql, params)

    // Check cache
    const cached = await kv.get(cacheKey, 'json')
    if (cached) return cached as T

    // Execute query
    const result = await db
      .prepare(sql)
      .bind(...params)
      .first()

    // Cache result
    await kv.put(cacheKey, JSON.stringify(result), {
      expirationTtl: ttl,
    })

    return result as T
  }

  // Index usage verification
  async verifyIndexUsage(sql: string): Promise<boolean> {
    const plan = await db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all()

    // Check for table scans
    const hasTableScan = plan.results.some(row =>
      row.detail?.includes('SCAN TABLE')
    )

    if (hasTableScan) {
      console.warn(`Query uses table scan: ${sql}`)
      return false
    }

    return true
  }
}
```

### 3. API Response Optimization

**Purpose**: Minimize response size and time.

**Response Strategies**:

```typescript
class ResponseOptimizer {
  // Compression
  async compress(response: Response): Promise<Response> {
    const acceptEncoding = request.headers.get('Accept-Encoding') || ''

    if (acceptEncoding.includes('br')) {
      // Brotli compression
      return new Response(await this.brotliCompress(await response.text()), {
        headers: {
          ...response.headers,
          'Content-Encoding': 'br',
        },
      })
    } else if (acceptEncoding.includes('gzip')) {
      // Gzip compression
      return new Response(await this.gzipCompress(await response.text()), {
        headers: {
          ...response.headers,
          'Content-Encoding': 'gzip',
        },
      })
    }

    return response
  }

  // Pagination
  async paginate(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse> {
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await db
      .prepare(query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as count FROM'))
      .first()

    // Get page data
    const dataResult = await db
      .prepare(`${query} LIMIT ? OFFSET ?`)
      .bind(limit, offset)
      .all()

    return {
      data: dataResult.results,
      meta: {
        page,
        limit,
        total: countResult.count,
        totalPages: Math.ceil(countResult.count / limit),
      },
    }
  }

  // Field filtering
  filterFields(data: any, fields?: string[]): any {
    if (!fields || fields.length === 0) return data

    if (Array.isArray(data)) {
      return data.map(item => this.pick(item, fields))
    }

    return this.pick(data, fields)
  }

  // ETag support
  async withETag(data: any): Promise<Response> {
    const etag = await this.generateETag(data)

    // Check if client has current version
    if (request.headers.get('If-None-Match') === etag) {
      return new Response(null, { status: 304 })
    }

    return new Response(JSON.stringify(data), {
      headers: {
        ETag: etag,
        'Cache-Control': 'private, must-revalidate',
      },
    })
  }
}
```

## Caching Strategy

### 1. Multi-Layer Cache Architecture

**Purpose**: Minimize latency through strategic caching.

```typescript
interface CacheLayers {
  // L1: In-memory (request lifetime)
  memory: {
    size: '10MB'
    ttl: 'request'
    use: 'Hot data, computed values'
  }

  // L2: KV Store (edge location)
  kv: {
    size: 'unlimited'
    ttl: '5-60 minutes'
    use: 'User sessions, API responses'
  }

  // L3: CDN Cache (global)
  cdn: {
    size: 'unlimited'
    ttl: '1-24 hours'
    use: 'Static assets, public data'
  }

  // L4: Browser Cache (client)
  browser: {
    size: '50MB'
    ttl: '1-7 days'
    use: 'Assets, offline data'
  }
}

// Cache invalidation strategy
class CacheInvalidation {
  // Tag-based invalidation
  async invalidateByTag(tag: string): Promise<void> {
    // Clear KV entries with tag
    const keys = await kv.list({ prefix: `tag:${tag}:` })
    await Promise.all(keys.keys.map(key => kv.delete(key.name)))

    // Purge CDN cache
    await this.purgeCDN({ tag })
  }

  // Time-based invalidation
  scheduleInvalidation(key: string, ttl: number): void {
    setTimeout(() => this.invalidate(key), ttl * 1000)
  }

  // Event-based invalidation
  async onDataChange(event: DataChangeEvent): Promise<void> {
    const affectedKeys = this.getAffectedKeys(event)
    await Promise.all(affectedKeys.map(key => this.invalidate(key)))
  }
}
```

### 2. Cache Warming

**Purpose**: Preload cache with frequently accessed data.

```typescript
class CacheWarming {
  // Warm cache on deployment
  async warmOnDeploy(): Promise<void> {
    const criticalQueries = [
      'SELECT * FROM instruments',
      'SELECT * FROM composers ORDER BY name',
      'SELECT * FROM popular_scores LIMIT 20',
    ]

    for (const query of criticalQueries) {
      const result = await db.prepare(query).all()
      await this.cacheResult(query, result)
    }
  }

  // Predictive warming
  async predictiveWarm(userId: string): Promise<void> {
    // Analyze user patterns
    const patterns = await this.analyzeUserPatterns(userId)

    // Preload likely next actions
    if (patterns.usuallyViewsRepertoire) {
      await this.warmRepertoire(userId)
    }

    if (patterns.oftenChecksStats) {
      await this.warmAnalytics(userId)
    }
  }

  // Background warming
  async backgroundWarm(): Promise<void> {
    // Use Cron trigger for off-peak warming
    const staleKeys = await this.findStaleKeys()

    for (const key of staleKeys) {
      // Refresh cache before expiry
      await this.refresh(key)

      // Spread load
      await this.delay(100)
    }
  }
}
```

## Network Optimization

### 1. Request Optimization

**Purpose**: Minimize network round trips and payload size.

```typescript
class NetworkOptimizer {
  // Request batching
  async batchRequests(requests: APIRequest[]): Promise<any[]> {
    const response = await fetch('/api/batch', {
      method: 'POST',
      body: JSON.stringify({ requests }),
      headers: { 'Content-Type': 'application/json' },
    })

    return response.json()
  }

  // GraphQL-style field selection
  async fetchWithFields(endpoint: string, fields: string[]): Promise<any> {
    const params = new URLSearchParams({
      fields: fields.join(','),
    })

    return fetch(`${endpoint}?${params}`)
  }

  // HTTP/2 Server Push
  pushAssets(response: Response): Response {
    response.headers.append('Link', '</app.js>; rel=preload; as=script')
    response.headers.append('Link', '</app.css>; rel=preload; as=style')
    return response
  }

  // Connection pooling
  private connections = new Map()

  getConnection(origin: string): Connection {
    if (!this.connections.has(origin)) {
      this.connections.set(origin, new Connection(origin))
    }
    return this.connections.get(origin)
  }
}
```

### 2. Progressive Enhancement

**Purpose**: Provide basic functionality immediately, enhance progressively.

```typescript
// Progressive data loading
function ProgressiveList() {
  const [items, setItems] = useState([])
  const [enhanced, setEnhanced] = useState(false)

  // Load basic data immediately
  useEffect(() => {
    fetchBasicItems().then(setItems)
  }, [])

  // Enhance with additional data
  useEffect(() => {
    if (items.length > 0 && !enhanced) {
      enhanceItems(items).then(enhanced => {
        setItems(enhanced)
        setEnhanced(true)
      })
    }
  }, [items, enhanced])

  return <ItemList items={items} enhanced={enhanced} />
}

// Progressive image loading
function ProgressiveImage({ src, placeholder }) {
  const [currentSrc, setCurrentSrc] = useState(placeholder)

  useEffect(() => {
    // Load low quality immediately
    const lowQuality = new Image()
    lowQuality.src = `${src}?q=10&w=50`
    lowQuality.onload = () => setCurrentSrc(lowQuality.src)

    // Load high quality in background
    const highQuality = new Image()
    highQuality.src = src
    highQuality.onload = () => setCurrentSrc(highQuality.src)
  }, [src])

  return <img src={currentSrc} loading="lazy" />
}
```

## Monitoring & Optimization Cycle

### Performance Monitoring

```typescript
class PerformanceMonitor {
  // Real User Monitoring (RUM)
  collectRUM(): void {
    // Web Vitals
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        this.sendMetric({
          name: entry.name,
          value: entry.startTime,
          type: 'web-vital',
        })
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Custom metrics
    performance.mark('practice-session-start')
    // ... user practices ...
    performance.mark('practice-session-end')
    performance.measure(
      'practice-session-duration',
      'practice-session-start',
      'practice-session-end'
    )
  }

  // Synthetic monitoring
  async runSynthetic(): Promise<SyntheticResults> {
    const tests = [
      this.testCriticalPath(),
      this.testAPIEndpoints(),
      this.testDatabaseQueries(),
      this.testCachePerformance(),
    ]

    return Promise.all(tests)
  }

  // Alerting thresholds
  checkThresholds(metrics: Metrics): Alert[] {
    const alerts = []

    if (metrics.p95 > 500) {
      alerts.push({
        level: 'warning',
        message: 'P95 latency exceeds 500ms',
      })
    }

    if (metrics.errorRate > 0.01) {
      alerts.push({
        level: 'critical',
        message: 'Error rate exceeds 1%',
      })
    }

    return alerts
  }
}
```

## Success Metrics

**User Experience**:

- Page load time < 2 seconds
- Time to interactive < 3 seconds
- Practice log save < 500ms
- Zero perceived lag in metronome
- Offline capability within 5 seconds

**Technical Excellence**:

- API p95 latency < 200ms
- Cache hit ratio > 80%
- Zero downtime deployments
- Bundle size < 500KB
- Memory usage < 50MB

**Business Impact**:

- Session duration increase
- Practice frequency improvement
- User retention rate
- Feature adoption speed
- Support ticket reduction

## Related Documentation

- [Architecture](../01-architecture/overview.md) - System design
- [Monitoring](./monitoring-debugging.md) - Observability
- [Frontend](../04-frontend/architecture.md) - Client optimization
- [Database](../02-database/schema.md) - Query performance

---

_Last updated: 2025-09-09 | Version 1.7.6_
