declare namespace google {
  namespace accounts {
    namespace id {
      interface InitializeConfig {
        client_id: string
        callback: (response: CredentialResponse) => void
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
        prompt_parent_id?: string
        nonce?: string
        context?: string
        state_cookie_domain?: string
        ux_mode?: 'popup' | 'redirect'
        allowed_parent_origin?: string | string[]
        intermediate_iframe_close_callback?: () => void
      }

      interface CredentialResponse {
        credential: string
        select_by: string
        clientId?: string
      }

      interface PromptMomentNotification {
        isDisplayMoment(): boolean
        isDisplayed(): boolean
        isNotDisplayed(): boolean
        getNotDisplayedReason(): string
        isSkippedMoment(): boolean
        getSkippedReason(): string
        isDismissedMoment(): boolean
        getDismissedReason(): string
        getMomentType(): string
      }

      interface GsiButtonConfiguration {
        type?: 'standard' | 'icon'
        theme?: 'outline' | 'filled_blue' | 'filled_black'
        size?: 'large' | 'medium' | 'small'
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
        shape?: 'rectangular' | 'pill' | 'circle' | 'square'
        logo_alignment?: 'left' | 'center'
        width?: number
        locale?: string
      }

      function initialize(config: InitializeConfig): void
      function prompt(
        momentListener?: (notification: PromptMomentNotification) => void
      ): void
      function renderButton(
        parent: HTMLElement,
        options: GsiButtonConfiguration
      ): void
      function disableAutoSelect(): void
      function storeCredential(
        credential: { id: string; password: string },
        callback?: () => void
      ): void
      function cancel(): void
      function revoke(
        email: string,
        callback?: (response: { successful: boolean; error: string }) => void
      ): void
    }
  }
}
