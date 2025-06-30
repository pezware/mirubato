# Music Catalog Seeding Guide

This guide explains how to seed the composer and piece data into Cloudflare KV for local, staging, and production environments.

## Prerequisites

- Cloudflare account with access to the Mirubato project
- Wrangler CLI installed and authenticated (`wrangler login`)
- Node.js installed

## Step 1: Generate Seed Data

First, generate the seed data files for each environment:

```bash
cd api

# Generate for local development
npx tsx scripts/seed-music-catalog.ts --env=local

# Generate for staging
npx tsx scripts/seed-music-catalog.ts --env=staging

# Generate for production
npx tsx scripts/seed-music-catalog.ts --env=production
```

This creates two JSON files per environment in the `api/scripts/` directory:

- `music-catalog-seed-{env}.json` - Human-readable format
- `music-catalog-bulk-{env}.json` - Format for wrangler kv:bulk

## Step 2: Create KV Namespaces

### For Local Development

Local development uses Wrangler's local KV emulation:

```bash
# Start the dev server - this automatically creates local KV
cd api
npm run dev
```

Then seed the local KV:

```bash
# In another terminal, seed the local KV
wrangler kv bulk put scripts/music-catalog-bulk-local.json --namespace-id=music-catalog-local --local
```

### For Staging/Production

1. **Create KV namespaces in Cloudflare Dashboard:**
   - Go to Workers & Pages > KV
   - Create namespace: `mirubato-music-catalog-staging`
   - Create namespace: `mirubato-music-catalog-prod`
   - Note the namespace IDs

2. **Update wrangler.toml with actual namespace IDs:**

```toml
# api/wrangler.toml

# Staging
[[env.staging.kv_namespaces]]
binding = "MUSIC_CATALOG"
id = "YOUR_STAGING_NAMESPACE_ID"  # Replace with actual ID

# Production
[[kv_namespaces]]
binding = "MUSIC_CATALOG"
id = "YOUR_PRODUCTION_NAMESPACE_ID"  # Replace with actual ID
```

## Step 3: Upload Data to KV

### Method 1: Using wrangler kv:bulk (Recommended)

```bash
cd api

# For staging
wrangler kv bulk put scripts/music-catalog-bulk-staging.json --namespace-id=YOUR_STAGING_NAMESPACE_ID

# For production
wrangler kv bulk put scripts/music-catalog-bulk-production.json --namespace-id=YOUR_PRODUCTION_NAMESPACE_ID
```

### Method 2: Using Cloudflare Dashboard

1. Go to Workers & Pages > KV > Your namespace
2. Click "Upload"
3. Select the `music-catalog-bulk-{env}.json` file
4. Confirm upload

## Step 4: Verify the Data

### Local Testing

```bash
# Start the frontend dev server
npm run dev

# In the app, try typing in the composer or piece fields
# You should see autocomplete suggestions
```

### Staging/Production Testing

```bash
# Test the API directly
curl "https://api-staging.mirubato.com/api/autocomplete/composers?q=beet"
curl "https://api.mirubato.com/api/autocomplete/pieces?q=moon"
```

## Data Structure in KV

The seed script creates the following KV entries:

```javascript
{
  // All composers as an array
  "composers:all": ["Ludwig van Beethoven", "Johann Sebastian Bach", ...],

  // All pieces with metadata
  "pieces:all": [
    {
      "title": "Moonlight Sonata",
      "composer": "Ludwig van Beethoven",
      "gradeLevel": 3,
      "instrument": "PIANO"
    },
    ...
  ],

  // Pieces grouped by composer (lowercase key)
  "pieces:by-composer:ludwig van beethoven": [...],

  // Pieces by grade level (1-10)
  "pieces:grade:1": [...],
  "pieces:grade:2": [...],

  // Pieces by instrument
  "pieces:instrument:piano": [...],
  "pieces:instrument:guitar": [...]
}
```

## Updating the Data

To update the composer/piece data:

1. Edit `docs/classical-music-composers-pieces.md`
2. Re-run the seed script for the appropriate environment
3. Re-upload to KV using the steps above

## Troubleshooting

### "Namespace not found" error

- Ensure the namespace ID in wrangler.toml matches the one in Cloudflare dashboard
- For local dev, ensure you're using the `--local` flag

### Autocomplete not working

- Check the browser console for errors
- Verify the API endpoints are accessible
- Check that the user is authenticated (autocomplete also searches user's history)

### Data not appearing

- KV can have a slight delay (usually < 60 seconds) for global propagation
- Try clearing browser cache
- Check the KV namespace in Cloudflare dashboard to verify data exists

## Cost Considerations

- KV read operations: 10 million free per month, then $0.50 per 10 million
- KV write operations: 1 million free per month, then $5.00 per million
- Storage: 1 GB free, then $0.50 per GB

The music catalog data is very small (~500KB) and reads are cached, so costs should be minimal.
