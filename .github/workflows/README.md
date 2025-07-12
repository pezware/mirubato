# GitHub Actions Workflows

## Workflows Overview

### 1. CI (`ci.yml`)

- **Trigger**: Push to main/develop, Pull requests
- **Purpose**: Lint, type check, and test code
- **Jobs**: ESLint, Prettier, TypeScript checks

### 2. Deploy Dashboard (`deploy-dashboard.yml`)

- **Trigger**: Push to main branch
- **Purpose**: Deploy dashboard to GitHub Pages
- **Security**: Uses GitHub token for deployment

### 3. Validate Translations (`validate-translations.yml`)

- **Trigger**: Push to main, Pull requests, Manual
- **Purpose**: Ensure i18n translations are complete
- **Checks**: Missing keys, consistency across languages

## Security Notes

Since this is a **public repository**, all workflows are designed to:

1. **Never log sensitive data** - All database outputs suppressed
2. **Use GitHub Secrets** - No hardcoded credentials
3. **Mask sensitive values** - Even counts are masked
4. **Encrypt at rest** - Backups are always encrypted

## Required Secrets

Configure in Settings → Secrets → Actions:

_Currently no secrets are required for the active workflows._

## Manual Workflow Triggers

Some workflows can be triggered manually:

1. Go to Actions tab
2. Select the workflow
3. Click "Run workflow"
4. Fill in any inputs
5. Click "Run workflow" button

## Workflow Permissions

All workflows use minimal permissions:

- `contents: read` - Read repository
- `actions: read` - Read workflow status
- No write permissions unless absolutely necessary

## Adding New Workflows

When adding workflows to this public repo:

1. **Never echo secrets** or sensitive data
2. **Use `set +x`** to disable command echo
3. **Redirect output** to /dev/null for sensitive commands
4. **Mask values** with `::add-mask::`
5. **Test locally** first if possible
6. **Document** required secrets and permissions

## Monitoring

- Check Actions tab for workflow status
- Artifacts available for download
- Workflow runs retained for 90 days

## Support

For workflow issues:

1. Check the specific workflow file
2. Review action logs (data is suppressed)
3. Verify secrets are configured
4. Create an issue with details
