import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import { Calendar, Clock3, Scissors, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { barberPortalApi } from '@/lib/api'
import { BarberLayout } from '@/components/layout/BarberLayout'
import { PageHeader } from '@/components/layout/PanelShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency, getBookingClientName, toWallClockDate } from '@/lib/utils'
import { useBarberAuthStore } from '@/store/barberAuth'
import type { Booking } from '@/lib/types'

export default function BarberDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const barber = useBarberAuthStore((state) => state.barber)
  const slug = barber?.barbershop?.slug ?? ''
  const { t, i18n } = useTranslation(['barber', 'admin', 'common'])
  const dateFnsLocale = getDateFnsLocale(i18n.language)
  const DAY_LABELS = [
    t('admin:schedule.days.1'), t('admin:schedule.days.2'), t('admin:schedule.days.3'),
    t('admin:schedule.days.4'), t('admin:schedule.days.5'), t('admin:schedule.days.6'),
    t('admin:schedule.days.0'),
  ]

  const { data: bookings = [], isLoading: l1 } = useQuery({
    queryKey: ['barber-portal', 'bookings', today],
    queryFn: () => barberPortalApi.bookings({ date: today }) as Promise<Booking[]>,
  })

  const { data: stats, isLoading: l2 } = useQuery({
    queryKey: ['barber-portal', 'stats'],
    queryFn: barberPortalApi.stats,
  })

  if (l1 || l2) return <BarberLayout><PageLoader /></BarberLayout>

  const upcoming = bookings.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status))
  const maxCount = Math.max(...(stats?.perDay ?? []).map((d: { count: number }) => d.count), 1)

  return (
    <BarberLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Visão consolidada da agenda, receita e próximas marcações do teu dia."
          actions={
            slug ? (
              <Link to={`/${slug}/barber/schedule`}>
                <Button size="sm">Abrir agenda</Button>
              </Link>
            ) : null
          }
        />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_20rem]">
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-gradient-to-br from-white to-warning-50/50 px-6 py-6 shadow-medium sm:px-8 sm:py-7">
            <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-warning-100/40 blur-3xl" />
            <div className="relative">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Flow diário</p>
              <h2 className="mt-2.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.75rem]">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: dateFnsLocale })}
              </h2>
              <p className="mt-2.5 max-w-2xl text-[13.5px] leading-6 text-ink-muted">
                Abre o portal e percebe logo quantos atendimentos tens, a receita em curso e o que vem a seguir.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-neutral-200/70 bg-white/80 p-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Hoje</p>
                  <p className="mt-2 text-[1.6rem] font-semibold leading-none tracking-tight text-ink">{stats?.todayCount ?? 0}</p>
                  <p className="mt-2.5 text-[12px] text-ink-muted">Marcações do dia</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-white/80 p-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Receita hoje</p>
                  <p className="mt-2 text-[1.6rem] font-semibold leading-none tracking-tight text-ink">{formatCurrency(stats?.todayRevenue ?? 0)}</p>
                  <p className="mt-2.5 text-[12px] text-ink-muted">Concluídos no dia</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-white/80 p-4">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Semana</p>
                  <p className="mt-2 text-[1.6rem] font-semibold leading-none tracking-tight text-ink">{formatCurrency(stats?.weekRevenue ?? 0)}</p>
                  <p className="mt-2.5 text-[12px] text-ink-muted">Receita acumulada</p>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <p className="eyebrow mb-4 text-ink-muted">Foco imediato</p>
              <div className="space-y-3">
                <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-4">
                  <p className="text-[13px] font-medium text-ink">Próximos atendimentos</p>
                  <p className="mt-1.5 text-[2rem] font-semibold leading-none tracking-tight text-ink">{upcoming.length}</p>
                  <p className="mt-2 text-[12.5px] text-ink-muted">Pendentes ou confirmados para hoje.</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-4">
                  <p className="text-[13px] font-medium text-ink">Receita do mês</p>
                  <p className="mt-1.5 text-[1.25rem] font-semibold text-ink">{formatCurrency(stats?.monthRevenue ?? 0)}</p>
                  <p className="mt-2 text-[12.5px] text-ink-muted">Leitura rápida de performance mensal.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Hoje', value: stats?.todayCount ?? 0, sub: 'agendamentos', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
            { label: 'Receita hoje', value: formatCurrency(stats?.todayRevenue ?? 0), sub: 'concluídos', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Esta semana', value: formatCurrency(stats?.weekRevenue ?? 0), sub: 'receita', icon: TrendingUp, color: 'bg-violet-100 text-violet-600' },
            { label: 'Este mês', value: formatCurrency(stats?.monthRevenue ?? 0), sub: 'receita', icon: Scissors, color: 'bg-warning-100 text-warning-700' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-soft">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                <item.icon size={17} />
              </div>
              <p className="text-xl font-bold leading-tight text-ink">{item.value}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{item.label}</p>
              <p className="mt-2 text-[12px] text-ink-muted">{item.sub}</p>
            </div>
          ))}
        </section>

        {stats?.perDay ? (
          <Card>
            <CardHeader>
              <CardTitle>Esta semana</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex h-24 items-end gap-2">
                {stats.perDay.map((d: { date: string; count: number }, i: number) => {
                  const isToday = d.date === today
                  const height = d.count === 0 ? 4 : Math.max(12, (d.count / maxCount) * 88)
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-xs font-medium text-zinc-400">{d.count > 0 ? d.count : ''}</span>
                      <div
                        className={`w-full rounded-lg transition-all ${isToday ? 'bg-primary-500' : 'bg-zinc-200'}`}
                        style={{ height }}
                      />
                      <span className={`text-[10px] font-semibold ${isToday ? 'text-primary-600' : 'text-zinc-400'}`}>
                        {DAY_LABELS[i]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Agenda de hoje</CardTitle>
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1 text-xs text-zinc-400">
              <Clock3 size={12} />
              {format(new Date(), 'HH:mm')}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100">
                  <Calendar size={18} className="text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-400">Sem agendamentos pendentes para hoje.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcoming.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-zinc-50">
                    <div className="w-12 shrink-0 text-center">
                      <span className="text-sm font-bold text-zinc-800">
                        {format(toWallClockDate(b.startTime), 'HH:mm')}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{getBookingClientName(b)}</p>
                      <p className="truncate text-xs text-zinc-400">{b.services.map((s) => s.service.name).join(', ')}</p>
                    </div>
                    <StatusBadge status={b.status} />
                    <span className="w-16 shrink-0 text-right text-sm font-bold text-zinc-700">
                      {formatCurrency(b.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BarberLayout>
  )
}
