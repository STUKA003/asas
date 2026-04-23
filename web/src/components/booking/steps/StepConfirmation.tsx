import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { type BookingDraft, useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, toWallClockDate } from '@/lib/utils'
import { buildGoogleCalendarUrl, detectCalendarPlatform, downloadIcsFile } from '@/lib/calendar'
import { Button } from '@/components/ui/Button'
import { Calendar, CheckCircle2, Clock, Download, ExternalLink, Scissors, User } from 'lucide-react'

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

function buildCalendarEvent(item: BookingDraft, responsibleName: string, responsiblePhone: string | undefined, barbershopName: string, location: string) {
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

export function StepConfirmation() {
  const store = useBookingStore()
  const { slug, barbershop } = useTenant()
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [createdBooking, setCreatedBooking] = useState<(BookingDraft & { managementUrl: string | null }) | null>(null)

  const { barber, customer, customerPlan, date, extras, products, service, slot } = store

  const discount = barbershop?.planMemberDiscount ?? 0
  const planServiceIds = new Set(customerPlan?.allowedServices.map((item) => item.id) ?? [])
  const applyDiscount = (price: number) => customerPlan ? price * (1 - discount / 100) : price
  const servicePrice = service ? (planServiceIds.has(service.id) ? 0 : applyDiscount(service.price)) : 0
  const totalPrice =
    servicePrice +
    extras.reduce((sum, extra) => sum + applyDiscount(extra.price), 0) +
    products.reduce((sum, product) => sum + applyDiscount(product.price), 0)
  const totalDuration = (service?.duration ?? 0) + extras.reduce((sum, extra) => sum + (extra.fitsInService ? 0 : extra.duration), 0)

  const draft = useMemo<BookingDraft | null>(() => {
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
      totalDuration,
      totalPrice,
    }
  }, [barber, customer?.attendeeName, customerPlan, date, discount, extras, planServiceIds, products, service, servicePrice, slot, totalDuration, totalPrice])

  const calendarPlatform = detectCalendarPlatform()

  function handleCalendarAction() {
    if (!draft) return
    const event = buildCalendarEvent(
      draft,
      customer?.name ?? draft.attendeeName,
      customer?.phone,
      barbershop?.name ?? 'Trimio',
      barbershop?.address || barbershop?.name || 'Barbearia'
    )
    if (calendarPlatform === 'ios') {
      downloadIcsFile(event, `reserva-${draft.attendeeName.toLowerCase().replace(/\s+/g, '-')}.ics`)
      return
    }
    window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer')
  }

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!customer || !draft) throw new Error('Completa a reserva antes de confirmar.')
      const response = await publicApi(slug).createBooking({
        barberId: draft.barber.id,
        serviceIds: [draft.service.id],
        extraIds: draft.extras.map((e) => e.id),
        productIds: draft.products.map((p) => p.id),
        startTime: draft.slot.startTime,
        customer: {
          attendeeName: draft.attendeeName !== customer.name ? draft.attendeeName : undefined,
          email: customer.email,
          name: customer.name,
          notes: customer.notes,
          phone: customer.phone,
        },
      })
      return {
        ...draft,
        managementUrl: typeof response?.management?.managementUrl === 'string' ? response.management.managementUrl : null,
      }
    },
    onSuccess: (data) => {
      setBookingError(null)
      setCreatedBooking(data)
    },
    onError: (error: unknown) => {
      setBookingError(getBookingErrorMessage(error))
    },
  })

  if (createdBooking) {
    return (
      <div className="space-y-5 py-4 animate-slide-up">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-primary-200 bg-primary-50">
            <CheckCircle2 size={40} className="text-primary-700" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Reserva confirmada</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {createdBooking.attendeeName !== customer?.name
              ? `Reserva para ${createdBooking.attendeeName} criada com sucesso.`
              : `Reserva criada com sucesso para ${customer?.name}.`}
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
          <div className="space-y-3 text-sm text-ink">
            <p className="flex items-center gap-2"><Scissors size={15} className="text-primary-600" />{createdBooking.service.name} com {createdBooking.barber.name}</p>
            <p className="flex items-center gap-2"><Calendar size={15} className="text-primary-600" />{format(new Date(createdBooking.date), "EEEE, d 'de' MMMM", { locale: pt })}</p>
            <p className="flex items-center gap-2"><Clock size={15} className="text-primary-600" />{format(toWallClockDate(createdBooking.slot.startTime), 'HH:mm')} · {formatDuration(createdBooking.totalDuration)}</p>
            <p className="flex items-center gap-2"><User size={15} className="text-primary-600" />{createdBooking.attendeeName}</p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={handleCalendarAction} className="w-full">
              {calendarPlatform === 'ios' ? <Download size={16} /> : <Calendar size={16} />}
              {calendarPlatform === 'ios' ? 'Guardar no Calendário' : 'Adicionar ao Google Calendar'}
            </Button>
            <button
              type="button"
              onClick={() => {
                if (!draft) return
                const event = buildCalendarEvent(
                  draft,
                  customer?.name ?? draft.attendeeName,
                  customer?.phone,
                  barbershop?.name ?? 'Trimio',
                  barbershop?.address || barbershop?.name || 'Barbearia'
                )
                downloadIcsFile(event, `reserva-${draft.attendeeName.toLowerCase().replace(/\s+/g, '-')}.ics`)
              }}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
            >
              <ExternalLink size={14} />
              Descarregar ficheiro .ics
            </button>
            {createdBooking.managementUrl ? (
              <Button onClick={() => { window.location.href = createdBooking.managementUrl! }} variant="secondary" className="w-full">
                Gerir reserva
              </Button>
            ) : null}
          </div>
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
        <h2 className="text-xl font-bold">Confirmar reserva</h2>
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

      {draft ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft space-y-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{draft.attendeeName}</p>
              <p className="mt-1 text-xs text-ink-muted">{draft.service.name} com {draft.barber.name}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Data</p>
              <p className="mt-1 font-medium text-ink">{format(new Date(draft.date), "d 'de' MMMM", { locale: pt })}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Hora</p>
              <p className="mt-1 font-medium text-ink">{format(toWallClockDate(draft.slot.startTime), 'HH:mm')}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Total</p>
              <p className="mt-1 font-medium text-ink">{formatCurrency(draft.totalPrice)}</p>
            </div>
          </div>
          {(draft.extras.length > 0 || draft.products.length > 0) ? (
            <p className="text-xs text-ink-muted">
              {[
                draft.extras.length > 0 ? `Extras: ${draft.extras.map((e) => e.name).join(', ')}` : null,
                draft.products.length > 0 ? `Produtos: ${draft.products.map((p) => p.name).join(', ')}` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-ink-muted">
          Falta completar a reserva antes de confirmar.
        </div>
      )}

      {bookingError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {bookingError}
        </div>
      ) : null}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => store.setStep(5)}>Voltar</Button>
        <Button loading={createBookingMutation.isPending} disabled={!draft} onClick={() => createBookingMutation.mutate()}>
          Confirmar reserva
        </Button>
      </div>
    </div>
  )
}
