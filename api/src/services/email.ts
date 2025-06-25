import type { Env } from '../index'

export class EmailService {
  constructor(private env: Env) {}

  /**
   * Send magic link email
   */
  async sendMagicLink(email: string, magicLink: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Mirubato</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f7fafc; border-radius: 8px; padding: 40px; text-align: center;">
    <h1 style="color: #667eea; margin-bottom: 30px;">🎼 Mirubato</h1>
    
    <h2 style="color: #2d3748; margin-bottom: 20px;">Sign in to your account</h2>
    
    <p style="color: #4a5568; margin-bottom: 30px;">
      Click the button below to sign in to your Mirubato account. This link will expire in 15 minutes.
    </p>
    
    <a href="${magicLink}" style="display: inline-block; background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
      Sign In
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
    © 2025 Mirubato. MIT License.
  </p>
</body>
</html>
    `

    // For development, just log the email
    if (this.env.ENVIRONMENT === 'local') {
      // Development: Magic link would be sent to email
      return
    }

    // In production, use Resend or another email service
    if (this.env.RESEND_API_KEY) {
      await this.sendWithResend(email, 'Sign in to Mirubato', html)
    } else {
      // Fallback: Magic link would be sent to email
    }
  }

  /**
   * Send email with Resend
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
        from: 'Mirubato <noreply@mirubato.com>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }
  }
}
