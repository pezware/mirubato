/**
 * Email Service for Dictionary Admin Portal
 * Handles sending magic link emails via Resend API
 */

import type { Env } from '../types/env'

export class EmailService {
  constructor(private env: Env) {}

  /**
   * Send magic link email
   */
  async sendMagicLink(email: string, magicLink: string): Promise<void> {
    console.log(`Attempting to send magic link to ${email}`)

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Mirubato Dictionary Admin</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f5f7f4; border-radius: 8px; padding: 40px; text-align: center;">
    <h1 style="color: #7a8a6f; margin-bottom: 30px;">📚 Mirubato Dictionary Admin</h1>
    
    <h2 style="color: #2d3748; margin-bottom: 20px;">Sign in to Admin Portal</h2>
    
    <p style="color: #4a5568; margin-bottom: 30px;">
      Click the button below to sign in to the Dictionary Admin Portal. This link will expire in 1 hour.
    </p>
    
    <a href="${magicLink}" style="display: inline-block; background-color: #7a8a6f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Sign In to Admin Portal
    </a>
    
    <p style="color: #718096; margin-top: 30px; font-size: 14px;">
      If you didn't request this email, you can safely ignore it.
    </p>
    
    <p style="color: #a0aec0; margin-top: 20px; font-size: 12px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="word-break: break-all;">${magicLink}</span>
    </p>
  </div>
  
  <p style="text-align: center; color: #a0aec0; margin-top: 40px; font-size: 12px;">
    © 2025 Mirubato Dictionary Service. Admin access only.
  </p>
</body>
</html>
    `

    // For local development, just log the magic link
    if (this.env.ENVIRONMENT === 'local') {
      console.log(`[LOCAL] Magic link for ${email}: ${magicLink}`)
      return
    }

    // Check if RESEND_API_KEY is configured
    if (!this.env.RESEND_API_KEY) {
      // In staging, log that email service is not configured
      if (this.env.ENVIRONMENT === 'staging') {
        console.log(
          `[STAGING] No RESEND_API_KEY configured. Cannot send email to ${email}.`
        )
        throw new Error('Email service not configured. Please contact support.')
      }
      throw new Error('Email service not configured')
    }

    // Send email via Resend
    console.log('Using Resend to send email')
    try {
      await this.sendWithResend(
        email,
        'Sign in to Mirubato Dictionary Admin',
        html
      )
      console.log('Email sent successfully')
    } catch (error) {
      console.error('Failed to send email via Resend:', error)

      // In staging, log the error but don't expose the magic link
      if (this.env.ENVIRONMENT === 'staging') {
        console.log(
          `[STAGING] Email failed for ${email}. Check server logs for details.`
        )
        throw new Error(`Email service error. Please contact support.`)
      }
      throw error
    }
  }

  /**
   * Send email with Resend API
   */
  private async sendWithResend(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mirubato Dictionary <dictionary@mirubato.com>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Resend API error: ${response.status} - ${errorText}`)
      throw new Error(`Failed to send email: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Resend API response:', result)
  }
}
