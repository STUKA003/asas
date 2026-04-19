import { cn } from '@/lib/utils'
import { type HTMLAttributes } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[1.75rem] border border-zinc-200/70 bg-white/92 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.22)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-26px_rgba(15,23,42,0.28)] dark:border-zinc-800/80 dark:bg-zinc-900/88 dark:shadow-[0_16px_40px_-22px_rgba(0,0,0,0.55)]',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-4 pt-6 sm:px-7', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6 sm:px-7', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50', className)} {...props} />
}
