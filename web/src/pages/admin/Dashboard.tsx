import { useQuery } from '@tanstack/react-query'
import { bookingsApi, barbersApi, customersApi } from '@/lib/api'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/layout/PanelShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency } from '@/lib/utils'
import {
  addDays,
  endOfMonth,
  format,
  isWithinInterval,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  Calendar,
  Scissors,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Booking, Barber, Customer } from '@/lib/types'

function getChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getTrendTone(change: number, reverse = false) {
  if (change === 0) return 'neutral'
  const positive = reverse ? change < 0 : change > 0
  return positive ? 'positive' : 'negative'
}

function serviceColor(serviceId?: string) {
  if (!serviceId) return 'from-blue-500 to-cyan-400'
  const palette = [
    'from-blue-500 to-cyan-400',
    'from-emerald-500 to-green-400',
    'from-violet-500 to-fuchsia-400',
    'from-amber-500 to-orange-400',
    'from-rose-500 to-pink-400',
  ]
  let total = 0
  for (const char of serviceId) total += char.charCodeAt(0)
  return palette[total % palette.length]
}

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayBookings = [], isLoading: l1 } = useQuery({
    queryKey: ['bookings', 'today'],
    queryFn: () => bookingsApi.list({ date: today }) as Promise<Booking[]>,
  })
  const { data: barbers = [], isLoading: l2 } = useQuery({
    queryKey: ['barbers'],
    queryFn: () => barbersApi.list() as Promise<Barber[]>,
  })
  const { data: customers = [], isLoading: l3 } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.list() as Promise<Customer[]>,
  })
  const { data: allBookings = [], isLoading: l4 } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.list() as Promise<Booking[]>,
  })

  if (l1 || l2 || l3 || l4) return <AdminLayout><PageLoader /></AdminLayout>

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const previousMonthStart = startOfMonth(subMonths(now, 1))
  const previousMonthEnd = endOfMonth(subMonths(now, 1))

  const thisMonth = allBookings.filter((b) =>
    isWithinInterval(new Date(b.startTime), { start: monthStart, end: monthEnd })
  )
  const previousMonth = allBookings.filter((b) =>
    isWithinInterval(new Date(b.startTime), { start: previousMonthStart, end: previousMonthEnd })
  )

  const completedThisMonth = thisMonth.filter((b) => b.status === 'COMPLETED')
  const completedPreviousMonth = previousMonth.filter((b) => b.status === 'COMPLETED')
  const thisMonthRevenue = completedThisMonth.reduce((sum, b) => sum + b.totalPrice, 0)
  const previousMonthRevenue = completedPreviousMonth.reduce((sum, b) => sum + b.totalPrice, 0)
  const avgTicket = completedThisMonth.length > 0 ? thisMonthRevenue / completedThisMonth.length : 0
  const previousAvgTicket = completedPreviousMonth.length > 0
    ? previousMonthRevenue / completedPreviousMonth.length
    : 0

  const finalizedThisMonth = thisMonth.filter((b) => ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(b.status))
  const finalizedPreviousMonth = previousMonth.filter((b) => ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(b.status))
  const noShows = thisMonth.filter((b) => b.status === 'NO_SHOW').length
  const previousNoShows = previousMonth.filter((b) => b.status === 'NO_SHOW').length
  const noShowRate = finalizedThisMonth.length > 0 ? Math.round((noShows / finalizedThisMonth.length) * 100) : 0
  const previousNoShowRate = finalizedPreviousMonth.length > 0
    ? Math.round((previousNoShows / finalizedPreviousMonth.length) * 100)
    : 0

  const revenueChange = getChange(thisMonthRevenue, previousMonthRevenue)
  const bookingChange = getChange(thisMonth.length, previousMonth.length)
  const ticketChange = getChange(avgTicket, previousAvgTicket)
  const noShowChange = getChange(noShowRate, previousNoShowRate)

  const barberRevenue: Record<string, { name: string; revenue: number; count: number }> = {}
  completedThisMonth.forEach((booking) => {
    if (!barberRevenue[booking.barber.id]) {
      barberRevenue[booking.barber.id] = { name: booking.barber.name, revenue: 0, count: 0 }
    }
    barberRevenue[booking.barber.id].revenue += booking.totalPrice
    barberRevenue[booking.barber.id].count += 1
  })
  const topBarbers = Object.values(barberRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 4)

  const serviceCount: Record<string, { name: string; count: number; serviceId: string }> = {}
  thisMonth
    .filter((booking) => booking.status !== 'CANCELLED')
    .forEach((booking) => {
      booking.services.forEach((service) => {
        if (!serviceCount[service.serviceId]) {
          serviceCount[service.serviceId] = { name: service.service.name, count: 0, serviceId: service.serviceId }
        }
        serviceCount[service.serviceId].count += 1
      })
    })
  const topServices = Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 4)
  const maxServiceCount = topServices[0]?.count ?? 1

  const upcoming = todayBookings
    .filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status))
    .slice(0, 8)

  const dailyDistribution = Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(monthStart, index)
    const bookings = thisMonth.filter((booking) =>
      format(new Date(booking.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    ).length
    return {
      day: format(day, 'EEE', { locale: pt }),
      fullDay: format(day, 'EEEE', { locale: pt }),
      bookings,
    }
  })
  const busiestDay = [...dailyDistribution].sort((a, b) => b.bookings - a.bookings)[0]
  const occupancySignal = todayBookings.length >= Math.max(barbers.length * 3, 6)
    ? 'Dia forte'
    : todayBookings.length <= Math.max(barbers.length, 2)
      ? 'Baixa ocupação'
      : 'Fluxo equilibrado'

  const heroTone = revenueChange >= 0 ? 'positive' : 'negative'
  const heroToneClasses = heroTone === 'positive'
    ? 'from-emerald-500/16 via-emerald-500/5 to-transparent'
    : 'from-amber-500/16 via-amber-500/5 to-transparent'

  const monthStats = [
    {
      label: 'Receita do mês',
      value: formatCurrency(thisMonthRevenue),
      helper: revenueChange >= 0 ? `${revenueChange}% acima do mês passado` : `${Math.abs(revenueChange)}% abaixo do mês passado`,
      microcopy: revenueChange >= 0 ? 'Ritmo saudável de faturação' : 'Vale rever horários e campanhas',
      tone: getTrendTone(revenueChange),
      icon: TrendingUp,
      iconWrap: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Agendamentos fechados',
      value: thisMonth.length,
      helper: bookingChange >= 0 ? `+${bookingChange}% vs mês anterior` : `${bookingChange}% vs mês anterior`,
      microcopy: busiestDay ? `Melhor dia: ${busiestDay.fullDay}` : 'Sem histórico suficiente',
      tone: getTrendTone(bookingChange),
      icon: Calendar,
      iconWrap: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(avgTicket),
      helper: ticketChange >= 0 ? `+${ticketChange}% por visita` : `${ticketChange}% por visita`,
      microcopy: avgTicket >= 25 ? 'Boa valorização por cliente' : 'Há margem para upsell',
      tone: getTrendTone(ticketChange),
      icon: BadgePercent,
      iconWrap: 'bg-violet-100 text-violet-600',
    },
    {
      label: 'Taxa de no-show',
      value: `${noShowRate}%`,
      helper: noShowChange === 0 ? 'Sem alteração face ao mês passado' : `${Math.abs(noShowChange)}% ${noShowChange < 0 ? 'melhor' : 'pior'} que o mês passado`,
      microcopy: noShowRate >= 12 ? 'Atenção a confirmações e lembretes' : 'Nível saudável para operação',
      tone: getTrendTone(noShowChange, true),
      icon: AlertTriangle,
      iconWrap: 'bg-rose-100 text-rose-600',
    },
  ] as const

  const insights = [
    {
      title: 'Pulse do dia',
      text: occupancySignal === 'Dia forte'
        ? 'Agenda quente. Mantém foco no tempo médio entre serviços.'
        : occupancySignal === 'Baixa ocupação'
          ? 'Hoje está abaixo do ideal. Vale destacar slots livres nas redes.'
          : 'Operação equilibrada. Bom momento para encaixar extras e produtos.',
      icon: Sparkles,
      tone: occupancySignal === 'Dia forte' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : occupancySignal === 'Baixa ocupação' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      title: 'Janela de atenção',
      text: noShowRate >= 12
        ? 'No-show acima do saudável. Reforça lembretes e confirmação manual.'
        : 'Faltas controladas. Dá para operar com previsibilidade.',
      icon: TriangleAlert,
      tone: noShowRate >= 12 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-zinc-50 text-zinc-700 border-zinc-200',
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Dashboard"
          subtitle="Visão consolidada do dia, desempenho mensal e sinais rápidos para atuação."
          actions={
            <Link to="/admin/bookings">
              <Button size="sm">Ver agendamentos</Button>
            </Link>
          }
        />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_20rem]">
        <section className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br ${heroToneClasses} from-white via-white to-zinc-50 px-6 py-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8`}>
          <div className="absolute -right-20 top-0 h-52 w-52 rounded-full bg-accent-200/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] lg:items-end">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Control center</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                  Hoje a operação está {occupancySignal === 'Dia forte' ? 'forte' : occupancySignal === 'Baixa ocupação' ? 'mais calma' : 'estável'}.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
                  {format(now, "EEEE, d 'de' MMMM", { locale: pt })}. Usa este painel para perceber o ritmo da casa, onde estás a ganhar margem e onde convém agir cedo.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Receita acumulada</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{formatCurrency(thisMonthRevenue)}</p>
                  <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${heroTone === 'positive' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {revenueChange >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(revenueChange)}% vs mês anterior
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Agenda de hoje</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{todayBookings.length}</p>
                  <p className="mt-3 text-xs text-zinc-500">
                    {upcoming.length} por confirmar ou a decorrer
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Clientes ativos</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{customers.length}</p>
                  <p className="mt-3 text-xs text-zinc-500">
                    {barbers.filter((barber) => barber.active).length} barbeiros disponíveis
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {insights.map((insight) => (
                <div key={insight.title} className={`rounded-[1.5rem] border p-4 ${insight.tone}`}>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/70 p-2 shadow-sm">
                      <insight.icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight">{insight.title}</p>
                      <p className="mt-1 text-sm leading-5">{insight.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Foco imediato</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-sm font-medium text-ink">Agenda por confirmar</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{upcoming.length}</p>
                    <p className="mt-1 text-sm text-ink-muted">Reservas pendentes ou confirmadas para hoje.</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                    <p className="text-sm font-medium text-ink">Estado do dia</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{occupancySignal}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {occupancySignal === 'Dia forte'
                        ? 'Prioriza pontualidade e encaixes curtos.'
                        : occupancySignal === 'Baixa ocupação'
                          ? 'Bom momento para divulgar horários livres.'
                          : 'Fluxo estável e margem para extras.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {monthStats.map((stat) => {
            const toneClasses = stat.tone === 'positive'
              ? 'bg-emerald-50 text-emerald-700'
              : stat.tone === 'negative'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-zinc-100 text-zinc-600'

            return (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{stat.value}</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${stat.iconWrap}`}>
                      <stat.icon size={18} />
                    </div>
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses}`}>
                    {stat.tone === 'positive' ? <ArrowUpRight size={13} /> : stat.tone === 'negative' ? <ArrowDownRight size={13} /> : null}
                    {stat.helper}
                  </div>
                  <p className="mt-3 text-sm leading-5 text-zinc-500">{stat.microcopy}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-4 border-b border-zinc-100 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Momentum</p>
                <CardTitle className="mt-2 text-xl">Tendência desta semana</CardTitle>
                <p className="mt-1 text-sm text-zinc-500">Leitura rápida do fluxo de bookings no arranque da semana.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50 px-3 py-2 text-right">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Melhor dia</p>
                <p className="mt-1 text-sm font-semibold text-zinc-950">{busiestDay?.fullDay ?? 'Sem dados'}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-7 gap-2">
                {dailyDistribution.map((day) => {
                  const height = Math.max(18, (day.bookings / Math.max(...dailyDistribution.map((entry) => entry.bookings), 1)) * 140)
                  return (
                    <div key={day.day} className="flex flex-col items-center gap-3">
                      <div className="flex h-40 w-full items-end rounded-[1.25rem] bg-zinc-100/80 px-2 py-2">
                        <div
                          className="w-full rounded-[1rem] bg-gradient-to-t from-accent-500 via-orange-400 to-amber-300 shadow-[0_14px_24px_-18px_rgba(var(--accent-600),0.95)]"
                          style={{ height }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{day.day}</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-950">{day.bookings}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Próximos</p>
              <CardTitle className="mt-2 text-xl">Agenda de hoje</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {upcoming.length === 0 ? (
                <div className="rounded-[1.35rem] border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-zinc-700">Sem bookings pendentes para hoje.</p>
                  <p className="mt-2 text-sm text-zinc-500">A agenda está limpa neste momento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((booking) => (
                    <div
                      key={booking.id}
                      className="group flex w-full items-center gap-3 rounded-[1.35rem] border border-zinc-200/70 bg-white/90 px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,0.28)]"
                    >
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-zinc-950 text-white">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">hora</span>
                        <span className="text-sm font-semibold">{format(new Date(booking.startTime), 'HH:mm')}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-zinc-950">{booking.customer.name}</p>
                          <StatusBadge status={booking.status} />
                        </div>
                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {booking.services[0]?.service.name ?? 'Serviço'} · {booking.barber.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Performance</p>
              <CardTitle className="mt-2 text-xl">Top barbeiros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              {topBarbers.length === 0 ? (
                <p className="rounded-[1.35rem] border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center text-sm text-zinc-500">
                  Sem dados fechados este mês.
                </p>
              ) : (
                topBarbers.map((barber, index) => (
                  <div key={barber.name} className="rounded-[1.35rem] border border-zinc-200/70 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-700'}`}>
                        <Users size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-zinc-950">{barber.name}</p>
                          <p className="text-sm font-semibold text-zinc-950">{formatCurrency(barber.revenue)}</p>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">{barber.count} serviços concluídos no mês</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-zinc-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{ width: `${(barber.revenue / (topBarbers[0]?.revenue || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Procura</p>
              <CardTitle className="mt-2 text-xl">Serviços mais pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              {topServices.length === 0 ? (
                <p className="rounded-[1.35rem] border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-8 text-center text-sm text-zinc-500">
                  Sem dados para mostrar este mês.
                </p>
              ) : (
                topServices.map((service) => (
                  <div key={service.serviceId} className="rounded-[1.35rem] border border-zinc-200/70 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${serviceColor(service.serviceId)} text-white shadow-sm`}>
                        <Scissors size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-zinc-950">{service.name}</p>
                          <p className="text-sm font-semibold text-zinc-950">{service.count}x</p>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {service.count === maxServiceCount ? 'Serviço líder do mês' : 'Continua a puxar ocupação'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-zinc-100">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${serviceColor(service.serviceId)}`}
                        style={{ width: `${(service.count / maxServiceCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AdminLayout>
  )
}
