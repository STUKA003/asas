import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import { publicApi } from '@/lib/publicApi'
import { useTenant } from '@/providers/TenantProvider'
import { type BookingDraft, useBookingStore } from '@/store/booking'
import { formatCurrency, formatDuration, toWallClockDate } from '@/lib/utils'
import { buildGoogleCalendarUrl, detectCalendarPlatform, downloadIcsFile } from '@/lib/calendar'
import { Button } from '@/components/ui/Button'
import { Calendar, CheckCircle2, Clock, Download, ExternalLink, Scissors, User } from 'lucide-react'

function getBookingErrorMessage(err: unknown) {
  const apiMessage =
    typeof err === 'object' && err !== null && 'response' in err &&
    typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ? (err as { response?: { data?: { error?: string } } }).response!.data!.error!
      : null
  if (!apiMessage) return err instanceof Error ? err.message : 'Booking error'
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
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const { t, i18n } = useTranslation(['public', 'common'])

  const dateFnsLocale = getDateFnsLocale(i18n.language)

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
      barber, date, extras,
      planDiscount: customerPlan ? discount : 0,
      products, service,
      serviceCoveredByPlan: planServiceIds.has(service.id),
      servicePrice, slot, totalDuration, totalPrice,
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
      downloadIcsFile(event, `booking-${draft.attendeeName.toLowerCase().replace(/\s+/g, '-')}.ics`)
      return
    }
    window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer')
  }

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!customer || !draft) throw new Error(t('booking.steps.confirmation.incomplete'))
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
        privacyConsentAccepted: true,
        privacyConsentVersion: '2026-04',
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
          <h2 className="mt-4 text-2xl font-bold">{t('booking.steps.confirmation.success.title')}</h2>
          <p className="mt-2 text-sm text-ink-muted">
            {createdBooking.attendeeName !== customer?.name
              ? t('booking.steps.confirmation.success.message', { name: createdBooking.attendeeName })
              : t('booking.steps.confirmation.success.message', { name: customer?.name })}
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-soft">
          <div className="space-y-3 text-sm text-ink">
            <p className="flex items-center gap-2"><Scissors size={15} className="text-primary-600" />{createdBooking.service.name} · {createdBooking.barber.name}</p>
            <p className="flex items-center gap-2"><Calendar size={15} className="text-primary-600" />{format(new Date(createdBooking.date), "EEEE, d 'de' MMMM", { locale: dateFnsLocale })}</p>
            <p className="flex items-center gap-2"><Clock size={15} className="text-primary-600" />{format(toWallClockDate(createdBooking.slot.startTime), 'HH:mm')} · {formatDuration(createdBooking.totalDuration)}</p>
            <p className="flex items-center gap-2"><User size={15} className="text-primary-600" />{createdBooking.attendeeName}</p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={handleCalendarAction} className="w-full">
              {calendarPlatform === 'ios' ? <Download size={16} /> : <Calendar size={16} />}
              {calendarPlatform === 'ios'
                ? t('booking.steps.confirmation.success.addToCalendar')
                : t('booking.steps.confirmation.success.addToGoogleCalendar')}
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
                downloadIcsFile(event, `booking-${draft.attendeeName.toLowerCase().replace(/\s+/g, '-')}.ics`)
              }}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
            >
              <ExternalLink size={14} />
              {t('booking.steps.confirmation.success.downloadIcs')}
            </button>
            {createdBooking.managementUrl ? (
              <Button onClick={() => { window.location.href = createdBooking.managementUrl! }} variant="secondary" className="w-full">
                {t('booking.steps.confirmation.success.manageBooking')}
              </Button>
            ) : null}
          </div>
        </div>

        <Button onClick={() => { store.reset(); window.location.href = `/${slug}` }} className="w-full">
          {t('booking.steps.confirmation.success.backHome')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">{t('booking.steps.confirmation.title')}</h2>
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
              <p className="mt-1 text-xs text-ink-muted">{draft.service.name} · {draft.barber.name}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{t('booking.summary.date')}</p>
              <p className="mt-1 font-medium text-ink">{format(new Date(draft.date), "d 'de' MMMM", { locale: dateFnsLocale })}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{t('booking.summary.time')}</p>
              <p className="mt-1 font-medium text-ink">{format(toWallClockDate(draft.slot.startTime), 'HH:mm')}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Total</p>
              <p className="mt-1 font-medium text-ink">{formatCurrency(draft.totalPrice)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-ink-muted">
          {t('booking.steps.confirmation.incomplete')}
        </div>
      )}

      {bookingError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {bookingError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {t('booking.steps.confirmation.dataTitle')}
        </p>
        <ul className="mt-2 space-y-1 text-ink-muted">
          {customer?.name ? <li>{t('booking.steps.confirmation.dataName', { name: customer.name })}</li> : null}
          {customer?.phone ? <li>{t('booking.steps.confirmation.dataPhone', { phone: customer.phone })}</li> : null}
          {customer?.email ? <li>{t('booking.steps.confirmation.dataEmail', { email: customer.email })}</li> : null}
          {draft?.attendeeName && draft.attendeeName !== customer?.name
            ? <li>{t('booking.steps.confirmation.dataAttendee', { attendee: draft.attendeeName })}</li>
            : null}
          <li>{t('booking.steps.confirmation.dataBookingInfo')}</li>
        </ul>
        <p className="mt-2.5 text-[11px] text-ink-muted">
          {t('booking.steps.confirmation.dataUsage')}{' '}
          <Link to={`/${slug}/privacy`} className="font-medium text-primary-700 underline underline-offset-4" target="_blank">
            {t('booking.steps.confirmation.privacyLink')}
          </Link>
        </p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 border-t border-neutral-200 pt-3">
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(event) => setPrivacyAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="leading-5 text-ink">
            {t('booking.steps.confirmation.consentLabel')}
          </span>
        </label>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => store.setStep(5)}>{t('common:btn.back')}</Button>
        <Button loading={createBookingMutation.isPending} disabled={!draft || !privacyAccepted} onClick={() => createBookingMutation.mutate()}>
          {t('booking.steps.confirmation.submitButton')}
        </Button>
      </div>
    </div>
  )
}
