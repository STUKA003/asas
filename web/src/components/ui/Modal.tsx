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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/48 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-strong animate-slide-up sm:max-h-[calc(100vh-4rem)]',
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 rounded-lg p-0">
              <X size={16} />
            </Button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}
