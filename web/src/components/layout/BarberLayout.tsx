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
  dashboard: { title: 'Painel do barbeiro', subtitle: 'Visão imediata do dia, clientes e receita em curso.' },
  schedule: { title: 'Agenda operacional', subtitle: 'Agenda visual para remarcar, acompanhar e fechar atendimentos.' },
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
        className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white shadow-[0_16px_34px_-24px_rgba(0,0,0,0.8)] transition hover:border-white/20 hover:bg-white/[0.08]"
      >
        <Avatar name={name ?? ''} size="sm" />
        <div className="hidden text-left sm:block">
          <p className="max-w-[10rem] truncate text-sm font-medium text-white">{name}</p>
          <p className="max-w-[10rem] truncate text-xs text-zinc-400">{email}</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#18181d] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)]">
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="mt-1 text-xs text-zinc-400">{email}</p>
          </div>
          <div className="p-2">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
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
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200/80">Plano</p>
            <p className="text-sm font-semibold text-white">
              {barber?.barbershop?.subscriptionPlan ?? 'FREE'}
            </p>
          </div>
          {slug ? (
            <Link to={`/${slug}/barber/schedule`}>
              <Button size="sm" className="rounded-2xl border-orange-500 bg-gradient-to-r from-orange-500 to-amber-400 text-zinc-950 hover:from-orange-400 hover:to-amber-300">
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
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-3 py-3">
          <div className="flex items-center gap-2 text-orange-300">
            <Sparkles size={14} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Sessão ativa</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">Portal do barbeiro</p>
          <p className="mt-1 text-xs text-zinc-400">Acesso rápido à agenda, estados e detalhe de atendimento.</p>
        </div>
      }
      theme="dark"
    >
      {children}
    </PanelShell>
  )
}
