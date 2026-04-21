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
}: PanelShellProps) {
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const isActive = (item: PanelNavItem) =>
    item.exact ? currentPath === item.href : currentPath === item.href || currentPath.startsWith(`${item.href}/`)

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-white shadow-medium">
            {brand.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-ink">{brand.name}</p>
            <p className="mt-1 truncate text-xs text-ink-muted">{brand.subtitle}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-5">
          {navSections.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`} className="space-y-1.5">
              {section.label ? (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
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
                        ? 'bg-primary-50 text-primary-700 shadow-soft'
                        : item.disabled
                          ? 'cursor-not-allowed text-ink-muted/60'
                          : 'text-ink-soft hover:bg-neutral-100 hover:text-ink'
                    )}
                    aria-disabled={item.disabled || undefined}
                  >
                    <item.icon size={17} className={cn(active ? 'text-primary-600' : 'text-ink-muted group-hover:text-ink')} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.trailing}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </nav>

      {sidebarFooter ? <div className="border-t border-neutral-200 px-3 py-3">{sidebarFooter}</div> : null}
    </div>
  )

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-72 shrink-0 border-r border-neutral-200 bg-white lg:flex">
        <Sidebar />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => onSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,20rem)] border-r border-neutral-200 bg-white shadow-strong">
            <Sidebar />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => onSidebarOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-ink shadow-soft lg:hidden"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight text-ink">{topbarTitle}</p>
                {topbarSubtitle ? <p className="truncate text-sm text-ink-muted">{topbarSubtitle}</p> : null}
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
