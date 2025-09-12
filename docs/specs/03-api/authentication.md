# Authentication Specification

Status: ✅ Active

## What

Passwordless authentication (magic link) and Google OAuth with JWT cookies for browser flows and Bearer tokens for API access.

## Why

- Reduce friction: no passwords for logging practice
- Work well at the edge: stateless JWT
- Keep implementation simple and reliable

## How

- Methods
  - Magic link: `POST /api/auth/request-magic-link` → `POST /api/auth/verify-magic-link`
  - Google OAuth: `POST /api/auth/google` (verifies Google ID token via tokeninfo)
- Tokens
  - Access/refresh are JWTs; both set as cookies (`auth-token`, `refresh-token`) with httpOnly, SameSite=Lax, Secure
  - Token TTL: currently 30 days for both
  - Also accepted via `Authorization: Bearer <jwt>` for API clients
- Refresh & logout
  - `POST /api/auth/refresh` reads `refresh-token` cookie and issues a new access token cookie
  - `POST /api/auth/logout` clears both cookies
- Staging behavior
  - Magic link email failures return success with `debugLink` in staging for developer testing

## Endpoints (Current)

- `POST /api/auth/request-magic-link`
- `POST /api/auth/verify-magic-link`
- `POST /api/auth/google`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Planned (not implemented): register, password login, logout-all, password reset, token revocation store, session table, CSRF tokens for stateful flows, token family rotation.

## Failure Modes

- Invalid/expired magic link token
- Google tokeninfo invalid `aud` or expired token
- Missing cookies for refresh
- User not found after upsert

## Operational Limits

- Cookies: httpOnly, SameSite=Lax; do not use from JS
- Token expiry: 30 days; no server-side revocation list today
- Rate limiting: applied to select auth endpoints

## Code References

- Handlers: `api/src/api/handlers/auth.ts`
- Middleware: `api/src/api/middleware.ts`
- JWT utils: `api/src/utils/auth.ts`
- DB helpers: `api/src/utils/database.ts`

## Related Documentation

- [REST API](./rest-api.md)
- [WebSocket](./websocket.md)

---

Last updated: 2025-09-09 | Source of truth: handlers above
