import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Scissors, LayoutDashboard, Calendar, LogOut, Menu, X, ChevronUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBarberAuthStore } from '@/store/barberAuth'
import { Avatar } from '@/components/ui/Avatar'
import { applyAccentColor } from '@/lib/theme'
import { useEffect as useLayoutEffect } from 'react'
import { barberAuthApi } from '@/lib/api'

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

  useLayoutEffect(() => {
    if (barber?.barbershop?.accentColor) {
      applyAccentColor(barber.barbershop.accentColor)
    }
  }, [barber?.barbershop?.accentColor])

  const handleLogout = () => { logout(); navigate(`/${slug}/barber/login`) }

  const nav = [
    { href: `/${slug}/barber`,          label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: `/${slug}/barber/schedule`, label: 'Agenda',    icon: Calendar },
  ]

  const AccountMenu = () => {
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
      <div ref={ref} className="relative p-3 border-t border-zinc-100 dark:border-zinc-800">
        {open && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
        >
          <Avatar name={barber?.name ?? ''} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{barber?.name}</p>
            <p className="text-xs text-zinc-400 truncate">{barber?.email}</p>
          </div>
          <ChevronUp size={14} className={cn('text-zinc-400 transition-transform shrink-0', open ? '' : 'rotate-180')} />
        </button>
      </div>
    )
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-6 pb-4">
        {barber?.barbershop?.logoUrl ? (
          <img src={barber.barbershop.logoUrl} alt={barber.barbershop.name} className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <div className="h-8 w-8 bg-accent-500 rounded-lg flex items-center justify-center">
            <Scissors size={16} className="text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold truncate">{barber?.barbershop?.name ?? 'Trimio'}</p>
          <p className="text-xs text-zinc-400 flex items-center gap-1"><User size={10} /> Portal do Barbeiro</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-accent-500 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              <item.icon size={18} className={!active ? 'text-zinc-400' : ''} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <AccountMenu />
    </div>
  )

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="hidden lg:flex w-60 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Menu size={20} />
          </button>
          <p className="font-bold truncate max-w-[180px]">{barber?.barbershop?.name ?? 'Trimio'}</p>
          <div className="w-10" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
