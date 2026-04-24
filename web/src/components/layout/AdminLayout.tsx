import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Ban,
  BarChart2,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogOut,
  Package,
  Palette,
  PartyPopper,
  RefreshCw,
  Scissors,
  Sparkles,
  UserX,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PanelShell, type PanelNavSection } from './PanelShell'
import { applyAccentColor } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'
import { barbershopApi, notificationsApi } from '@/lib/api'
import adminLogo from '@/assets/branding/barbershop-logo.png'
import { PushToggle } from './PushToggle'

type PlanTier = 'FREE' | 'BASIC' | 'PRO'

const PLAN_ORDER: Record<PlanTier, number> = { FREE: 0, BASIC: 1, PRO: 2 }

const NAV_SECTIONS: PanelNavSection[] = [
  {
    label: 'Operação',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/bookings', label: 'Agendamentos', icon: Calendar },
      { href: '/admin/customers', label: 'Clientes', icon: Users },
      { href: '/admin/barbers', label: 'Barbeiros', icon: Users },
      { href: '/admin/schedule', label: 'Horários', icon: Clock },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/admin/services', label: 'Serviços', icon: Scissors },
      { href: '/admin/extras', label: 'Extras', icon: Sparkles },
      { href: '/admin/products', label: 'Produtos', icon: Package },
      { href: '/admin/plans', label: 'Planos', icon: CreditCard },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/admin/reports', label: 'Relatórios', icon: BarChart2 },
      { href: '/admin/customization', label: 'Marca & Site', icon: Palette },
      { href: '/admin/billing', label: 'Faturação', icon: Zap },
    ],
  },
]

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/admin': { title: 'Dashboard', subtitle: 'Visão geral do desempenho, agenda e sinais operacionais.' },
  '/admin/bookings': { title: 'Agendamentos', subtitle: 'Controla reservas, confirmações e bloqueios da agenda.' },
  '/admin/customers': { title: 'Clientes', subtitle: 'Consulta histórico, planos ativos e dados de contacto.' },
  '/admin/barbers': { title: 'Barbeiros', subtitle: 'Gere equipa, acessos e disponibilidade.' },
  '/admin/services': { title: 'Serviços', subtitle: 'Mantém o catálogo principal da barbearia organizado.' },
  '/admin/extras': { title: 'Extras', subtitle: 'Upsells e complementos que aumentam o ticket médio.' },
  '/admin/products': { title: 'Produtos', subtitle: 'Inventário e venda de produtos no ponto de serviço.' },
  '/admin/plans': { title: 'Planos', subtitle: 'Configura subscrições e benefícios recorrentes.' },
  '/admin/schedule': { title: 'Horários', subtitle: 'Define a estrutura base de funcionamento da agenda.' },
  '/admin/reports': { title: 'Relatórios', subtitle: 'Leitura comercial e operacional para apoiar decisões.' },
  '/admin/customization': { title: 'Marca & Site', subtitle: 'Personaliza presença digital, cores e conteúdo público.' },
  '/admin/billing': { title: 'Faturação', subtitle: 'Acompanha plano atual, upgrades e ciclo de cobrança.' },
}

function resolvePageMeta(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  const matched = Object.entries(PAGE_META)
    .filter(([path]) => path !== '/admin' && pathname.startsWith(path))
    .sort((a, b) => b[0].length - a[0].length)[0]
  return matched?.[1] ?? PAGE_META['/admin']
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const qc = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  })
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
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
      await notificationsApi.markAllRead()
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] })
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
    BOOKING_COMPLETED: { icon: PartyPopper, iconClass: 'text-primary-600', bg: 'bg-primary-50' },
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
                      notificationsApi.markAllRead()
                      qc.invalidateQueries({ queryKey: ['notifications'] })
                      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] })
                    }}
                    className="text-xs font-medium text-ink-muted transition hover:text-ink"
                  >
                    Marcar tudo como lido
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

