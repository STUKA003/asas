import { Instagram, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/providers/TenantProvider'
import clientsLogo from '@/assets/branding/clients-logo.png'

export function Footer() {
  const { slug, barbershop } = useTenant()
  const { t } = useTranslation('public')

  const instagramHref = barbershop?.instagram
    ? `https://instagram.com/${barbershop.instagram.replace(/^@/, '')}`
    : null
  const whatsappHref = barbershop?.whatsapp
    ? `https://wa.me/${barbershop.whatsapp.replace(/\D/g, '')}`
    : null

  return (
    <footer className="border-t border-neutral-100 bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_auto] lg:px-8 lg:py-14">

        {/* Brand */}
        <div>
          <Link to={`/${slug}`} className="inline-flex items-center gap-2.5">
            <img
              src={clientsLogo}
              alt="Trimio Clientes"
              className="h-9 w-9 shrink-0 rounded-xl object-contain"
            />
            <div>
              <p className="text-[13px] font-semibold text-ink">
                {barbershop?.name ?? 'Trimio Clientes'}
              </p>
              <p className="text-[11.5px] text-ink-muted">
                {t('footer.tagline')}
              </p>
            </div>
          </Link>
          <p className="mt-5 max-w-sm text-[12.5px] leading-6 text-ink-muted">
            © {new Date().getFullYear()} {barbershop?.name ?? 'Trimio'}. {t('footer.allRightsReserved')}
          </p>
        </div>

        {/* Navigation */}
        <div>
          <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted/70">
            {t('footer.nav')}
          </p>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <Link to={`/${slug}`}           className="text-ink-soft transition-colors hover:text-ink">{t('header.home')}</Link>
            <Link to={`/${slug}/services`}  className="text-ink-soft transition-colors hover:text-ink">{t('header.services')}</Link>
            <Link to={`/${slug}/booking`}   className="text-ink-soft transition-colors hover:text-ink">{t('footer.book')}</Link>
            <Link to={`/${slug}/privacy`}   className="text-ink-soft transition-colors hover:text-ink">{t('footer.privacy')}</Link>
            <Link to="/admin"               className="text-ink-soft transition-colors hover:text-ink">{t('footer.adminArea')}</Link>
          </div>
        </div>

        {/* Contact */}
        {(whatsappHref || instagramHref) && (
          <div>
            <p className="mb-4 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted/70">
              {t('footer.contact')}
            </p>
            <div className="flex flex-col gap-2.5 text-[13px]">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-ink"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
              )}
              {instagramHref && (
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-ink"
                >
                  <Instagram size={13} /> Instagram
                </a>
              )}
            </div>
          </div>
        )}

      </div>
    </footer>
  )
}
