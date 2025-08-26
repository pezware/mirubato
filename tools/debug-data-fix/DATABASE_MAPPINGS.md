# Database Mappings for Mirubato Services

## API Service Database IDs

### Production

- **Database Name**: mirubato-prod
- **Database ID**: 31ecc854-aecf-4994-8bda-7a9cd3055122
- **Domain**: api.mirubato.com

### Staging

- **Database Name**: mirubato-dev
- **Database ID**: 4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e
- **Domain**: api-staging.mirubato.com

## Scores Service Database IDs

### Production

- **Database Name**: mirubato-scores-production
- **Database ID**: aac4662e-d14a-4397-971c-c544d8c79104
- **Domain**: scores.mirubato.com

### Staging

- **Database Name**: mirubato-scores-staging
- **Database ID**: eb2baa9e-c67f-45e1-bf79-cd2cf781e92e
- **Domain**: scores-staging.mirubato.com

## Dictionary Service Database IDs

### Production

- **Database Name**: mirubato-dictionary-production
- **Database ID**: bcb9546e-c5ef-43f7-a462-3472fa3fae89
- **Domain**: dictionary.mirubato.com

### Staging

- **Database Name**: mirubato-dictionary-staging
- **Database ID**: 1cc0df2f-aac5-41a9-b6d5-405f7d40b740
- **Domain**: dictionary-staging.mirubato.com

## Sync Worker Database IDs

### Production

- **Database Name**: mirubato-prod (shared with API)
- **Database ID**: 31ecc854-aecf-4994-8bda-7a9cd3055122
- **Domain**: sync.mirubato.com

### Staging

- **Database Name**: mirubato-dev (shared with API)
- **Database ID**: 4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e
- **Domain**: sync-staging.mirubato.com

## Important Notes

1. **API and Sync Worker share the same database** - Both use mirubato-prod/mirubato-dev
2. **Scores and Dictionary have separate databases** - Each service has its own database
3. **Staging uses "mirubato-dev" naming** - Despite being staging environment

## Debug Tool Configuration

For the debug-data-fix tool, use these database IDs in your .env file:

```env
# Main API Database (contains user data, sync_data, logbook, repertoire)
D1_DATABASE_ID_STAGING=4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e
D1_DATABASE_ID_PRODUCTION=31ecc854-aecf-4994-8bda-7a9cd3055122

# Scores Service Database (if needed for score verification)
D1_SCORES_DATABASE_ID_STAGING=eb2baa9e-c67f-45e1-bf79-cd2cf781e92e
D1_SCORES_DATABASE_ID_PRODUCTION=aac4662e-d14a-4397-971c-c544d8c79104
```
