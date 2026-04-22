import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Calendar, CheckCircle, LayoutDashboard, LogOut, RefreshCw, Scissors, Sparkles, UserX, XCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { barberAuthApi } from '@/lib/api'
import { barberPortalApi } from '@/lib/api'
import { useBarberAuthStore } from '@/store/barberAuth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { applyAccentColor } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'
import { PanelShell, type PanelNavSection } from './PanelShell'
import barberLogo from '@/assets/branding/barber-logo.png'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão rápida do teu dia, agenda e receita.' },
  schedule: { title: 'Agenda', subtitle: 'Acompanha os teus horários e reservas em curso.' },
}

function BarberNotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const qc = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['barber-portal', 'notifications', 'unread'],
    queryFn: barberPortalApi.unreadNotifications,
    refetchInterval: 30_000,
  })
  const { data: notifications = [] } = useQuery({
    queryKey: ['barber-portal', 'notifications'],
    queryFn: barberPortalApi.notifications,
    enabled: open,
  })

  const unread = countData?.count ?? 0

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = async () => {
    setOpen((prev) => !prev)
    if (!open && unread > 0) {
      await barberPortalApi.markNotificationsRead()
      qc.invalidateQueries({ queryKey: ['barber-portal', 'notifications'] })
      qc.invalidateQueries({ queryKey: ['barber-portal', 'notifications', 'unread'] })
    }
  }

  const panelStyle = (() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    const width = Math.min(360, window.innerWidth - 32)
    if (!rect) return { top: 72, left: 16, width }
    return {
      top: rect.bottom + 8,
      left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
      width,
    }
  })()

  const TYPE_CONFIG: Record<string, { icon: React.ElementType; iconClass: string; bg: string }> = {
    BOOKING_CREATED: { icon: Calendar, iconClass: 'text-primary-600', bg: 'bg-primary-50' },
    BOOKING_CONFIRMED: { icon: CheckCircle, iconClass: 'text-success-600', bg: 'bg-success-50' },
    BOOKING_CUSTOMER_CONFIRMED: { icon: CheckCircle, iconClass: 'text-success-600', bg: 'bg-success-50' },
    BOOKING_CANCELLED: { icon: XCircle, iconClass: 'text-danger-600', bg: 'bg-danger-50' },
    BOOKING_CUSTOMER_CANCELLED: { icon: XCircle, iconClass: 'text-danger-600', bg: 'bg-danger-50' },
    BOOKING_NO_SHOW: { icon: UserX, iconClass: 'text-warning-600', bg: 'bg-warning-50' },
    BOOKING_RESCHEDULED: { icon: RefreshCw, iconClass: 'text-primary-600', bg: 'bg-primary-50' },
    BOOKING_CUSTOMER_RESCHEDULED: { icon: RefreshCw, iconClass: 'text-primary-600', bg: 'bg-primary-50' },
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-ink-soft shadow-soft transition hover:text-ink"
        title="Notificações"
      >
        <Bell size={17} />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <div
              className="fixed z-[9999] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-strong"
              style={panelStyle}
            >
              <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink">Notificações</p>
                  {unread > 0 ? <Badge>{unread} novas</Badge> : null}
                </div>
                {notifications.length > 0 ? (
                  <button
                    onClick={() => {
                      barberPortalApi.markNotificationsRead()
                      qc.invalidateQueries({ queryKey: ['barber-portal', 'notifications'] })
                      qc.invalidateQueries({ queryKey: ['barber-portal', 'notifications', 'unread'] })
                    }}
                    className="text-xs font-medium text-ink-muted transition hover:text-ink"
                  >
                    Limpar tudo
                  </button>
                ) : null}
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-ink-muted">
                      <Bell size={18} />
                    </div>
                    <p className="text-sm text-ink-muted">Sem notificações recentes.</p>
                  </div>
                ) : (
                  notifications.map((n: { id: string; type: string; message: string; read: boolean; createdAt: string }) => {
                    const cfg = TYPE_CONFIG[n.type] ?? { icon: Bell, iconClass: 'text-ink-muted', bg: 'bg-neutral-100' }
                    const Icon = cfg.icon
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'flex gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0',
                          !n.read && 'bg-primary-50/60'
                        )}
                      >
                        <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cfg.bg)}>
                          <Icon size={15} className={cfg.iconClass} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-5 text-ink">{n.message}</p>
                          <p className="mt-1 text-[11px] text-ink-muted">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: pt })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  )
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
        <div className="flex items-center gap-3">
          <BarberNotificationBell />
          <BarberAccountMenu
            name={barber?.name}
            email={barber?.email}
            onLogout={handleLogout}
          />
        </div>
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
