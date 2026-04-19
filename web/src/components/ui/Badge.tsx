import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/lib/types'

const statusConfig: Record<BookingStatus, { dot: string; container: string; label: string }> = {
  PENDING:   { dot: 'bg-amber-400',  container: 'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-300  dark:border-amber-800',  label: 'Pendente' },
  CONFIRMED: { dot: 'bg-blue-500',   container: 'bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/20   dark:text-blue-300   dark:border-blue-800',   label: 'Confirmado' },
  COMPLETED: { dot: 'bg-emerald-500',container: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800', label: 'Concluído' },
  CANCELLED: { dot: 'bg-zinc-400',   container: 'bg-zinc-100  text-zinc-500   border-zinc-200   dark:bg-zinc-800      dark:text-zinc-400   dark:border-zinc-700',   label: 'Cancelado' },
  NO_SHOW:   { dot: 'bg-red-400',    container: 'bg-red-50    text-red-600    border-red-200    dark:bg-red-900/20    dark:text-red-400    dark:border-red-800',    label: 'Não compareceu' },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const c = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', c.container)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300', className)}>
      {children}
    </span>
  )
}
