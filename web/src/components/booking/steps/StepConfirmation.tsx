import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, toWallClockDate } from '@/lib/utils'
import { buildGoogleCalendarUrl, detectCalendarPlatform, downloadIcsFile } from '@/lib/calendar'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { CheckCircle2, Calendar, Clock, Download, ExternalLink, User, Scissors } from 'lucide-react'

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

export function StepConfirmation() {
  const store = useBookingStore()
  const { slug, barbershop } = useTenant()
  const [confirmed, setConfirmed] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [managementUrl, setManagementUrl] = useState<string | null>(null)
  const previousStep = 5

  const { service, barber, slot, extras, products, customer, customerPlan } = store

  const planServiceIds = new Set(customerPlan?.allowedServices.map((s) => s.id) ?? [])
  const discount = barbershop?.planMemberDiscount ?? 0
  const applyDiscount = (price: number) => customerPlan ? price * (1 - discount / 100) : price

  const servicePrice = service ? (planServiceIds.has(service.id) ? 0 : applyDiscount(service.price)) : 0
  const totalPrice =
    servicePrice +
    extras.reduce((s, e) => s + applyDiscount(e.price), 0) +
    products.reduce((s, p) => s + applyDiscount(p.price), 0)

  const totalDuration =
    (service?.duration ?? 0) + extras.reduce((s, e) => s + e.duration, 0)

  const calendarEvent = !slot || !service || !barber
    ? null
    : {
        title: `${service.name} com ${barber.name}`,
        description: [
          `Reserva em ${barbershop?.name ?? 'Trimio'}.`,
          customer?.name ? `Cliente: ${customer.name}.` : null,
          customer?.phone ? `Contacto: ${customer.phone}.` : null,
        ].filter(Boolean).join(' '),
        location: barbershop?.address || barbershop?.name || 'Barbearia',
        startTime: toWallClockDate(slot.startTime),
        endTime: new Date(toWallClockDate(slot.startTime).getTime() + totalDuration * 60 * 1000),
      }

  const calendarPlatform = detectCalendarPlatform()

  function handleCalendarAction() {
    if (!calendarEvent) return

    if (calendarPlatform === 'ios') {
      downloadIcsFile(calendarEvent, 'reserva-trimio.ics')
      return
    }

    window.open(buildGoogleCalendarUrl(calendarEvent), '_blank', 'noopener,noreferrer')
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      publicApi(slug).createBooking({
        barberId:   barber!.id,
        serviceIds: [service!.id],
        extraIds:   extras.map((e) => e.id),
        productIds: products.map((p) => p.id),
        startTime:  slot!.startTime,
        customer: {
          name:   customer!.name,
          phone:  customer!.phone,
          email:  customer?.email || undefined,
          notes:  customer?.notes,
        },
      }),
    onSuccess: (data: { management?: { managementUrl?: string } }) => {
      setBookingError(null)
      setManagementUrl(data.management?.managementUrl ?? null)
      setConfirmed(true)
    },
    onError: (err: unknown) => {
      setBookingError(getBookingErrorMessage(err))
    },
  })

  if (confirmed) {
    return (
      <div className="text-center py-8 space-y-4 animate-slide-up">
        <div className="flex justify-center">
          <div className="tenant-card flex h-20 w-20 items-center justify-center rounded-full">
            <CheckCircle2 size={40} className="tenant-ink" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Agendado!</h2>
          <p className="text-zinc-500 mt-2">Seu horário foi confirmado com sucesso.</p>
        </div>
        <div className="tenant-card rounded-2xl p-4 text-left space-y-2 text-sm">
          <p><span className="text-zinc-400">Serviço:</span> <span className="font-medium">{service?.name}</span></p>
          <p><span className="text-zinc-400">Barbeiro:</span> <span className="font-medium">{barber?.name}</span></p>
          {slot && (
            <p>
              <span className="text-zinc-400">Data:</span>{' '}
              <span className="font-medium">
                {format(toWallClockDate(slot.startTime), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
              </span>
            </p>
          )}
        </div>
        {calendarEvent && (
          <div className="space-y-2">
            <Button onClick={handleCalendarAction} className="w-full">
              {calendarPlatform === 'ios' ? <Download size={16} /> : <Calendar size={16} />}
              {calendarPlatform === 'ios' ? 'Guardar no Calendário' : 'Adicionar ao Google Calendar'}
            </Button>
            {calendarPlatform === 'ios' ? (
              <p className="text-xs text-zinc-500">
                No iPhone ou iPad vais descarregar um ficheiro de calendário para abrir na app Calendário.
              </p>
            ) : (
              <p className="text-xs text-zinc-500">
                No Android abrimos o Google Calendar com a reserva pronta para guardar.
              </p>
            )}
            <button
              type="button"
              onClick={() => calendarEvent && downloadIcsFile(calendarEvent, 'reserva-trimio.ics')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
            >
              <ExternalLink size={14} />
              Descarregar ficheiro .ics
            </button>
          </div>
        )}
        {managementUrl && (
          <Button onClick={() => { window.location.href = managementUrl }} variant="secondary" className="w-full">
            Gerir esta reserva
          </Button>
        )}
        <Button onClick={() => { store.reset(); window.location.href = `/${slug}` }} className="w-full">
          Voltar ao início
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Confirmar agendamento</h2>
      </div>

      <div className="space-y-3">
        {/* Barber + Service */}
        <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
          {barber && <Avatar name={barber.name} />}
          <div>
            <p className="font-semibold text-sm">{barber?.name}</p>
            <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
              <Scissors size={11} /> {service?.name}
            </div>
          </div>
        </div>

        {/* Date/time */}
        {slot && (
          <div className="tenant-card flex items-center gap-3 rounded-2xl p-4">
            <div className="tenant-soft-icon flex h-10 w-10 items-center justify-center rounded-xl">
              <Calendar size={18} />
            </div>
            <div>
              <p className="font-semibold text-sm capitalize">
                {format(toWallClockDate(slot.startTime), "EEEE, d 'de' MMMM", { locale: pt })}
              </p>
              <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5">
                <Clock size={11} /> {format(toWallClockDate(slot.startTime), 'HH:mm')} — {formatDuration(totalDuration)}
              </div>
            </div>
          </div>
        )}

        {/* Customer */}
        {customer && (
          <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <User size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{customer.name}</p>
              <p className="text-xs text-zinc-400">{customer.phone}</p>
            </div>
          </div>
        )}

        {/* Pricing breakdown */}
        <div className="tenant-card rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-zinc-500">
              <span>{service?.name}</span>
              {service && planServiceIds.has(service.id) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">plano</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {service && planServiceIds.has(service.id) && (
                <span className="line-through text-zinc-400 text-xs">{formatCurrency(service.price)}</span>
              )}
              <span>{formatCurrency(servicePrice)}</span>
            </div>
          </div>
          {extras.map((e) => (
            <div key={e.id} className="flex justify-between items-center text-zinc-500">
              <span>+ {e.name}</span>
              <div className="flex items-center gap-1.5">
                {customerPlan && discount > 0 && <span className="line-through text-xs text-zinc-400">{formatCurrency(e.price)}</span>}
                <span>{formatCurrency(applyDiscount(e.price))}</span>
              </div>
            </div>
          ))}
          {products.map((p) => (
            <div key={p.id} className="flex justify-between items-center text-zinc-500">
              <span>{p.name}</span>
              <div className="flex items-center gap-1.5">
                {customerPlan && discount > 0 && <span className="line-through text-xs text-zinc-400">{formatCurrency(p.price)}</span>}
                <span>{formatCurrency(applyDiscount(p.price))}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="tenant-ink">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>

      {bookingError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {bookingError}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => store.setStep(previousStep)}>Voltar</Button>
        <Button loading={isPending} onClick={() => mutate()}>Confirmar agendamento</Button>
      </div>
    </div>
  )
}
