import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Scissors, LayoutDashboard, Users, Sparkles, Package, CreditCard,
  Calendar, Clock, Palette, LogOut, Menu, ChevronRight, Zap, Lock, Ban, AlertTriangle, ChevronUp, Bell, BarChart2,
  CheckCircle, PartyPopper, XCircle, UserX, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui/Avatar'
import { barbershopApi, notificationsApi } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { applyAccentColor } from '@/lib/theme'

type PlanTier = 'FREE' | 'BASIC' | 'PRO'
const PLAN_ORDER: Record<PlanTier, number> = { FREE: 0, BASIC: 1, PRO: 2 }

const nav: { href: string; label: string; icon: React.ElementType; require?: PlanTier }[] = [
  { href: '/admin',               label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/bookings',      label: 'Agendamentos',  icon: Calendar },
  { href: '/admin/customers',     label: 'Clientes',      icon: Users },
  { href: '/admin/barbers',       label: 'Barbeiros',     icon: Users },
  { href: '/admin/services',      label: 'Serviços',      icon: Scissors },
  { href: '/admin/extras',        label: 'Extras',        icon: Sparkles,  require: 'BASIC' },
  { href: '/admin/products',      label: 'Produtos',      icon: Package,   require: 'BASIC' },
  { href: '/admin/plans',         label: 'Planos',        icon: CreditCard,require: 'BASIC' },
  { href: '/admin/schedule',      label: 'Horários',      icon: Clock },
  { href: '/admin/reports',       label: 'Relatórios',    icon: BarChart2, require: 'BASIC' },
  { href: '/admin/customization', label: 'Marca & Site',  icon: Palette },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { data: barbershop } = useQuery({
    queryKey: ['barbershop'],
    queryFn: barbershopApi.get,
  })

  useEffect(() => {
    if (barbershop?.accentColor) {
      applyAccentColor(barbershop.accentColor)
    }
  }, [barbershop?.accentColor])

  const handleLogout = () => { logout(); navigate('/admin/login') }

  const currentPlan = (barbershop?.subscription?.plan ?? 'FREE') as PlanTier

  const planColors: Record<string, string> = {
    FREE:  'bg-zinc-100 text-zinc-500',
    BASIC: 'bg-blue-100 text-blue-700',
    PRO:   'bg-amber-100 text-amber-700',
  }
  const planLabels: Record<string, string> = { FREE: 'Grátis', BASIC: 'Básico', PRO: 'Pro' }

  const NotificationBell = () => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const qc2 = useQueryClient()

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

    const handleOpen = async () => {
      setOpen(o => !o)
      if (!open && unread > 0) {
        await notificationsApi.markAllRead()
        qc2.invalidateQueries({ queryKey: ['notifications'] })
      }
    }

    useEffect(() => {
      function handler(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }, [])

    const getPanelStyle = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = 16
      const desktopWidth = 320
      const width = Math.min(desktopWidth, viewportWidth - margin * 2)

      if (!buttonRect) {
        return {
          top: 64,
          left: margin,
          width,
          maxHeight: Math.max(240, viewportHeight - 80),
        }
      }

      const idealLeft = buttonRect.right - width
      const left = Math.max(margin, Math.min(idealLeft, viewportWidth - width - margin))
      const top = Math.max(margin, Math.min(buttonRect.bottom + 8, viewportHeight - margin - 240))

      return {
        top,
        left,
        width,
        maxHeight: Math.max(240, viewportHeight - top - margin),
      }
    }

    type NotifConfig = { icon: React.ElementType; iconClass: string; bg: string }
    const TYPE_CONFIG: Record<string, NotifConfig> = {
      BOOKING_CONFIRMED:   { icon: CheckCircle,  iconClass: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      BOOKING_COMPLETED:   { icon: PartyPopper,  iconClass: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-900/20'  },
      BOOKING_CANCELLED:   { icon: XCircle,      iconClass: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20'        },
      BOOKING_NO_SHOW:     { icon: UserX,        iconClass: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20'  },
      BOOKING_RESCHEDULED: { icon: RefreshCw,    iconClass: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20'     },
    }
    const fallbackConfig: NotifConfig = { icon: Bell, iconClass: 'text-zinc-500', bg: 'bg-zinc-100' }

    const panelStyle = getPanelStyle()

    return (
      <div ref={ref} className="relative">
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className="relative rounded-xl p-2.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Notificações"
        >
          <Bell size={18} className="text-zinc-500" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && createPortal(
          <div
            className="fixed overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            style={{ ...panelStyle, zIndex: 9999 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Notificações</p>
                {unread > 0 && (
                  <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => { notificationsApi.markAllRead(); qc2.invalidateQueries({ queryKey: ['notifications'] }) }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  Limpar tudo
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: `calc(${panelStyle.maxHeight}px - 49px)` }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Bell size={18} className="text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-400">Sem notificações</p>
                </div>
              ) : (
                notifications.map((n: { id: string; type: string; message: string; read: boolean; createdAt: string }) => {
                  const cfg = TYPE_CONFIG[n.type] ?? fallbackConfig
                  const Icon = cfg.icon
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 border-b border-zinc-50 dark:border-zinc-800/60 px-4 py-3 last:border-0 transition-colors ${
                        !n.read ? 'bg-accent-50/60 dark:bg-accent-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon size={15} className={cfg.iconClass} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">{n.message}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: pt })}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="h-2 w-2 rounded-full bg-accent-500 shrink-0 mt-2" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  const AccountMenu = () => {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const plan = (barbershop?.subscription?.plan ?? 'FREE') as string

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
      <div ref={ref} className="relative border-t border-zinc-100 p-3">
        {/* Dropdown */}
        {open && (
          <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-[1.5rem] border border-zinc-200/70 bg-white/96 shadow-[0_22px_48px_-28px_rgba(15,23,42,0.32)] backdrop-blur-xl">
            {/* Plan badge */}
            <div className={`flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 text-xs font-semibold ${planColors[plan] ?? planColors.FREE}`}>
              <span>Plano {planLabels[plan] ?? plan}</span>
              {plan !== 'PRO' && <span className="opacity-70">↑ Upgrade</span>}
            </div>
            <Link
              to="/admin/billing"
              onClick={() => { setOpen(false); setSidebarOpen(false) }}
              className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Zap size={15} className="text-zinc-400" />
              Assinatura
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        )}

        {/* Trigger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-zinc-100"
        >
          {user && <Avatar name={user.name} size="sm" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
          </div>
          <ChevronUp size={14} className={cn('text-zinc-400 transition-transform shrink-0', open ? '' : 'rotate-180')} />
        </button>
      </div>
    )
  }

  const NavItem = ({ item }: { item: typeof nav[number] }) => {
    const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
    const locked = !!item.require && PLAN_ORDER[currentPlan] < PLAN_ORDER[item.require]
    return (
      <Link
        to={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
          active
            ? 'bg-zinc-950 text-white shadow-[0_16px_28px_-18px_rgba(15,23,42,0.65)]'
            : locked
              ? 'text-zinc-400 hover:bg-zinc-100'
              : 'text-zinc-600 hover:bg-white hover:text-zinc-950'
        )}
      >
        <item.icon size={18} className={cn(!active && (locked ? 'text-zinc-300' : 'text-zinc-400 group-hover:text-zinc-700'))} />
        <span className="flex-1">{item.label}</span>
        {locked && <Lock size={12} className="text-zinc-300" />}
        {active && !locked && <ChevronRight size={14} className="ml-auto" />}
      </Link>
    )
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-5 pb-4">
        {barbershop?.logoUrl ? (
          <img src={barbershop.logoUrl} alt={barbershop.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-zinc-200/70" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-500 shadow-[0_12px_24px_-14px_rgba(var(--accent-600),0.9)]">
            <Scissors size={16} className="text-white" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-950">{barbershop?.name ?? 'Trimio'}</p>
          <p className="text-[11px] text-zinc-500">Painel da barbearia</p>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      <AccountMenu />
    </div>
  )

  // Suspended screen
  if (barbershop?.suspended) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-900/40 flex items-center justify-center mx-auto mb-5">
            <Ban size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Conta suspensa</h1>
          <p className="text-zinc-400 text-sm">
            {barbershop.suspendedReason
              ? `Motivo: ${barbershop.suspendedReason}`
              : 'A tua conta foi suspensa. Contacta o suporte para mais informações.'}
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-transparent">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-white/50 bg-white/80 backdrop-blur-xl lg:flex">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 w-72 animate-slide-up border-r border-white/60 bg-white/90 backdrop-blur-xl">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-16 items-center justify-between border-b border-white/60 bg-white/80 px-4 backdrop-blur-xl lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-2xl p-2.5 hover:bg-zinc-100">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 font-bold tracking-tight">
            {barbershop?.logoUrl ? (
              <img src={barbershop.logoUrl} alt={barbershop.name} className="h-6 w-6 rounded-md object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-500 shadow-sm">
                <Scissors size={12} className="text-white" />
              </div>
            )}
            <span className="truncate max-w-[180px]">{barbershop?.name ?? 'Trimio'}</span>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 xl:p-10">
          {barbershop?.subscription?.expired && (
            <div className="mb-5 flex items-center gap-3 rounded-[1.5rem] border border-orange-200/80 bg-orange-50/90 px-4 py-3 text-sm text-orange-700 shadow-sm">
              <AlertTriangle size={16} className="shrink-0" />
              <span className="flex-1">
                O teu plano <strong>{barbershop.subscription.paidPlan}</strong> expirou — estás agora no plano Grátis com funcionalidades limitadas.
              </span>
              <Link to="/admin/billing" className="shrink-0 font-semibold underline hover:no-underline">
                Renovar
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
