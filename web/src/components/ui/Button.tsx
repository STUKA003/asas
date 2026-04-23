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
    'border border-primary-600/80 bg-gradient-to-b from-primary-500 to-primary-600 text-white ' +
    'hover:from-primary-600 hover:to-primary-700 hover:border-primary-700/90 ' +
    'shadow-[0_1px_3px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.14)] ' +
    'hover:shadow-[0_2px_6px_rgba(0,0,0,0.20),0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]',
  secondary:
    'border border-neutral-200 bg-white text-ink ' +
    'hover:bg-neutral-50 hover:border-neutral-300 ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.05),0_1px_1px_rgba(0,0,0,0.03)]',
  ghost:
    'border border-transparent bg-transparent text-ink-soft ' +
    'hover:bg-neutral-100/80 hover:text-ink',
  danger:
    'border border-danger-600/80 bg-gradient-to-b from-danger-500 to-danger-600 text-white ' +
    'hover:from-danger-600 hover:to-danger-700 hover:border-danger-700/90 ' +
    'shadow-[0_1px_3px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.12)]',
  outline:
    'border border-neutral-200 bg-white text-ink ' +
    'hover:bg-neutral-50 hover:border-neutral-300 ' +
    'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
}

const sizes = {
  sm: 'h-8  gap-1.5 px-3   text-[12.5px]',
  md: 'h-9  gap-2   px-4   text-[13px]',
  lg: 'h-10 gap-2   px-4.5 text-[13.5px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-xl font-medium',
        'transition-all duration-150',
        'active:scale-[0.97] active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-200/70 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-45',
        variants[variant],
        sizes[size],
        className
      )}
      style={{ letterSpacing: '-0.008em' }}
      {...props}
    >
      {loading && <Spinner className="h-3.5 w-3.5 text-current" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
