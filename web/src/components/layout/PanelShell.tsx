import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PanelNavItem {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  disabled?: boolean
  trailing?: React.ReactNode
}

export interface PanelNavSection {
  label?: string
  items: PanelNavItem[]
}

interface PanelShellProps {
  brand: {
    name: string
    subtitle: string
    icon: React.ReactNode
    logoSrc?: string
  }
  currentPath: string
  navSections: PanelNavSection[]
  sidebarOpen: boolean
  onSidebarOpen: (open: boolean) => void
  topbarTitle: string
  topbarSubtitle?: string
  topbarAction?: React.ReactNode
  topbarAside?: React.ReactNode
  sidebarFooter?: React.ReactNode
  children: React.ReactNode
  theme?: 'light' | 'dark'
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  )
}

export function PanelShell({
  brand,
  currentPath,
  navSections,
  sidebarOpen,
  onSidebarOpen,
  topbarTitle,
  topbarSubtitle,
  topbarAction,
  topbarAside,
  sidebarFooter,
  children,
  theme = 'light',
}: PanelShellProps) {
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const isDark = theme === 'dark'

  const isActive = (item: PanelNavItem) =>
    item.exact ? currentPath === item.href : currentPath === item.href || currentPath.startsWith(`${item.href}/`)

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className={cn('px-5 py-5', isDark ? 'border-b border-white/10' : 'border-b border-neutral-200')}>
        <div className="flex items-center gap-3">
          {brand.logoSrc ? (
            <img
              src={brand.logoSrc}
              alt={brand.name}
              className="h-11 w-11 shrink-0 rounded-2xl object-contain"
            />
          ) : (
            <div className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-medium',
              isDark ? 'bg-primary-600' : 'bg-ink'
            )}>
              {brand.icon}
            </div>
          )}
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-semibold tracking-tight', isDark ? 'text-white' : 'text-ink')}>{brand.name}</p>
            <p className={cn('mt-1 truncate text-xs', isDark ? 'text-zinc-400' : 'text-ink-muted')}>{brand.subtitle}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-5">
          {navSections.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`} className="space-y-1.5">
              {section.label ? (
                <p className={cn(
                  'px-3 text-[11px] font-semibold uppercase tracking-[0.18em]',
                  isDark ? 'text-zinc-500' : 'text-ink-muted'
                )}>
                  {section.label}
                </p>
              ) : null}
              {section.items.map((item) => {
                const active = isActive(item)
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => onSidebarOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      active
                        ? isDark
                          ? 'bg-white/10 text-white shadow-soft'
                          : 'bg-primary-50 text-primary-700 shadow-soft'
                        : item.disabled
                          ? isDark
                            ? 'cursor-not-allowed text-zinc-600'
                            : 'cursor-not-allowed text-ink-muted/60'
                          : isDark
                            ? 'text-zinc-300 hover:bg-white/5 hover:text-white'
                            : 'text-ink-soft hover:bg-neutral-100 hover:text-ink'
                    )}
                    aria-disabled={item.disabled || undefined}
                  >
                    <item.icon
                      size={17}
                      className={cn(
                        active
                          ? isDark ? 'text-white' : 'text-primary-600'
                          : isDark ? 'text-zinc-500 group-hover:text-white' : 'text-ink-muted group-hover:text-ink'
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.trailing}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </nav>

      {sidebarFooter ? <div className={cn('px-3 py-3', isDark ? 'border-t border-white/10' : 'border-t border-neutral-200')}>{sidebarFooter}</div> : null}
    </div>
  )

  return (
    <div className={cn('flex min-h-screen', isDark ? 'bg-[#0b1020]' : 'bg-neutral-50')}>
      <aside className={cn(
        'hidden w-72 shrink-0 lg:flex',
        isDark ? 'border-r border-white/10 bg-[#0f172a]' : 'border-r border-neutral-200 bg-white'
      )}>
        <Sidebar />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => onSidebarOpen(false)} />
          <aside className={cn(
            'absolute inset-y-0 left-0 w-[min(88vw,20rem)] shadow-strong',
            isDark ? 'border-r border-white/10 bg-[#0f172a]' : 'border-r border-neutral-200 bg-white'
          )}>
            <Sidebar />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={cn(
          'sticky top-0 z-30 backdrop-blur-xl',
          isDark ? 'border-b border-white/10 bg-[#0b1020]/90' : 'border-b border-neutral-200 bg-white/90'
        )}>
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => onSidebarOpen(true)}
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl lg:hidden',
                  isDark
                    ? 'border border-white/10 bg-white/5 text-white'
                    : 'border border-neutral-200 bg-white text-ink shadow-soft'
                )}
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className={cn('truncate text-lg font-semibold tracking-tight', isDark ? 'text-white' : 'text-ink')}>{topbarTitle}</p>
                {topbarSubtitle ? <p className={cn('truncate text-sm', isDark ? 'text-zinc-400' : 'text-ink-muted')}>{topbarSubtitle}</p> : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {topbarAction}
              {topbarAside}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
