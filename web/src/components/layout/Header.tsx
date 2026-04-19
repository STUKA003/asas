import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTenant } from '@/providers/TenantProvider'
import { cn } from '@/lib/utils'

export function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { slug, barbershop } = useTenant()

  const base = `/${slug}`
  const isFree = barbershop?.plan === 'FREE'
  const links = [
    { href: base,              label: 'Início'    },
    { href: `${base}/services`, label: 'Serviços'  },
    ...(!isFree && barbershop?.showPlans !== false ? [{ href: `${base}/plans`, label: 'Planos' }] : []),
    ...(!isFree && barbershop?.showProducts !== false ? [{ href: `${base}/products`, label: 'Produtos' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <Link to={base} className="flex min-w-0 items-center gap-3 text-lg font-bold tracking-tight">
            {barbershop?.logoUrl ? (
              <img src={barbershop.logoUrl} alt={barbershop.name} className="h-12 w-auto max-w-[9rem] sm:max-w-[11rem] object-contain shrink-0" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-500 shadow-[0_12px_24px_-14px_rgba(var(--accent-600),0.9)]">
                <Scissors size={16} className="text-white" />
              </div>
            )}
            <span className="hidden sm:inline truncate">{barbershop?.name ?? 'Trimio'}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors',
                  pathname === l.href
                    ? 'bg-zinc-950 text-white shadow-[0_14px_24px_-16px_rgba(15,23,42,0.7)]'
                    : 'text-zinc-600 hover:bg-white hover:text-zinc-950'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to={`${base}/booking`}>
              <Button size="sm">Agendar agora</Button>
            </Link>
            <button
              className="rounded-2xl p-2.5 transition-colors hover:bg-zinc-100 md:hidden"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-white/70 bg-white/95 md:hidden">
          <nav className="flex flex-col p-4 gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                  pathname === l.href
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
