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
    <div className="flex flex-col gap-4 border-b border-neutral-200/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[1.65rem]">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      ) : null}
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
    item.exact
      ? currentPath === item.href
      : currentPath === item.href || currentPath.startsWith(`${item.href}/`)

  const Sidebar = () => (
    <div className="flex h-full flex-col">

      {/* ── Brand ── */}
      <div className={cn(
        'px-4 py-4',
        isDark ? 'border-b border-white/[0.07]' : 'border-b border-neutral-100'
      )}>
        <div className="flex items-center gap-3">
          {brand.logoSrc ? (
            <img
              src={brand.logoSrc}
              alt={brand.name}
              className="h-10 w-10 shrink-0 rounded-xl object-contain"
            />
          ) : (
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white',
              isDark ? 'bg-primary-600/90' : 'bg-ink'
            )}
              style={{ boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.15)' }}
            >
              {brand.icon}
            </div>
          )}
          <div className="min-w-0">
            <p className={cn(
              'truncate text-[13px] font-semibold leading-tight tracking-[-0.01em]',
              isDark ? 'text-white' : 'text-ink'
            )}>
              {brand.name}
            </p>
            <p className={cn(
              'mt-0.5 truncate text-[11.5px] leading-tight',
              isDark ? 'text-white/40' : 'text-ink-muted'
            )}>
              {brand.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-4">
          {navSections.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`} className="space-y-0.5">
              {section.label ? (
                <p className={cn(
                  'mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                  isDark ? 'text-white/25' : 'text-ink-muted/70'
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
                      'group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all duration-150',
                      active
                        ? isDark
                          ? 'bg-white/[0.09] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                          : 'bg-primary-50/80 font-semibold text-primary-700 shadow-[inset_0_0_0_1px_rgba(var(--primary-200),0.5)]'
                        : item.disabled
                          ? isDark
                            ? 'cursor-not-allowed font-medium text-white/20'
                            : 'cursor-not-allowed font-medium text-ink-muted/40'
                          : isDark
                            ? 'font-medium text-white/55 hover:bg-white/[0.04] hover:text-white/80'
                            : 'font-medium text-ink-soft hover:bg-neutral-100/80 hover:text-ink'
                    )}
                    aria-disabled={item.disabled || undefined}
                  >
                    <item.icon
                      size={15}
                      className={cn(
                        'shrink-0 transition-colors duration-150',
                        active
                          ? isDark ? 'text-white' : 'text-primary-600'
                          : isDark
                            ? 'text-white/35 group-hover:text-white/70'
                            : 'text-ink-muted/70 group-hover:text-ink-soft'
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

      {/* ── Footer ── */}
      {sidebarFooter ? (
        <div className={cn(
          'px-3 py-3',
          isDark ? 'border-t border-white/[0.07]' : 'border-t border-neutral-100'
        )}>
          {sidebarFooter}
        </div>
      ) : null}
    </div>
  )

  return (
    <div className={cn(
      'flex min-h-screen',
      isDark ? 'bg-[#0d0d11]' : 'bg-[#f7f7fa]'
    )}>

      {/* ── Desktop sidebar ── */}
      <aside className={cn(
        'hidden w-64 shrink-0 lg:flex lg:flex-col',
        isDark
          ? 'border-r border-white/[0.07] bg-[#111116]'
          : 'border-r border-neutral-100 bg-white'
      )}>
        <Sidebar />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[4px]"
            onClick={() => onSidebarOpen(false)}
          />
          <aside className={cn(
            'absolute inset-y-0 left-0 flex w-[min(85vw,18rem)] flex-col',
            'shadow-[20px_0_48px_rgba(0,0,0,0.18)]',
            isDark
              ? 'border-r border-white/[0.07] bg-[#111116]'
              : 'border-r border-neutral-100 bg-white'
          )}>
            <Sidebar />
          </aside>
        </div>
      ) : null}

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* ── Topbar ── */}
        <header className={cn(
          'sticky top-0 z-30 backdrop-blur-xl',
          isDark
            ? 'border-b border-white/[0.07] bg-[#0d0d11]/90'
            : 'border-b border-neutral-100 bg-white/90'
        )}>
          <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => onSidebarOpen(true)}
                className={cn(
                  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-150 lg:hidden',
                  isDark
                    ? 'border border-white/[0.10] bg-white/[0.05] text-white/70 hover:bg-white/[0.09] hover:text-white'
                    : 'border border-neutral-200 bg-white text-ink-soft shadow-soft hover:bg-neutral-50 hover:text-ink'
                )}
              >
                <Menu size={16} />
              </button>
              <div className="min-w-0">
                <p className={cn(
                  'truncate text-[15px] font-semibold tracking-[-0.02em]',
                  isDark ? 'text-white' : 'text-ink'
                )}>
                  {topbarTitle}
                </p>
                {topbarSubtitle ? (
                  <p className={cn(
                    'hidden truncate text-[12px] leading-tight sm:block',
                    isDark ? 'text-white/35' : 'text-ink-muted'
                  )}>
                    {topbarSubtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              {topbarAction}
              {topbarAside}
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
