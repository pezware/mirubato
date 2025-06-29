import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import enCommon from '../locales/en/common.json'
import enAuth from '../locales/en/auth.json'
import enLogbook from '../locales/en/logbook.json'
import enReports from '../locales/en/reports.json'
import enErrors from '../locales/en/errors.json'
import enScorebook from '../locales/en/scorebook.json'

import esCommon from '../locales/es/common.json'
import esAuth from '../locales/es/auth.json'
import esLogbook from '../locales/es/logbook.json'
import esReports from '../locales/es/reports.json'
import esErrors from '../locales/es/errors.json'
import esScorebook from '../locales/es/scorebook.json'

import frCommon from '../locales/fr/common.json'
import frAuth from '../locales/fr/auth.json'
import frLogbook from '../locales/fr/logbook.json'
import frReports from '../locales/fr/reports.json'
import frErrors from '../locales/fr/errors.json'
import frScorebook from '../locales/fr/scorebook.json'

import zhTWCommon from '../locales/zh-TW/common.json'
import zhTWAuth from '../locales/zh-TW/auth.json'
import zhTWLogbook from '../locales/zh-TW/logbook.json'
import zhTWReports from '../locales/zh-TW/reports.json'
import zhTWErrors from '../locales/zh-TW/errors.json'
import zhTWScorebook from '../locales/zh-TW/scorebook.json'

import deCommon from '../locales/de/common.json'
import deAuth from '../locales/de/auth.json'
import deLogbook from '../locales/de/logbook.json'
import deReports from '../locales/de/reports.json'
import deErrors from '../locales/de/errors.json'
import deScorebook from '../locales/de/scorebook.json'

import zhCNCommon from '../locales/zh-CN/common.json'
import zhCNAuth from '../locales/zh-CN/auth.json'
import zhCNLogbook from '../locales/zh-CN/logbook.json'
import zhCNReports from '../locales/zh-CN/reports.json'
import zhCNErrors from '../locales/zh-CN/errors.json'
import zhCNScorebook from '../locales/zh-CN/scorebook.json'

export const defaultNS = 'common'
export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    logbook: enLogbook,
    reports: enReports,
    errors: enErrors,
    scorebook: enScorebook,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    logbook: esLogbook,
    reports: esReports,
    errors: esErrors,
    scorebook: esScorebook,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    logbook: frLogbook,
    reports: frReports,
    errors: frErrors,
    scorebook: frScorebook,
  },
  'zh-TW': {
    common: zhTWCommon,
    auth: zhTWAuth,
    logbook: zhTWLogbook,
    reports: zhTWReports,
    errors: zhTWErrors,
    scorebook: zhTWScorebook,
  },
  de: {
    common: deCommon,
    auth: deAuth,
    logbook: deLogbook,
    reports: deReports,
    errors: deErrors,
    scorebook: deScorebook,
  },
  'zh-CN': {
    common: zhCNCommon,
    auth: zhCNAuth,
    logbook: zhCNLogbook,
    reports: zhCNReports,
    errors: zhCNErrors,
    scorebook: zhCNScorebook,
  },
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n
