import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format, isFuture, isToday } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Calendar, Clock3, Mail, Scissors, Search, Send, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { PageLoader } from '@/components/ui/Spinner'
import { publicApi } from '@/lib/publicApi'
import type { CustomerBookingSummary } from '@/lib/types'
import { formatDuration, toWallClockDate } from '@/lib/utils'
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

export default function MyBookings() {
  const { slug, barbershop, loading } = useTenant()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [lookup, setLookup] = useState<{ name: string; phone: string } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const bookingsQuery = useQuery({
    queryKey: ['public', slug, 'customer-bookings', lookup?.phone, lookup?.name],
    queryFn: () => publicApi(slug).customerBookings({ phone: lookup!.phone, name: lookup!.name }),
    enabled: !!slug && !!lookup,
  })

  const bookings = bookingsQuery.data?.bookings ?? []
  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => {
      const start = toWallClockDate(booking.startTime)
      return isToday(start) || isFuture(start)
    }),
    [bookings]
  )
  const pastBookings = useMemo(
    () => bookings.filter((booking) => !upcomingBookings.some((item) => item.id === booking.id)),
    [bookings, upcomingBookings]
  )

  const submitted = !!lookup
  const canSearch = name.trim().length >= 2 && phone.trim().length >= 8

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSearch) return
    setFeedback(null)
    setLookup({ name: name.trim(), phone: phone.trim() })
  }

  if (loading) return <PageLoader />

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="rounded-[2rem] border border-white/70 bg-white p-6 shadow-soft sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
              <section>
                <p className="eyebrow">Área do cliente</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">
                  Meus agendamentos
                </h1>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  Consulta as tuas marcações na {barbershop?.name ?? 'barbearia'} e confirma rapidamente se tens reservas futuras ou histórico recente.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                  <div className="space-y-2">
                    <label htmlFor="customer-bookings-name" className="ui-label">
                      Nome
                    </label>
                    <input
                      id="customer-bookings-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="ui-control"
                      placeholder="O teu nome"
                    />
                  </div>

                  <PhoneInput
                    label="Telefone"
                    value={phone}
                    onChange={setPhone}
                    hint="Usa o mesmo contacto com que fizeste a marcação."
                  />

                  <Button type="submit" className="w-full" disabled={!canSearch || bookingsQuery.isFetching} loading={bookingsQuery.isFetching}>
                    <Search size={16} />
                    Procurar agendamentos
                  </Button>
                </form>

                <div className="mt-5 rounded-2xl border border-primary-100 bg-primary-50/70 p-4 text-sm text-primary-700">
                  A gestão sensível da reserva fica protegida por um link seguro gerado no momento da marcação. Esta área serve apenas para localizar as tuas reservas.
                </div>
              </section>

              <section className="space-y-5">
                {!submitted ? (
                  <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-6 text-center">
                    <div>
                      <p className="text-[15px] font-semibold text-ink">Encontra as tuas marcações</p>
                      <p className="mt-2 text-sm leading-6 text-ink-muted">
                        Introduz o teu nome e telefone para carregar as reservas associadas ao teu contacto.
                      </p>
                    </div>
                  </div>
                ) : bookingsQuery.isLoading ? (
                  <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-neutral-200 bg-white">
                    <PageLoader />
                  </div>
                ) : bookingsQuery.isError ? (
                  <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
                    {getApiErrorMessage(bookingsQuery.error)}
                  </div>
                ) : !bookings.length ? (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-[15px] font-semibold text-ink">Nenhuma marcação encontrada</p>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">
                      Verifica se o nome e o telefone são os mesmos usados no agendamento. Se acabaste de marcar, tenta novamente em alguns segundos.
                    </p>
                    <Link to={`/${slug}/booking`} className="mt-4 inline-flex">
                      <Button variant="secondary">
                        <Calendar size={16} />
                        Fazer nova marcação
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    {feedback ? (
                      <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
                        {feedback}
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                      <p className="text-sm font-semibold text-ink">
                        {bookingsQuery.data?.customer?.name ?? lookup.name}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {bookings.length} marcação{bookings.length !== 1 ? 'ões' : ''} encontrada{bookings.length !== 1 ? 's' : ''}.
                      </p>
                    </div>

                    <div className="space-y-5">
                      <BookingSection
                        title="Próximas marcações"
                        bookings={upcomingBookings}
                        lookup={lookup}
                        slug={slug}
                        onFeedback={setFeedback}
                        emptyMessage="Sem marcações futuras neste momento."
                      />
                      <BookingSection
                        title="Histórico recente"
                        bookings={pastBookings}
                        lookup={lookup}
                        slug={slug}
                        onFeedback={setFeedback}
                        emptyMessage="Sem histórico recente para mostrar."
                      />
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function BookingSection({
  title,
  bookings,
  lookup,
  slug,
  onFeedback,
  emptyMessage,
}: {
  title: string
  bookings: CustomerBookingSummary[]
  lookup: { name: string; phone: string }
  slug: string
  onFeedback: (message: string | null) => void
  emptyMessage: string
}) {
  const resendMutation = useMutation({
    mutationFn: (bookingId: string) => publicApi(slug).resendManagedBookingLink({
      bookingId,
      name: lookup.name,
      phone: lookup.phone,
    }),
    onSuccess: (data) => onFeedback(data.message),
    onError: (error: unknown) => onFeedback(getApiErrorMessage(error)),
  })

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">{bookings.length}</span>
      </div>

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {booking.services.map((item) => item.service.name).join(', ') || 'Serviço'}
                    </p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="space-y-1 text-sm text-ink-soft">
                    <p className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary-600" />
                      {format(toWallClockDate(booking.startTime), "EEEE, d 'de' MMMM", { locale: pt })}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock3 size={14} className="text-primary-600" />
                      {format(toWallClockDate(booking.startTime), 'HH:mm')} · {formatDuration(booking.totalDuration)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Scissors size={14} className="text-primary-600" />
                      {booking.barber.name}
                    </p>
                  </div>
                </div>
                <div className="max-w-xs rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-ink-muted">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <ShieldCheck size={15} className="text-primary-600" />
                    Gestão protegida
                  </p>
                  <p className="mt-2 leading-6">
                    Para confirmar, remarcar ou cancelar, usa o link seguro recebido no momento da marcação.
                  </p>
                  {booking.customer.email ? (
                    <div className="mt-3 space-y-2">
                      <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                        <Mail size={13} />
                        Existe email associado a esta reserva.
                      </p>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => resendMutation.mutate(booking.id)}
                        loading={resendMutation.isPending}
                      >
                        <Send size={15} />
                        Reenviar link seguro
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-[12.5px] text-ink-muted">
                      Esta reserva não tem email associado. Sem o link original, a gestão online fica indisponível.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
