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
      <div
        className="absolute inset-0 animate-fade-in bg-neutral-950/55 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden',
          'rounded-2xl border border-neutral-200/60 bg-white animate-enter',
          'sm:max-h-[calc(100vh-4rem)]',
          sizes[size]
        )}
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)' }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
            <h2 className="text-[14.5px] font-semibold text-ink" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 rounded-lg p-0 text-ink-muted hover:bg-neutral-100 hover:text-ink"
            >
              <X size={14} />
            </Button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
