import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, LayoutDashboard, LogOut, Scissors, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { barberAuthApi } from '@/lib/api'
import { useBarberAuthStore } from '@/store/barberAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { applyAccentColor } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'
import { PanelShell, type PanelNavSection } from './PanelShell'
import barberLogo from '@/assets/branding/barber-logo.png'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão rápida do teu dia, agenda e receita.' },
  schedule: { title: 'Agenda', subtitle: 'Acompanha os teus horários e reservas em curso.' },
}

function BarberAccountMenu({
  name,
  email,
  onLogout,
}: {
  name?: string
  email?: string
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-soft transition hover:border-neutral-300"
      >
        <Avatar name={name ?? ''} size="sm" />
        <div className="hidden text-left sm:block">
          <p className="max-w-[10rem] truncate text-sm font-medium text-ink">{name}</p>
          <p className="max-w-[10rem] truncate text-xs text-ink-muted">{email}</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-strong">
          <div className="border-b border-neutral-200 px-4 py-4">
            <p className="text-sm font-semibold text-ink">{name}</p>
            <p className="mt-1 text-xs text-ink-muted">{email}</p>
          </div>
          <div className="p-2">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 transition hover:bg-danger-50"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface BarberLayoutProps {
  children: React.ReactNode
}

export function BarberLayout({ children }: BarberLayoutProps) {
  const { barber, token, logout, setBarber } = useBarberAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const slug = barber?.barbershop?.slug ?? barber?.barbershopId ?? ''

  const { data: meData } = useQuery({
    queryKey: ['barber-auth', 'me'],
    queryFn: () => barberAuthApi.me(),
    enabled: !!token,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (!meData) return
    setBarber({ ...meData, barbershopId: meData.barbershopId ?? '' })
  }, [meData, setBarber])

  useEffect(() => {
    if (barber?.barbershop?.accentColor) applyAccentColor(barber.barbershop.accentColor)
  }, [barber?.barbershop?.accentColor])

  useInstallBrand('barber')

  const handleLogout = () => {
    logout()
    navigate(`/${slug}/barber/login`)
  }

  const navSections: PanelNavSection[] = [
    {
      label: 'Portal',
      items: [
        { href: `/${slug}/barber`, label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: `/${slug}/barber/schedule`, label: 'Agenda', icon: Calendar },
      ],
    },
  ]

  const pageMeta = pathname.endsWith('/schedule') ? PAGE_META.schedule : PAGE_META.dashboard

  return (
    <PanelShell
      brand={{
        name: 'Trimio Flow',
        subtitle: barber?.barbershop?.name ?? 'Portal do barbeiro',
        icon: <Scissors size={18} />,
        logoSrc: barberLogo,
      }}
      currentPath={pathname}
      navSections={navSections}
      sidebarOpen={sidebarOpen}
      onSidebarOpen={setSidebarOpen}
      topbarTitle={pageMeta.title}
      topbarSubtitle={pageMeta.subtitle}
      topbarAction={
        <div className="hidden items-center gap-3 md:flex">
          <div className="rounded-xl border border-warning-100 bg-warning-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-warning-700">Plano</p>
            <p className="text-sm font-semibold text-ink">
              {barber?.barbershop?.subscriptionPlan ?? 'FREE'}
            </p>
          </div>
          {slug ? (
            <Link to={`/${slug}/barber/schedule`}>
              <Button size="sm">
                Abrir agenda
              </Button>
            </Link>
          ) : null}
        </div>
      }
      topbarAside={
        <BarberAccountMenu
          name={barber?.name}
          email={barber?.email}
          onLogout={handleLogout}
        />
      }
      sidebarFooter={
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
          <div className="flex items-center gap-2 text-primary-600">
            <Sparkles size={14} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Sessão ativa</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">Portal do barbeiro</p>
          <p className="mt-1 text-xs text-ink-muted">Acesso rápido à agenda, estados e detalhe de atendimento.</p>
        </div>
      }
    >
      {children}
    </PanelShell>
  )
}
