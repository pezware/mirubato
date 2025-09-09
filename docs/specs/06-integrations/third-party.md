# Third-Party Integrations Specification

## Purpose

Third-party integrations extend Mirubato's capabilities by leveraging specialized external services for authentication, communication, analytics, and content delivery. These integrations are chosen for their reliability, developer experience, and alignment with our edge-first architecture.

## Why Third-Party Services Matter

Building everything in-house would require:

- Complex authentication systems with security vulnerabilities
- Email delivery infrastructure with deliverability challenges
- Content delivery networks with global presence
- Analytics platforms with real-time processing
- Payment processing with compliance requirements

Third-party services provide battle-tested, compliant, and scalable solutions that let us focus on core music education features.

## Core Integrations

### 1. Google OAuth 2.0 - Authentication

**Purpose**: Provide secure, frictionless authentication without managing passwords.

**Why Google OAuth**:

- **User Trust**: Users trust Google with authentication
- **No Passwords**: Eliminates password fatigue and security risks
- **Rich Profile**: Access to name, email, and profile picture
- **Mobile Ready**: Seamless on all devices
- **Free Tier**: No cost for authentication

**Implementation Architecture**:

```typescript
interface GoogleOAuthFlow {
  // 1. Authorization Request
  initiateAuth(): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${env.FRONTEND_URL}/auth/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline', // For refresh tokens
      prompt: 'select_account', // Always show account selector
      state: generateCSRFToken() // Prevent CSRF attacks
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  // 2. Token Exchange
  async exchangeCode(code: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.FRONTEND_URL}/auth/callback`,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new AuthError('Token exchange failed', response.status)
    }

    return response.json()
  }

  // 3. Profile Retrieval
  async getUserProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    if (!response.ok) {
      throw new AuthError('Profile fetch failed', response.status)
    }

    return response.json()
  }

  // 4. User Creation/Update
  async handleGoogleAuth(profile: GoogleProfile): Promise<User> {
    // Check if user exists
    let user = await db.prepare(
      'SELECT * FROM users WHERE google_id = ? OR email = ?'
    ).bind(profile.id, profile.email).first()

    if (!user) {
      // Create new user
      user = await this.createUser({
        google_id: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
        created_at: new Date().toISOString()
      })
    } else {
      // Update existing user
      await this.updateUser(user.id, {
        google_id: profile.id,
        picture: profile.picture,
        last_login: new Date().toISOString()
      })
    }

    // Generate JWT
    return await this.generateAuthTokens(user)
  }
}
```

**Security Best Practices**:

```typescript
interface GoogleOAuthSecurity {
  // CSRF Protection
  validateState(state: string, session: string): boolean {
    const expectedState = this.hashState(session)
    return timingSafeEqual(state, expectedState)
  }

  // Token Validation
  async validateIdToken(idToken: string): Promise<TokenPayload> {
    const { OAuth2Client } = await import('google-auth-library')
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID)

    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()

    // Verify critical claims
    if (payload.aud !== env.GOOGLE_CLIENT_ID) {
      throw new Error('Invalid audience')
    }

    if (payload.iss !== 'accounts.google.com' &&
        payload.iss !== 'https://accounts.google.com') {
      throw new Error('Invalid issuer')
    }

    return payload
  }

  // Secure Storage
  storeTokens(tokens: TokenSet): void {
    // Never store tokens in localStorage
    // Use httpOnly cookies or secure session storage
    this.session.set('access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: tokens.expires_in
    })

    if (tokens.refresh_token) {
      // Store refresh token encrypted in database
      this.storeRefreshToken(user.id, this.encrypt(tokens.refresh_token))
    }
  }
}
```

### 2. Resend - Email Service

**Purpose**: Reliable transactional email delivery for magic links and notifications.

**Why Resend (not SendGrid)**:

- **Developer Experience**: Simple, modern API
- **Edge Compatible**: Works perfectly with Cloudflare Workers
- **Cost Effective**: Better pricing for our volume
- **React Email**: Beautiful email templates with React
- **Deliverability**: Excellent inbox placement

**Email Types and Templates**:

```typescript
interface EmailTemplates {
  // Magic Link Authentication
  magicLink: {
    template: (link: string) => ReactEmail
    subject: 'Sign in to Mirubato'
    priority: 'high'
    expiry: '15 minutes'
  }

