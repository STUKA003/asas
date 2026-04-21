import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary: 'border border-primary-600 bg-primary-600 text-white shadow-medium hover:bg-primary-700 hover:border-primary-700',
  secondary: 'border border-neutral-200 bg-white text-ink shadow-soft hover:bg-neutral-50',
  ghost: 'border border-transparent bg-transparent text-ink-soft hover:bg-neutral-100 hover:text-ink',
  danger: 'border border-danger-600 bg-danger-600 text-white shadow-medium hover:bg-danger-700 hover:border-danger-700',
  outline: 'border border-neutral-200 bg-white text-ink shadow-soft hover:bg-neutral-50',
}

const sizes = {
  sm: 'h-10 gap-2 px-4 text-sm',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl font-medium tracking-[-0.01em] transition',
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
