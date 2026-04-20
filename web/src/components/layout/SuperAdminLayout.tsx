import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, Building2, LogOut, Shield, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSuperAuthStore } from '@/store/superauth'
import { useInstallBrand } from '@/lib/installBrand'

const nav = [
  { href: '/superadmin',             label: 'Dashboard', icon: LayoutDashboard },
  { href: '/superadmin/barbershops', label: 'Barbearias', icon: Building2 },
]

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useSuperAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useInstallBrand('superadmin')

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-500 shadow-[0_12px_24px_-14px_rgba(var(--accent-600),0.85)]">
          <Shield size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none tracking-tight">Super Admin</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">Trimio Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-white text-zinc-950 shadow-[0_18px_30px_-18px_rgba(255,255,255,0.55)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              )}
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => { logout(); navigate('/superadmin/login') }}
          className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm text-zinc-500 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0a0d14] text-zinc-100">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-white/[0.04] backdrop-blur-xl lg:flex">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,20rem)] border-r border-white/10 bg-[#0a0d14]/95 backdrop-blur-xl">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-black/20 px-4 backdrop-blur-xl lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-2xl p-2.5 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent-500">
              <Shield size={15} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-white">Super Admin</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Trimio</p>
            </div>
          </div>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.09),transparent_26rem),radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_28rem)] p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
