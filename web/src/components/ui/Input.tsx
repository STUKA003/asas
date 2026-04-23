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
          <label htmlFor={inputId} className="ui-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'ui-control',
            error && 'ui-control-error',
            className
          )}
          {...props}
        />
        {error && (
          <p className="flex items-center gap-1 text-[12px] text-danger-600">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-[12px] leading-normal text-ink-muted">{hint}</p>
        )}
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
          <label htmlFor={inputId} className="ui-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'ui-control min-h-[100px] resize-none py-3',
            error && 'ui-control-error',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[12px] text-danger-600">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
