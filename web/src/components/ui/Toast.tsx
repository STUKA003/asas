import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Types ────────────────────────────────────────────────────── */

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

/* ─── Context ──────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null)

/* ─── Single toast item ────────────────────────────────────────── */

const config: Record<ToastType, { icon: typeof CheckCircle2; containerClass: string; iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    containerClass: 'border-success-200/60 bg-white',
    iconClass: 'text-success-600',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'border-danger-200/60 bg-white',
    iconClass: 'text-danger-500',
  },
  info: {
    icon: Info,
    containerClass: 'border-neutral-200/70 bg-white',
    iconClass: 'text-ink-muted',
  },
}

function ToastItemView({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const c = config[item.type]
  const Icon = c.icon

  useEffect(() => {
    // Trigger enter animation
    const t1 = setTimeout(() => setVisible(true), 10)
    // Trigger exit
    const duration = item.duration ?? 3500
    const t2 = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => onDismiss(item.id), 260)
    }, duration)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-strong',
        'transition-all duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        c.containerClass,
        visible && !leaving ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      )}
      style={{ willChange: 'transform, opacity' }}
    >
      <Icon size={16} className={cn('mt-px shrink-0', c.iconClass)} />
      <p className="flex-1 text-[13px] font-medium text-ink leading-snug">{item.message}</p>
      <button
        onClick={() => { setLeaving(true); setTimeout(() => onDismiss(item.id), 260) }}
        className="ml-1 mt-px shrink-0 rounded-md p-0.5 text-ink-muted/50 transition-colors hover:text-ink-muted"
      >
        <X size={13} />
      </button>
    </div>
  )
}

/* ─── Provider ─────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = `toast-${++counterRef.current}`
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }])
  }, [])

  const success = useCallback((message: string) => toast(message, 'success'), [toast])
  const error   = useCallback((message: string) => toast(message, 'error', 5000), [toast])
  const info    = useCallback((message: string) => toast(message, 'info'), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(90vw,360px)] flex-col gap-2"
        >
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItemView item={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

/* ─── Hook ─────────────────────────────────────────────────────── */

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
