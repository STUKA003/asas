import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Euro,
  Scissors,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { barberPortalApi } from '@/lib/api'
import { BarberLayout } from '@/components/layout/BarberLayout'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import { useBarberAuthStore } from '@/store/barberAuth'
import type { Booking } from '@/lib/types'

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string
  value: string | number
  note: string
  icon: typeof CalendarDays
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_26px_70px_-42px_rgba(0,0,0,0.9)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-zinc-300">{label}</p>
      <p className="mt-2 text-sm text-zinc-500">{note}</p>
    </div>
  )
}

export default function BarberDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const barber = useBarberAuthStore((state) => state.barber)
  const slug = barber?.barbershop?.slug ?? ''

  const { data: bookings = [], isLoading: isBookingsLoading } = useQuery({
    queryKey: ['barber-portal', 'bookings', today],
    queryFn: () => barberPortalApi.bookings({ date: today }) as Promise<Booking[]>,
  })

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['barber-portal', 'stats'],
    queryFn: barberPortalApi.stats,
  })

  const upcoming = useMemo(
    () => bookings.filter((booking) => ['PENDING', 'CONFIRMED'].includes(booking.status)),
    [bookings]
  )
  const completedToday = useMemo(
    () => bookings.filter((booking) => booking.status === 'COMPLETED').length,
    [bookings]
  )
  const nextBooking = upcoming[0] ?? null
  const maxCount = Math.max(...(stats?.perDay ?? []).map((day: { count: number }) => day.count), 1)

  if (isBookingsLoading || isStatsLoading) {
    return (
      <BarberLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <PageLoader />
        </div>
      </BarberLayout>
    )
  }

  return (
    <BarberLayout>
      <div className="space-y-6 text-white">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),transparent_18rem),linear-gradient(135deg,rgba(24,24,29,0.98),rgba(12,12,16,0.96))] p-6 shadow-[0_36px_100px_-56px_rgba(0,0,0,0.95)] sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200/80">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-[0.98] text-white sm:text-4xl">
                {barber?.name ? `${barber.name}, este é o estado do teu turno.` : 'Estado do turno em tempo real.'}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-300">
                Consulta volume do dia, próximo atendimento e evolução semanal sem sair do portal do barbeiro.
              </p>
            </div>

            {slug ? (
              <Link to={`/${slug}/barber/schedule`} className="shrink-0">
                <Button className="rounded-2xl border-orange-500 bg-gradient-to-r from-orange-500 to-amber-400 text-zinc-950 hover:from-orange-400 hover:to-amber-300">
                  Abrir agenda <ArrowRight size={16} />
                </Button>
              </Link>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Agendamentos hoje"
            value={stats?.todayCount ?? 0}
            note={`${upcoming.length} por atender`}
            icon={CalendarDays}
          />
          <StatCard
            label="Receita hoje"
            value={formatCurrency(stats?.todayRevenue ?? 0)}
            note={`${completedToday} concluídos`}
            icon={Euro}
          />
          <StatCard
            label="Receita da semana"
            value={formatCurrency(stats?.weekRevenue ?? 0)}
            note="Acumulado semanal"
            icon={TrendingUp}
          />
          <StatCard
            label="Receita do mês"
            value={formatCurrency(stats?.monthRevenue ?? 0)}
            note="Visão mensal"
            icon={Scissors}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="rounded-[2rem] border border-white/10 bg-[#131319] p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.9)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Semana</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Carga de agenda</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-zinc-400">
                {stats?.perDay?.reduce((total: number, day: { count: number }) => total + day.count, 0) ?? 0} marcações
              </div>
            </div>

            <div className="mt-8 flex h-52 items-end gap-3">
              {(stats?.perDay ?? []).map((day: { date: string; count: number }, index: number) => {
                const isTodayColumn = day.date === today
                const height = day.count === 0 ? 12 : Math.max(22, (day.count / maxCount) * 156)

                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-3">
                    <span className={`text-xs font-semibold ${isTodayColumn ? 'text-orange-300' : 'text-zinc-500'}`}>
                      {day.count}
                    </span>
                    <div className="flex h-40 w-full items-end rounded-[1.5rem] bg-white/[0.03] px-2 pb-2">
                      <div
                        className={`w-full rounded-[1rem] ${
                          isTodayColumn
                            ? 'bg-gradient-to-t from-orange-500 to-amber-300'
                            : 'bg-gradient-to-t from-zinc-700 to-zinc-500'
                        }`}
                        style={{ height }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${isTodayColumn ? 'text-white' : 'text-zinc-500'}`}>
                      {DAY_LABELS[index]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-[#131319] p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.9)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Próximo cliente</p>
              {nextBooking ? (
                <>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{nextBooking.customer.name}</h2>
                      <p className="mt-1 text-sm text-zinc-400">
                        {nextBooking.services.map((service) => service.service.name).join(', ')}
                      </p>
                    </div>
                    <StatusBadge status={nextBooking.status} />
                  </div>
                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Clock3 size={14} />
                        Horário
                      </div>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {format(new Date(nextBooking.startTime), 'HH:mm')} - {format(new Date(nextBooking.endTime), 'HH:mm')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Euro size={14} />
                        Total
                      </div>
                      <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(nextBooking.totalPrice)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-zinc-400">
                  Sem próximo atendimento pendente para hoje.
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#131319] p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.9)] sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Resumo do dia</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Concluídos</p>
                      <p className="text-xs text-zinc-500">Atendimentos fechados hoje</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-white">{completedToday}</span>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-300">
                      <UserRound size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Fila ativa</p>
                      <p className="text-xs text-zinc-500">Pendentes ou confirmados</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-white">{upcoming.length}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#131319] p-5 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.9)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Hoje</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Linha de atendimento</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-zinc-400">
              {format(new Date(), 'HH:mm')}
            </div>
          </div>

          {upcoming.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-400">
              Sem agendamentos pendentes para hoje.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {upcoming.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 md:flex-row md:items-center"
                >
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-orange-500/12 text-orange-200">
                    <span className="text-lg font-semibold">{format(new Date(booking.startTime), 'HH:mm')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-white">{booking.customer.name}</p>
                    <p className="mt-1 truncate text-sm text-zinc-400">
                      {booking.services.map((service) => service.service.name).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <StatusBadge status={booking.status} />
                    <span className="text-sm font-semibold text-white">{formatCurrency(booking.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </BarberLayout>
  )
}
