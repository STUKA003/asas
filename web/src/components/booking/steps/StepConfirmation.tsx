import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { type BookingPartyItem, useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, toWallClockDate } from '@/lib/utils'
import { buildGoogleCalendarUrl, detectCalendarPlatform, downloadIcsFile } from '@/lib/calendar'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Calendar, CheckCircle2, Clock, Download, ExternalLink, Plus, Scissors, Trash2, User } from 'lucide-react'

function getBookingErrorMessage(err: unknown) {
  const apiMessage =
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ? (err as { response?: { data?: { error?: string } } }).response!.data!.error!
      : null

  if (!apiMessage) {
    return err instanceof Error ? err.message : 'Erro ao criar agendamento'
  }

  if (
    apiMessage.includes('plano') ||
    apiMessage.includes('marcacao ativa') ||
    apiMessage.includes('nao permite marcacoes') ||
    apiMessage.includes('nao esta incluido no plano')
  ) {
    return `Este agendamento não pode ser confirmado com o plano atual. ${apiMessage}`
  }

  return apiMessage
}

type CalendarEvent = {
  description: string
  endTime: Date
  location: string
  startTime: Date
  title: string
}

type CreatedBookingSummary = BookingPartyItem & {
  managementUrl: string | null
}

function buildCalendarEvent(item: BookingPartyItem, responsibleName: string, responsiblePhone: string | undefined, barbershopName: string, location: string) {
  return {
    title: `${item.service.name} com ${item.barber.name}`,
    description: [
      `Reserva em ${barbershopName}.`,
      `Cliente: ${item.attendeeName}.`,
      item.attendeeName !== responsibleName ? `Responsável: ${responsibleName}.` : null,
      responsiblePhone ? `Contacto: ${responsiblePhone}.` : null,
    ].filter(Boolean).join(' '),
    location,
    startTime: toWallClockDate(item.slot.startTime),
    endTime: new Date(toWallClockDate(item.slot.startTime).getTime() + item.totalDuration * 60 * 1000),
  }
}

