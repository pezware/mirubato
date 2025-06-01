import type { Env } from '../types/context'

export class EmailService {
  constructor(private env: Env) {}

  async sendMagicLinkEmail(email: string, token: string): Promise<void> {
    // TODO: Implement email sending with Resend or SendGrid
    // For now, we'll just log the magic link in development
    if (this.env.ENVIRONMENT === 'development') {
      console.log(
        `Magic link for ${email}: http://localhost:5173/auth/verify?token=${token}`
      )
    }

    // In production, this would send an actual email
    // Example with Resend:
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'Mirubato <noreply@mirubato.com>',
    //     to: email,
    //     subject: 'Your Mirubato Login Link',
    //     html: this.getMagicLinkEmailTemplate(token),
    //   }),
    // });
  }

  // @ts-expect-error - This method is prepared for future email integration
  private getMagicLinkEmailTemplate(token: string): string {
    const loginUrl = `${this.env.ENVIRONMENT === 'production' ? 'https://mirubato.com' : 'http://localhost:5173'}/auth/verify?token=${token}`

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Login to Mirubato</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Welcome to Mirubato</h1>
          <p>Click the link below to log in to your account:</p>
          <p style="margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Log in to Mirubato</a>
          </p>
          <p style="color: #666; font-size: 14px;">This link will expire in 10 minutes for your security.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this login link, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Mirubato - Open-source sight-reading practice platform<br>
            <a href="https://mirubato.com" style="color: #3498db;">mirubato.com</a>
          </p>
        </body>
      </html>
    `
  }
}