  // Welcome Email
  welcome: {
    template: (user: User) => ReactEmail
    subject: 'Welcome to Mirubato! 🎼'
    priority: 'normal'
    includeOnboarding: true
  }

  // Practice Reminders
  practiceReminder: {
    template: (user: User, lastPractice: Date) => ReactEmail
    subject: 'Time to practice! Your instruments are waiting'
    priority: 'low'
    unsubscribable: true
  }

  // Goal Achievement
  goalAchieved: {
    template: (goal: Goal) => ReactEmail
    subject: `Congratulations! You achieved "${goal.title}"`
    priority: 'normal'
    celebratory: true
  }

  // Weekly Summary
  weeklySummary: {
    template: (stats: WeeklyStats) => ReactEmail
    subject: 'Your weekly practice summary'
    priority: 'low'
    unsubscribable: true
  }
}
```

**Resend Integration**:

```typescript
class ResendEmailService {
  private client: Resend
  private rateLimiter: RateLimiter

  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
    this.rateLimiter = new RateLimiter({
      maxPerSecond: 10,
      maxPerMinute: 100,
    })
  }

  async send(email: EmailRequest): Promise<EmailResponse> {
    // Check rate limits
    await this.rateLimiter.check(email.to)

    // Validate email
    if (!this.isValidEmail(email.to)) {
      throw new ValidationError('Invalid email address')
    }

    // Check suppression list
    if (await this.isSuppressed(email.to)) {
      return { suppressed: true, reason: 'User unsubscribed' }
    }

    try {
      const response = await this.client.emails.send({
        from: 'Mirubato <noreply@mirubato.com>',
        to: [email.to],
        subject: email.subject,
        react: email.template, // React Email component
        headers: {
          'X-Entity-Ref-ID': crypto.randomUUID(),
          'X-Priority': email.priority || 'normal',
        },
        tags: [
          { name: 'type', value: email.type },
          { name: 'user_id', value: email.userId },
        ],
      })

      // Track delivery
      await this.trackEmail({
        id: response.id,
        to: email.to,
        type: email.type,
        sentAt: new Date(),
      })

      return response
    } catch (error) {
      // Handle specific errors
      if (error.statusCode === 429) {
        throw new RateLimitError('Email rate limit exceeded')
      }

      if (error.statusCode === 422) {
        throw new ValidationError('Invalid email content')
      }

      // Log and rethrow
      console.error('Email send failed:', error)
      throw error
    }
  }

  // Batch sending for notifications
  async sendBatch(emails: EmailRequest[]): Promise<BatchResponse> {
    const chunks = this.chunkEmails(emails, 100) // Resend batch limit
    const results = []

    for (const chunk of chunks) {
      const batchResponse = await this.client.batch.send(
        chunk.map(email => ({
          from: 'Mirubato <noreply@mirubato.com>',
          to: email.to,
          subject: email.subject,
          react: email.template,
        }))
      )

      results.push(batchResponse)

      // Respect rate limits between batches
      await this.delay(1000)
    }

    return this.consolidateResults(results)
  }
}
```

**Email Deliverability Best Practices**:

```typescript
interface DeliverabilityOptimization {
  // Domain Configuration
  dnsRecords: {
    spf: 'v=spf1 include:amazonses.com ~all',
    dkim: 'resend._domainkey.mirubato.com',
    dmarc: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@mirubato.com'
  },

  // Bounce Handling
  async handleBounce(webhook: ResendWebhook) {
    if (webhook.type === 'email.bounced') {
      const bounce = webhook.data

      if (bounce.bounce_type === 'hard') {
        // Permanent failure - suppress email
        await this.suppressEmail(bounce.email, 'hard_bounce')
      } else {
        // Temporary failure - retry later
        await this.scheduleRetry(bounce.email, bounce.email_id)
      }
    }
  },

