import { Instagram, MessageCircle, Scissors } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTenant } from '@/providers/TenantProvider'

export function Footer() {
  const { slug, barbershop } = useTenant()
  const instagramHref = barbershop?.instagram
    ? `https://instagram.com/${barbershop.instagram.replace(/^@/, '')}`
    : null
  const whatsappHref = barbershop?.whatsapp
    ? `https://wa.me/${barbershop.whatsapp.replace(/\D/g, '')}`
    : null
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_auto] lg:px-8">
        <div>
          <Link to={`/${slug}`} className="flex items-center gap-3 font-bold">
          {barbershop?.logoUrl ? (
            <img src={barbershop.logoUrl} alt={barbershop.name} className="h-7 w-auto max-w-[5rem] object-contain" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-ink text-white shadow-soft">
              <Scissors size={14} className="text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-ink">{barbershop?.name ?? 'Trimio'}</p>
            <p className="text-sm text-ink-muted">Experiência de marcação simples, rápida e organizada.</p>
          </div>
        </Link>
        <p className="mt-4 max-w-md text-sm leading-6 text-ink-muted">
          © {new Date().getFullYear()} {barbershop?.name ?? 'Trimio'}. Todos os direitos reservados.
        </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Navegação</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link to={`/${slug}`} className="text-ink-soft transition hover:text-ink">Início</Link>
            <Link to={`/${slug}/services`} className="text-ink-soft transition hover:text-ink">Serviços</Link>
            <Link to={`/${slug}/booking`} className="text-ink-soft transition hover:text-ink">Agendamento</Link>
            <Link to="/admin" className="text-ink-soft transition hover:text-ink">Admin</Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Contacto</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ink-soft transition hover:text-ink"><MessageCircle size={14} /> WhatsApp</a> : null}
            {instagramHref ? <a href={instagramHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ink-soft transition hover:text-ink"><Instagram size={14} /> Instagram</a> : null}
          </div>
        </div>
      </div>
    </footer>
  )
}
