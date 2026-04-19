import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-slide-up dark:bg-zinc-900 sm:max-h-[calc(100vh-2rem)]', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:px-6">
            <h2 className="text-base font-semibold">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X size={16} />
            </Button>
          </div>
        )}
        <div className="overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}
