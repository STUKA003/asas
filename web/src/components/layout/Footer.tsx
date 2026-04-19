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
    <footer className="border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to={`/${slug}`} className="flex items-center gap-2 font-bold">
          {barbershop?.logoUrl ? (
            <img src={barbershop.logoUrl} alt={barbershop.name} className="h-7 w-auto max-w-[5rem] object-contain" />
          ) : (
            <div className="h-7 w-7 bg-accent-500 rounded-lg flex items-center justify-center">
              <Scissors size={14} className="text-white" />
            </div>
          )}
          {barbershop?.name ?? 'Trimio'}
        </Link>
        <p className="text-sm text-zinc-400">© {new Date().getFullYear()} {barbershop?.name ?? 'Trimio'}. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors inline-flex items-center gap-1"><MessageCircle size={14} /> WhatsApp</a>}
          {instagramHref && <a href={instagramHref} target="_blank" rel="noreferrer" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors inline-flex items-center gap-1"><Instagram size={14} /> Instagram</a>}
          <Link to="/admin" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">Admin</Link>
        </div>
      </div>
    </footer>
  )
}
