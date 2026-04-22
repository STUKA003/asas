import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  MoveRight,
} from 'lucide-react'
import { barberPortalApi } from '@/lib/api'
import { CalendarView } from '@/components/admin/CalendarView'
import { BarberLayout } from '@/components/layout/BarberLayout'
import { BookingModal } from '@/pages/barber/BookingModal'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { useBarberAuthStore } from '@/store/barberAuth'
import type { Barber, Booking, BookingStatus, Extra, Product } from '@/lib/types'

const START_HOUR = 7
const END_HOUR = 22
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 64

const VIEW_OPTIONS = [
  { label: '1 dia', days: 1 },
  { label: '3 dias', days: 3 },
  { label: '7 dias', days: 7 },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-blue-500/12 border-l-blue-400 text-blue-100',
  CONFIRMED: 'bg-orange-500/14 border-l-orange-400 text-orange-100',
  COMPLETED: 'bg-emerald-500/14 border-l-emerald-400 text-emerald-100',
  CANCELLED: 'bg-zinc-500/10 border-l-zinc-500 text-zinc-400',
  NO_SHOW: 'bg-red-500/12 border-l-red-400 text-red-100',
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'pendente',
  CONFIRMED: 'confirmado',
  COMPLETED: 'concluído',
  CANCELLED: 'cancelado',
  NO_SHOW: 'não compareceu',
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

export default function BarberSchedule() {
  const qc = useQueryClient()
  const barber = useBarberAuthStore((state) => state.barber)
  const snapMinutes = barber?.barbershop?.slotGranularityMinutes ?? 15
  const [viewDays, setViewDays] = useState(1)
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [modalBooking, setModalBooking] = useState<Booking | null>(null)
  const [selectedExtraId, setSelectedExtraId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addItemsError, setAddItemsError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ booking: Booking; duration: number; offsetY: number } | null>(null)
  const suppressClickRef = useRef(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{ top: number; dayIdx: number; booking: Booking; label: string } | null>(null)
  const canManageItems = (barber?.barbershop?.subscriptionPlan ?? 'FREE') !== 'FREE'

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
  const to = format(days[days.length - 1], 'yyyy-MM-dd')
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['barber-portal', 'bookings-range', from, to],
    queryFn: () => barberPortalApi.bookings({ from, to }) as Promise<Booking[]>,
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
    mutationFn: ({ id, status }: { id: string; status: string }) => barberPortalApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      invalidate()
      setModalBooking(null)
      setSelectedExtraId('')
      setSelectedProductId('')
      setAddItemsError(null)
      setFeedback({
        type: 'success',
        message: `Agendamento marcado como ${STATUS_LABELS[variables.status as BookingStatus] ?? variables.status.toLowerCase()}.`,
      })
    },
    onError: (err: unknown) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(err, 'Não foi possível alterar o estado do agendamento.') })
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime }: { id: string; startTime: string }) => barberPortalApi.reschedule(id, startTime),
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
    const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    return { top, dayIdx, snapped, label }
  }

  const prev = () => setAnchor((date) => addDays(date, -viewDays))
  const next = () => setAnchor((date) => addDays(date, viewDays))
  const goToday = () => setAnchor(startOfDay(new Date()))
  const changeView = (daysCount: number) => {
    setViewDays(daysCount)
    setAnchor(startOfDay(new Date()))
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, index) => START_HOUR + index)
  const now = new Date()
  const barberCalendarBarbers: Barber[] = barber
    ? [
        {
          id: barber.id,
          name: barber.name,
          email: barber.email,
          avatar: barber.avatar,
          active: true,
        },
      ]
    : []

  const visibleBookings = bookings.filter((booking) => ['PENDING', 'CONFIRMED'].includes(booking.status))
  const nextBooking = visibleBookings[0] ?? null

  return (
    <BarberLayout>
      <div className="space-y-6 text-white">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_16rem),linear-gradient(180deg,#141419_0%,#111116_100%)] p-5 shadow-[0_32px_100px_-56px_rgba(0,0,0,0.95)] sm:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200/80">Agenda operacional</p>
              <h1 className="mt-4 text-3xl font-semibold leading-[0.98] text-white sm:text-4xl">
                Remarca, acompanha e fecha o dia no mesmo painel.
              </h1>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                A agenda do barbeiro junta vista rápida, drag & drop e detalhe do atendimento sem depender do portal admin.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <CalendarDays size={13} />
                  Intervalo
                </div>
                <p className="mt-2 text-sm font-semibold text-white">
                  {viewDays === 1
                    ? format(anchor, "d 'de' MMMM", { locale: pt })
                    : `${format(days[0], 'd MMM', { locale: pt })} - ${format(days[days.length - 1], 'd MMM', { locale: pt })}`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <Clock3 size={13} />
                  Slot
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{snapMinutes} min</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                  <Layers3 size={13} />
                  Ativos
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{visibleBookings.length} atendimentos</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-[2rem] border border-white/10 bg-[#131319] p-4 shadow-[0_26px_70px_-44px_rgba(0,0,0,0.9)] sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={goToday}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                >
                  Hoje
                </button>
                <div className="flex overflow-hidden rounded-2xl border border-white/10">
                  <button onClick={prev} className="px-3 py-2 text-zinc-300 transition hover:bg-white/[0.06] hover:text-white">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={next} className="border-l border-white/10 px-3 py-2 text-zinc-300 transition hover:bg-white/[0.06] hover:text-white">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white">
                  {viewDays === 1
                    ? format(anchor, "d 'de' MMMM, yyyy", { locale: pt })
                    : `${format(days[0], 'd MMM', { locale: pt })} - ${format(days[days.length - 1], "d MMM yyyy", { locale: pt })}`}
                </div>
              </div>

              <div className="flex rounded-2xl border border-white/10 bg-white/[0.02] p-1">
                {VIEW_OPTIONS.map((option) => (
                  <button
                    key={option.days}
                    onClick={() => changeView(option.days)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                      viewDays === option.days
                        ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {feedback ? (
              <div
                className={`mt-4 rounded-[1.5rem] border px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-500/25 bg-red-500/10 text-red-200'
                }`}
              >
                {feedback.message}
              </div>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#131319] p-5 shadow-[0_26px_70px_-44px_rgba(0,0,0,0.9)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Próximo atendimento</p>
            {nextBooking ? (
              <>
                <h2 className="mt-3 text-xl font-semibold text-white">{nextBooking.customer.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {nextBooking.services.map((service) => service.service.name).join(', ')}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                  <Clock3 size={14} />
                  {format(new Date(nextBooking.startTime), 'HH:mm')} - {format(new Date(nextBooking.endTime), 'HH:mm')}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                  <MoveRight size={14} />
                  {formatCurrency(nextBooking.totalPrice)}
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-zinc-500">
                Nenhum atendimento ativo no intervalo selecionado.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#131319] shadow-[0_30px_80px_-48px_rgba(0,0,0,0.95)]">
          <div className="border-b border-white/10 bg-[#17171d]">
            <div className="flex">
              <div className="w-14 shrink-0" />
              {days.map((day) => {
                const current = isToday(day)
                return (
                  <div key={day.toISOString()} className={`flex-1 border-l border-white/10 py-3 text-center ${current ? 'bg-orange-500/10' : ''}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${current ? 'text-orange-300' : 'text-zinc-500'}`}>
                      {format(day, 'EEE', { locale: pt })}
                    </p>
                    <p className={`mt-1 text-2xl font-semibold ${current ? 'text-white' : 'text-zinc-300'}`}>{format(day, 'd')}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[28rem] items-center justify-center">
              <PageLoader />
            </div>
          ) : viewDays === 1 ? (
            <div className="bg-[#111116] p-4 sm:p-5">
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
            <div ref={scrollRef} className="max-h-[72vh] overflow-y-auto overflow-x-hidden bg-[#111116]">
              <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                <div className="relative w-14 shrink-0 select-none border-r border-white/10 bg-[#17171d]">
                  {hours.map((hour) => (
                    <div key={hour} className="absolute flex w-full items-start justify-end pr-2 pt-1" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}>
                      <span className="text-[10px] font-medium text-zinc-500">{String(hour).padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                {days.map((day, dayIdx) => {
                  const dayBookings = bookings.filter((booking) => isSameDay(new Date(booking.startTime), day))
                  const isCurrentDay = isToday(day)
                  const nowMin = minutesFromDayStart(now)

                  return (
                    <div
                      key={day.toISOString()}
                      data-day-column
                      className="relative flex-1 border-l border-white/10"
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
                        newStart.setHours(START_HOUR + Math.floor(preview.snapped / 60), preview.snapped % 60, 0, 0)
                        rescheduleMutation.mutate({ id: currentDrag.booking.id, startTime: newStart.toISOString() })
                      }}
                    >
                      {hours.map((hour) => (
                        <div key={hour} className="absolute left-0 right-0 border-t border-white/8" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }} />
                      ))}
                      {hours.map((hour) => (
                        <div key={`${hour}-half`} className="absolute left-0 right-0 border-t border-white/[0.04]" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                      ))}

                      {isCurrentDay && nowMin >= 0 && nowMin <= TOTAL_HOURS * 60 ? (
                        <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: (nowMin / 60) * HOUR_HEIGHT }}>
                          <div className="h-2.5 w-2.5 shrink-0 -ml-1 rounded-full bg-red-500" />
                          <div className="h-[1.5px] flex-1 bg-red-500" />
                        </div>
                      ) : null}

                      {dragPreview && dragPreview.dayIdx === dayIdx && dragRef.current ? (
                        <div
                          className="pointer-events-none absolute left-1 right-1 z-30 rounded-xl border-2 border-dashed border-orange-400 bg-orange-500/10"
                          style={{ top: dragPreview.top, height: Math.max((dragRef.current.duration / 60000 / 60) * HOUR_HEIGHT, 20) }}
                        >
                          <p className="truncate px-2 pt-1 text-[11px] font-bold text-orange-200">{dragRef.current.booking.customer.name}</p>
                          <p className="px-2 text-[10px] text-orange-300">{dragPreview.label}</p>
                        </div>
                      ) : null}

                      {dayBookings.map((booking) => {
                        const start = new Date(booking.startTime)
                        const end = new Date(booking.endTime)
                        const topMin = minutesFromDayStart(start)
                        const durationMin = (end.getTime() - start.getTime()) / 60000
                        const top = (topMin / 60) * HOUR_HEIGHT
                        const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 20)
                        const colors = STATUS_COLORS[booking.status] ?? STATUS_COLORS.PENDING
                        const compact = height < 46
                        const isDragged = draggingId === booking.id

                        return (
                          <div
                            key={booking.id}
                            draggable={!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)}
                            onDragStart={(e) => {
                              if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) return
                              const rect = e.currentTarget.getBoundingClientRect()
                              const duration = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()
                              dragRef.current = {
                                booking,
                                duration,
                                offsetY: e.clientY - rect.top,
                              }
                              setDraggingId(booking.id)
                              suppressClickRef.current = true
                              e.dataTransfer.setData('text/plain', booking.id)
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
                              setModalBooking(booking)
                            }}
                            className={`absolute left-1 right-1 overflow-hidden rounded-xl border border-white/10 border-l-[3px] px-2 py-1.5 shadow-[0_16px_24px_-18px_rgba(0,0,0,0.9)] transition ${
                              isDragged
                                ? 'opacity-30'
                                : !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)
                                  ? 'cursor-grab hover:-translate-y-0.5 active:cursor-grabbing'
                                  : ''
                            } ${colors}`}
                            style={{ top, height, zIndex: 10 }}
                          >
                            <div className="flex items-center gap-1.5">
                              <p className="flex-1 truncate text-[11px] font-bold leading-tight">{booking.customer.name}</p>
                              {booking.customer.plan ? (
                                <span className="rounded bg-violet-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">P</span>
                              ) : (
                                <span className="rounded bg-zinc-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">A</span>
                              )}
                            </div>
                            {!compact ? (
                              <>
                                <p className="mt-1 truncate text-[10px] opacity-80">
                                  {booking.customer.plan ? booking.customer.plan.name : booking.services.map((service) => service.service.name).join(', ')}
                                </p>
                                <p className="mt-1 text-[10px] opacity-70">
                                  {format(start, 'HH:mm')} - {format(end, 'HH:mm')} · {formatCurrency(booking.totalPrice)}
                                </p>
                              </>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {modalBooking ? (
        <BookingModal
          booking={modalBooking}
          onClose={() => {
            setModalBooking(null)
            setSelectedExtraId('')
            setSelectedProductId('')
            setAddItemsError(null)
          }}
          onStatusChange={(status) => statusMutation.mutate({ id: modalBooking.id, status })}
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
          onAddItems={() =>
            addItemsMutation.mutate({
              id: modalBooking.id,
              ...(selectedExtraId ? { extraId: selectedExtraId } : {}),
              ...(selectedProductId ? { productId: selectedProductId } : {}),
            })
          }
          onRemoveItem={(type, itemId) => removeItemMutation.mutate({ id: modalBooking.id, type, itemId })}
        />
      ) : null}
    </BarberLayout>
  )
}
