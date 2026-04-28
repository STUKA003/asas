import { useRef, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, LayoutDashboard, LogOut, Shield } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSuperAuthStore } from '@/store/superauth'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { PanelShell, type PanelNavSection } from './PanelShell'
import { useInstallBrand } from '@/lib/installBrand'
import superadminLogo from '@/assets/branding/superadmin-logo.png'

function SuperAccountMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('superadmin')

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
        <Avatar name={t('layout.account.name')} size="sm" />
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium text-ink">{t('layout.account.name')}</p>
          <p className="text-xs text-ink-muted">{t('layout.account.platform')}</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-strong">
          <div className="border-b border-neutral-200 px-4 py-4">
            <p className="text-sm font-semibold text-ink">{t('layout.account.name')}</p>
            <p className="mt-1 text-xs text-ink-muted">{t('layout.account.platform')}</p>
          </div>
          <div className="p-2">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger-600 transition hover:bg-danger-50"
            >
              <LogOut size={16} />
              {t('layout.account.logout')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useSuperAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { t } = useTranslation('superadmin')

  useInstallBrand('superadmin')

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await qc.refetchQueries({ type: 'active' })
    } finally {
      setRefreshing(false)
    }
  }

  const navSections: PanelNavSection[] = [
    {
      label: t('layout.nav.platform'),
      items: [
        { href: '/superadmin', label: t('layout.nav.dashboard'), icon: LayoutDashboard, exact: true },
        { href: '/superadmin/barbershops', label: t('layout.nav.barbershops'), icon: Building2 },
      ],
    },
  ]

  const metaKey = pathname === '/superadmin/barbershops' ? 'barbershops' : 'dashboard'
  const pageTitle = t(`layout.pageMeta.${metaKey}.title`)
  const pageSubtitle = t(`layout.pageMeta.${metaKey}.subtitle`)

  return (
    <PanelShell
      brand={{
        name: t('layout.brand.name'),
        subtitle: t('layout.brand.subtitle'),
        icon: <Shield size={18} />,
        logoSrc: superadminLogo,
      }}
      currentPath={pathname}
      navSections={navSections}
      sidebarOpen={sidebarOpen}
      onSidebarOpen={setSidebarOpen}
      topbarTitle={pageTitle}
      topbarSubtitle={pageSubtitle}
      topbarAction={
        pathname !== '/superadmin/barbershops' ? (
          <Link to="/superadmin/barbershops" className="hidden md:block">
            <Button size="sm" variant="secondary">{t('layout.topbar.viewBarbershops')}</Button>
          </Link>
        ) : null
      }
      topbarAside={
        <>
          <LanguageSelector variant="dark" />
          <SuperAccountMenu onLogout={() => { logout(); navigate('/superadmin/login') }} />
        </>
      }
      sidebarFooter={
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {t('layout.sidebar.scopeLabel')}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{t('layout.sidebar.scopeTitle')}</p>
          <p className="mt-1 text-xs text-zinc-400">{t('layout.sidebar.scopeDesc')}</p>
        </div>
      }
      theme="dark"
      pullRefreshLabels={{
        refreshing: t('layout.pull.refreshing'),
        release: t('layout.pull.releaseToRefresh'),
        pull: t('layout.pull.pullToRefresh'),
      }}
      onPullRefresh={handleRefresh}
      isPullRefreshing={refreshing}
    >
      {children}
    </PanelShell>
  )
}
