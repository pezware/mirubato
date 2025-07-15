/**
 * Admin Authentication Routes for Dictionary Service
 * Provides magic link authentication for admin portal
 */

import { Hono } from 'hono'
import { Env, Variables } from '../types/env'
import {
  createApiResponse,
  ValidationError,
  InternalError,
} from '../utils/errors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { EmailService } from '../services/email'
import {
  generateMagicLinkToken,
  verifyMagicLinkToken,
  generateAccessToken,
} from '../utils/auth'

export const adminAuthRoutes = new Hono<{
  Bindings: Env
  Variables: Variables
}>()

// Request magic link schema
const magicLinkRequestSchema = z.object({
  email: z.string().email(),
})

/**
 * Request magic link for admin authentication
 * POST /fredericchopin/auth/magic-link
 */
adminAuthRoutes.post(
  '/magic-link',
  zValidator('json', magicLinkRequestSchema),
  async c => {
    const { email } = c.req.valid('json')
    const emailService = new EmailService(c.env)

    // Validate email is @mirubato.com
    const validEmailPattern = /^[^@]+@mirubato\.com$/
    if (!validEmailPattern.test(email)) {
      throw new ValidationError(
        'Access restricted to @mirubato.com email addresses'
      )
    }

    // Check if MAGIC_LINK_SECRET is configured
    if (!c.env.MAGIC_LINK_SECRET) {
      throw new InternalError('Authentication service not configured')
    }

    try {
      // Generate magic link token
      const token = await generateMagicLinkToken(email, c.env.MAGIC_LINK_SECRET)

      // Build magic link URL
      const origin =
        c.env.ENVIRONMENT === 'production'
          ? 'https://dictionary.mirubato.com'
          : 'https://dictionary-staging.mirubato.com'
      const magicLink = `${origin}/fredericchopin/auth/verify?token=${token}`

      // Send email
      try {
        await emailService.sendMagicLink(email, magicLink)

        return c.json(
          createApiResponse({
            success: true,
            message: 'Magic link sent to your email',
            email,
          })
        )
      } catch (emailError: any) {
        // In staging, return magic link in response if email fails
        if (c.env.ENVIRONMENT === 'staging') {
          console.error('Email send failed in staging:', emailError)
          return c.json(
            createApiResponse({
              success: true,
              message: emailError.message || 'Email service error (check logs)',
              email,
              debugLink: magicLink, // Only for staging
            })
          )
        }
        throw emailError
      }
    } catch (error: any) {
      console.error('Error generating magic link:', error)
      throw new InternalError(
        error.message || 'Failed to process authentication request'
      )
    }
  }
)

/**
 * Verify magic link token
 * GET /fredericchopin/auth/verify
 */
adminAuthRoutes.get('/verify', async c => {
  const token = c.req.query('token')

  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invalid Link</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f7f4;
        }
        .message {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
        }
        .error { color: #e89595; }
        a { color: #7a8a6f; }
      </style>
    </head>
    <body>
      <div class="message">
        <h2 class="error">Invalid Link</h2>
        <p>This magic link is invalid or has expired.</p>
        <a href="/fredericchopin/">Back to Admin Portal</a>
      </div>
    </body>
    </html>
  `

  if (!token) {
    return c.html(errorHtml, 400)
  }

  // Check if MAGIC_LINK_SECRET is configured
  if (!c.env.MAGIC_LINK_SECRET) {
    console.error('MAGIC_LINK_SECRET not configured')
    return c.html(errorHtml, 500)
  }

  // Check if JWT_SECRET is configured for session token
  if (!c.env.JWT_SECRET) {
    console.error('JWT_SECRET not configured')
    return c.html(errorHtml, 500)
  }

  try {
    // Verify the magic link token
    const { email, isAdmin } = await verifyMagicLinkToken(
      token,
      c.env.MAGIC_LINK_SECRET
    )

    if (!isAdmin) {
      console.error('User is not admin:', email)
      return c.html(errorHtml, 403)
    }

    // Generate a new JWT for the session
    const sessionToken = await generateAccessToken(email, c.env.JWT_SECRET)

    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f7f4;
          }
          .message {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .success { color: #7a8a6f; }
          button {
            background: #7a8a6f;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
          }
          button:hover {
            background: #687a5c;
          }
        </style>
      </head>
      <body>
        <div class="message">
          <h2 class="success">Authentication Successful!</h2>
          <p>Welcome, ${email}</p>
          <p>Setting up your admin session...</p>
          <button onclick="window.location.href='/fredericchopin/'">Go to Admin Portal</button>
        </div>
        <script>
          // Store the session token in localStorage
          localStorage.setItem('auth-token', '${sessionToken}');
          localStorage.setItem('user-email', '${email}');
          localStorage.setItem('isAdmin', 'true');
          
          // Redirect after 2 seconds
          setTimeout(() => {
            window.location.href = '/fredericchopin/';
          }, 2000);
        </script>
      </body>
      </html>
    `)
  } catch (error: any) {
    console.error('Token verification failed:', error)
    return c.html(errorHtml, 400)
  }
})

export default adminAuthRoutes
