import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const { googleLogin } = useAuthStore()

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (!window.google) {
        console.error('Google Sign-In library not loaded')
        return
      }

      const GOOGLE_CLIENT_ID =
        '588179480764-kqduhkmbjh34po7kgfond5anarg1b4vm.apps.googleusercontent.com'

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: google.accounts.id.CredentialResponse) => {
          try {
            await googleLogin(response.credential)
            onSuccess?.()
          } catch (error) {
            console.error('Google login failed:', error)
            onError?.(
              error instanceof Error ? error.message : 'Google login failed'
            )
          }
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      })

      // Render the button
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: 300,
        })
      }
    }

    // Check if the library is already loaded
    if (window.google) {
      initializeGoogleSignIn()
    } else {
      // Wait for the library to load
      const checkInterval = setInterval(() => {
        if (window.google) {
          clearInterval(checkInterval)
          initializeGoogleSignIn()
        }
      }, 100)

      // Cleanup
      return () => clearInterval(checkInterval)
    }
  }, [googleLogin, onSuccess, onError])

  return (
    <div className="w-full">
      <div ref={buttonRef} className="flex justify-center" />
    </div>
  )
}
