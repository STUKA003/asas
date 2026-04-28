import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n/config'

const FLAG: Record<SupportedLanguage, string> = {
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
        {!compact && <span className="hidden sm:inline">{FLAG[currentLang]} {t(`lang.${currentLang}`)}</span>}
        {compact && <span>{FLAG[currentLang]}</span>}
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
              <span className="text-base leading-none">{FLAG[lang]}</span>
              <span>{t(`lang.${lang}`)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