function BookingDraftCard({
  item,
  removable,
  onRemove,
}: {
  item: BookingPartyItem
  removable?: boolean
  onRemove?: () => void
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{item.attendeeName}</p>
          <p className="mt-1 text-xs text-ink-muted">{item.service.name} com {item.barber.name}</p>
        </div>
        {removable && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 text-ink-muted transition hover:border-danger-200 hover:bg-danger-50 hover:text-danger-600"
          >
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Data</p>
          <p className="mt-1 font-medium text-ink">{format(new Date(item.date), "d 'de' MMMM", { locale: pt })}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Hora</p>
          <p className="mt-1 font-medium text-ink">{format(toWallClockDate(item.slot.startTime), 'HH:mm')}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Total</p>
          <p className="mt-1 font-medium text-ink">{formatCurrency(item.totalPrice)}</p>
        </div>
      </div>
      {(item.extras.length > 0 || item.products.length > 0) ? (
        <p className="mt-3 text-xs text-ink-muted">
          {[
            item.extras.length > 0 ? `Extras: ${item.extras.map((extra) => extra.name).join(', ')}` : null,
            item.products.length > 0 ? `Produtos: ${item.products.map((product) => product.name).join(', ')}` : null,
          ].filter(Boolean).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

export function StepConfirmation() {
  const store = useBookingStore()
  const { slug, barbershop } = useTenant()
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [createdBookings, setCreatedBookings] = useState<CreatedBookingSummary[]>([])
  const previousStep = 5

  const {
    addPartyBooking,
    barber,
    customer,
    customerPlan,
    date,
    extras,
    party,
    products,
    removePartyBooking,
    resetCurrentBooking,
    service,
    slot,
  } = store

  const discount = barbershop?.planMemberDiscount ?? 0
  const planServiceIds = new Set(customerPlan?.allowedServices.map((item) => item.id) ?? [])
  const applyDiscount = (price: number) => customerPlan ? price * (1 - discount / 100) : price
  const servicePrice = service ? (planServiceIds.has(service.id) ? 0 : applyDiscount(service.price)) : 0
  const currentTotalPrice =
    servicePrice +
    extras.reduce((sum, extra) => sum + applyDiscount(extra.price), 0) +
    products.reduce((sum, product) => sum + applyDiscount(product.price), 0)
  const currentTotalDuration = (service?.duration ?? 0) + extras.reduce((sum, extra) => sum + extra.duration, 0)

  const currentDraft = useMemo<BookingPartyItem | null>(() => {
    if (!service || !barber || !date || !slot || !customer?.attendeeName) return null

    return {
      attendeeName: customer.attendeeName,
      barber,
      date,
      extras,
      planDiscount: customerPlan ? discount : 0,
      products,
      service,
      serviceCoveredByPlan: planServiceIds.has(service.id),
      servicePrice,
      slot,
      totalDuration: currentTotalDuration,
      totalPrice: currentTotalPrice,
    }
  }, [barber, currentTotalDuration, currentTotalPrice, customer?.attendeeName, customerPlan, date, discount, extras, planServiceIds, products, service, servicePrice, slot])

  const allDrafts = currentDraft ? [...party, currentDraft] : party
  const overallTotal = allDrafts.reduce((sum, item) => sum + item.totalPrice, 0)
  const calendarPlatform = detectCalendarPlatform()

  function handleCalendarAction(item: BookingPartyItem) {
    const event = buildCalendarEvent(
      item,
      customer?.name ?? item.attendeeName,
      customer?.phone,
      barbershop?.name ?? 'Trimio',
      barbershop?.address || barbershop?.name || 'Barbearia'
    )

    if (calendarPlatform === 'ios') {
      downloadIcsFile(event, `reserva-${item.attendeeName.toLowerCase().replace(/\s+/g, '-')}.ics`)
      return
    }

    window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer')
  }

  const createBookingsMutation = useMutation({
    mutationFn: async () => {
      if (!customer || allDrafts.length === 0) {
        throw new Error('Completa pelo menos uma reserva antes de confirmar.')
      }

      const created: CreatedBookingSummary[] = []

      for (const item of allDrafts) {
        const response = await publicApi(slug).createBooking({
          barberId: item.barber.id,
          serviceIds: [item.service.id],
          extraIds: item.extras.map((extra) => extra.id),
          productIds: item.products.map((product) => product.id),
          startTime: item.slot.startTime,
          customer: {
            attendeeName: item.attendeeName,
            email: customer.email,
            name: customer.name,
            notes: customer.notes,
            phone: customer.phone,
          },
        })

        created.push({
          ...item,
          managementUrl: typeof response?.management?.managementUrl === 'string' ? response.management.managementUrl : null,
        })
      }

      return created
    },
    onSuccess: (data) => {
      setBookingError(null)
      setCreatedBookings(data)
    },
    onError: (error: unknown) => {
      setBookingError(getBookingErrorMessage(error))
    },
  })

  function handleAddAnotherPerson() {
    if (!currentDraft) return

    addPartyBooking(currentDraft)
    setBookingError(null)
    resetCurrentBooking({ attendeeName: '' })
    store.setStep(0)
  }

  if (createdBookings.length > 0) {
    return (
      <div className="space-y-5 py-4 animate-slide-up">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-primary-200 bg-primary-50">
            <CheckCircle2 size={40} className="text-primary-700" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Reservas confirmadas</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Criámos {createdBookings.length} reserva{createdBookings.length > 1 ? 's' : ''} para {customer?.name}.
          </p>
        </div>

        <div className="space-y-4">
          {createdBookings.map((item, index) => (
            <div key={`${item.slot.startTime}-${item.attendeeName}-${index}`} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
              <BookingDraftCard item={item} />
              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={() => handleCalendarAction(item)} className="w-full">
                  {calendarPlatform === 'ios' ? <Download size={16} /> : <Calendar size={16} />}
                  {calendarPlatform === 'ios' ? 'Guardar no Calendário' : 'Adicionar ao Google Calendar'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    const event = buildCalendarEvent(
                      item,
                      customer?.name ?? item.attendeeName,
                      customer?.phone,
                      barbershop?.name ?? 'Trimio',
                      barbershop?.address || barbershop?.name || 'Barbearia'
                    )
                    downloadIcsFile(event, `reserva-${item.attendeeName.toLowerCase().replace(/\s+/g, '-')}.ics`)
                  }}
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
                >
                  <ExternalLink size={14} />
                  Descarregar ficheiro .ics
                </button>
                {item.managementUrl ? (
                  <Button onClick={() => { window.location.href = item.managementUrl! }} variant="secondary" className="w-full">
                    Gerir reserva de {item.attendeeName}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={() => { store.reset(); window.location.href = `/${slug}` }} className="w-full">
          Voltar ao início
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Confirmar reservas</h2>
        <p className="mt-1 text-sm text-ink-muted">
          O responsável recebe os emails e cada pessoa fica com a sua reserva separada.
        </p>
      </div>

      {customer ? (
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <User size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">{customer.name}</p>
            <p className="text-xs text-zinc-400">{customer.phone} · {customer.email}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {party.map((item, index) => (
          <BookingDraftCard
            key={`${item.slot.startTime}-${item.attendeeName}-${index}`}
            item={item}
            removable
            onRemove={() => removePartyBooking(index)}
          />
        ))}

        {currentDraft ? (
          <div className="rounded-3xl border border-primary-200 bg-primary-50/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-primary-800">Reserva atual</p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-700">
                pronta a adicionar
              </span>
            </div>
            <BookingDraftCard item={currentDraft} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-ink-muted">
            Falta completar a reserva atual antes de confirmar.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Total do grupo</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatCurrency(overallTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{allDrafts.length} reserva{allDrafts.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-ink-muted">Criadas separadamente no calendário</p>
          </div>
        </div>
      </div>

      {bookingError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {bookingError}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={() => store.setStep(previousStep)}>
          Voltar
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" disabled={!currentDraft} onClick={handleAddAnotherPerson}>
            <Plus size={15} />
            Adicionar outra pessoa
          </Button>
          <Button loading={createBookingsMutation.isPending} disabled={allDrafts.length === 0} onClick={() => createBookingsMutation.mutate()}>
            Confirmar {allDrafts.length > 1 ? 'reservas' : 'reserva'}
          </Button>
        </div>
      </div>
    </div>
  )
}
