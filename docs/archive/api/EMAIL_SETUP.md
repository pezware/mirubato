# Email Setup Guide for Mirubato API

## Overview

The Mirubato API uses Resend for sending transactional emails, including magic link authentication emails. This guide walks you through setting up Resend for your deployment.

## Prerequisites

- A Resend account (sign up at https://resend.com)
- A verified domain in Resend (or use the development domain)
- Access to Cloudflare Workers dashboard or wrangler CLI

## Step 1: Create a Resend Account

1. Go to [Resend](https://resend.com) and sign up for an account
2. Verify your email address

## Step 2: Get Your API Key

1. Log into your Resend dashboard
2. Navigate to **API Keys** section
3. Create a new API key with "Send emails" permission
4. Copy the API key (it starts with `re_`)

## Step 3: Configure Your Domain (Production Only)

For production use, you'll need to verify your domain:

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `mirubato.com`)
3. Add the DNS records as shown in Resend
4. Wait for verification (usually takes a few minutes)

**Note**: For development, you can use Resend's default domain: `onboarding@resend.dev`

## Step 4: Configure Cloudflare Environment Variables

### Option A: Using Wrangler CLI (Recommended)

```bash
# Navigate to the API directory
cd api

# Add the Resend API key as an encrypted secret
echo "re_your_api_key_here" | wrangler secret put RESEND_API_KEY

# For staging environment
echo "re_your_staging_api_key" | wrangler secret put RESEND_API_KEY --env staging
```

### Option B: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account > **Workers & Pages**
3. Find `mirubato-api` worker
4. Go to **Settings** > **Variables**
5. Add encrypted variable:
   - Variable name: `RESEND_API_KEY`
   - Value: Your Resend API key
   - Click "Encrypt" before saving

## Step 5: Update Email Configuration

The email service is configured to use the following sender:

- **From Email**: `noreply@mirubato.com`
- **From Name**: `Mirubato`

If you're using a different domain, update the `from` field in `/api/src/services/email.ts`:

```typescript
from: 'Mirubato <noreply@yourdomain.com>',
```

## Step 6: Test Email Sending

1. Deploy your changes:

   ```bash
   wrangler deploy
   ```

2. Test the magic link flow:

   ```bash
   curl -X POST https://apiv2.mirubato.com/api/auth/request-magic-link \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

3. Check your email for the magic link

## Troubleshooting

### Common Issues

1. **"Email not sent" in logs**
   - Ensure `RESEND_API_KEY` is properly set as a secret
   - Check that the API key has "Send emails" permission

2. **"Domain not verified" error**
   - Make sure your sending domain is verified in Resend
   - For development, use `onboarding@resend.dev` as the sender

3. **Rate limiting**
   - Free Resend accounts have rate limits
   - Check your Resend dashboard for current usage

### Debug Mode

To debug email sending in development:

1. Set environment to local in wrangler.toml:

   ```toml
   [env.local]
   vars = { ENVIRONMENT = "local" }
   ```

2. Emails will be logged to console instead of sent

## Email Templates

The magic link email template is located in `/api/src/services/email.ts`. The template includes:

- Responsive HTML design
- Clear call-to-action button
- Fallback plain text link
- 15-minute expiration notice

## Security Considerations

1. **API Key Storage**: Always store the Resend API key as an encrypted secret
2. **Domain Verification**: Verify your domain to prevent spoofing
3. **Rate Limiting**: Implement rate limiting on the magic link endpoint
4. **Email Validation**: Validate email addresses before sending

## Production Checklist

- [ ] Resend account created and verified
- [ ] Domain verified in Resend (for production)
- [ ] API key created with appropriate permissions
- [ ] API key added as Cloudflare secret
- [ ] Email template reviewed and tested
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Monitoring set up for failed emails

## Support

For issues with:

- **Resend**: Check [Resend documentation](https://resend.com/docs)
- **Cloudflare Workers**: See [Workers documentation](https://developers.cloudflare.com/workers/)
- **API Implementation**: Review `/api/src/services/email.ts`
