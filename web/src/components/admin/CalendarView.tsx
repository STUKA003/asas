import { useEffect, useMemo, useRef, useState } from 'react'
import { format, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { Booking, Barber, BlockedTime } from '@/lib/types'

const HOUR_START  = 8
const HOUR_END    = 21
const HOUR_HEIGHT = 68

const PLAN_BADGE_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500',   'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
]

function planBadgeColor(planId: string): string {
  let hash = 0
  for (let i = 0; i < planId.length; i++) hash = (hash * 31 + planId.charCodeAt(i)) >>> 0
  return PLAN_BADGE_COLORS[hash % PLAN_BADGE_COLORS.length]
}

function planAbbr(planName: string): string {
  return planName
    .split(/[\s\-+&/]+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 3)
    .join('')
    .toUpperCase()
}

const STATUS_STYLES: Record<string, { bar: string; bg: string; text: string }> = {
  PENDING:   { bar: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-800' },
  CONFIRMED: { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
  COMPLETED: { bar: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-800' },
  CANCELLED: { bar: 'bg-zinc-400', bg: 'bg-zinc-100', text: 'text-zinc-500' },
  NO_SHOW:   { bar: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700' },
}

interface DragOver { barberId: string; top: number; label: string }

export interface EffectiveWorkingHour {
  startTime: string
  endTime: string
}

interface Props {
  date: Date
  bookings: Booking[]
  barbers:  Barber[]
  blockedTimes?: BlockedTime[]
  effectiveHours?: Map<string, EffectiveWorkingHour[]>
  slotGranularityMinutes?: number
  onBookingClick: (b: Booking) => void
  onSlotClick?: (barberId: string, time: string) => void
  onReschedule?: (bookingId: string, newStartTime: string, newBarberId?: string) => void
}

export function CalendarView({ date, bookings, barbers, blockedTimes = [], effectiveHours, slotGranularityMinutes = 15, onBookingClick, onSlotClick, onReschedule }: Props) {
  const hours       = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT
  const [now, setNow] = useState(() => new Date())

  /* ── Shared drag state ── */
  const draggingRef   = useRef<{ booking: Booking; offsetY: number } | null>(null)
  const [dragOver,    setDragOver]    = useState<DragOver | null>(null)
  const [draggingId,  setDraggingId]  = useState<string | null>(null)

  /* ── Touch-drag state ── */
  const touchActive   = useRef(false)
  const touchTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchInitialY = useRef(0)
  const touchClone    = useRef<HTMLElement | null>(null)
  const containerRef  = useRef<HTMLDivElement>(null)

  /* Prevent page scroll while touch-dragging (passive:false required) */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: TouchEvent) => { if (touchActive.current) e.preventDefault() }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  /* ── Helpers ── */
  const byBarber = useMemo(() => {
    const map = new Map<string, Booking[]>()
    barbers.forEach((b) => map.set(b.id, []))
    bookings.forEach((bk) => {
      const list = map.get(bk.barber.id)
      if (list) list.push(bk)
    })
    return map
  }, [bookings, barbers])

  const blocksByBarber = useMemo(() => {
    const map = new Map<string, BlockedTime[]>()
    barbers.forEach((barber) => map.set(barber.id, []))

    blockedTimes.forEach((block) => {
      if (block.barberId) {
        const list = map.get(block.barberId)
        if (list) list.push(block)
        return
      }

      barbers.forEach((barber) => {
        map.get(barber.id)?.push(block)
      })
    })

    return map
  }, [blockedTimes, barbers])

  function getStyle(bk: Booking) {
    const d    = new Date(bk.startTime)
    const mins = d.getHours() * 60 + d.getMinutes() - HOUR_START * 60
    return {
      top:    Math.max(0, (mins / 60) * HOUR_HEIGHT),
      height: Math.max(28, (bk.totalDuration / 60) * HOUR_HEIGHT - 2),
    }
  }

  function getBlockStyle(startTime: string, endTime: string) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const startMinutes = start.getHours() * 60 + start.getMinutes() - HOUR_START * 60
    const durationMinutes = Math.max(15, (end.getTime() - start.getTime()) / (1000 * 60))

    return {
      top: Math.max(0, (startMinutes / 60) * HOUR_HEIGHT),
      height: Math.max(20, (durationMinutes / 60) * HOUR_HEIGHT - 2),
    }
  }

  const showCurrentTime = isToday(date)
  const nowMinutes = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60
  const currentTimeTop = (nowMinutes / 60) * HOUR_HEIGHT
  const currentTimeLabel = format(now, 'HH:mm')

  function serviceTone(serviceId?: string) {
    if (!serviceId) return 'from-blue-500 to-cyan-400'
    const palette = [
      'from-blue-500 to-cyan-400',
      'from-emerald-500 to-green-400',
      'from-violet-500 to-fuchsia-400',
      'from-amber-500 to-orange-400',
      'from-rose-500 to-pink-400',
    ]
    let total = 0
    for (const char of serviceId) total += char.charCodeAt(0)
    return palette[total % palette.length]
  }

  function getClosedBands(hours: EffectiveWorkingHour[]): { top: number; height: number }[] {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const toTop = (min: number) => Math.max(0, (min - HOUR_START * 60) / 60 * HOUR_HEIGHT)
    const toH = (from: number, to: number) => {
      const cFrom = Math.max(HOUR_START * 60, from)
      const cTo   = Math.min(HOUR_END * 60, to)
      return Math.max(0, (cTo - cFrom) / 60 * HOUR_HEIGHT)
    }

    if (hours.length === 0) return [{ top: 0, height: totalHeight }]

    const sorted = [...hours].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const bands: { top: number; height: number }[] = []

    const firstStart = toMin(sorted[0].startTime)
    if (firstStart > HOUR_START * 60) bands.push({ top: 0, height: toH(HOUR_START * 60, firstStart) })

    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = toMin(sorted[i].endTime)
      const gapEnd   = toMin(sorted[i + 1].startTime)
      if (gapEnd > gapStart) bands.push({ top: toTop(gapStart), height: toH(gapStart, gapEnd) })
    }

    const lastEnd = toMin(sorted[sorted.length - 1].endTime)
    if (lastEnd < HOUR_END * 60) bands.push({ top: toTop(lastEnd), height: toH(lastEnd, HOUR_END * 60) })

    return bands
  }

  function snapDrop(relY: number, offsetY: number) {
    const adjusted   = relY - offsetY
    const rawMinutes = (adjusted / HOUR_HEIGHT) * 60
    const snapped    = Math.round(rawMinutes / slotGranularityMinutes) * slotGranularityMinutes
    const total      = HOUR_START * 60 + Math.max(0, snapped)
    const h = Math.min(Math.floor(total / 60), HOUR_END - 1)
    const m = total % 60
    const top   = ((h - HOUR_START) * 60 + m) / 60 * HOUR_HEIGHT
    const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    return { top, label, h, m }
  }

  function commitDrop(barberId: string, h: number, m: number, booking: Booking) {
    if (!onReschedule) return
    if (h < HOUR_START || h >= HOUR_END) return
    const newStart = new Date(date)
    newStart.setHours(h, m, 0, 0)
    const newBarberId = barberId !== booking.barber.id ? barberId : undefined
    onReschedule(booking.id, newStart.toISOString(), newBarberId)
  }

  /* ── Mouse drag handlers ── */
  function handleMouseDragOver(e: React.DragEvent, barberId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!draggingRef.current) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { top, label } = snapDrop(e.clientY - rect.top, draggingRef.current.offsetY)
    setDragOver({ barberId, top, label })
  }

  function handleMouseDrop(e: React.DragEvent, barberId: string) {
    e.preventDefault()
    if (!draggingRef.current) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const { h, m } = snapDrop(e.clientY - rect.top, draggingRef.current.offsetY)
    commitDrop(barberId, h, m, draggingRef.current.booking)
    draggingRef.current = null
    setDraggingId(null)
    setDragOver(null)
  }

  /* ── Touch drag handlers ── */
  function cleanupTouchDrag() {
    touchActive.current = false
    touchTimer.current && clearTimeout(touchTimer.current)
    touchTimer.current = null
    if (touchClone.current) {
      document.body.removeChild(touchClone.current)
      touchClone.current = null
    }
    draggingRef.current = null
    setDraggingId(null)
    setDragOver(null)
  }

  function handleTouchStart(e: React.TouchEvent, bk: Booking) {
    if (!onReschedule) return
    const touch  = e.touches[0]
    const rect   = e.currentTarget.getBoundingClientRect()
    const offsetY = touch.clientY - rect.top
    touchInitialY.current = touch.clientY

    touchTimer.current = setTimeout(() => {
      touchActive.current = true
      draggingRef.current = { booking: bk, offsetY }
      setDraggingId(bk.id)

      /* Create a floating clone that follows the finger */
      const src   = e.currentTarget as HTMLElement
      const clone = src.cloneNode(true) as HTMLElement
      clone.style.cssText = [
        'position:fixed',
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        `top:${touch.clientY - offsetY}px`,
        `left:${rect.left}px`,
        'opacity:0.85',
        'z-index:9999',
        'pointer-events:none',
        'border-radius:12px',
        'transform:scale(1.03)',
        'box-shadow:0 8px 24px rgba(0,0,0,0.18)',
        'transition:none',
      ].join(';')
      document.body.appendChild(clone)
      touchClone.current = clone

      if (navigator.vibrate) navigator.vibrate(40)
    }, 380)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0]

    /* If drag hasn't started yet: cancel on significant movement */
    if (!touchActive.current) {
      if (Math.abs(touch.clientY - touchInitialY.current) > 8) {
        touchTimer.current && clearTimeout(touchTimer.current)
        touchTimer.current = null
      }
      return
    }

    /* Move the clone */
    if (touchClone.current && draggingRef.current) {
      touchClone.current.style.top = `${touch.clientY - draggingRef.current.offsetY}px`
      touchClone.current.style.left = `${touch.clientX - 60}px`
    }

    /* Detect which column is under finger using elementFromPoint */
    if (touchClone.current) touchClone.current.style.display = 'none'
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    if (touchClone.current) touchClone.current.style.display = ''

    const col = el?.closest('[data-barber-id]')
    if (col && draggingRef.current) {
      const barberId = col.getAttribute('data-barber-id')!
      const colRect  = col.getBoundingClientRect()
      const { top, label } = snapDrop(touch.clientY - colRect.top, draggingRef.current.offsetY)
      setDragOver({ barberId, top, label })
    } else {
      setDragOver(null)
    }
  }

  function handleTouchEnd() {
    if (touchActive.current && draggingRef.current && dragOver) {
      const [h, m] = dragOver.label.split(':').map(Number)
      commitDrop(dragOver.barberId, h, m, draggingRef.current.booking)
    } else if (!touchActive.current) {
      /* Short tap — handled by onClick, nothing extra needed */
    }
    cleanupTouchDrag()
  }

  if (barbers.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">
        Nenhum barbeiro encontrado.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="overflow-x-auto rounded-[1.75rem] border border-zinc-200/70 bg-white/92 shadow-[0_20px_45px_-32px_rgba(15,23,42,0.35)] backdrop-blur-sm">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 flex border-b border-zinc-100 bg-white/95 backdrop-blur-xl">
        <div className="w-14 shrink-0" />
        {barbers.map((b) => (
          <div key={b.id} className="min-w-[150px] flex-1 border-l border-zinc-100 px-2 py-3 text-center text-sm font-semibold tracking-tight text-zinc-800 truncate">
            {b.name}
          </div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div className="flex select-none">
        {/* Hour labels */}
        <div className="relative w-14 shrink-0 border-r border-zinc-100 bg-zinc-50/70" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <div key={h} className="absolute left-0 right-0 flex justify-end pr-2" style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}>
                <span className="text-[10px] font-medium -translate-y-2 text-zinc-400">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
          ))}
          {showCurrentTime && nowMinutes >= 0 && nowMinutes <= totalHeight / HOUR_HEIGHT * 60 && (
            <div
                className="pointer-events-none absolute left-0 right-0 z-20 flex items-center justify-end pr-2"
                style={{ top: currentTimeTop }}
              >
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm -translate-y-1/2">
                {currentTimeLabel}
              </span>
            </div>
          )}
        </div>

        {/* Barber columns */}
        {barbers.map((barber) => {
          const bks        = byBarber.get(barber.id) ?? []
          const blocks     = blocksByBarber.get(barber.id) ?? []
          const isDropZone = dragOver?.barberId === barber.id

          return (
            <div
              key={barber.id}
              data-barber-id={barber.id}
              className={cn(
                'relative min-w-[150px] flex-1 border-l border-zinc-100 transition-colors',
                onSlotClick && !draggingId && 'cursor-pointer',
                isDropZone && 'bg-accent-50/50'
              )}
              style={{ height: totalHeight }}
              /* Mouse DnD */
              onDragOver={(e) => handleMouseDragOver(e, barber.id)}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleMouseDrop(e, barber.id)}
              /* Slot click (desktop + touch tap) */
              onClick={(e) => {
                if (draggingId || !onSlotClick) return
                if ((e.target as HTMLElement).closest('[data-booking]')) return
                const rect = e.currentTarget.getBoundingClientRect()
                const snapped = Math.round(((e.clientY - rect.top) / HOUR_HEIGHT * 60) / slotGranularityMinutes) * slotGranularityMinutes
                const total = HOUR_START * 60 + snapped
                const h = Math.floor(total / 60), m = total % 60
                if (h < HOUR_START || h >= HOUR_END) return
                onSlotClick(barber.id, `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
              }}
            >
              {/* Hour grid lines */}
              {hours.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-zinc-100" style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}>
                  <div className="absolute left-0 right-0 border-t border-dashed border-zinc-100/80" style={{ top: HOUR_HEIGHT / 2 }} />
                </div>
              ))}

              {showCurrentTime && nowMinutes >= 0 && nowMinutes <= totalHeight / HOUR_HEIGHT * 60 && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                  style={{ top: currentTimeTop }}
                >
                  <div className="h-2.5 w-2.5 shrink-0 -ml-1 rounded-full border-2 border-white bg-red-500 shadow-sm" />
                  <div className="h-[2px] flex-1 bg-red-500/85" />
                </div>
              )}

              {/* Closed / outside working hours bands */}
              {effectiveHours && getClosedBands(effectiveHours.get(barber.id) ?? []).map((band, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute left-0 right-0 z-0 bg-zinc-100/70 dark:bg-zinc-800/50"
                  style={{ top: band.top, height: band.height }}
                />
              ))}

              {blocks.map((block) => {
                const { top, height } = getBlockStyle(block.startTime, block.endTime)

                return (
                  <div
                    key={block.id}
                    className="pointer-events-none absolute left-1 right-1 z-0 overflow-hidden rounded-[1rem] border border-dashed border-red-300 bg-red-50/90"
                    style={{ top: top + 1, height }}
                  >
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                      Bloqueado
                    </div>
                    {height > 30 ? (
                      <div className="px-2 text-[10px] text-red-600/80">
                        {format(new Date(block.startTime), 'HH:mm')} - {format(new Date(block.endTime), 'HH:mm')}
                        {block.reason ? ` · ${block.reason}` : ''}
                      </div>
                    ) : null}
                  </div>
                )
              })}

              {/* Drop indicator */}
              {isDropZone && dragOver && draggingRef.current && (
                <div
                  className="pointer-events-none absolute left-1 right-1 z-20 flex items-center justify-center rounded-[1rem] border-2 border-dashed border-accent-400 bg-accent-100/70"
                  style={{ top: dragOver.top + 1, height: Math.max(28, (draggingRef.current.booking.totalDuration / 60) * HOUR_HEIGHT - 2) }}
                >
                  <span className="text-xs font-semibold text-accent-600">{dragOver.label}</span>
                </div>
              )}

              {/* Booking blocks */}
              {bks.map((bk) => {
                const { top, height } = getStyle(bk)
                const s = STATUS_STYLES[bk.status] ?? STATUS_STYLES.PENDING
                const isDragging = draggingId === bk.id
                return (
                  <div
                    key={bk.id}
                    data-booking="true"
                    draggable={!!onReschedule}
                    onDragStart={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      draggingRef.current = { booking: bk, offsetY: e.clientY - rect.top }
                      setDraggingId(bk.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      draggingRef.current = null
                      setDraggingId(null)
                      setDragOver(null)
                    }}
                    onTouchStart={(e) => handleTouchStart(e, bk)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => { e.stopPropagation(); if (!isDragging) onBookingClick(bk) }}
                    className={cn(
                      'group absolute left-1 right-1 z-10 flex overflow-hidden rounded-[1rem] border border-white/60 bg-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)]',
                      onReschedule ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                      isDragging ? 'opacity-25' : 'opacity-100 hover:-translate-y-0.5 hover:shadow-[0_22px_34px_-22px_rgba(15,23,42,0.55)] active:scale-[0.99]',
                      'transition-all duration-150'
                    )}
                    style={{ top: top + 1, height, touchAction: onReschedule ? 'none' : 'auto' }}
                    title={`${bk.customer.name} · ${bk.services[0]?.service.name ?? 'Serviço'} · ${format(new Date(bk.startTime), 'HH:mm')}`}
                  >
                    <div className={cn('w-1 shrink-0 rounded-l-xl', s.bar)} />
                    <div className={cn('min-w-0 flex-1 px-2 py-1.5', s.bg, s.text)}>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${serviceTone(bk.services[0]?.serviceId)}`} />
                        <p className="flex-1 truncate text-[11px] font-bold leading-tight">
                          {format(new Date(bk.startTime), 'HH:mm')} · {bk.customer.name}
                        </p>
                        {bk.customer.plan
                          ? <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${planBadgeColor(bk.customer.plan.id)} text-white leading-none`}>{planAbbr(bk.customer.plan.name)}</span>
                          : <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-zinc-400 text-white leading-none">A</span>
                        }
                      </div>
                      {height > 36 && (
                        <p className="mt-1 truncate text-[10px] leading-tight opacity-80">
                          {bk.customer.plan ? bk.customer.plan.name : bk.services[0]?.service.name ?? '—'}
                        </p>
                      )}
                      {height > 54 && (
                        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-75">
                          <span>{bk.barber.name}</span>
                          <span className="font-semibold">{formatCurrency(bk.totalPrice)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
