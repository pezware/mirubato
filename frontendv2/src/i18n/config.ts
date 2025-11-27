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
import enToolbox from '../locales/en/toolbox.json'
import enRepertoire from '../locales/en/repertoire.json'
import enUI from '../locales/en/ui.json'
import enAbout from '../locales/en/about.json'
import enPrivacy from '../locales/en/privacy.json'
import enValidation from '../locales/en/validation.json'
import enShare from '../locales/en/share.json'

import esCommon from '../locales/es/common.json'
import esAuth from '../locales/es/auth.json'
import esLogbook from '../locales/es/logbook.json'
import esReports from '../locales/es/reports.json'
import esErrors from '../locales/es/errors.json'
import esScorebook from '../locales/es/scorebook.json'
import esToolbox from '../locales/es/toolbox.json'
import esRepertoire from '../locales/es/repertoire.json'
import esUI from '../locales/es/ui.json'
import esAbout from '../locales/es/about.json'
import esPrivacy from '../locales/es/privacy.json'
import esValidation from '../locales/es/validation.json'
import esShare from '../locales/es/share.json'

import frCommon from '../locales/fr/common.json'
import frAuth from '../locales/fr/auth.json'
import frLogbook from '../locales/fr/logbook.json'
import frReports from '../locales/fr/reports.json'
import frErrors from '../locales/fr/errors.json'
import frScorebook from '../locales/fr/scorebook.json'
import frToolbox from '../locales/fr/toolbox.json'
import frRepertoire from '../locales/fr/repertoire.json'
import frUI from '../locales/fr/ui.json'
import frAbout from '../locales/fr/about.json'
import frPrivacy from '../locales/fr/privacy.json'
import frValidation from '../locales/fr/validation.json'
import frShare from '../locales/fr/share.json'

import zhTWCommon from '../locales/zh-TW/common.json'
import zhTWAuth from '../locales/zh-TW/auth.json'
import zhTWLogbook from '../locales/zh-TW/logbook.json'
import zhTWReports from '../locales/zh-TW/reports.json'
import zhTWErrors from '../locales/zh-TW/errors.json'
import zhTWScorebook from '../locales/zh-TW/scorebook.json'
import zhTWToolbox from '../locales/zh-TW/toolbox.json'
import zhTWRepertoire from '../locales/zh-TW/repertoire.json'
import zhTWUI from '../locales/zh-TW/ui.json'
import zhTWAbout from '../locales/zh-TW/about.json'
import zhTWPrivacy from '../locales/zh-TW/privacy.json'
import zhTWValidation from '../locales/zh-TW/validation.json'
import zhTWShare from '../locales/zh-TW/share.json'

import deCommon from '../locales/de/common.json'
import deAuth from '../locales/de/auth.json'
import deLogbook from '../locales/de/logbook.json'
import deReports from '../locales/de/reports.json'
import deErrors from '../locales/de/errors.json'
import deScorebook from '../locales/de/scorebook.json'
import deToolbox from '../locales/de/toolbox.json'
import deRepertoire from '../locales/de/repertoire.json'
import deUI from '../locales/de/ui.json'
import deAbout from '../locales/de/about.json'
import dePrivacy from '../locales/de/privacy.json'
import deValidation from '../locales/de/validation.json'
import deShare from '../locales/de/share.json'

import zhCNCommon from '../locales/zh-CN/common.json'
import zhCNAuth from '../locales/zh-CN/auth.json'
import zhCNLogbook from '../locales/zh-CN/logbook.json'
import zhCNReports from '../locales/zh-CN/reports.json'
import zhCNErrors from '../locales/zh-CN/errors.json'
import zhCNScorebook from '../locales/zh-CN/scorebook.json'
import zhCNToolbox from '../locales/zh-CN/toolbox.json'
import zhCNRepertoire from '../locales/zh-CN/repertoire.json'
import zhCNUI from '../locales/zh-CN/ui.json'
import zhCNAbout from '../locales/zh-CN/about.json'
import zhCNPrivacy from '../locales/zh-CN/privacy.json'
import zhCNValidation from '../locales/zh-CN/validation.json'
import zhCNShare from '../locales/zh-CN/share.json'

export const defaultNS = 'common'
export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    logbook: enLogbook,
    reports: enReports,
    errors: enErrors,
    scorebook: enScorebook,
    toolbox: enToolbox,
    repertoire: enRepertoire,
    ui: enUI,
    about: enAbout,
    privacy: enPrivacy,
    validation: enValidation,
    share: enShare,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    logbook: esLogbook,
    reports: esReports,
    errors: esErrors,
    scorebook: esScorebook,
    toolbox: esToolbox,
    repertoire: esRepertoire,
    ui: esUI,
    about: esAbout,
    privacy: esPrivacy,
    validation: esValidation,
    share: esShare,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    logbook: frLogbook,
    reports: frReports,
    errors: frErrors,
    scorebook: frScorebook,
    toolbox: frToolbox,
    repertoire: frRepertoire,
    ui: frUI,
    about: frAbout,
    privacy: frPrivacy,
    validation: frValidation,
    share: frShare,
  },
  'zh-TW': {
    common: zhTWCommon,
    auth: zhTWAuth,
    logbook: zhTWLogbook,
    reports: zhTWReports,
    errors: zhTWErrors,
    scorebook: zhTWScorebook,
    toolbox: zhTWToolbox,
    repertoire: zhTWRepertoire,
    ui: zhTWUI,
    about: zhTWAbout,
    privacy: zhTWPrivacy,
    validation: zhTWValidation,
    share: zhTWShare,
  },
  de: {
    common: deCommon,
    auth: deAuth,
    logbook: deLogbook,
    reports: deReports,
    errors: deErrors,
    scorebook: deScorebook,
    toolbox: deToolbox,
    repertoire: deRepertoire,
    ui: deUI,
    about: deAbout,
    privacy: dePrivacy,
    validation: deValidation,
    share: deShare,
  },
  'zh-CN': {
    common: zhCNCommon,
    auth: zhCNAuth,
    logbook: zhCNLogbook,
    reports: zhCNReports,
    errors: zhCNErrors,
    scorebook: zhCNScorebook,
    toolbox: zhCNToolbox,
    repertoire: zhCNRepertoire,
    ui: zhCNUI,
    about: zhCNAbout,
    privacy: zhCNPrivacy,
    validation: zhCNValidation,
    share: zhCNShare,
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
