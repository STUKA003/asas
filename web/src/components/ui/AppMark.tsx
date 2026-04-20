import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppMarkProps {
  icon: LucideIcon
  eyebrow: string
  title: string
  subtitle: string
  tone?: 'admin' | 'barber' | 'superadmin'
  compact?: boolean
}

const toneClasses: Record<NonNullable<AppMarkProps['tone']>, { shell: string; chip: string; icon: string }> = {
  admin: {
    shell: 'bg-zinc-950 text-white',
    chip: 'bg-white/10 border border-white/10 text-white/70',
    icon: 'bg-white/12 text-white',
  },
  barber: {
    shell: 'bg-white/6 text-white border border-white/10',
    chip: 'bg-accent-500/18 border border-accent-400/25 text-accent-100',
    icon: 'bg-accent-500 text-white',
  },
  superadmin: {
    shell: 'bg-white/6 text-white border border-white/10',
    chip: 'bg-sky-500/18 border border-sky-400/25 text-sky-100',
    icon: 'bg-sky-500 text-white',
  },
}

export function AppMark({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  tone = 'admin',
  compact = false,
}: AppMarkProps) {
  const palette = toneClasses[tone]

  return (
    <div className={cn('rounded-[1.6rem] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]', palette.shell, compact && 'rounded-[1.35rem] p-3')}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', palette.icon, compact && 'h-11 w-11')}>
          <Icon size={compact ? 20 : 22} />
        </div>
        <div className="min-w-0">
          <div className={cn('inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]', palette.chip)}>
            {eyebrow}
          </div>
          <p className={cn('mt-3 text-lg font-semibold leading-tight', compact && 'mt-2 text-base')}>{title}</p>
          <p className={cn('mt-1 text-sm leading-5 text-white/65', compact && 'text-xs leading-4')}>{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
