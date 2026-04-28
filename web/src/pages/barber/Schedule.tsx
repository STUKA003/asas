import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, startOfDay, isSameDay, isToday } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { barberPortalApi } from '@/lib/api'
import { CalendarView } from '@/components/admin/CalendarView'
import { BarberLayout } from '@/components/layout/BarberLayout'
import { PageHeader } from '@/components/layout/PanelShell'
import { BookingModal } from '@/pages/barber/BookingModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency, getBookingClientName, toWallClockDate } from '@/lib/utils'
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
  PENDING: 'bg-blue-50 border-l-blue-400 text-blue-800',
  CONFIRMED: 'bg-primary-50 border-l-primary-500 text-primary-900',
  COMPLETED: 'bg-emerald-50 border-l-emerald-500 text-emerald-800',
  CANCELLED: 'bg-zinc-100 border-l-zinc-400 text-zinc-400',
  NO_SHOW: 'bg-red-50 border-l-red-400 text-red-700',
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

function getEffectivePortalPlan(barber: ReturnType<typeof useBarberAuthStore.getState>['barber']) {
  if (!barber?.barbershop?.subscriptionPlan) return 'FREE'

  const endsAt = barber.barbershop.subscriptionEndsAt
  if (barber.barbershop.subscriptionPlan !== 'FREE' && endsAt && new Date(endsAt) < new Date()) {
    return 'FREE'
  }

  return barber.barbershop.subscriptionPlan
}

