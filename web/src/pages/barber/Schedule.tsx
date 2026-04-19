import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { barberPortalApi } from '@/lib/api'
import { CalendarView } from '@/components/admin/CalendarView'
import { BarberLayout } from '@/components/layout/BarberLayout'
import { BookingModal } from '@/pages/barber/BookingModal'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns'
import { pt } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useBarberAuthStore } from '@/store/barberAuth'
import type { Barber, Booking, BookingStatus, Extra, Product } from '@/lib/types'

/* ─── Grid constants ──────────────────────────────────────── */
const START_HOUR  = 7
const END_HOUR    = 22
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 64           // px per hour
const MIN_PX      = HOUR_HEIGHT / 60
const DRAG_THRESHOLD = 3         // px before drag starts

const VIEW_OPTIONS = [
  { label: '1 dia',  days: 1 },
  { label: '3 dias', days: 3 },
  { label: '7 dias', days: 7 },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-blue-50   border-l-blue-400   text-blue-800   dark:bg-blue-900/30   dark:text-blue-200',
  CONFIRMED: 'bg-accent-50 border-l-accent-500 text-accent-900 dark:bg-accent-900/30 dark:text-accent-200',
  COMPLETED: 'bg-emerald-50 border-l-emerald-500 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  CANCELLED: 'bg-zinc-100  border-l-zinc-400   text-zinc-400   dark:bg-zinc-800      dark:text-zinc-500',
  NO_SHOW:   'bg-red-50    border-l-red-400    text-red-700    dark:bg-red-900/30    dark:text-red-300',
}

function minutesFromDayStart(date: Date) {
  return (date.getHours() - START_HOUR) * 60 + date.getMinutes()
}

function snapToInterval(minutes: number, snapMinutes: number) {
  return Math.round(minutes / snapMinutes) * snapMinutes
}

function getApiErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
  ) {
    return (err as { response?: { data?: { error?: string } } }).response!.data!.error!
  }

  return err instanceof Error ? err.message : fallback
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'pendente',
  CONFIRMED: 'confirmado',
  COMPLETED: 'concluído',
  CANCELLED: 'cancelado',
  NO_SHOW: 'não compareceu',
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function BarberSchedule() {
  const qc = useQueryClient()
  const barber = useBarberAuthStore((state) => state.barber)
  const snapMinutes = barber?.barbershop?.slotGranularityMinutes ?? 15
  const [viewDays, setViewDays]       = useState(1)
  const [anchor, setAnchor]           = useState(() => startOfDay(new Date()))
  const [modalBooking, setModalBooking] = useState<Booking | null>(null)
  const [selectedExtraId, setSelectedExtraId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addItemsError, setAddItemsError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef   = useRef<HTMLDivElement>(null)
  const dragRef   = useRef<{ booking: Booking; duration: number; offsetY: number } | null>(null)
  const suppressClickRef = useRef(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{ top: number; dayIdx: number; booking: Booking; label: string } | null>(null)
  const canManageItems = (barber?.barbershop?.subscriptionPlan ?? 'FREE') !== 'FREE'

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (new Date().getHours() - START_HOUR - 1) * HOUR_HEIGHT)
    }
  }, [])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  const days = Array.from({ length: viewDays }, (_, i) => addDays(anchor, i))
  const from = format(days[0], 'yyyy-MM-dd')
  const to   = format(days[days.length - 1], 'yyyy-MM-dd')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['barber-portal', 'bookings-range', from, to],
    queryFn:  () => barberPortalApi.bookings({ from, to }) as Promise<Booking[]>,
  })
  const { data: extras = [] } = useQuery({
    queryKey: ['barber-portal', 'extras'],
    queryFn: () => barberPortalApi.extras() as Promise<Extra[]>,
    enabled: !!modalBooking && canManageItems,
  })
  const { data: products = [] } = useQuery({
    queryKey: ['barber-portal', 'products'],
    queryFn: () => barberPortalApi.products() as Promise<Product[]>,
    enabled: !!modalBooking && canManageItems,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['barber-portal'] })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      barberPortalApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      invalidate()
      setModalBooking(null)
      setSelectedExtraId('')
      setSelectedProductId('')
      setAddItemsError(null)
      setFeedback({ type: 'success', message: `Agendamento marcado como ${STATUS_LABELS[variables.status as BookingStatus] ?? variables.status.toLowerCase()}.` })
    },
    onError: (err: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err, 'Não foi possível alterar o estado do agendamento.') })
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime }: { id: string; startTime: string }) =>
      barberPortalApi.reschedule(id, startTime),
    onSuccess: (_, variables) => {
      invalidate()
      setFeedback({
        type: 'success',
        message: `Agendamento movido para ${format(new Date(variables.startTime), "d MMM 'às' HH:mm", { locale: pt })}.`,
      })
    },
    onError: (err: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err, 'Não foi possível remarcar o agendamento.') })
    },
  })
  const addItemsMutation = useMutation({
    mutationFn: ({ id, extraId, productId }: { id: string; extraId?: string; productId?: string }) =>
      barberPortalApi.addItems(id, {
        ...(extraId ? { extraIds: [extraId] } : {}),
        ...(productId ? { productIds: [productId] } : {}),
      }) as Promise<Booking>,
    onSuccess: (updated) => {
      setAddItemsError(null)
      invalidate()
      setModalBooking(updated)
      setSelectedExtraId('')
      setSelectedProductId('')
      setFeedback({ type: 'success', message: 'Extra/produto adicionado ao agendamento.' })
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, 'Não foi possível adicionar o item ao agendamento')
      setAddItemsError(message)
      setFeedback({ type: 'error', message })
    },
  })
  const removeItemMutation = useMutation({
    mutationFn: ({ id, type, itemId }: { id: string; type: 'extra' | 'product'; itemId: string }) =>
      barberPortalApi.removeItem(id, { type, itemId }) as Promise<Booking>,
    onSuccess: (updated) => {
      setAddItemsError(null)
      invalidate()
      setModalBooking(updated)
      setFeedback({ type: 'success', message: 'Item removido do agendamento.' })
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, 'Não foi possível remover o item do agendamento')
      setAddItemsError(message)
      setFeedback({ type: 'error', message })
    },
  })

  const getDropPreview = (clientY: number, dayIdx: number, columnEl: HTMLElement) => {
    const scroll = scrollRef.current
    if (!scroll) return null

    const rect = columnEl.getBoundingClientRect()
    const offsetY = dragRef.current?.offsetY ?? 0
    const relY = clientY - rect.top + scroll.scrollTop - offsetY
    const rawMin = (relY / HOUR_HEIGHT) * 60
    const durationMinutes = Math.round((dragRef.current?.duration ?? 0) / 60000)
    const maxMinutes = Math.max(0, TOTAL_HOURS * 60 - durationMinutes)
    const snapped = Math.max(0, Math.min(snapToInterval(rawMin, snapMinutes), maxMinutes))
    const top = (snapped / 60) * HOUR_HEIGHT
    const h = START_HOUR + Math.floor(snapped / 60)
    const m = snapped % 60
    const label = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`

    return { top, dayIdx, snapped, label }
  }

  const prev    = () => setAnchor(d => addDays(d, -viewDays))
  const next    = () => setAnchor(d => addDays(d,  viewDays))
  const goToday = () => setAnchor(startOfDay(new Date()))
  const changeView = (n: number) => { setViewDays(n); setAnchor(startOfDay(new Date())) }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)
  const now   = new Date()
  const barberCalendarBarbers: Barber[] = barber
    ? [{
        id: barber.id,
        name: barber.name,
        email: barber.email,
        avatar: barber.avatar,
        active: true,
      }]
    : []

  return (
    <BarberLayout>
      <div className="flex flex-col -m-4 lg:-m-8" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Hoje
            </button>
            <div className="flex">
              <button onClick={prev} className="p-1.5 rounded-l-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={next} className="p-1.5 rounded-r-lg border border-l-0 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <span className="text-sm font-semibold hidden sm:block">
              {viewDays === 1
                ? format(anchor, "d 'de' MMMM, yyyy", { locale: pt })
                : `${format(days[0], 'd MMM', { locale: pt })} – ${format(days[days.length - 1], "d MMM yyyy", { locale: pt })}`
              }
            </span>
          </div>
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {VIEW_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => changeView(opt.days)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewDays === opt.days
                    ? 'bg-accent-500 text-white'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div
            className={`mx-4 lg:mx-6 mt-3 px-4 py-3 rounded-2xl border text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* ── Day headers ── */}
        <div className="flex bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div className="w-14 shrink-0" />
          {days.map(d => {
            const current = isToday(d)
            return (
              <div key={d.toISOString()} className={`flex-1 text-center py-2 border-l border-zinc-100 dark:border-zinc-800 ${current ? 'bg-accent-50 dark:bg-accent-900/10' : ''}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${current ? 'text-accent-500' : 'text-zinc-400'}`}>
                  {format(d, 'EEE', { locale: pt })}
                </p>
                <p className={`text-xl font-bold leading-tight ${current ? 'text-accent-500' : 'text-zinc-800 dark:text-zinc-100'}`}>
                  {format(d, 'd')}
                </p>
              </div>
            )
          })}
        </div>

        {/* ── Time grid ── */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-900"><PageLoader /></div>
        ) : viewDays === 1 ? (
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-zinc-900 px-4 py-4 lg:px-6">
            <CalendarView
              date={anchor}
              bookings={bookings.filter((booking) => isSameDay(new Date(booking.startTime), anchor))}
              barbers={barberCalendarBarbers}
              slotGranularityMinutes={snapMinutes}
              onBookingClick={setModalBooking}
              onReschedule={(bookingId, newStartTime) => {
                rescheduleMutation.mutate({ id: bookingId, startTime: newStartTime })
              }}
            />
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-zinc-900">
            <div ref={gridRef} className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>

              {/* Time labels */}
              <div className="w-14 shrink-0 relative select-none">
                {hours.map(h => (
                  <div key={h} className="absolute w-full flex items-start justify-end pr-2 pt-1" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}>
                    <span className="text-[10px] text-zinc-400 font-medium">{String(h).padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((d, dayIdx) => {
                const dayBookings  = bookings.filter(b => isSameDay(new Date(b.startTime), d))
                const isCurrentDay = isToday(d)
                const nowMin       = minutesFromDayStart(now)

                return (
                  <div
                    key={d.toISOString()}
                    data-day-column
                    className="flex-1 relative border-l border-zinc-100 dark:border-zinc-800"
                    onDragOver={(e) => {
                      if (!dragRef.current) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      const preview = getDropPreview(e.clientY, dayIdx, e.currentTarget)
                      if (!preview) return
                      setDragPreview({ top: preview.top, dayIdx: preview.dayIdx, booking: dragRef.current.booking, label: preview.label })
                    }}
                    onDrop={(e) => {
                      if (!dragRef.current) return
                      e.preventDefault()
                      const currentDrag = dragRef.current
                      const preview = getDropPreview(e.clientY, dayIdx, e.currentTarget)
                      dragRef.current = null
                      setDraggingId(null)
                      setDragPreview(null)
                      window.setTimeout(() => {
                        suppressClickRef.current = false
                      }, 0)
                      if (!preview) return
                      const targetDay = addDays(anchor, preview.dayIdx)
                      const newStart = new Date(targetDay)
                      newStart.setHours(
                        START_HOUR + Math.floor(preview.snapped / 60),
                        preview.snapped % 60,
                        0,
                        0,
                      )
                      rescheduleMutation.mutate({ id: currentDrag.booking.id, startTime: newStart.toISOString() })
                    }}
                  >
                    {/* Hour lines */}
                    {hours.map(h => (
                      <div key={h} className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-800" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                    ))}
                    {/* Half-hour lines */}
                    {hours.map(h => (
                      <div key={`${h}-h`} className="absolute left-0 right-0 border-t border-zinc-50 dark:border-zinc-800/50" style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                    ))}

                    {/* Current time line */}
                    {isCurrentDay && nowMin >= 0 && nowMin <= TOTAL_HOURS * 60 && (
                      <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: (nowMin / 60) * HOUR_HEIGHT }}>
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                        <div className="flex-1 h-[1.5px] bg-red-500" />
                      </div>
                    )}

                    {/* Drag preview ghost */}
                    {dragPreview && dragPreview.dayIdx === dayIdx && dragRef.current && (() => {
                      const durationMin = dragRef.current.duration / 60000
                      const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 20)
                      return (
                        <div
                          className="absolute left-1 right-1 rounded-md border-2 border-dashed border-accent-500 bg-accent-100/50 dark:bg-accent-900/20 pointer-events-none z-30"
                          style={{ top: dragPreview.top, height }}
                        >
                          <p className="text-[11px] font-bold px-2 pt-1 text-accent-700 dark:text-accent-300 truncate">
                            {dragRef.current.booking.customer.name}
                          </p>
                          <p className="text-[10px] px-2 text-accent-600 dark:text-accent-400">
                            {dragPreview.label}
                          </p>
                        </div>
                      )
                    })()}

                    {/* Booking blocks */}
                    {dayBookings.map(b => {
                      const start    = new Date(b.startTime)
                      const end      = new Date(b.endTime)
                      const topMin   = minutesFromDayStart(start)
                      const durationMin = (end.getTime() - start.getTime()) / 60000
                      const top      = (topMin / 60) * HOUR_HEIGHT
                      const height   = Math.max((durationMin / 60) * HOUR_HEIGHT, 20)
                      const colors   = STATUS_COLORS[b.status] ?? STATUS_COLORS.PENDING
                      const compact  = height < 46
                      const isDragged = draggingId === b.id

                      return (
                        <div
                          key={b.id}
                          data-booking-card
                          draggable={!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status)}
                          onDragStart={(e) => {
                            if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status)) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            const duration = new Date(b.endTime).getTime() - new Date(b.startTime).getTime()
                            dragRef.current = {
                              booking: b,
                              duration,
                              offsetY: e.clientY - rect.top,
                            }
                            setDraggingId(b.id)
                            suppressClickRef.current = true
                            e.dataTransfer.setData('text/plain', b.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => {
                            dragRef.current = null
                            setDraggingId(null)
                            setDragPreview(null)
                            window.setTimeout(() => {
                              suppressClickRef.current = false
                            }, 0)
                          }}
                          onClick={() => {
                            if (suppressClickRef.current) return
                            setModalBooking(b)
                          }}
                          className={`absolute left-1 right-1 rounded-md border-l-[3px] px-2 py-1 overflow-hidden select-none ${colors} ${
                            isDragged ? 'opacity-30' : (!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status) ? 'cursor-grab active:cursor-grabbing hover:opacity-90' : '')
                          } transition-opacity`}
                          style={{ top, height, zIndex: 10 }}
                        >
                          <div className="flex items-center gap-1">
                            <p className="text-[11px] font-bold leading-tight truncate flex-1">{b.customer.name}</p>
                            {b.customer.plan
                              ? <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-violet-500 text-white leading-none">P</span>
                              : <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-zinc-400 text-white leading-none">A</span>
                            }
                          </div>
                          {!compact && (
                            <>
                              <p className="text-[10px] leading-tight truncate opacity-75 mt-0.5">
                                {b.customer.plan ? b.customer.plan.name : b.services.map(s => s.service.name).join(', ')}
                              </p>
                              <p className="text-[10px] leading-tight opacity-60 mt-0.5">
                                {format(start, 'HH:mm')}–{format(end, 'HH:mm')} · {formatCurrency(b.totalPrice)}
                              </p>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Booking detail modal */}
      {modalBooking && (
        <BookingModal
          booking={modalBooking}
          onClose={() => {
            setModalBooking(null)
            setSelectedExtraId('')
            setSelectedProductId('')
            setAddItemsError(null)
          }}
          onStatusChange={status => statusMutation.mutate({ id: modalBooking.id, status })}
          canManageItems={canManageItems}
          extras={extras}
          products={products}
          selectedExtraId={selectedExtraId}
          selectedProductId={selectedProductId}
          addItemsError={addItemsError}
          isAddingItems={addItemsMutation.isPending}
          isRemovingItem={removeItemMutation.isPending}
          isUpdatingStatus={statusMutation.isPending}
          onExtraChange={setSelectedExtraId}
          onProductChange={setSelectedProductId}
          onAddItems={() => addItemsMutation.mutate({
            id: modalBooking.id,
            ...(selectedExtraId ? { extraId: selectedExtraId } : {}),
            ...(selectedProductId ? { productId: selectedProductId } : {}),
          })}
          onRemoveItem={(type, itemId) => removeItemMutation.mutate({ id: modalBooking.id, type, itemId })}
        />
      )}
    </BarberLayout>
  )
}
