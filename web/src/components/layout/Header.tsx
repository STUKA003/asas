import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, Menu, Scissors, X } from 'lucide-react'
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
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <Link to={base} className="flex min-w-0 items-center gap-3 text-lg font-bold tracking-tight">
            {barbershop?.logoUrl ? (
              <img src={barbershop.logoUrl} alt={barbershop.name} className="h-12 w-auto max-w-[9rem] sm:max-w-[11rem] object-contain shrink-0" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-white shadow-medium">
                <Scissors size={16} className="text-white" />
              </div>
            )}
            <div className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-semibold text-ink">{barbershop?.name ?? 'Trimio'}</span>
              <span className="block truncate text-xs font-medium text-ink-muted">Reserva online e gestão clara</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={cn(
                  'rounded-xl px-4 py-2.5 text-sm font-medium transition',
                  pathname === l.href
                    ? 'bg-primary-50 text-primary-700 shadow-soft'
                    : 'text-ink-soft hover:bg-neutral-100 hover:text-ink'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to={`${base}/booking`}>
              <Button size="sm" className="hidden sm:inline-flex">
                <CalendarDays size={15} />
                Agendar agora
              </Button>
            </Link>
            <button
              className="rounded-xl border border-neutral-200 bg-white p-2.5 shadow-soft transition hover:bg-neutral-50 md:hidden"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-neutral-200 bg-white md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-medium transition',
                  pathname === l.href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-ink-soft hover:bg-neutral-100 hover:text-ink'
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link to={`${base}/booking`} onClick={() => setOpen(false)} className="mt-2">
              <Button size="sm" className="w-full">
                <CalendarDays size={15} />
                Agendar agora
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
