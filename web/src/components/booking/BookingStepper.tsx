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
      {/* Desktop */}
      <div className="hidden rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.22)] sm:flex sm:items-center sm:justify-between">
        {steps.map((label, i) => {
          const done = i < current
          const clickable = done && !!onStepClick
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  onClick={() => clickable && onStepClick(i)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all',
                    done      && 'bg-zinc-950 text-white',
                    i === current && 'bg-zinc-950 text-white ring-4 ring-zinc-200/80',
                    i > current   && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400',
                    clickable && 'cursor-pointer hover:brightness-90 active:scale-95',
                  )}
                >
                  {done ? <Check size={14} /> : i + 1}
                </div>
                <span
                  onClick={() => clickable && onStepClick(i)}
                  className={cn(
                    'whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                    i <= current ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400',
                    clickable && 'cursor-pointer hover:text-accent-600',
                  )}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('mx-3 mb-6 h-0.5 flex-1 transition-colors', i < current ? 'bg-zinc-950' : 'bg-zinc-200 dark:bg-zinc-800')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile — tappable completed dots */}
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.2)] sm:hidden">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-bold text-white">
          {current + 1}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Passo {current + 1} de {steps.length}</p>
          <p className="text-sm font-semibold text-zinc-950">{steps[current]}</p>
        </div>
        <div className="flex-1 ml-2 flex items-center gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              onClick={() => i < current && onStepClick?.(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i < current   && 'bg-zinc-950 flex-1 cursor-pointer hover:brightness-90',
                i === current && 'bg-zinc-950 flex-[2]',
                i > current   && 'bg-zinc-200 dark:bg-zinc-700 flex-1',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
