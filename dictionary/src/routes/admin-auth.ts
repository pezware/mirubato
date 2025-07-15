/**
 * Admin Authentication Routes for Dictionary Service
 * Provides magic link authentication for admin portal
 */

import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { Env, Variables } from '../types/env'
import { createApiResponse, ValidationError } from '../utils/errors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

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

    // Validate email is @mirubato.com
    const validEmailPattern = /^[^@]+@mirubato\.com$/
    if (!validEmailPattern.test(email)) {
      throw new ValidationError(
        'Access restricted to @mirubato.com email addresses'
      )
    }

    // Generate a simple token for this demo
    // In production, you would:
    // 1. Generate a secure random token
    // 2. Store it in KV with expiration
    // 3. Send email via service like Resend

    // Check if JWT_SECRET is configured
    if (!c.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured')
    }

    // For now, we'll create a JWT directly
    const token = await sign(
      {
        email,
        isAdmin: true,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      },
      c.env.JWT_SECRET
    )

    // In production, you would send an email here using a service like Resend:
    // await sendEmail({
    //   to: email,
    //   subject: 'Your Mirubato Admin Portal Login Link',
    //   body: `Click here to login: ${magicLink}`
    // })

    // For demo/staging, we'll return the link directly
    // c.req.url is already a string URL in Hono
    const origin =
      c.env.ENVIRONMENT === 'production'
        ? 'https://dictionary.mirubato.com'
        : 'https://dictionary-staging.mirubato.com'
    const magicLink = `${origin}/fredericchopin/auth/verify?token=${token}`

    return c.json(
      createApiResponse({
        message: 'Magic link generated',
        magicLink,
        email,
        expiresIn: '1 hour',
      })
    )
  }
)

/**
 * Verify magic link token
 * GET /fredericchopin/auth/verify
 */
adminAuthRoutes.get('/verify', async c => {
  const token = c.req.query('token')

  if (!token) {
    return c.html(
      `
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
    `,
      400
    )
  }

  // In production, verify token from KV storage
  // For now, we'll accept the JWT

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
        <p>You have been authenticated. Setting up your session...</p>
        <button onclick="window.location.href='/fredericchopin/'">Go to Admin Portal</button>
      </div>
      <script>
        // Store the token in localStorage
        localStorage.setItem('auth-token', '${token}');
        
        // Also try to extract email from token
        try {
          const payload = JSON.parse(atob('${token}'.split('.')[1]));
          if (payload.email) {
            localStorage.setItem('user-email', payload.email);
          }
        } catch (e) {
          console.error('Failed to parse token:', e);
        }
        
        // Redirect after 2 seconds
        setTimeout(() => {
          window.location.href = '/fredericchopin/';
        }, 2000);
      </script>
    </body>
    </html>
  `)
})

export default adminAuthRoutes
