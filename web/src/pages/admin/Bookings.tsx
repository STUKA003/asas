import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays, subDays, isToday, startOfDay, endOfDay } from 'date-fns'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import { barbersApi, barbershopApi, blockedTimesApi, bookingsApi, extrasApi, productsApi, workingHoursApi } from '@/lib/api'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/Badge'
import { DataTable } from '@/components/admin/DataTable'
import { CalendarView, type EffectiveWorkingHour } from '@/components/admin/CalendarView'
import { NewBookingModal } from '@/components/admin/NewBookingModal'
import { formatCurrency, formatDuration, getBookingClientName, toWallClockDate } from '@/lib/utils'
import { Eye, Trash2, ChevronLeft, ChevronRight, LayoutList, Calendar, Plus, Ban, Search, X } from 'lucide-react'
import type { Barber, BlockedTime, Booking, BookingStatus, Extra, Product } from '@/lib/types'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function toIso(date: Date, time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const next = new Date(date)
  next.setHours(hour, minute, 0, 0)
  return next.toISOString()
}

export default function Bookings() {
  const qc = useQueryClient()
  const { t, i18n } = useTranslation(['admin', 'common'])
  const dateFnsLocale = getDateFnsLocale(i18n.language)
  const [view, setView]               = useState<'list' | 'calendar'>('calendar')
  const [status, setStatus]           = useState('')
  const [date, setDate]               = useState(todayStr)
  const [calDate, setCalDate]         = useState<Date>(new Date())
  const [query, setQuery]             = useState('')
  const [barberId, setBarberId]       = useState('')
  const [detail, setDetail]           = useState<Booking | null>(null)
  const [slotAction, setSlotAction]   = useState<{ barberId: string; time: string } | null>(null)
  const [newBooking, setNewBooking]   = useState<{ barberId?: string; time?: string } | null>(null)
  const [newBlocked, setNewBlocked]   = useState<{ barberId?: string; date: string; startTime: string; endTime: string; reason: string } | null>(null)
  const [selectedExtraId, setSelectedExtraId]     = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addItemsError, setAddItemsError]         = useState<string | null>(null)

  const calDateStr = format(calDate, 'yyyy-MM-dd')

  const { data = [], isLoading } = useQuery({
    queryKey: ['bookings', status, date, query, barberId],
    queryFn: () =>
      bookingsApi.list({
        ...(status && { status }),
        ...(date && { date }),
        ...(query.trim() && { q: query.trim() }),
        ...(barberId && { barberId }),
      }) as Promise<Booking[]>,
    enabled: view === 'list',
  })

  const { data: calBookings = [], isLoading: calLoading } = useQuery({
    queryKey: ['bookings', 'calendar', calDateStr],
    queryFn: () => bookingsApi.list({ date: calDateStr }) as Promise<Booking[]>,
    enabled: view === 'calendar',
  })
  const { data: blockedTimes = [] } = useQuery({
    queryKey: ['blocked-times', calDateStr],
    queryFn: () => blockedTimesApi.list({
      from: startOfDay(calDate).toISOString(),
      to: endOfDay(calDate).toISOString(),
    }) as Promise<BlockedTime[]>,
    enabled: view === 'calendar',
  })
  const { data: allWorkingHours = [] } = useQuery({
    queryKey: ['working-hours'],
    queryFn: () => workingHoursApi.list() as Promise<{ id: string; dayOfWeek: number; startTime: string; endTime: string; barberId: string | null }[]>,
    enabled: view === 'calendar',
  })

  const { data: barbers = [] } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barbersApi.list() as Promise<Barber[]>,
  })

  const effectiveHours = useMemo(() => {
    const dayOfWeek = calDate.getDay()
    const shopWide = allWorkingHours.filter((h) => h.barberId == null && h.dayOfWeek === dayOfWeek)
    const map = new Map<string, EffectiveWorkingHour[]>()
    for (const barber of barbers) {
      const specific = allWorkingHours.filter((h) => h.barberId === barber.id && h.dayOfWeek === dayOfWeek)
      map.set(barber.id, specific.length > 0 ? specific : shopWide)
    }
    return map
  }, [allWorkingHours, barbers, calDate])
  const { data: barbershop } = useQuery({
    queryKey: ['barbershop'],
    queryFn: () => barbershopApi.get(),
  })
  const { data: extras = [] } = useQuery({
    queryKey: ['extras'],
    queryFn: () => extrasApi.list() as Promise<Extra[]>,
    enabled: !!detail,
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list() as Promise<Product[]>,
    enabled: !!detail,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => bookingsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      setDetail(null)
    },
  })
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime, barberId }: { id: string; startTime: string; barberId?: string }) =>
      bookingsApi.reschedule(id, { startTime, ...(barberId ? { barberId } : {}) }) as Promise<Booking>,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['bookings'] })
      // Only update the open modal if it's the same booking
      if (detail?.id === updated.id) setDetail(updated)
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response!.data!.error!
          : err instanceof Error ? err.message : t('bookings.errors.move')
      setRescheduleError(msg)
    },
  })
  const addItems = useMutation({
    mutationFn: ({ id, extraId, productId }: { id: string; extraId?: string; productId?: string }) =>
      bookingsApi.addItems(id, {
        ...(extraId ? { extraIds: [extraId] } : {}),
        ...(productId ? { productIds: [productId] } : {}),
      }) as Promise<Booking>,
    onSuccess: (updated) => {
      setAddItemsError(null)
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setDetail(updated)
      setSelectedExtraId('')
      setSelectedProductId('')
    },
    onError: (err: unknown) => {
      const message =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response!.data!.error!
          : err instanceof Error ? err.message : t('bookings.errors.addItem')
      setAddItemsError(message)
    },
  })
  const removeItem = useMutation({
    mutationFn: ({ id, type, itemId }: { id: string; type: 'extra' | 'product'; itemId: string }) =>
      bookingsApi.removeItem(id, { type, itemId }) as Promise<Booking>,
    onSuccess: (updated) => {
      setAddItemsError(null)
      qc.invalidateQueries({ queryKey: ['bookings'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setDetail(updated)
    },
    onError: (err: unknown) => {
      const message =
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response?: { data?: { error?: string } } }).response!.data!.error!
          : err instanceof Error ? err.message : t('bookings.errors.removeItem')
      setAddItemsError(message)
    },
  })
  const createBlockedTime = useMutation({
    mutationFn: (data: { startTime: string; endTime: string; reason?: string; barberId?: string }) =>
      blockedTimesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-times'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      setNewBlocked(null)
    },
  })
  const removeBlockedTime = useMutation({
    mutationFn: (id: string) => blockedTimesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked-times'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  const extraOptions = [
    { value: '', label: t('bookings.detail.selectExtra') },
    ...extras.map((e) => ({ value: e.id, label: `${e.name} • ${formatCurrency(e.price)}` })),
  ]
  const productOptions = [
    { value: '', label: t('bookings.detail.selectProduct') },
    ...products.filter((p) => p.stock > 0)
      .map((p) => ({ value: p.id, label: `${p.name} • ${formatCurrency(p.price)} • ${t('bookings.detail.stock', { count: p.stock })}` })),
  ]
  const barberOptions = [
    { value: '', label: t('bookings.allBarbers') },
    ...barbers.map((b) => ({ value: b.id, label: b.name })),
  ]
  const blockedBarberOptions = [
    { value: '', label: t('bookings.allBarbers') },
    ...barbers.map((b) => ({ value: b.id, label: b.name })),
  ]

  function closeDetail() {
    setDetail(null)
    setSelectedExtraId('')
    setSelectedProductId('')
    setAddItemsError(null)
  }

  function openBlockedModal(initial?: { barberId?: string; time?: string }) {
    setNewBlocked({
      barberId: initial?.barberId,
      date: calDateStr,
      startTime: initial?.time ?? '12:00',
      endTime: initial?.time ?? '13:00',
      reason: '',
    })
  }

  const statusOptions = [
    { value: '', label: t('bookings.status.all') },
    { value: 'PENDING', label: t('bookings.status.pending') },
    { value: 'CONFIRMED', label: t('bookings.status.confirmed') },
    { value: 'COMPLETED', label: t('bookings.status.completed') },
    { value: 'CANCELLED', label: t('bookings.status.cancelled') },
    { value: 'NO_SHOW', label: t('bookings.status.noShow') },
  ]

  const legendItems = [
    { label: t('bookings.legend.pending'), color: 'bg-amber-400' },
    { label: t('bookings.legend.confirmed'), color: 'bg-blue-500' },
    { label: t('bookings.legend.completed'), color: 'bg-green-500' },
    { label: t('bookings.legend.cancelled'), color: 'bg-zinc-400' },
    { label: t('bookings.legend.noShow'), color: 'bg-red-400' },
  ]

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('bookings.title')}</h1>
            <p className="text-zinc-500 text-sm mt-0.5 capitalize">
              {view === 'list'
                ? t('bookings.results', { count: data.length })
                : format(calDate, 'PPPP', { locale: dateFnsLocale })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => setNewBooking({})} className="gap-1.5 flex-1 sm:flex-none justify-center">
              <Plus size={15} /> <span>{t('bookings.newButton')}</span>
            </Button>
            <Button variant="outline" onClick={() => openBlockedModal()} className="gap-1.5 flex-1 sm:flex-none justify-center">
              <Ban size={15} /> <span>{t('bookings.blockButton')}</span>
            </Button>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === 'calendar'
                    ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Calendar size={14} /> <span className="hidden sm:inline">{t('bookings.viewCalendar')}</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === 'list'
                    ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <LayoutList size={14} /> <span className="hidden sm:inline">{t('bookings.viewList')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── AGENDA VIEW ── */}
        {view === 'calendar' && (
          <>
            {/* Day navigation */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <button
                onClick={() => setCalDate((d) => subDays(d, 1))}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="text-center">
                <p className="font-semibold capitalize">
                  {format(calDate, 'PPPP', { locale: dateFnsLocale })}
                </p>
                <p className="text-xs text-zinc-400">{format(calDate, 'yyyy')}</p>
              </div>

              <div className="flex items-center gap-2">
                {!isToday(calDate) && (
                  <Button size="sm" variant="outline" onClick={() => setCalDate(new Date())}>
                    {t('bookings.today')}
                  </Button>
                )}
                <button
                  onClick={() => setCalDate((d) => addDays(d, 1))}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {legendItems.map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5 text-zinc-500">
                  <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>

            {rescheduleError && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                <span>{rescheduleError}</span>
                <button onClick={() => setRescheduleError(null)} className="shrink-0 text-red-400 hover:text-red-600 font-bold text-lg leading-none">×</button>
              </div>
            )}

            {calLoading ? (
              <div className="flex items-center justify-center h-48 text-zinc-400 text-sm">{t('bookings.loading')}</div>
            ) : (
              <CalendarView
                date={calDate}
                bookings={calBookings}
                barbers={barbers}
                blockedTimes={blockedTimes}
                effectiveHours={effectiveHours}
                slotGranularityMinutes={barbershop?.slotGranularityMinutes ?? 15}
                onBookingClick={setDetail}
                onSlotClick={(barberId, time) => setSlotAction({ barberId, time })}
                onReschedule={(bookingId, newStartTime, newBarberId) =>
                  rescheduleMutation.mutate({ id: bookingId, startTime: newStartTime, barberId: newBarberId })
                }
              />
            )}

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold">{t('bookings.blockedTimes.title')}</p>
                  <p className="text-xs text-zinc-400">{t('bookings.blockedTimes.subtitle')}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => openBlockedModal()}>
                  <Ban size={13} />
                  {t('bookings.blockedTimes.blockButton')}
                </Button>
              </div>

              {blockedTimes.length === 0 ? (
                <p className="py-3 text-xs text-zinc-400 text-center">{t('bookings.blockedTimes.noBlocks')}</p>
              ) : (
                <div className="space-y-2">
                  {blockedTimes.map((block) => (
                    <div key={block.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 px-3 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 h-2 w-2 rounded-full bg-red-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {format(toWallClockDate(block.startTime), 'HH:mm')}–{format(toWallClockDate(block.endTime), 'HH:mm')}
                            <span className="ml-2 text-xs font-normal text-zinc-400">{block.barber?.name ?? t('bookings.blockedTimes.everyone')}</span>
                          </p>
                          {block.reason && <p className="text-xs text-zinc-400 truncate">{block.reason}</p>}
                        </div>
                      </div>
                      <button
                        className="shrink-0 text-zinc-400 hover:text-red-500 transition-colors"
                        disabled={removeBlockedTime.isPending}
                        onClick={() => removeBlockedTime.mutate(block.id)}
                        aria-label={t('bookings.blockedTimes.removeBlock')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            <div className="flex flex-col gap-2 xl:flex-row">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('bookings.searchPlaceholder')}
                  className="h-10 w-full pl-9 pr-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder-zinc-400"
                />
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900 xl:shrink-0"
              />
              <Select className="w-full xl:w-52" options={barberOptions} value={barberId} onChange={(e) => setBarberId(e.target.value)} />
              <Select className="w-full xl:w-52" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
              {(query || date || barberId || status) && (
                <Button
                  type="button" variant="outline"
                  className="gap-1.5 xl:shrink-0"
                  onClick={() => { setQuery(''); setDate(''); setBarberId(''); setStatus('') }}
                >
                  <X size={13} /> {t('common:btn.clear')}
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="pt-0 px-0 pb-0">
                <DataTable<Booking>
                  loading={isLoading}
                  data={data}
                  keyExtractor={(b) => b.id}
                  onRowClick={setDetail}
                  columns={[
                    {
                      key: 'startTime', label: t('bookings.columns.dateTime'),
                      render: (b) => (
                        <div>
                          <p className="font-medium">{format(toWallClockDate(b.startTime), 'dd/MM/yyyy')}</p>
                          <p className="text-xs text-zinc-400">{format(toWallClockDate(b.startTime), 'HH:mm')} — {formatDuration(b.totalDuration)}</p>
                        </div>
                      ),
                    },
                    { key: 'customer', label: t('bookings.columns.customer'), render: (b) => <span className="font-medium">{getBookingClientName(b)}</span> },
                    { key: 'barber', label: t('bookings.columns.barber'), render: (b) => b.barber.name },
                    { key: 'service', label: t('bookings.columns.service'), render: (b) => b.services[0]?.service.name ?? '—' },
                    { key: 'status', label: t('bookings.columns.status'), render: (b) => <StatusBadge status={b.status} /> },
                    { key: 'total', label: t('bookings.columns.total'), render: (b) => formatCurrency(b.totalPrice) },
                  ]}
                  actions={(b) => (
                    <Button size="sm" variant="ghost" onClick={() => setDetail(b)}><Eye size={14} /></Button>
                  )}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Detail modal (shared between views) ── */}
      <Modal open={!!detail} onClose={closeDetail} title={t('bookings.detail.title')}>
        {detail && (() => {
          const bookingServices = detail.services ?? []
          const bookingExtras   = detail.extras   ?? []
          const bookingProducts = detail.products ?? []
          const hasPlan         = !!detail.customer.plan

          return (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-400 text-xs mb-1">{t('bookings.detail.customerLabel')}</p>
                  <p className="font-medium">{getBookingClientName(detail)}</p>
                  {detail.attendeeName && detail.attendeeName !== detail.customer.name ? (
                    <p className="text-zinc-400 text-xs">{t('bookings.detail.responsible', { name: detail.customer.name })}</p>
                  ) : null}
                  {hasPlan ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 mt-0.5">
                      {t('bookings.detail.planBadge')}: {detail.customer.plan!.name}
                    </span>
                  ) : (
                    <p className="text-zinc-400 text-xs">{detail.customer.phone}</p>
                  )}
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-400 text-xs mb-1">{t('bookings.detail.barberLabel')}</p>
                  <p className="font-medium">{detail.barber.name}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-400 text-xs mb-1">{t('bookings.detail.dateTimeLabel')}</p>
                  <p className="font-medium">{format(toWallClockDate(detail.startTime), 'PPp', { locale: dateFnsLocale })}</p>
                  <p className="text-zinc-400 text-xs">{formatDuration(detail.totalDuration)}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-zinc-400 text-xs mb-1">
                    {hasPlan ? t('bookings.detail.toPay') : t('bookings.detail.totalLabel')}
                  </p>
                  <p className="font-bold text-accent-600">{formatCurrency(detail.totalPrice)}</p>
                  {hasPlan && detail.totalPrice === 0 && (
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{t('bookings.detail.coveredByPlan')}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {bookingServices.map((s) => (
                  <div key={s.serviceId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{s.service.name}</span>
                      {hasPlan && s.price === 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">{t('bookings.detail.planBadge')}</span>
                      )}
                    </div>
                    <span className={hasPlan && s.price === 0 ? 'text-zinc-400 line-through' : ''}>
                      {formatCurrency(s.price)}
                    </span>
                  </div>
                ))}
                {bookingExtras.map((e) => (
                  <div key={e.id} className="flex flex-col gap-2 text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>+ {e.extra.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(e.price)}</span>
                      <Button
                        type="button" size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        disabled={removeItem.isPending}
                        onClick={() => removeItem.mutate({ id: detail.id, type: 'extra', itemId: e.id })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
                {bookingProducts.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>{p.product.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(p.price)}</span>
                      <Button
                        type="button" size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        disabled={removeItem.isPending}
                        onClick={() => removeItem.mutate({ id: detail.id, type: 'product', itemId: p.id })}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <p className="text-xs text-zinc-500">{t('bookings.detail.addToBooking')}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select options={extraOptions} value={selectedExtraId} onChange={(e) => setSelectedExtraId(e.target.value)} />
                  <Select options={productOptions} value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} />
                </div>
                {addItemsError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {addItemsError}
                  </div>
                )}
                <div className="flex justify-stretch sm:justify-end">
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    loading={addItems.isPending}
                    disabled={!selectedExtraId && !selectedProductId}
                    onClick={() => addItems.mutate({
                      id: detail.id,
                      ...(selectedExtraId ? { extraId: selectedExtraId } : {}),
                      ...(selectedProductId ? { productId: selectedProductId } : {}),
                    })}
                  >
                    {t('bookings.detail.addButton')}
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-2">{t('bookings.detail.changeStatus')}</p>
                <div className="flex flex-wrap gap-2">
                  {(['PENDING','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'] as BookingStatus[]).map((s) => (
                    <button
                      key={s}
                      disabled={detail.status === s || updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: detail.id, status: s })}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed"
                    >
                      <StatusBadge status={s} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      <Modal open={!!slotAction} onClose={() => setSlotAction(null)} title={t('bookings.slotModal.title')} size="sm">
        {slotAction ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50">
              <p className="font-medium">{format(calDate, 'PP', { locale: dateFnsLocale })}</p>
              <p className="text-zinc-500 mt-1">{slotAction.time} · {barbers.find((barber) => barber.id === slotAction.barberId)?.name ?? t('bookings.columns.barber')}</p>
            </div>
            <div className="grid gap-3">
              <Button
                onClick={() => {
                  setNewBooking({ barberId: slotAction.barberId, time: slotAction.time })
                  setSlotAction(null)
                }}
                className="gap-2"
              >
                <Plus size={14} />
                {t('bookings.slotModal.createBooking')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  openBlockedModal({ barberId: slotAction.barberId, time: slotAction.time })
                  setSlotAction(null)
                }}
                className="gap-2"
              >
                <Ban size={14} />
                {t('bookings.slotModal.blockSlot')}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!newBlocked} onClose={() => setNewBlocked(null)} title={t('bookings.newBlockedModal.title')}>
        {newBlocked ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('bookings.newBlockedModal.dateLabel')}
                type="date"
                value={newBlocked.date}
                onChange={(e) => setNewBlocked((current) => current ? { ...current, date: e.target.value } : current)}
              />
              <Select
                label={t('bookings.newBlockedModal.barberLabel')}
                options={blockedBarberOptions}
                value={newBlocked.barberId ?? ''}
                onChange={(e) => setNewBlocked((current) => current ? { ...current, barberId: e.target.value || undefined } : current)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t('bookings.newBlockedModal.startLabel')}
                type="time"
                value={newBlocked.startTime}
                onChange={(e) => setNewBlocked((current) => current ? { ...current, startTime: e.target.value } : current)}
              />
              <Input
                label={t('bookings.newBlockedModal.endLabel')}
                type="time"
                value={newBlocked.endTime}
                onChange={(e) => setNewBlocked((current) => current ? { ...current, endTime: e.target.value } : current)}
              />
            </div>

            <Input
              label={t('bookings.newBlockedModal.reasonLabel')}
              placeholder={t('bookings.newBlockedModal.reasonPlaceholder')}
              value={newBlocked.reason}
              onChange={(e) => setNewBlocked((current) => current ? { ...current, reason: e.target.value } : current)}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewBlocked(null)}>{t('common:btn.cancel')}</Button>
              <Button
                loading={createBlockedTime.isPending}
                onClick={() => createBlockedTime.mutate({
                  ...(newBlocked.barberId ? { barberId: newBlocked.barberId } : {}),
                  reason: newBlocked.reason || undefined,
                  startTime: toIso(new Date(newBlocked.date), newBlocked.startTime),
                  endTime: toIso(new Date(newBlocked.date), newBlocked.endTime),
                })}
              >
                {t('bookings.newBlockedModal.saveButton')}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <NewBookingModal
        open={!!newBooking}
        onClose={() => setNewBooking(null)}
        initialDate={calDate}
        initialBarberId={newBooking?.barberId}
        initialTime={newBooking?.time}
      />
    </AdminLayout>
  )
}