function AdminAccountMenu({
  userName,
  userEmail,
  userAvatar,
  currentPlan,
  onLogout,
}: {
  userName?: string
  userEmail?: string
  userAvatar?: string | null
  currentPlan: PlanTier
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-soft transition hover:border-neutral-300"
      >
        <Avatar name={userName ?? ''} src={userAvatar ?? undefined} size="sm" />
        <div className="hidden text-left sm:block">
          <p className="max-w-[10rem] truncate text-sm font-medium text-ink">{userName}</p>
          <p className="max-w-[10rem] truncate text-xs text-ink-muted">{userEmail}</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-72 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-strong">
          <div className="border-b border-neutral-200 px-4 py-4">
            <p className="text-sm font-semibold text-ink">{userName}</p>
            <p className="mt-1 text-xs text-ink-muted">{userEmail}</p>
            <div className="mt-3">
              <Badge>Plano {currentPlan === 'FREE' ? 'Grátis' : currentPlan === 'BASIC' ? 'Básico' : 'Pro'}</Badge>
            </div>
          </div>
          <div className="p-2">
            <Link
              to="/admin/billing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-neutral-100 hover:text-ink"
            >
              <Zap size={16} />
              Assinatura e faturação
            </Link>
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

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, logout } = useAuthStore()
  const { data: barbershop } = useQuery({
    queryKey: ['barbershop'],
    queryFn: barbershopApi.get,
  })

  useEffect(() => {
    if (barbershop?.accentColor) applyAccentColor(barbershop.accentColor)
  }, [barbershop?.accentColor])

  useInstallBrand('admin')

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await qc.refetchQueries({ type: 'active' })
    } finally {
      setRefreshing(false)
    }
  }

  const currentPlan = (barbershop?.subscription?.plan ?? 'FREE') as PlanTier
  const pageMeta = resolvePageMeta(pathname)

  const navSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const require = ['/admin/extras', '/admin/products', '/admin/plans', '/admin/reports'].includes(item.href)
        ? 'BASIC'
        : undefined
      const locked = require ? PLAN_ORDER[currentPlan] < PLAN_ORDER[require as PlanTier] : false
      return {
        ...item,
        trailing: locked ? <Lock size={14} className="text-ink-muted" /> : undefined,
      }
    }),
  }))

  if (barbershop?.suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
        <div className="ui-card max-w-md p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-danger-50 text-danger-600">
            <Ban size={28} />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-ink">Conta suspensa</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {barbershop.suspendedReason
              ? `Motivo: ${barbershop.suspendedReason}`
              : 'A tua conta foi suspensa. Contacta o suporte para mais informações.'}
          </p>
          <Button onClick={handleLogout} variant="secondary" className="mt-6">
            Sair
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PanelShell
      brand={{
        name: 'Trimio Studio',
        subtitle: barbershop?.name ?? 'Painel da barbearia',
        icon: <Building2 size={18} />,
        logoSrc: adminLogo,
      }}
      currentPath={pathname}
      navSections={navSections}
      sidebarOpen={sidebarOpen}
      onSidebarOpen={setSidebarOpen}
      topbarTitle={pageMeta.title}
      topbarSubtitle={pageMeta.subtitle}
      topbarAction={
        pathname !== '/admin/billing' ? (
          <Link to="/admin/billing" className="hidden md:block">
            <Button size="sm" variant={barbershop?.subscription?.expired ? 'danger' : 'secondary'}>
              {barbershop?.subscription?.expired ? 'Renovar plano' : 'Ver faturação'}
            </Button>
          </Link>
        ) : null
      }
      topbarAside={
        <>
          <PushToggle variant="admin" />
          <NotificationBell />
          <AdminAccountMenu
            userName={user?.name}
            userEmail={user?.email}
            userAvatar={barbershop?.currentUser?.avatar ?? user?.avatar}
            currentPlan={currentPlan}
            onLogout={handleLogout}
          />
        </>
      }
      sidebarFooter={
        <div className="rounded-xl border border-primary-100 bg-primary-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Plano atual</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {currentPlan === 'FREE' ? 'Grátis' : currentPlan === 'BASIC' ? 'Básico' : 'Pro'}
          </p>
          <Link to="/admin/billing" className="mt-3 inline-flex text-sm font-medium text-primary-700 hover:text-primary-800">
            Gerir assinatura
          </Link>
        </div>
      }
      onPullRefresh={handleRefresh}
      isPullRefreshing={refreshing}
    >
      {barbershop?.subscription?.expired ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning-100 bg-warning-50 px-4 py-4 text-sm text-warning-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            O teu plano <strong>{barbershop.subscription.paidPlan}</strong> expirou. Estás agora no plano Grátis com funcionalidades limitadas.
          </div>
          <Link to="/admin/billing" className="shrink-0 font-semibold hover:underline">
            Renovar
          </Link>
        </div>
      ) : null}
      <div className="animate-fade-in">
        {children}
      </div>
    </PanelShell>
  )
}