  // Complaint Handling
  async handleComplaint(webhook: ResendWebhook) {
    if (webhook.type === 'email.complained') {
      // User marked as spam - immediately suppress
      await this.suppressEmail(webhook.data.email, 'spam_complaint')
      await this.notifyAdmin('Spam complaint received', webhook.data)
    }
  },

  // Engagement Tracking
  async trackEngagement(webhook: ResendWebhook) {
    const events = ['email.opened', 'email.clicked']

    if (events.includes(webhook.type)) {
      await this.updateEngagement({
        email: webhook.data.email,
        event: webhook.type,
        timestamp: webhook.created_at
      })
    }
  }
}
```

### 3. Magic Link Authentication

**Purpose**: Passwordless authentication via email for users who prefer not to use OAuth.

**Why Magic Links**:

- **No Password Fatigue**: Users don't need another password
- **Security**: No passwords to leak or crack
- **Simplicity**: Just click a link in email
- **Mobile Friendly**: Works seamlessly across devices

**Implementation Flow**:

```typescript
interface MagicLinkAuth {
  // Generate secure token
  async generateMagicLink(email: string): Promise<string> {
    // Validate email
    if (!this.isValidEmail(email)) {
      throw new ValidationError('Invalid email address')
    }

    // Create or find user
    let user = await db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first()

    if (!user) {
      user = await this.createUser({
        email,
        auth_method: 'magic_link'
      })
    }

    // Generate secure token
    const token = this.generateSecureToken()
    const hashedToken = await this.hashToken(token)

    // Store with expiry
    await db.prepare(`
      INSERT INTO magic_links (user_id, token_hash, expires_at)
      VALUES (?, ?, datetime('now', '+15 minutes'))
    `).bind(user.id, hashedToken).run()

    // Build magic link
    const magicLink = `${env.FRONTEND_URL}/auth/verify?token=${token}`

    // Send email
    await this.emailService.send({
      to: email,
      type: 'magic_link',
      template: MagicLinkTemplate({ link: magicLink }),
      priority: 'high'
    })

    return { success: true, message: 'Check your email' }
  }

  // Verify and authenticate
  async verifyMagicLink(token: string): Promise<AuthResponse> {
    const hashedToken = await this.hashToken(token)

    // Find valid token
    const link = await db.prepare(`
      SELECT ml.*, u.*
      FROM magic_links ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.token_hash = ?
        AND ml.expires_at > datetime('now')
        AND ml.used_at IS NULL
    `).bind(hashedToken).first()

    if (!link) {
      throw new AuthError('Invalid or expired link')
    }

    // Mark as used
    await db.prepare(`
      UPDATE magic_links
      SET used_at = datetime('now')
      WHERE token_hash = ?
    `).bind(hashedToken).run()

    // Generate session
    return await this.createSession(link.user_id)
  }

  // Security utilities
  generateSecureToken(): string {
    return base64url(crypto.getRandomValues(new Uint8Array(32)))
  }

  async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token + env.MAGIC_LINK_SECRET)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return base64url(new Uint8Array(hash))
  }
}
```

### 4. Browser Automation (Future)

**Purpose**: Advanced features like automated sheet music import and practice recording.

**Potential Integrations**:

```typescript
interface FutureIntegrations {
  // Browserless.io - Headless browser automation
  browserless: {
    purpose: 'Screenshot sheet music, PDF rendering'
    useCase: 'Generate previews of uploaded scores'
    cost: '$50/month for 1000 hours'
  }

  // Stripe - Payment processing
  stripe: {
    purpose: 'Premium subscriptions, one-time purchases'
    useCase: 'Monetization when ready'
    cost: '2.9% + $0.30 per transaction'
  }

  // PostHog - Product analytics
  posthog: {
    purpose: 'User behavior tracking, feature adoption'
    useCase: 'Understand how users practice'
    cost: 'Free up to 1M events/month'
  }

  // Sentry - Error tracking
  sentry: {
    purpose: 'Real-time error monitoring'
    useCase: 'Catch issues before users report'
    cost: 'Free up to 5K errors/month'
  }

