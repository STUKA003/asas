import { useRef, useState, useEffect } from 'react'
import { Building2, LayoutDashboard, LogOut, Shield } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSuperAuthStore } from '@/store/superauth'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { PanelShell, type PanelNavSection } from './PanelShell'
import { useInstallBrand } from '@/lib/installBrand'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/superadmin': {
    title: 'Dashboard',
    subtitle: 'Leitura consolidada da saúde comercial e operacional da plataforma.',
  },
  '/superadmin/barbershops': {
    title: 'Barbearias',
    subtitle: 'Gestão centralizada das contas, planos e estado das operações.',
  },
}

function SuperAccountMenu({
  onLogout,
}: {
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
        <Avatar name="Super Admin" size="sm" />
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium text-ink">Super Admin</p>
          <p className="text-xs text-ink-muted">Trimio Platform</p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-strong">
          <div className="border-b border-neutral-200 px-4 py-4">
            <p className="text-sm font-semibold text-ink">Super Admin</p>
            <p className="mt-1 text-xs text-ink-muted">Trimio Platform</p>
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

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useSuperAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useInstallBrand('superadmin')

  const navSections: PanelNavSection[] = [
    {
      label: 'Plataforma',
      items: [
        { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: '/superadmin/barbershops', label: 'Barbearias', icon: Building2 },
      ],
    },
  ]

  const pageMeta = PAGE_META[pathname] ?? PAGE_META['/superadmin']

  return (
    <PanelShell
      brand={{
        name: 'Trimio Command',
        subtitle: 'Controlo da plataforma',
        icon: <Shield size={18} />,
      }}
      currentPath={pathname}
      navSections={navSections}
      sidebarOpen={sidebarOpen}
      onSidebarOpen={setSidebarOpen}
      topbarTitle={pageMeta.title}
      topbarSubtitle={pageMeta.subtitle}
      topbarAction={
        pathname !== '/superadmin/barbershops' ? (
          <Link to="/superadmin/barbershops" className="hidden md:block">
            <Button size="sm" variant="secondary">Ver barbearias</Button>
          </Link>
        ) : null
      }
      topbarAside={<SuperAccountMenu onLogout={() => { logout(); navigate('/superadmin/login') }} />}
      sidebarFooter={
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Escopo</p>
          <p className="mt-1 text-sm font-semibold text-ink">Operação central</p>
          <p className="mt-1 text-xs text-ink-muted">Visão transversal sobre crescimento, contas e monetização.</p>
        </div>
      }
    >
      {children}
    </PanelShell>
  )
}
