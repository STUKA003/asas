import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, Building2, LogOut, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSuperAuthStore } from '@/store/superauth'

const nav = [
  { href: '/superadmin',             label: 'Dashboard', icon: LayoutDashboard },
  { href: '/superadmin/barbershops', label: 'Barbearias', icon: Building2 },
]

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useSuperAuthStore()

  return (
    <div className="flex h-screen bg-[#0a0d14] text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-500 shadow-[0_12px_24px_-14px_rgba(var(--accent-600),0.85)]">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none tracking-tight">Super Admin</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">Trimio Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/superadmin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                to={item.href}
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
      </aside>

      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.09),transparent_26rem),radial-gradient(circle_at_top_left,rgba(59,130,246,0.1),transparent_28rem)] p-6 lg:p-8 xl:p-10">
        {children}
      </main>
    </div>
  )
}
