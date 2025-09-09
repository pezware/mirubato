# API Client Examples

Status: ✅ Active

These short examples illustrate common flows. For full schemas, see `/openapi.json`.

## Request + Verify Magic Link

- Request link
  - `curl -X POST "$API_URL/api/auth/request-magic-link" -H "Content-Type: application/json" -d '{"email":"user@example.com"}'`
- Verify token (from email)
  - `curl -X POST "$API_URL/api/auth/verify-magic-link" -H "Content-Type: application/json" -d '{"token":"<magic-token>"}' -i`
  - Response sets cookies `auth-token` and `refresh-token` (httpOnly)

## Refresh Access Token (cookie-based)

- `curl -X POST "$API_URL/api/auth/refresh" -b "refresh-token=<cookie-value>" -i`

## Push Sync Changes with Idempotency

- `curl -X POST "$API_URL/api/sync/push" \
-H "Authorization: Bearer $JWT" \
-H "Content-Type: application/json" \
-H "X-Idempotency-Key: $(uuidgen)" \
-d '{"changes": {"entries": [{"id":"e1","timestamp": 1701388800,"duration":600,"type":"practice","instrument":"piano"}]}}'`

## Open WebSocket (Browser)

```js
const url = `wss://sync.mirubato.com/sync/ws?userId=${userId}&token=${jwt}`
const ws = new WebSocket(url)
ws.onmessage = e => console.log('WS', e.data)
ws.onopen = () =>
  ws.send(JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() }))
```

---

Last updated: September 2025
