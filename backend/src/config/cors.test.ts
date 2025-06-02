import { isOriginAllowed } from './cors'

describe('CORS Configuration', () => {
  describe('isOriginAllowed', () => {
    describe('production environment', () => {
      it('should allow exact production domains', () => {
        expect(isOriginAllowed('https://mirubato.com', 'production')).toBe(true)
        expect(isOriginAllowed('https://www.mirubato.com', 'production')).toBe(
          true
        )
      })

      it('should allow Cloudflare preview deployments with hash prefix', () => {
        expect(
          isOriginAllowed(
            'https://7a80e837-mirubato.pezware.workers.dev',
            'production'
          )
        ).toBe(true)
        expect(
          isOriginAllowed(
            'https://abc123-mirubato.pezware.workers.dev',
            'production'
          )
        ).toBe(true)
      })

      it('should allow Cloudflare preview deployments with branch prefix', () => {
        expect(
          isOriginAllowed(
            'https://feature-auth-mirubato.pezware.workers.dev',
            'production'
          )
        ).toBe(true)
        expect(
          isOriginAllowed(
            'https://bugfix-cors-mirubato.pezware.workers.dev',
            'production'
          )
        ).toBe(true)
      })

      it('should allow backend preview deployments', () => {
        expect(
          isOriginAllowed(
            'https://mirubato-backend.pezware.workers.dev',
            'production'
          )
        ).toBe(true)
        expect(
          isOriginAllowed(
            'https://feature-mirubato-backend.pezware.workers.dev',
            'production'
          )
        ).toBe(true)
      })

      it('should allow any workers.dev domain (if generic pattern is kept)', () => {
        expect(
          isOriginAllowed('https://some-other-app.workers.dev', 'production')
        ).toBe(true)
        expect(isOriginAllowed('https://another.pages.dev', 'production')).toBe(
          true
        )
      })

      it('should not allow non-matching domains', () => {
        expect(isOriginAllowed('https://evil.com', 'production')).toBe(false)
        expect(isOriginAllowed('http://mirubato.com', 'production')).toBe(false) // Wrong protocol
      })
    })

    describe('development environment', () => {
      it('should allow localhost origins', () => {
        expect(isOriginAllowed('http://localhost:3000', 'development')).toBe(
          true
        )
        expect(isOriginAllowed('http://localhost:5173', 'development')).toBe(
          true
        )
        expect(isOriginAllowed('http://127.0.0.1:3000', 'development')).toBe(
          true
        )
      })

      it('should allow any localhost port', () => {
        expect(isOriginAllowed('http://localhost:8080', 'development')).toBe(
          true
        )
        expect(isOriginAllowed('http://localhost:4321', 'development')).toBe(
          true
        )
      })

      it('should not allow production domains in development', () => {
        expect(isOriginAllowed('https://mirubato.com', 'development')).toBe(
          false
        )
      })
    })
  })
})
