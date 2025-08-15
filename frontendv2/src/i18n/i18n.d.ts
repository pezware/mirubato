import 'react-i18next'
import type common from '../locales/en/common.json'
import type auth from '../locales/en/auth.json'
import type logbook from '../locales/en/logbook.json'
import type reports from '../locales/en/reports.json'
import type errors from '../locales/en/errors.json'
import type scorebook from '../locales/en/scorebook.json'
import type toolbox from '../locales/en/toolbox.json'
import type ui from '../locales/en/ui.json'

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      logbook: typeof logbook
      reports: typeof reports
      errors: typeof errors
      scorebook: typeof scorebook
      toolbox: typeof toolbox
      ui: typeof ui
    }
  }
}
