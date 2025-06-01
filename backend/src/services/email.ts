import type { Env } from '../types/context'
import {
  MAGIC_LINK_HTML_TEMPLATE,
  MAGIC_LINK_TEXT_TEMPLATE,
} from '../templates/email/compiled-templates'
import { getConfig } from '@mirubato/shared/config/environment'

export class EmailService {
  constructor(private env: Env) {}

  async sendMagicLinkEmail(email: string, token: string): Promise<void> {
    const loginUrl = this.getLoginUrl(token)

    // Log in development
    if (this.env.ENVIRONMENT === 'development') {
      console.log(`Magic link for ${email}: ${loginUrl}`)
      return
    }

    // Send email in production
    if (this.env.RESEND_API_KEY) {
      await this.sendViaResend(email, loginUrl)
    } else {
      console.warn('No email service configured. Magic link:', loginUrl)
    }
  }

  private async sendViaResend(email: string, loginUrl: string): Promise<void> {
    const config = getConfig()
    const html = this.getHtmlContent(loginUrl)
    const text = this.getTextContent(loginUrl)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.email.from.name} <${config.email.from.email}>`,
        to: email,
        subject: 'Your Mirubato sign-in link',
        html,
        text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to send email: ${error}`)
    }
  }

  private getLoginUrl(token: string): string {
    const config = getConfig()
    const env = config.currentEnvironment

    // Get the first frontend URL
    const baseUrl =
      env.frontend.url || env.frontend.urls?.[0] || 'http://localhost:3000'

    return `${baseUrl}/auth/verify?token=${token}`
  }

  private getHtmlContent(loginUrl: string): string {
    // Replace the placeholder with the actual login URL
    return MAGIC_LINK_HTML_TEMPLATE.replace(/{{LOGIN_URL}}/g, loginUrl)
  }

  private getTextContent(loginUrl: string): string {
    // Replace the placeholder with the actual login URL
    return MAGIC_LINK_TEXT_TEMPLATE.replace(/{{LOGIN_URL}}/g, loginUrl)
  }
}
