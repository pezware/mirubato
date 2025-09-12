---
Spec-ID: SPEC-INT-003
Title: Third-Party Integrations
Status: ✅ Active
Owner: @pezware
Last-Reviewed: 2025-09-11
Version: 1.7.6
---

# Third-Party Integrations Specification

Status: ✅ Active

## What

Strategic integration of external services for authentication, communication, AI enhancement, and future capabilities like payments and analytics.

## Why

- Core competency focus on music education, not infrastructure
- Battle-tested services reduce security and reliability risks
- Global scale without infrastructure investment
- Compliance and regulatory requirements handled by specialists
- Cost-effective compared to in-house development

## How

- Minimal vendor lock-in through abstraction layers
- Fallback strategies for critical services
- Edge-compatible services preferred
- Privacy-first selection criteria
- Pay-per-use pricing models

## Integration Categories

### Authentication Services

**Google OAuth 2.0** (✅ Active)

- **Purpose**: Primary authentication provider
- **Why Google**: User trust, no password management, mobile-ready
- **Scope**: OpenID, email, profile
- **Implementation**: OAuth 2.0 authorization code flow
- **Code**: `api/src/api/handlers/auth.ts`

**Magic Links** (✅ Active)

- **Purpose**: Passwordless authentication alternative
- **Why**: Simplicity for non-Google users
- **Flow**: Email token → 15-minute expiry → JWT session
- **Rate limiting**: 10 requests per hour
- **Code**: `api/src/api/handlers/auth.ts:145-215`

### Communication Services

**Resend** (✅ Active)

- **Purpose**: Transactional email delivery
- **Why Resend**: Developer experience, deliverability, edge-compatible
- **Use cases**: Magic links, notifications (future)
- **Templates**: React Email components
- **Code**: `api/src/services/email.ts`

### AI & Content Services

**Google Gemini** (✅ Active)

- **Purpose**: AI fallback for complex score analysis
- **Why Gemini**: Superior vision capabilities, generous free tier
- **Models**: gemini-1.5-flash, gemini-1.5-pro
- **Use cases**: Complex score metadata, detailed explanations
- **Code**: `scores/src/services/geminiAiExtractor.ts`

### Future Integrations

**Payment Processing** (🔄 Planned)

- **Provider**: Stripe (tentative)
- **Why**: Industry standard, global support, SCA compliance
- **Features**: Subscriptions, usage-based billing
- **Timeline**: Version 2.0

**Analytics & Monitoring** (🔄 Planned)

- **Options**: PostHog, Plausible, Sentry
- **Requirements**: Privacy-focused, GDPR compliant
- **Metrics**: Usage patterns, error tracking, performance

**Music Services** (🔄 Planned)

- **Spotify/Apple Music**: Practice playlist integration
- **YouTube**: Video lessons and performances
- **SoundCloud**: User recordings

## Integration Patterns

### Service Abstraction

Each integration wrapped in service layer:

- Consistent error handling
- Retry logic with exponential backoff
- Circuit breaker patterns
- Metric collection

### Configuration Management

- **Secrets**: Wrangler secrets for API keys
- **Environment**: Per-environment configurations
- **Feature flags**: Progressive rollout capability

### Error Handling

**Fallback Strategies**:

1. **Primary fails**: Use fallback service
2. **Fallback fails**: Degrade gracefully
3. **All fail**: Queue for retry, notify user

**Example: Authentication**:

- Google OAuth → Magic Link → Error message

### Rate Limiting

Per-service limits enforced:

- Google OAuth: 10K/day free tier
- Resend: 100/day free, 3000/month paid
- Gemini: 60 requests/minute

## Cost Analysis

### Current Costs (Monthly)

| Service       | Free Tier | Usage       | Cost |
| ------------- | --------- | ----------- | ---- |
| Google OAuth  | Unlimited | ~1000 users | $0   |
| Resend        | 100/day   | ~50/day     | $0   |
| Google Gemini | 60/min    | ~100/day    | $0   |

### Projected Costs (10K users)

| Service      | Usage        | Cost         |
| ------------ | ------------ | ------------ |
| Google OAuth | 10K users    | $0           |
| Resend       | 500/day      | $20          |
| Gemini       | 1000/day     | $50          |
| Stripe       | Transactions | 2.9% + $0.30 |

## Security Framework

### Authentication Security

- **OAuth 2.0**: Industry standard flow
- **PKCE**: Protection against code interception
- **State parameter**: CSRF protection
- **Secure cookies**: HttpOnly, SameSite, Secure

### API Key Management

- **Storage**: Cloudflare secrets
- **Rotation**: Quarterly for all keys
- **Access**: Service-specific bindings
- **Audit**: All usage logged

### Data Privacy

- **Minimal sharing**: Only required data to third-parties
- **No PII in logs**: Sanitized before external services
- **User consent**: Explicit for data sharing
- **GDPR compliance**: Right to deletion supported

## Monitoring & Reliability

### Health Checks

Each integration monitored:

```
/health/integrations
├── google-oauth: status, latency
├── resend: status, queue depth
└── gemini: status, quota remaining
```

### Failure Detection

- Response time > 5s
- Error rate > 1%
- Quota approaching limit
- Service deprecation notices

### Incident Response

1. Automatic fallback activation
2. User notification if degraded
3. Manual intervention threshold
4. Post-incident review

## Code References

### Authentication

- Google OAuth: `api/src/api/handlers/auth.ts:274-344`
- Magic links: `api/src/api/handlers/auth.ts:145-215`
- JWT utilities: `api/src/utils/auth.ts`

### Email

- Resend client: `api/src/services/email.ts`
- Templates: `api/src/templates/`

### AI Services

- Gemini client: `scores/src/services/geminiAiExtractor.ts`
- Hybrid strategy: `scores/src/services/hybridAiExtractor.ts`

## Operational Limits

- **Google OAuth**: 10K users/day free
- **Resend**: 100 emails/day free, 3000/month paid
- **Gemini**: 60 requests/minute, 1M tokens/day
- **Future Stripe**: No limits, pay per transaction

## Failure Modes

- **OAuth unavailable**: Fall back to magic links
- **Email delivery fails**: Retry queue, show in-app code
- **AI quota exceeded**: Disable AI features, manual entry
- **Payment fails**: Retry with different method

## Decisions

- **Google OAuth primary** (2024-02): User trust and simplicity
- **Resend over SendGrid** (2024-03): Better DX, edge support
- **Gemini for vision** (2024-06): Superior to GPT-4V for music
- **No analytics yet** (2024-08): Privacy-first approach
- **Stripe planned** (2024-10): Industry standard for payments

## Non-Goals

- Social media authentication (Facebook, Twitter)
- Enterprise SSO (SAML, LDAP)
- Custom email infrastructure
- Self-hosted analytics
- Cryptocurrency payments

## Open Questions

- Should we add Apple Sign In for iOS users?
- When to implement subscription billing?
- Which analytics platform respects privacy best?
- Should we integrate music streaming APIs?
- How to handle GDPR data portability?

## Security & Privacy Considerations

- **Vendor security**: Only SOC 2 compliant services
- **Data minimization**: Request minimal scopes
- **Audit logging**: Track all third-party calls
- **Incident response**: Vendor status monitoring
- **Compliance**: GDPR, CCPA considerations
- **User control**: Opt-out and data deletion

## Related Documentation

- [Authentication](../03-api/authentication.md) - Auth implementation
- [AI Services](./ai-services.md) - AI integration details
- [IMSLP Integration](./imslp.md) - Content integration

---

Last updated: 2025-09-11 | Version 1.7.6
