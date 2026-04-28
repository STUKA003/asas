import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// PT
import ptCommon from './locales/pt/common.json'
import ptPublic from './locales/pt/public.json'
import ptAdmin from './locales/pt/admin.json'
import ptBarber from './locales/pt/barber.json'
import ptSuperadmin from './locales/pt/superadmin.json'
import ptPlatform from './locales/pt/platform.json'

// EN
import enCommon from './locales/en/common.json'
import enPublic from './locales/en/public.json'
import enAdmin from './locales/en/admin.json'
import enBarber from './locales/en/barber.json'
import enSuperadmin from './locales/en/superadmin.json'
import enPlatform from './locales/en/platform.json'

// ES
import esCommon from './locales/es/common.json'
import esPublic from './locales/es/public.json'
import esAdmin from './locales/es/admin.json'
import esBarber from './locales/es/barber.json'
import esSuperadmin from './locales/es/superadmin.json'
import esPlatform from './locales/es/platform.json'

// FR
import frCommon from './locales/fr/common.json'
import frPublic from './locales/fr/public.json'
import frAdmin from './locales/fr/admin.json'
import frBarber from './locales/fr/barber.json'
import frSuperadmin from './locales/fr/superadmin.json'
import frPlatform from './locales/fr/platform.json'

// DE
import deCommon from './locales/de/common.json'
import dePublic from './locales/de/public.json'
import deAdmin from './locales/de/admin.json'
import deBarber from './locales/de/barber.json'
import deSuperadmin from './locales/de/superadmin.json'
import dePlatform from './locales/de/platform.json'

// IT
import itCommon from './locales/it/common.json'
import itPublic from './locales/it/public.json'
import itAdmin from './locales/it/admin.json'
import itBarber from './locales/it/barber.json'
import itSuperadmin from './locales/it/superadmin.json'
import itPlatform from './locales/it/platform.json'

// NL
import nlCommon from './locales/nl/common.json'
import nlPublic from './locales/nl/public.json'
import nlAdmin from './locales/nl/admin.json'
import nlBarber from './locales/nl/barber.json'
import nlSuperadmin from './locales/nl/superadmin.json'
import nlPlatform from './locales/nl/platform.json'

export const SUPPORTED_LANGUAGES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'nl'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { common: ptCommon, public: ptPublic, admin: ptAdmin, barber: ptBarber, superadmin: ptSuperadmin, platform: ptPlatform },
      en: { common: enCommon, public: enPublic, admin: enAdmin, barber: enBarber, superadmin: enSuperadmin, platform: enPlatform },
      es: { common: esCommon, public: esPublic, admin: esAdmin, barber: esBarber, superadmin: esSuperadmin, platform: esPlatform },
      fr: { common: frCommon, public: frPublic, admin: frAdmin, barber: frBarber, superadmin: frSuperadmin, platform: frPlatform },
      de: { common: deCommon, public: dePublic, admin: deAdmin, barber: deBarber, superadmin: deSuperadmin, platform: dePlatform },
      it: { common: itCommon, public: itPublic, admin: itAdmin, barber: itBarber, superadmin: itSuperadmin, platform: itPlatform },
      nl: { common: nlCommon, public: nlPublic, admin: nlAdmin, barber: nlBarber, superadmin: nlSuperadmin, platform: nlPlatform },
    },
    defaultNS: 'common',
    fallbackLng: 'pt',
    supportedLngs: SUPPORTED_LANGUAGES,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'trimio_lang',
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
