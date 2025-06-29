# R2 Local Testing Best Practices

Based on research and Cloudflare's recommendations, here's how we handle R2 storage in local development.

## Key Principle: Use Miniflare for Local Development

**DO NOT** use actual R2 buckets for local development. Instead, use Miniflare's built-in R2 simulation that comes with `wrangler dev`.

## How It Works

1. **Wrangler Configuration** (`wrangler.toml`):

   ```toml
   [[r2_buckets]]
   binding = "SCORES_BUCKET"
   bucket_name = "mirubato-scores-production"  # Ignored in local dev
   ```

2. **Run Development Server**:

   ```bash
   cd scores
   npm run dev  # This runs: wrangler dev --env local
   ```

3. **Miniflare Automatically**:
   - Creates a local R2 simulation
   - Stores data in `.wrangler/state/` (or in-memory)
   - Makes it available as `env.SCORES_BUCKET` in your code

## Seeding Test Data

### Option 1: Use Development Endpoints (Recommended)

We've created development-only endpoints for seeding:

```bash
# After starting wrangler dev, run:
cd scores
npm run seed:r2
```

This creates placeholder PDFs in the local R2 storage.

### Option 2: Manual Upload via API

```bash
# Upload a file manually
curl -X POST http://localhost:8787/api/dev/upload \
  -H "Content-Type: application/json" \
  -d '{
    "key": "test-data/my-file.pdf",
    "content": "base64-encoded-content",
    "contentType": "application/pdf"
  }'
```

## Benefits of This Approach

1. **Speed**: No network latency - everything is local
2. **Cost**: Free - no R2 API charges
3. **Offline**: Works without internet connection
4. **Isolation**: Each developer has their own storage
5. **Clean State**: Easy to reset by restarting wrangler

## File Structure

```
scores/
├── src/
│   └── api/
│       └── handlers/
│           ├── serveR2.ts     # Serves files from R2
│           └── devSeed.ts     # Development seeding endpoints
├── scripts/
│   └── seed-r2-miniflare.sh  # Seeds test data
└── .wrangler/
    └── state/                 # Local R2 data (git-ignored)
```

## Troubleshooting

### PDFs Not Loading?

1. Make sure `wrangler dev` is running
2. Run `npm run seed:r2` to seed test data
3. Check browser console for CORS errors

### Reset Local R2?

```bash
# Stop wrangler dev, then:
rm -rf .wrangler/state
# Start wrangler dev again
```

### Need Real PDFs Instead of Placeholders?

The current seed script creates placeholder PDFs. To use real PDFs:

1. Update `devSeed.ts` to accept file uploads
2. Or use the `/api/dev/upload` endpoint with base64-encoded PDFs

## Production vs Local

| Aspect      | Local (Miniflare)  | Production      |
| ----------- | ------------------ | --------------- |
| Storage     | `.wrangler/state/` | Cloudflare R2   |
| Performance | Instant            | Network latency |
| Cost        | Free               | Per operation   |
| Persistence | Ephemeral\*        | Permanent       |
| Access      | Local only         | Global          |

\*Can be configured for persistence between restarts

## References

- [Cloudflare Wrangler Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Miniflare Documentation](https://miniflare.dev/)
- [R2 Documentation](https://developers.cloudflare.com/r2/)
