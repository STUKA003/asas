import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTenant } from '@/providers/TenantProvider'
import { cn } from '@/lib/utils'
import clientsLogo from '@/assets/branding/clients-logo.png'
import { useInstallBrand } from '@/lib/installBrand'

export function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { slug, barbershop } = useTenant()
  useInstallBrand('clients')

  const base = `/${slug}`
  const isFree = barbershop?.plan === 'FREE'
  const links = [
    { href: base,               label: 'Início'   },
    { href: `${base}/services`, label: 'Serviços' },
    ...(!isFree && barbershop?.showPlans    !== false ? [{ href: `${base}/plans`,    label: 'Planos'   }] : []),
    ...(!isFree && barbershop?.showProducts !== false ? [{ href: `${base}/products`, label: 'Produtos' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Brand */}
          <Link to={base} className="flex min-w-0 items-center gap-2.5">
            {barbershop?.logoUrl ? (
              <img
                src={barbershop.logoUrl}
                alt={barbershop.name}
                className="h-10 w-10 shrink-0 rounded-xl object-contain mix-blend-multiply"
              />
            ) : (
              <img
                src={clientsLogo}
                alt="Trimio Clientes"
                className="h-10 w-10 shrink-0 rounded-xl object-contain"
              />
            )}
            <div className="hidden min-w-0 sm:block">
              <span className="block truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
                {barbershop?.name ?? 'Trimio Clientes'}
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all duration-150',
                  pathname === l.href
                    ? 'bg-primary-50/80 text-primary-700 shadow-[inset_0_0_0_1px_rgba(var(--primary-200),0.5)]'
                    : 'text-ink-soft hover:bg-neutral-100/80 hover:text-ink'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link to={`${base}/booking`}>
              <Button size="sm" className="hidden sm:inline-flex">
                <CalendarDays size={14} />
                Agendar agora
              </Button>
            </Link>
            <button
              className={cn(
                'rounded-xl border border-neutral-200 bg-white p-2 transition-all duration-150',
                'shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-neutral-50 hover:border-neutral-300 md:hidden'
              )}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="animate-slide-up border-t border-neutral-100 bg-white md:hidden">
          <nav className="flex flex-col gap-0.5 p-3">
            {links.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150',
                  pathname === l.href
                    ? 'bg-primary-50/80 text-primary-700'
                    : 'text-ink-soft hover:bg-neutral-100/80 hover:text-ink'
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link to={`${base}/booking`} onClick={() => setOpen(false)} className="mt-1.5">
              <Button size="sm" className="w-full">
                <CalendarDays size={14} />
                Agendar agora
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
