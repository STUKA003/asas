import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:   'bg-zinc-950 text-white shadow-[0_16px_34px_-18px_rgba(9,9,11,0.7)] hover:-translate-y-0.5 hover:bg-zinc-900 hover:shadow-[0_22px_40px_-20px_rgba(9,9,11,0.72)]',
  secondary: 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm',
  ghost:     'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
  danger:    'bg-red-500 hover:bg-red-600 text-white shadow-[0_10px_24px_-12px_rgba(239,68,68,0.9)]',
  outline:   'border border-zinc-200/80 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/70 hover:-translate-y-0.5 hover:bg-white dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)]',
}

const sizes = {
  sm: 'h-10 px-4 text-sm rounded-[16px] gap-1.5',
  md: 'h-11 px-5 text-sm rounded-[18px] gap-2',
  lg: 'h-13 px-6 text-base rounded-[20px] gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
