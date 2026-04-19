import { cn } from '@/lib/utils'

interface AvatarProps { name: string; src?: string; size?: 'sm' | 'md' | 'lg'; className?: string }

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' }

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  return (
    <div className={cn('rounded-full bg-accent-100 text-accent-700 font-semibold flex items-center justify-center overflow-hidden flex-shrink-0', sizes[size], className)}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials}
    </div>
  )
}
