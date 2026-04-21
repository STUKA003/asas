import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:
    'border border-primary-600/90 bg-gradient-to-b from-primary-500 to-primary-600 text-white ' +
    'hover:from-primary-600 hover:to-primary-700 hover:border-primary-700 ' +
    'shadow-[0_1px_3px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.12)]',
  secondary:
    'border border-neutral-200 bg-white text-ink ' +
    'hover:bg-neutral-50 hover:border-neutral-300 ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
  ghost:
    'border border-transparent bg-transparent text-ink-soft ' +
    'hover:bg-neutral-100 hover:text-ink',
  danger:
    'border border-danger-600/90 bg-gradient-to-b from-danger-500 to-danger-600 text-white ' +
    'hover:from-danger-600 hover:to-danger-700 hover:border-danger-700 ' +
    'shadow-[0_1px_3px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.10)]',
  outline:
    'border border-neutral-200 bg-white text-ink ' +
    'hover:bg-neutral-50 hover:border-neutral-300 ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
}

const sizes = {
  sm: 'h-9  gap-1.5 px-3.5 text-[13px]',
  md: 'h-10 gap-2   px-4.5 text-sm',
  lg: 'h-11 gap-2.5 px-5   text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-xl font-medium tracking-[-0.01em]',
        'transition-all duration-150',
        'active:scale-[0.97] active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4 text-current" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
