import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Calendar, CheckCircle2, Clock3, Copy, Plus, RefreshCw, Scissors, XCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
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
  const token = params.get('token') ?? ''
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      setFeedback('Presença confirmada com sucesso.')
      await baseMutationOptions.onSuccess()
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => publicApi(slug).cancelManagedBooking({ token }),
    ...baseMutationOptions,
    onSuccess: async () => {
      setFeedback('Marcação cancelada com sucesso.')
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

  const canSubmitReschedule = !!selectedSlot && !rescheduleMutation.isPending

  const serviceNames = useMemo(
    () => booking?.services.map((item) => item.service.name).join(', ') ?? '',
    [booking]
  )

  async function copyManageLink() {
    if (!booking?.management.managementUrl) return
    await navigator.clipboard.writeText(booking.management.managementUrl)
    setFeedback('Link de gestão copiado.')
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
                <p className="eyebrow">Gestão da reserva</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">
                  Confirma, cancela ou remarca sem ligar.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
                  Usa esta página para gerir a tua marcação na {barbershop?.name ?? 'barbearia'}.
                </p>
              </div>
              {booking ? <StatusBadge status={booking.status} /> : null}
            </div>

            {!token ? (
              <div className="mt-8 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                Falta o token da reserva. Abre o link completo de gestão para continuar.
              </div>
            ) : bookingQuery.isError ? (
              <div className="mt-8 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                {getApiErrorMessage(bookingQuery.error)}
              </div>
            ) : booking ? (
              <div className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Detalhes</p>
                    <div className="mt-4 space-y-3 text-sm text-ink">
                      <p className="flex items-center gap-2"><Scissors size={15} className="text-primary-600" /> {serviceNames}</p>
                      <p className="flex items-center gap-2"><Calendar size={15} className="text-primary-600" /> {format(toWallClockDate(booking.startTime), "EEEE, d 'de' MMMM", { locale: pt })}</p>
                      <p className="flex items-center gap-2"><Clock3 size={15} className="text-primary-600" /> {format(toWallClockDate(booking.startTime), 'HH:mm')} · {formatDuration(booking.totalDuration)}</p>
                      <p><span className="text-ink-muted">Barbeiro:</span> {booking.barber.name}</p>
                      <p><span className="text-ink-muted">Cliente:</span> {getBookingClientName(booking)}</p>
                      {booking.attendeeName && booking.attendeeName !== booking.customer.name ? (
                        <p><span className="text-ink-muted">Responsável:</span> {booking.customer.name}</p>
                      ) : null}
                      {booking.customer.phone ? <p><span className="text-ink-muted">Contacto:</span> {booking.customer.phone}</p> : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Ações rápidas</p>
                    <div className="mt-4 grid gap-3">
                      <Button
                        variant="secondary"
                        onClick={copyManageLink}
                        className="w-full"
                      >
                        <Copy size={16} />
                        Copiar link desta reserva
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { window.location.href = `/${slug}/booking?responsibleToken=${token}` }}
                        className="w-full"
                      >
                        <Plus size={16} />
                        Adicionar outra pessoa
                      </Button>
                      <Button
                        onClick={() => confirmMutation.mutate()}
                        className="w-full"
                        disabled={!booking.canConfirm || cancelMutation.isPending || rescheduleMutation.isPending}
                        loading={confirmMutation.isPending}
                      >
                        <CheckCircle2 size={16} />
                        Confirmar presença
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => cancelMutation.mutate()}
                        className="w-full"
                        disabled={!booking.canCancel || confirmMutation.isPending || rescheduleMutation.isPending}
                        loading={cancelMutation.isPending}
                      >
                        <XCircle size={16} />
                        Cancelar marcação
                      </Button>
                    </div>
                  </div>
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
