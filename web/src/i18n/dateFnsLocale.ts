import { pt } from 'date-fns/locale'
import { enGB } from 'date-fns/locale'
import { es } from 'date-fns/locale'
import { fr } from 'date-fns/locale'
import { de } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { nl } from 'date-fns/locale'
import type { Locale } from 'date-fns'

const LOCALES: Record<string, Locale> = {
  pt,
  en: enGB,
  es,
  fr,
  de,
  it,
  nl,
}

export function getDateFnsLocale(language: string): Locale {
  return LOCALES[language] ?? LOCALES[language.split('-')[0]] ?? pt
}