  // Algolia - Search
  algolia: {
    purpose: 'Instant search across scores and repertoire'
    useCase: 'When catalog grows large'
    cost: '$0.50 per 1000 requests'
  }
}
```

## Integration Configuration

### Environment Variables

```typescript
interface IntegrationConfig {
  // Google OAuth
  GOOGLE_CLIENT_ID: string // OAuth app client ID
  GOOGLE_CLIENT_SECRET: string // OAuth app secret
  GOOGLE_REDIRECT_URI: string // Callback URL

  // Resend Email
  RESEND_API_KEY: string // API key for Resend
  RESEND_WEBHOOK_SECRET: string // Webhook signature verification
  RESEND_FROM_EMAIL: string // Verified sender email

  // Magic Links
  MAGIC_LINK_SECRET: string // Secret for token hashing
  MAGIC_LINK_TTL: number // Expiry time in seconds

  // Feature Flags
  ENABLE_GOOGLE_AUTH: boolean // Toggle Google OAuth
  ENABLE_MAGIC_LINKS: boolean // Toggle magic links
  ENABLE_EMAIL_NOTIFICATIONS: boolean // Toggle email notifications
}
```

### Security Configuration

```typescript
interface SecurityConfig {
  // CORS Settings
  cors: {
    origins: ['https://mirubato.com', 'http://localhost:4000']
    credentials: true
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }

  // Rate Limiting
  rateLimits: {
    auth: { requests: 5; window: '15m' }
    email: { requests: 10; window: '1h' }
    api: { requests: 100; window: '1m' }
  }

  // Token Settings
  tokens: {
    jwt: { algorithm: 'HS256'; expiry: '7d' }
    refresh: { expiry: '30d'; rotate: true }
    magicLink: { expiry: '15m'; oneTime: true }
  }

  // Content Security Policy
  csp: {
    'default-src': ["'self'"]
    'script-src': ["'self'", 'https://accounts.google.com']
    'connect-src': ["'self'", 'https://api.resend.com']
    'img-src': ["'self'", 'https://lh3.googleusercontent.com']
  }
}
```

## Error Handling

### Integration Failures

```typescript
class IntegrationErrorHandler {
  async handle(error: IntegrationError): Promise<Response> {
    // Log error with context
    console.error({
      service: error.service,
      operation: error.operation,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })

    // Service-specific handling
    switch (error.service) {
      case 'google_oauth':
        return this.handleOAuthError(error)

      case 'resend':
        return this.handleEmailError(error)

      case 'magic_link':
        return this.handleMagicLinkError(error)

      default:
        return this.handleGenericError(error)
    }
  }

  handleOAuthError(error: OAuthError): Response {
    const errorMessages = {
      invalid_grant: 'Authorization code expired. Please try again.',
      access_denied: 'You denied access. Please try again.',
      invalid_client: 'Configuration error. Please contact support.',
      rate_limit: 'Too many attempts. Please wait and try again.',
    }

    const message = errorMessages[error.code] || 'Authentication failed'

    return new Response(
      JSON.stringify({
        error: 'oauth_error',
        message,
        retry: error.retryable,
      }),
      { status: error.status || 400 }
    )
  }

  handleEmailError(error: EmailError): Response {
    // Don't expose email failures to user
    if (error.type === 'delivery_failed') {
      // Queue for retry
      this.queueEmailRetry(error.email)

      // Return success to user
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Check your email',
        })
      )
    }

    return new Response(
      JSON.stringify({
        error: 'email_error',
        message: 'Unable to send email. Please try again.',
      }),
      { status: 500 }
    )
  }
}
```

### Fallback Strategies

```typescript
interface FallbackStrategies {
  // OAuth Fallback
  authFallback: async (error: OAuthError) => {
    // If Google OAuth fails, offer magic link
    return {
      fallback: 'magic_link',
      message: 'Google sign-in unavailable. Use email sign-in instead?'
    }
  },

  // Email Fallback
  emailFallback: async (error: EmailError) => {
    // If Resend fails, try backup provider or queue
    if (env.BACKUP_EMAIL_PROVIDER) {
      return await this.sendViaBackup(error.email)
    }

    // Queue for later delivery
    await this.queueEmail(error.email)
    return { queued: true }
  },

