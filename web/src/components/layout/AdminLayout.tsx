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
import { useTranslation } from 'react-i18next'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { PanelShell, type PanelNavSection } from './PanelShell'
import { applyAccentColor } from '@/lib/theme'
import { useInstallBrand } from '@/lib/installBrand'
import { barbershopApi, notificationsApi } from '@/lib/api'
import adminLogo from '@/assets/branding/barbershop-logo.png'
import { PushToggle } from './PushToggle'

type PlanTier = 'FREE' | 'BASIC' | 'PRO'

const PLAN_ORDER: Record<PlanTier, number> = { FREE: 0, BASIC: 1, PRO: 2 }

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const qc = useQueryClient()
  const { t } = useTranslation('admin')

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

  const { i18n } = useTranslation()
  const dateFnsLocale = getDateFnsLocale(i18n.language)

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-ink-soft shadow-soft transition hover:text-ink"
        title={t('layout.notifications.title')}
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
                  <p className="text-sm font-semibold text-ink">{t('layout.notifications.title')}</p>
                  {unread > 0 ? <Badge>{t('layout.notifications.newBadge', { count: unread })}</Badge> : null}
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
                    {t('layout.notifications.markAllRead')}
                  </button>
                ) : null}
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-ink-muted">
                      <Bell size={18} />
                    </div>
                    <p className="text-sm text-ink-muted">{t('layout.notifications.noRecent')}</p>
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
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: dateFnsLocale })}
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
  const { t } = useTranslation(['admin', 'common'])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const planLabel = currentPlan === 'FREE'
    ? t('common:plan.FREE')
    : currentPlan === 'BASIC'
      ? t('common:plan.BASIC')
      : t('common:plan.PRO')

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
              <Badge>{t('admin:layout.account.planBadge', { plan: planLabel })}</Badge>
            </div>
          </div>
          <div className="p-2">
            <Link
              to="/admin/billing"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-neutral-100 hover:text-ink"
            >
              <Zap size={16} />
              {t('admin:layout.account.billingLink')}
            </Link>
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 transition hover:bg-danger-50"
            >
              <LogOut size={16} />
              {t('admin:layout.account.logout')}
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
  const { t } = useTranslation(['admin', 'common'])
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

  const NAV_SECTIONS: PanelNavSection[] = [
    {
      label: t('admin:layout.nav.operation'),
      items: [
        { href: '/admin', label: t('admin:layout.nav.dashboard'), icon: LayoutDashboard, exact: true },
        { href: '/admin/bookings', label: t('admin:layout.nav.bookings'), icon: Calendar },
        { href: '/admin/customers', label: t('admin:layout.nav.customers'), icon: Users },
        { href: '/admin/barbers', label: t('admin:layout.nav.barbers'), icon: Users },
        { href: '/admin/schedule', label: t('admin:layout.nav.schedule'), icon: Clock },
      ],
    },
    {
      label: t('admin:layout.nav.catalog'),
      items: [
        { href: '/admin/services', label: t('admin:layout.nav.services'), icon: Scissors },
        { href: '/admin/extras', label: t('admin:layout.nav.extras'), icon: Sparkles },
        { href: '/admin/products', label: t('admin:layout.nav.products'), icon: Package },
        { href: '/admin/plans', label: t('admin:layout.nav.plans'), icon: CreditCard },
      ],
    },
    {
      label: t('admin:layout.nav.management'),
      items: [
        { href: '/admin/reports', label: t('admin:layout.nav.reports'), icon: BarChart2 },
        { href: '/admin/customization', label: t('admin:layout.nav.brandSite'), icon: Palette },
        { href: '/admin/billing', label: t('admin:layout.nav.billing'), icon: Zap },
      ],
    },
  ]

  const PAGE_META_KEYS: Record<string, { titleKey: string; subtitleKey: string }> = {
    '/admin': { titleKey: 'admin:layout.pageMeta.dashboard.title', subtitleKey: 'admin:layout.pageMeta.dashboard.subtitle' },
    '/admin/bookings': { titleKey: 'admin:layout.pageMeta.bookings.title', subtitleKey: 'admin:layout.pageMeta.bookings.subtitle' },
    '/admin/customers': { titleKey: 'admin:layout.pageMeta.customers.title', subtitleKey: 'admin:layout.pageMeta.customers.subtitle' },
    '/admin/barbers': { titleKey: 'admin:layout.pageMeta.barbers.title', subtitleKey: 'admin:layout.pageMeta.barbers.subtitle' },
    '/admin/services': { titleKey: 'admin:layout.pageMeta.services.title', subtitleKey: 'admin:layout.pageMeta.services.subtitle' },
    '/admin/extras': { titleKey: 'admin:layout.pageMeta.extras.title', subtitleKey: 'admin:layout.pageMeta.extras.subtitle' },
    '/admin/products': { titleKey: 'admin:layout.pageMeta.products.title', subtitleKey: 'admin:layout.pageMeta.products.subtitle' },
    '/admin/plans': { titleKey: 'admin:layout.pageMeta.plans.title', subtitleKey: 'admin:layout.pageMeta.plans.subtitle' },
    '/admin/schedule': { titleKey: 'admin:layout.pageMeta.schedule.title', subtitleKey: 'admin:layout.pageMeta.schedule.subtitle' },
    '/admin/reports': { titleKey: 'admin:layout.pageMeta.reports.title', subtitleKey: 'admin:layout.pageMeta.reports.subtitle' },
    '/admin/customization': { titleKey: 'admin:layout.pageMeta.customization.title', subtitleKey: 'admin:layout.pageMeta.customization.subtitle' },
    '/admin/billing': { titleKey: 'admin:layout.pageMeta.billing.title', subtitleKey: 'admin:layout.pageMeta.billing.subtitle' },
  }

  function resolvePageMeta(path: string) {
    if (PAGE_META_KEYS[path]) return PAGE_META_KEYS[path]
    const matched = Object.entries(PAGE_META_KEYS)
      .filter(([p]) => p !== '/admin' && path.startsWith(p))
      .sort((a, b) => b[0].length - a[0].length)[0]
    return matched?.[1] ?? PAGE_META_KEYS['/admin']
  }

  const metaKeys = resolvePageMeta(pathname)
  const pageTitle = t(metaKeys.titleKey)
  const pageSubtitle = t(metaKeys.subtitleKey)

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

  const planLabel = currentPlan === 'FREE'
    ? t('common:plan.FREE')
    : currentPlan === 'BASIC'
      ? t('common:plan.BASIC')
      : t('common:plan.PRO')

  if (barbershop?.suspended) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
        <div className="ui-card max-w-md p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-danger-50 text-danger-600">
            <Ban size={28} />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-ink">{t('admin:layout.suspended.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {barbershop.suspendedReason
              ? t('admin:layout.suspended.reason', { reason: barbershop.suspendedReason })
              : t('admin:layout.suspended.defaultMessage')}
          </p>
          <Button onClick={handleLogout} variant="secondary" className="mt-6">
            {t('admin:layout.account.logout')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PanelShell
      brand={{
        name: t('admin:layout.brand.name'),
        subtitle: barbershop?.name ?? t('admin:layout.brand.defaultSubtitle'),
        icon: <Building2 size={18} />,
        logoSrc: adminLogo,
      }}
      currentPath={pathname}
      navSections={navSections}
      sidebarOpen={sidebarOpen}
      onSidebarOpen={setSidebarOpen}
      topbarTitle={pageTitle}
      topbarSubtitle={pageSubtitle}
      topbarAction={
        pathname !== '/admin/billing' ? (
          <Link to="/admin/billing" className="hidden md:block">
            <Button size="sm" variant={barbershop?.subscription?.expired ? 'danger' : 'secondary'}>
              {barbershop?.subscription?.expired
                ? t('admin:layout.topbar.renewPlan')
                : t('admin:layout.topbar.viewBilling')}
            </Button>
          </Link>
        ) : null
      }
      topbarAside={
        <>
          <LanguageSelector />
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">
            {t('admin:layout.sidebar.currentPlan')}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{planLabel}</p>
          <Link to="/admin/billing" className="mt-3 inline-flex text-sm font-medium text-primary-700 hover:text-primary-800">
            {t('admin:layout.sidebar.manageSubscription')}
          </Link>
        </div>
      }
      pullRefreshLabels={{
        refreshing: t('admin:layout.pull.refreshing'),
        release: t('admin:layout.pull.releaseToRefresh'),
        pull: t('admin:layout.pull.pullToRefresh'),
      }}
      onPullRefresh={handleRefresh}
      isPullRefreshing={refreshing}
    >
      {barbershop?.subscription?.expired ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning-100 bg-warning-50 px-4 py-4 text-sm text-warning-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            {t('admin:layout.expiredPlan.message', { plan: barbershop.subscription.paidPlan })}
          </div>
          <Link to="/admin/billing" className="shrink-0 font-semibold hover:underline">
            {t('admin:layout.expiredPlan.renew')}
          </Link>
        </div>
      ) : null}
      <div className="animate-fade-in">
        {children}
      </div>
    </PanelShell>
  )
}
