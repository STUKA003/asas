import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full h-12 px-4 text-sm rounded-[18px] border bg-white/90 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.3)] transition-all',
            'focus:outline-none focus:ring-4 focus:ring-accent-100 focus:border-accent-500',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-zinc-200/80 dark:border-zinc-700',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-zinc-400">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full px-4 py-3 text-sm rounded-[18px] border bg-white/90 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.3)] transition-all resize-none',
            'focus:outline-none focus:ring-4 focus:ring-accent-100 focus:border-accent-500',
            error ? 'border-red-400' : 'border-zinc-200 dark:border-zinc-700',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