export default function BarberSchedule() {
  const { i18n } = useTranslation()
  const dateFnsLocale = getDateFnsLocale(i18n.language)
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
  const canManageItems = getEffectivePortalPlan(barber) !== 'FREE'

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
      setFeedback({ type: 'success', message: `Agendamento marcado como ${STATUS_LABELS[variables.status as BookingStatus] ?? variables.status.toLowerCase()}.` })
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
        message: `Agendamento movido para ${format(toWallClockDate(variables.startTime), "d MMM 'às' HH:mm", { locale: dateFnsLocale })}.`,
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

  const prev = () => setAnchor((d) => addDays(d, -viewDays))
  const next = () => setAnchor((d) => addDays(d, viewDays))
  const goToday = () => setAnchor(startOfDay(new Date()))
  const changeView = (n: number) => {
    setViewDays(n)
    setAnchor(startOfDay(new Date()))
  }

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)
  const now = new Date()
  const barberCalendarBarbers: Barber[] = barber
    ? [{ id: barber.id, name: barber.name, email: barber.email, avatar: barber.avatar, active: true }]
    : []

  return (
    <BarberLayout>
      <div className="space-y-6">
        <PageHeader
          title="Agenda"
          subtitle="Acompanha horários, remarcações e detalhe dos atendimentos em curso."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={goToday} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-50">
                    Hoje
                  </button>
                  <div className="flex overflow-hidden rounded-lg border border-zinc-200">
                    <button onClick={prev} className="p-1.5 transition-colors hover:bg-zinc-50">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={next} className="border-l border-zinc-200 p-1.5 transition-colors hover:bg-zinc-50">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <span className="hidden text-sm font-semibold sm:block">
                    {viewDays === 1
                      ? format(anchor, "d 'de' MMMM, yyyy", { locale: dateFnsLocale })
                      : `${format(days[0], 'd MMM', { locale: dateFnsLocale })} - ${format(days[days.length - 1], "d MMM yyyy", { locale: dateFnsLocale })}`}
                  </span>
                </div>

                <div className="flex overflow-hidden rounded-lg border border-zinc-200">
                  {VIEW_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => changeView(opt.days)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        viewDays === opt.days ? 'bg-primary-600 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {feedback ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                    feedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {feedback.message}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="eyebrow mb-3">Resumo</p>
              <div className="space-y-3">
                <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-4">
                  <p className="text-[13px] font-medium text-ink">Slot base</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{snapMinutes} min</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-4">
                  <p className="text-[13px] font-medium text-ink">Intervalo ativo</p>
                  <p className="mt-1 text-lg font-semibold text-ink">{viewDays} {viewDays === 1 ? 'dia' : 'dias'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex border-b border-zinc-100 bg-white">
          <div className="w-14 shrink-0" />
          {days.map((d) => {
            const current = isToday(d)
            return (
              <div key={d.toISOString()} className={`flex-1 border-l border-zinc-100 py-2 text-center ${current ? 'bg-primary-50' : ''}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${current ? 'text-primary-600' : 'text-zinc-400'}`}>
                  {format(d, 'EEE', { locale: dateFnsLocale })}
                </p>
                <p className={`text-xl font-bold leading-tight ${current ? 'text-primary-600' : 'text-zinc-800'}`}>
                  {format(d, 'd')}
                </p>
              </div>
            )
          })}
        </div>

        {isLoading ? (
          <div className="flex min-h-[26rem] items-center justify-center rounded-2xl border border-neutral-200/70 bg-white">
            <PageLoader />
          </div>
        ) : viewDays === 1 ? (
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-soft lg:p-6">
            <CalendarView
              date={anchor}
              bookings={bookings.filter((booking) => isSameDay(toWallClockDate(booking.startTime), anchor))}
              barbers={barberCalendarBarbers}
              slotGranularityMinutes={snapMinutes}
              onBookingClick={setModalBooking}
              onReschedule={(bookingId, newStartTime) => {
                rescheduleMutation.mutate({ id: bookingId, startTime: newStartTime })
              }}
            />
          </div>
        ) : (
          <div ref={scrollRef} className="overflow-y-auto overflow-x-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-soft">
            <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              <div className="relative w-14 shrink-0 select-none border-r border-zinc-100 bg-zinc-50/70">
                {hours.map((h) => (
                  <div key={h} className="absolute flex w-full items-start justify-end pr-2 pt-1" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}>
                    <span className="text-[10px] font-medium text-zinc-400">{String(h).padStart(2, '0')}:00</span>
                  </div>
                ))}
              </div>

              {days.map((d, dayIdx) => {
                const dayBookings = bookings.filter((b) => isSameDay(toWallClockDate(b.startTime), d))
                const isCurrentDay = isToday(d)
                const nowMin = minutesFromDayStart(now)

                return (
                  <div
                    key={d.toISOString()}
                    data-day-column
                    className="relative flex-1 border-l border-zinc-100"
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
                    {hours.map((h) => (
                      <div key={h} className="absolute left-0 right-0 border-t border-zinc-100" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }} />
                    ))}
                    {hours.map((h) => (
                      <div key={`${h}-h`} className="absolute left-0 right-0 border-t border-zinc-50" style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                    ))}

                    {isCurrentDay && nowMin >= 0 && nowMin <= TOTAL_HOURS * 60 && (
                      <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: (nowMin / 60) * HOUR_HEIGHT }}>
                        <div className="h-2 w-2 shrink-0 -ml-1 rounded-full bg-red-500" />
                        <div className="h-[1.5px] flex-1 bg-red-500" />
                      </div>
                    )}

                    {dragPreview && dragPreview.dayIdx === dayIdx && dragRef.current && (
                      <div
                        className="pointer-events-none absolute left-1 right-1 z-30 rounded-md border-2 border-dashed border-primary-500 bg-primary-100/50"
                        style={{ top: dragPreview.top, height: Math.max((dragRef.current.duration / 60000 / 60) * HOUR_HEIGHT, 20) }}
                      >
                        <p className="truncate px-2 pt-1 text-[11px] font-bold text-primary-700">{getBookingClientName(dragRef.current.booking)}</p>
                        <p className="px-2 text-[10px] text-primary-600">{dragPreview.label}</p>
                      </div>
                    )}

                    {dayBookings.map((b) => {
                      const start = toWallClockDate(b.startTime)
                      const end = toWallClockDate(b.endTime)
                      const topMin = minutesFromDayStart(start)
                      const durationMin = (end.getTime() - start.getTime()) / 60000
                      const top = (topMin / 60) * HOUR_HEIGHT
                      const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 20)
                      const colors = STATUS_COLORS[b.status] ?? STATUS_COLORS.PENDING
                      const compact = height < 46
                      const isDragged = draggingId === b.id

                      return (
                        <div
                          key={b.id}
                          draggable={!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status)}
                          onDragStart={(e) => {
                            if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status)) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            const duration = new Date(b.endTime).getTime() - new Date(b.startTime).getTime()
                            dragRef.current = { booking: b, duration, offsetY: e.clientY - rect.top }
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
                          className={`absolute left-1 right-1 overflow-hidden rounded-md border-l-[3px] px-2 py-1 transition-opacity ${colors} ${
                            isDragged ? 'opacity-30' : !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(b.status) ? 'cursor-grab hover:opacity-90 active:cursor-grabbing' : ''
                          }`}
                          style={{ top, height, zIndex: 10 }}
                        >
                          <div className="flex items-center gap-1">
                            <p className="flex-1 truncate text-[11px] font-bold leading-tight">{getBookingClientName(b)}</p>
                            {b.customer.plan ? (
                              <span className="shrink-0 rounded bg-violet-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">P</span>
                            ) : (
                              <span className="shrink-0 rounded bg-zinc-400 px-1 py-0.5 text-[9px] font-bold leading-none text-white">A</span>
                            )}
                          </div>
                          {!compact && (
                            <>
                              <p className="mt-0.5 truncate text-[10px] leading-tight opacity-75">
                                {b.customer.plan ? b.customer.plan.name : b.services.map((s) => s.service.name).join(', ')}
                              </p>
                              <p className="mt-0.5 text-[10px] leading-tight opacity-60">
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

      {modalBooking && (
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
      )}
    </BarberLayout>
  )
}
