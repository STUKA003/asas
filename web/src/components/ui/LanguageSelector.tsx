import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config'

export const LANGUAGE_FLAG: Record<SupportedLanguage, string> = {
  pt: '🇵🇹',
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  nl: '🇳🇱',
}

interface LanguageSelectorProps {
  variant?: 'light' | 'dark'
  compact?: boolean
}

export function LanguageSelector({ variant = 'light', compact = false }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLang = (SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? i18n.language
    : 'pt') as SupportedLanguage

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isDark = variant === 'dark'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm font-medium transition-all',
          isDark
            ? 'border-white/[0.10] bg-white/[0.06] text-white/70 hover:bg-white/[0.10] hover:text-white'
            : 'border-neutral-200 bg-white text-ink-soft shadow-soft hover:border-neutral-300 hover:text-ink'
        )}
        title={t('lang.label')}
      >
        <Globe size={14} />
        {!compact && <span className="hidden sm:inline">{LANGUAGE_FLAG[currentLang]} {t(`lang.${currentLang}`)}</span>}
        {compact && <span>{LANGUAGE_FLAG[currentLang]}</span>}
      </button>

      {open ? (
        <div className={cn(
          'absolute right-0 top-[calc(100%+0.4rem)] z-50 w-44 overflow-hidden rounded-2xl border shadow-strong',
          isDark
            ? 'border-white/[0.10] bg-[#17171d]'
            : 'border-neutral-200 bg-white'
        )}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => {
                i18n.changeLanguage(lang)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors',
                lang === currentLang
                  ? isDark
                    ? 'bg-white/[0.10] font-semibold text-white'
                    : 'bg-primary-50 font-semibold text-primary-700'
                  : isDark
                    ? 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                    : 'text-ink-soft hover:bg-neutral-50 hover:text-ink'
              )}
            >
              <span className="text-base leading-none">{LANGUAGE_FLAG[lang]}</span>
              <span>{t(`lang.${lang}`)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function LanguagePreferences() {
  const { i18n, t } = useTranslation('common')

  const currentLang = (SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? i18n.language
    : 'pt') as SupportedLanguage

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{t('lang.settingsTitle')}</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{t('lang.settingsDescription')}</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => i18n.changeLanguage(lang)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors',
              lang === currentLang
                ? 'border-primary-200 bg-primary-50 font-semibold text-primary-700'
                : 'border-zinc-200 text-ink-soft hover:border-zinc-300 hover:bg-zinc-50 hover:text-ink'
            )}
          >
            <span className="text-base leading-none">{LANGUAGE_FLAG[lang]}</span>
            <span className="flex-1">{t(`lang.${lang}`)}</span>
            {lang === currentLang ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-600">
                {t('lang.current')}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

export function LanguageMenuOptions() {
  const { i18n, t } = useTranslation('common')

  const currentLang = (SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
    ? i18n.language
    : 'pt') as SupportedLanguage

  return (
    <div className="space-y-2 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {t('lang.label')}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => i18n.changeLanguage(lang)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors',
              lang === currentLang
                ? 'bg-primary-50 font-semibold text-primary-700'
                : 'text-ink-soft hover:bg-neutral-100 hover:text-ink'
            )}
          >
            <span className="text-base leading-none">{LANGUAGE_FLAG[lang]}</span>
            <span className="truncate">{t(`lang.${lang}`)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
