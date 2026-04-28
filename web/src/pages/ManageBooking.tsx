import { useMemo, useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Calendar, CheckCircle2, Clock3, Copy, Download, Plus, RefreshCw, Scissors, Shield, ShieldAlert, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/Spinner'
import { publicApi } from '@/lib/publicApi'
import { formatDuration, getBookingClientName, toWallClockDate } from '@/lib/utils'
import { useTenant } from '@/providers/TenantProvider'

function getApiErrorMessage(error: unknown) {
  const apiMessage =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
      ? (error as { response?: { data?: { error?: string } } }).response!.data!.error!
      : null

  return apiMessage ?? (error instanceof Error ? error.message : 'Ocorreu um erro inesperado.')
}

export default function ManageBooking() {
  const { slug, barbershop, loading } = useTenant()
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation('public')
  const token = params.get('token') ?? ''
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showEraseConfirm, setShowEraseConfirm] = useState(false)
  const eraseConfirmRef = useRef<HTMLDivElement>(null)

  const dateFnsLocale = (() => {
    try { return require(`date-fns/locale/${i18n.language}`).default ?? require('date-fns/locale/pt').default }
    catch { try { return require(`date-fns/locale/${i18n.language.split('-')[0]}`).default } catch { return require('date-fns/locale/pt').default } }
  })()

  const bookingQuery = useQuery({
    queryKey: ['public-booking-manage', slug, token],
    queryFn: () => publicApi(slug).managedBooking({ token }),
    enabled: !!slug && !!token,
  })

  const booking = bookingQuery.data?.booking

  const effectiveDate = selectedDate || (booking ? format(toWallClockDate(booking.startTime), 'yyyy-MM-dd') : '')

  const availabilityQuery = useQuery({
    queryKey: ['public-booking-manage', 'availability', slug, token, effectiveDate],
    queryFn: () => publicApi(slug).managedBookingAvailability({ token, date: effectiveDate }),
    enabled: !!slug && !!token && !!effectiveDate && !!booking?.canReschedule,
  })

  const baseMutationOptions = {
    onSuccess: async () => {
      setErrorMessage(null)
      await queryClient.invalidateQueries({ queryKey: ['public-booking-manage', slug, token] })
      await queryClient.invalidateQueries({ queryKey: ['public-booking-manage', 'availability', slug, token] })
    },
    onError: (error: unknown) => {
      setFeedback(null)
      setErrorMessage(getApiErrorMessage(error))
    },
  }

  const confirmMutation = useMutation({
    mutationFn: () => publicApi(slug).confirmManagedBooking({ token }),
    ...baseMutationOptions,
    onSuccess: async () => {
      setFeedback(t('manageBooking.actions.presenceConfirmed'))
      await baseMutationOptions.onSuccess()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => publicApi(slug).cancelManagedBooking({ token }),
    ...baseMutationOptions,
    onSuccess: async () => {
      setFeedback(t('manageBooking.actions.bookingCancelled'))
      await baseMutationOptions.onSuccess()
    },
  })

  const rescheduleMutation = useMutation({
    mutationFn: (startTime: string) => publicApi(slug).rescheduleManagedBooking({ token, startTime }),
    ...baseMutationOptions,
    onSuccess: async () => {
      setFeedback('Marcação remarcada com sucesso.')
      setSelectedSlot(null)
      await baseMutationOptions.onSuccess()
    },
  })

  const exportDataMutation = useMutation({
    mutationFn: () => publicApi(slug).exportManagedBookingData({ token }),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dados-reserva-${booking?.id ?? 'trimio'}.json`
      anchor.click()
      window.URL.revokeObjectURL(url)
      setFeedback(t('manageBooking.privacy.exportDone'))
      setErrorMessage(null)
    },
    onError: (error: unknown) => {
      setFeedback(null)
      setErrorMessage(getApiErrorMessage(error))
    },
  })

  const eraseDataMutation = useMutation({
    mutationFn: () => publicApi(slug).eraseManagedBookingData({ token }),
    onSuccess: (data) => {
      setFeedback(data.message)
      setErrorMessage(null)
      void queryClient.invalidateQueries({ queryKey: ['public-booking-manage', slug, token] })
    },
    onError: (error: unknown) => {
      setFeedback(null)
      setErrorMessage(getApiErrorMessage(error))
    },
  })

  const canSubmitReschedule = !!selectedSlot && !rescheduleMutation.isPending

  const serviceNames = useMemo(
    () => booking?.services.map((item) => item.service.name).join(', ') ?? '',
    [booking]
  )

  async function copyManageLink() {
    if (!booking?.management.managementUrl) return
    await navigator.clipboard.writeText(booking.management.managementUrl)
    setFeedback(t('manageBooking.actions.linkCopied'))
    setErrorMessage(null)
  }

  if (loading || bookingQuery.isLoading) {
    return <PageLoader />
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{t('manageBooking.eyebrow')}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">
                  {t('manageBooking.title')}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                  {t('manageBooking.subtitle', { shopName: barbershop?.name ?? 'barbearia' })}
                </p>
              </div>
              {booking ? <StatusBadge status={booking.status} /> : null}
            </div>

            {!token ? (
              <div className="mt-8 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                {t('manageBooking.missingToken')}
              </div>
            ) : bookingQuery.isError ? (
              <div className="mt-8 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                {getApiErrorMessage(bookingQuery.error)}
              </div>
            ) : booking ? (
              <div className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{t('manageBooking.details.label')}</p>
                    <div className="mt-4 space-y-3 text-sm text-ink">
                      <p className="flex items-center gap-2"><Scissors size={15} className="text-primary-600" /> {serviceNames}</p>
                      <p className="flex items-center gap-2"><Calendar size={15} className="text-primary-600" /> {format(toWallClockDate(booking.startTime), "EEEE, d 'de' MMMM", { locale: dateFnsLocale })}</p>
                      <p className="flex items-center gap-2"><Clock3 size={15} className="text-primary-600" /> {format(toWallClockDate(booking.startTime), 'HH:mm')} · {formatDuration(booking.totalDuration)}</p>
                      <p><span className="text-ink-muted">{t('manageBooking.details.barber')}</span> {booking.barber.name}</p>
                      <p><span className="text-ink-muted">{t('manageBooking.details.customer')}</span> {getBookingClientName(booking)}</p>
                      {booking.attendeeName && booking.attendeeName !== booking.customer.name ? (
                        <p><span className="text-ink-muted">{t('manageBooking.details.responsible')}</span> {booking.customer.name}</p>
                      ) : null}
                      {booking.customer.phone ? <p><span className="text-ink-muted">{t('manageBooking.details.contact')}</span> {booking.customer.phone}</p> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{t('manageBooking.actions.label')}</p>
                    <div className="mt-4 grid gap-3">
                      <Button
                        variant="secondary"
                        onClick={copyManageLink}
                        className="w-full"
                      >
                        <Copy size={16} />
                        {t('manageBooking.actions.copyLink')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { window.location.href = `/${slug}/booking?responsibleToken=${token}` }}
                        className="w-full"
                      >
                        <Plus size={16} />
                        {t('manageBooking.actions.addPerson')}
                      </Button>
                      <Button
                        onClick={() => confirmMutation.mutate()}
                        className="w-full"
                        disabled={!booking.canConfirm || cancelMutation.isPending || rescheduleMutation.isPending}
                        loading={confirmMutation.isPending}
                      >
                        <CheckCircle2 size={16} />
                        {t('manageBooking.actions.confirmPresence')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => cancelMutation.mutate()}
                        className="w-full"
                        disabled={!booking.canCancel || confirmMutation.isPending || rescheduleMutation.isPending}
                        loading={cancelMutation.isPending}
                      >
                        <XCircle size={16} />
                        {t('manageBooking.actions.cancelBooking')}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                        <Shield size={16} className="text-primary-700" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-ink">{t('manageBooking.privacy.title')}</p>
                        <p className="text-xs text-ink-muted">{t('manageBooking.privacy.subtitle')}</p>
                      </div>
                    </div>
                    <Link to={`/${slug}/privacy`} target="_blank" className="text-xs font-medium text-primary-700 underline underline-offset-4">
                      {t('manageBooking.privacy.privacyPolicy')}
                    </Link>
                  </div>

                  {booking.privacyConsentAt ? (
                    <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-xs text-ink-muted">
                      <p>
                        <span className="font-medium text-ink">Consentimento dado</span> em{' '}
                        {format(new Date(booking.privacyConsentAt), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: dateFnsLocale })}
                        {booking.privacyConsentVersion ? ` · versão ${booking.privacyConsentVersion}` : null}
                      </p>
                      <p className="mt-0.5">
                        Os dados identificativos são conservados por 3 anos a partir da última reserva.
                        Podes pedir a anonimização a qualquer momento.
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Button
                      variant="secondary"
                      onClick={() => exportDataMutation.mutate()}
                      className="w-full"
                      loading={exportDataMutation.isPending}
                    >
                      <Download size={16} />
                      {t('manageBooking.privacy.exportData')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEraseConfirm(true)
                        setTimeout(() => eraseConfirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
                      }}
                      className="w-full"
                      disabled={eraseDataMutation.isSuccess}
                    >
                      <ShieldAlert size={16} />
                      {t('manageBooking.privacy.anonymizeData')}
                    </Button>
                  </div>

                  {showEraseConfirm && !eraseDataMutation.isSuccess ? (
                    <div ref={eraseConfirmRef} className="mt-4 rounded-xl border border-danger-200 bg-danger-50 p-4">
                      <p className="text-sm font-semibold text-danger-800">{t('manageBooking.privacy.confirmAnonymize.title')}</p>
                      <p className="mt-1.5 text-xs leading-5 text-danger-700">
                        Esta acção irá <strong>substituir os teus dados pessoais identificativos</strong> (nome, telefone, email, observações) por um identificador anónimo em toda a barbearia <strong>{barbershop?.name}</strong>.
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-danger-700">
                        <li>· O histórico operacional das reservas (datas, serviços, duração) é mantido de forma anónima.</li>
                        <li>· Esta acção não pode ser revertida.</li>
                        <li>· O link desta reserva deixará de funcionar após a anonimização.</li>
                      </ul>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowEraseConfirm(false)}
                          className="flex-1"
                          disabled={eraseDataMutation.isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => eraseDataMutation.mutate()}
                          loading={eraseDataMutation.isPending}
                          className="flex-1 bg-danger-600 hover:bg-danger-700 focus:ring-danger-200"
                        >
                          <ShieldAlert size={15} />
                          {t('manageBooking.privacy.confirmAnonymize.confirmButton')}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <p className="mt-3 text-[11px] text-ink-muted">
                    Para exportar ou anonimizar dados noutras barbearias onde tenhas reservas, acede ao link de gestão dessas reservas.
                    Para outros pedidos RGPD, contacta <a href="mailto:privacidade@trimio.pt" className="underline underline-offset-2">privacidade@trimio.pt</a>.
                  </p>
                </div>

                {feedback ? (
                  <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
                    {feedback}
                  </div>
                ) : null}
                {errorMessage ? (
                  <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                    {errorMessage}
                  </div>
                ) : null}

                {booking.canReschedule ? (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-ink">Remarcar</p>
                        <p className="mt-1 text-sm text-ink-muted">
                          Escolhe outro dia e um horário livre para o mesmo serviço.
                        </p>
                      </div>
                      <div className="min-w-[14rem]">
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(event) => {
                            setSelectedDate(event.target.value)
                            setSelectedSlot(null)
                            setFeedback(null)
                            setErrorMessage(null)
                          }}
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      {availabilityQuery.isLoading ? (
                        <PageLoader />
                      ) : availabilityQuery.isError ? (
                        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                          {getApiErrorMessage(availabilityQuery.error)}
                        </div>
                      ) : availabilityQuery.data?.slots.length ? (
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {availabilityQuery.data.slots.map((slot) => {
                            const isSelected = selectedSlot === slot.startTime
                            return (
                              <button
                                key={slot.startTime}
                                type="button"
                                onClick={() => setSelectedSlot(slot.startTime)}
                                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                                  isSelected
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-neutral-200 bg-white text-ink hover:border-primary-300 hover:bg-primary-50/50'
                                }`}
                              >
                                {format(toWallClockDate(slot.startTime), 'HH:mm')}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-ink-muted">
                          Sem horários disponíveis para esse dia.
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        onClick={() => selectedSlot && rescheduleMutation.mutate(selectedSlot)}
                        disabled={!canSubmitReschedule || !booking.canReschedule || availabilityQuery.isLoading}
                        loading={rescheduleMutation.isPending}
                      >
                        <RefreshCw size={16} />
                        Confirmar nova hora
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