  // Service Degradation
  degradedMode: {
    // Continue working with reduced functionality
    oauth: false,      // Disable OAuth, use magic links only
    email: 'queue',    // Queue emails for later delivery
    analytics: false,  // Disable analytics tracking
    search: 'basic'    // Fall back to basic search
  }
}
```

## Monitoring and Analytics

### Integration Health Metrics

```typescript
interface IntegrationMetrics {
  // OAuth Metrics
  oauth: {
    successRate: number // Successful auth / attempts
    averageLatency: number // Time to complete flow
    errorRate: number // Failed auths / attempts
    userConversion: number // Completed / started
  }

  // Email Metrics
  email: {
    deliveryRate: number // Delivered / sent
    openRate: number // Opened / delivered
    clickRate: number // Clicked / opened
    bounceRate: number // Bounced / sent
    complaintRate: number // Complaints / delivered
  }

  // Magic Link Metrics
  magicLink: {
    requestRate: number // Links requested / day
    verificationRate: number // Links verified / sent
    expiryRate: number // Expired / sent
    averageTimeToClick: number // Time from send to verify
  }
}
```

### Alerting Rules

```typescript
interface AlertingRules {
  // Critical Alerts
  critical: [
    { metric: 'oauth.errorRate'; threshold: 0.1; window: '5m' },
    { metric: 'email.deliveryRate'; threshold: 0.8; window: '15m' },
    { metric: 'magicLink.verificationRate'; threshold: 0.5; window: '1h' },
  ]

  // Warning Alerts
  warning: [
    { metric: 'oauth.averageLatency'; threshold: 3000; window: '10m' },
    { metric: 'email.bounceRate'; threshold: 0.05; window: '1d' },
    { metric: 'email.complaintRate'; threshold: 0.001; window: '1d' },
  ]

  // Info Alerts
  info: [
    { metric: 'oauth.userConversion'; threshold: 0.7; window: '1d' },
    { metric: 'email.openRate'; threshold: 0.2; window: '1w' },
  ]
}
```

## Best Practices

### For Implementation

1. **API Keys Security**: Never commit API keys, use environment variables
2. **Graceful Degradation**: Always have fallbacks for external services
3. **Rate Limiting**: Respect third-party rate limits
4. **Error Handling**: Don't expose internal errors to users
5. **Monitoring**: Track integration health proactively
6. **Documentation**: Keep integration docs current
7. **Testing**: Mock external services in tests

### For Operations

1. **Regular Audits**: Review API usage and costs monthly
2. **Update Dependencies**: Keep SDKs and libraries current
3. **Monitor Quotas**: Set up alerts before hitting limits
4. **Backup Providers**: Have alternatives ready
5. **Incident Response**: Document recovery procedures

## Cost Management

### Current Monthly Costs (Estimated)

| Service      | Free Tier     | Current Usage | Monthly Cost |
| ------------ | ------------- | ------------- | ------------ |
| Google OAuth | Unlimited     | 500 users/mo  | $0           |
| Resend       | 3,000 emails  | 2,000 emails  | $0           |
| Cloudflare   | 100k requests | 50k requests  | $0           |
| **Total**    |               |               | **$0**       |

### Scaling Costs

| Users     | OAuth | Email (Resend) | Total/Month |
| --------- | ----- | -------------- | ----------- |
| 1,000     | $0    | $0             | $0          |
| 10,000    | $0    | $20            | $20         |
| 100,000   | $0    | $200           | $200        |
| 1,000,000 | $0    | $2,000         | $2,000      |

## Success Metrics

**Integration Quality**:

- API response times < 500ms
- Error rates < 1%
- Uptime > 99.9%

**User Experience**:

- OAuth completion > 80%
- Email delivery > 95%
- Magic link verification > 70%

**Business Value**:

- User signup conversion > 60%
- Authentication success > 95%
- Support tickets < 1% of users

## Related Documentation

- [Authentication](../03-api/authentication.md) - Auth system design
- [API Routes](../03-api/rest-api.md) - API endpoints
- [Security](../appendix/security.md) - Security practices
- [Operations](./operations.md) - Monitoring and debugging

---

_Last updated: 2025-09-09 | Version 1.7.6_
