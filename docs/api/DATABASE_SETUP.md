# API Service Database Setup

## Overview

The API service uses Cloudflare D1 databases that are shared with the existing backend service. This ensures data consistency during the migration period.

## Database Configuration

### Production Database

- **Name**: mirubato-prod
- **ID**: 31ecc854-aecf-4994-8bda-7a9cd3055122
- **Binding**: DB

### Development/Staging Database

- **Name**: mirubato-dev
- **ID**: 4510137a-7fdf-4fcd-83c9-a1b0adb7fe3e
- **Binding**: DB

## Important Notes

1. **Shared Databases**: The API service uses the same D1 databases as the backend service. This is intentional to ensure both services can operate on the same data during the transition period.

2. **No KV Storage Needed**: Unlike the backend service, the API service uses stateless JWT tokens for magic links, so it doesn't require KV storage.

3. **Database Migrations**: Since we're using existing databases, no new migrations are needed. The API service is designed to work with the existing schema.

## Deployment

The databases are already created and configured in Cloudflare. When deploying the API service:

1. The production deployment will automatically use the production database
2. The staging deployment will use the development database
3. Local development will also use the development database

## Troubleshooting

If you encounter database binding errors during deployment:

1. Verify the database IDs match those in your Cloudflare account
2. Ensure your account has access to these databases
3. Check that the database names haven't been changed in Cloudflare

## Future Considerations

When the API service fully replaces the backend service:

1. The backend service can be decommissioned
2. The databases will remain unchanged
3. Consider renaming databases for clarity (e.g., mirubato-api-prod instead of mirubato-prod)
