import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/lib/types'

const statusConfig: Record<BookingStatus, { dot: string; container: string; label: string }> = {
  PENDING:   { dot: 'bg-warning-500',  container: 'border-warning-200/60  bg-warning-50/80  text-warning-700',  label: 'Pendente'       },
  CONFIRMED: { dot: 'bg-primary-500',  container: 'border-primary-200/60  bg-primary-50/80  text-primary-700',  label: 'Confirmado'     },
  COMPLETED: { dot: 'bg-success-500',  container: 'border-success-200/60  bg-success-50/80  text-success-700',  label: 'Concluído'      },
  CANCELLED: { dot: 'bg-neutral-300',  container: 'border-neutral-200     bg-neutral-100/80 text-ink-muted',    label: 'Cancelado'      },
  NO_SHOW:   { dot: 'bg-danger-400',   container: 'border-danger-200/60   bg-danger-50/80   text-danger-700',   label: 'Não compareceu' },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const c = statusConfig[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium',
      c.container
    )}>
      <span className={cn('h-[5px] w-[5px] shrink-0 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border border-primary-200/60 bg-primary-50/80 px-2.5 py-1 text-[11.5px] font-medium text-primary-700',
      className
    )}>
      {children}
    </span>
  )
}
