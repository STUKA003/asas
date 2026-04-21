import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BookingStepper({
  current,
  steps,
  onStepClick,
}: {
  current: number
  steps: string[]
  onStepClick?: (i: number) => void
}) {
  return (
    <div className="w-full">
      <div className="hidden rounded-3xl border border-neutral-200 bg-white p-5 shadow-medium sm:block">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Progresso</p>
            <p className="mt-1 text-sm font-medium text-ink">Passo {current + 1} de {steps.length}</p>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{ width: `${((current + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
        {steps.map((label, i) => {
          const done = i < current
          const clickable = done && !!onStepClick
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  onClick={() => clickable && onStepClick(i)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition',
                    done && 'border-primary-600 bg-primary-600 text-white',
                    i === current && 'border-primary-600 bg-primary-600 text-white ring-4 ring-primary-100',
                    i > current && 'border-neutral-200 bg-white text-ink-muted',
                    clickable && 'cursor-pointer hover:brightness-95 active:scale-95',
                  )}
                >
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span
                  onClick={() => clickable && onStepClick(i)}
                  className={cn(
                    'whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                    i <= current ? 'text-ink' : 'text-ink-muted',
                    clickable && 'cursor-pointer hover:text-primary-700',
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('mx-3 mb-6 h-0.5 flex-1 transition-colors', i < current ? 'bg-primary-600' : 'bg-neutral-200')} />
              )}
            </div>
          )
        })}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-soft sm:hidden">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
          {current + 1}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Passo {current + 1} de {steps.length}</p>
          <p className="text-sm font-semibold text-ink">{steps[current]}</p>
        </div>
        <div className="flex-1 ml-2 flex items-center gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              onClick={() => i < current && onStepClick?.(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i < current && 'bg-primary-600 flex-1 cursor-pointer hover:brightness-90',
                i === current && 'bg-primary-600 flex-[2]',
                i > current && 'bg-neutral-200 flex-1',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
