import { useQuery } from '@tanstack/react-query'
import { bookingsApi, barbersApi, customersApi } from '@/lib/api'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/layout/PanelShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatCurrency, getBookingClientName, toWallClockDate } from '@/lib/utils'
import { addDays, endOfMonth, format, isWithinInterval, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight,
  BadgePercent, Calendar, Scissors, Sparkles,
  TrendingUp, TriangleAlert, Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Booking, Barber, Customer } from '@/lib/types'

function getChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getTrendTone(change: number, reverse = false) {
  if (change === 0) return 'neutral'
  return (reverse ? change < 0 : change > 0) ? 'positive' : 'negative'
}

function serviceColor(serviceId?: string) {
  if (!serviceId) return 'from-blue-500 to-cyan-400'
  const palette = [
    'from-blue-500 to-cyan-400', 'from-emerald-500 to-green-400',
    'from-violet-500 to-fuchsia-400', 'from-amber-500 to-orange-400', 'from-rose-500 to-pink-400',
  ]
  let total = 0
  for (const char of serviceId) total += char.charCodeAt(0)
  return palette[total % palette.length]
}

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayBookings = [], isLoading: l1 } = useQuery({ queryKey: ['bookings', 'today'],    queryFn: () => bookingsApi.list({ date: today }) as Promise<Booking[]> })
  const { data: barbers       = [], isLoading: l2 } = useQuery({ queryKey: ['barbers'],             queryFn: () => barbersApi.list() as Promise<Barber[]> })
  const { data: customers     = [], isLoading: l3 } = useQuery({ queryKey: ['customers'],           queryFn: () => customersApi.list() as Promise<Customer[]> })
  const { data: allBookings   = [], isLoading: l4 } = useQuery({ queryKey: ['bookings'],            queryFn: () => bookingsApi.list() as Promise<Booking[]> })

  const isLoading = l1 || l2 || l3 || l4

  if (isLoading) return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="pb-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-neutral-100" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded-lg bg-neutral-100" />
        </div>
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-5">
            <div className="mb-4 h-4 w-32 animate-pulse rounded-lg bg-neutral-100" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-neutral-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-neutral-100" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200/70 bg-white p-5">
            <div className="mb-4 h-4 w-32 animate-pulse rounded-lg bg-neutral-100" />
            <div className="h-36 animate-pulse rounded-xl bg-neutral-100" />
          </div>
        </div>
      </div>
    </AdminLayout>
  )

  const now = new Date()
  const monthStart         = startOfMonth(now)
  const monthEnd           = endOfMonth(now)
  const prevMonthStart     = startOfMonth(subMonths(now, 1))
  const prevMonthEnd       = endOfMonth(subMonths(now, 1))

  const thisMonth   = allBookings.filter((b) => isWithinInterval(toWallClockDate(b.startTime), { start: monthStart, end: monthEnd }))
  const prevMonth   = allBookings.filter((b) => isWithinInterval(toWallClockDate(b.startTime), { start: prevMonthStart, end: prevMonthEnd }))
  const operationalThisMonth = thisMonth.filter((b) => b.status !== 'CANCELLED')
  const operationalPrevMonth = prevMonth.filter((b) => b.status !== 'CANCELLED')
  const operationalToday = todayBookings.filter((b) => ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(b.status))
  const customersToday = new Set(operationalToday.map((b) => b.customer.id)).size
  const monthlyActiveCustomers = new Set(
    operationalThisMonth
      .filter((b) => ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(b.status))
      .map((b) => b.customer.id)
  ).size

  const completedThis = thisMonth.filter((b) => b.status === 'COMPLETED')
  const completedPrev = prevMonth.filter((b) => b.status === 'COMPLETED')

  const thisRevenue    = completedThis.reduce((s, b) => s + b.totalPrice, 0)
  const prevRevenue    = completedPrev.reduce((s, b) => s + b.totalPrice, 0)
  const avgTicket      = completedThis.length > 0 ? thisRevenue / completedThis.length : 0
  const prevAvgTicket  = completedPrev.length > 0 ? prevRevenue / completedPrev.length : 0

  const finalizedThis = thisMonth.filter((b) => ['COMPLETED', 'NO_SHOW'].includes(b.status))
  const finalizedPrev = prevMonth.filter((b) => ['COMPLETED', 'NO_SHOW'].includes(b.status))
  const noShows       = thisMonth.filter((b) => b.status === 'NO_SHOW').length
  const prevNoShows   = prevMonth.filter((b) => b.status === 'NO_SHOW').length
  const noShowRate    = finalizedThis.length > 0 ? Math.round((noShows / finalizedThis.length) * 100) : 0
  const prevNoShowRate = finalizedPrev.length > 0 ? Math.round((prevNoShows / finalizedPrev.length) * 100) : 0

  const revenueChange  = getChange(thisRevenue, prevRevenue)
  const bookingChange  = getChange(operationalThisMonth.length, operationalPrevMonth.length)
  const ticketChange   = getChange(avgTicket, prevAvgTicket)
  const noShowChange   = getChange(noShowRate, prevNoShowRate)

  const barberRevenue: Record<string, { name: string; revenue: number; count: number }> = {}
  completedThis.forEach((b) => {
    if (!barberRevenue[b.barber.id]) barberRevenue[b.barber.id] = { name: b.barber.name, revenue: 0, count: 0 }
    barberRevenue[b.barber.id].revenue += b.totalPrice
    barberRevenue[b.barber.id].count   += 1
  })
  const topBarbers = Object.values(barberRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 4)

  const serviceCount: Record<string, { name: string; count: number; serviceId: string }> = {}
  thisMonth.filter((b) => b.status !== 'CANCELLED').forEach((b) => {
    b.services.forEach((s) => {
      if (!serviceCount[s.serviceId]) serviceCount[s.serviceId] = { name: s.service.name, count: 0, serviceId: s.serviceId }
      serviceCount[s.serviceId].count += 1
    })
  })
  const topServices      = Object.values(serviceCount).sort((a, b) => b.count - a.count).slice(0, 4)
  const maxServiceCount  = topServices[0]?.count ?? 1

  const upcoming = todayBookings.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status)).slice(0, 8)

  const weekStart = startOfWeek(now, { locale: pt })
  const weekEnd = addDays(weekStart, 6)
  const currentWeekBookings = allBookings.filter((b) =>
    b.status !== 'CANCELLED' &&
    isWithinInterval(toWallClockDate(b.startTime), { start: weekStart, end: weekEnd })
  )

  const dailyDistribution = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(weekStart, i)
    const count = currentWeekBookings.filter((b) => format(toWallClockDate(b.startTime), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).length
    return { day: format(day, 'EEE', { locale: pt }), fullDay: format(day, 'EEEE', { locale: pt }), bookings: count }
  })
  const busiestDay = [...dailyDistribution].sort((a, b) => b.bookings - a.bookings)[0]

  const occupancySignal = operationalToday.length >= Math.max(barbers.length * 3, 6)
    ? 'Dia forte'
    : operationalToday.length <= Math.max(barbers.length, 2)
      ? 'Baixa ocupação'
      : 'Fluxo equilibrado'

  const heroTone        = revenueChange >= 0 ? 'positive' : 'negative'
  const heroGradient    = heroTone === 'positive'
    ? 'from-emerald-500/[0.08] via-transparent to-transparent'
    : 'from-amber-500/[0.08]   via-transparent to-transparent'

  const monthStats = [
    {
      label: 'Receita do mês',        value: formatCurrency(thisRevenue),
      helper: revenueChange >= 0 ? `${revenueChange}% acima do mês passado` : `${Math.abs(revenueChange)}% abaixo do mês passado`,
      microcopy: revenueChange >= 0 ? 'Ritmo saudável de faturação' : 'Vale rever horários e campanhas',
      tone: getTrendTone(revenueChange), icon: TrendingUp,  iconWrap: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: 'Agendamentos ativos', value: operationalThisMonth.length,
      helper: bookingChange >= 0 ? `+${bookingChange}% vs mês anterior` : `${bookingChange}% vs mês anterior`,
      microcopy: busiestDay ? `Melhor dia: ${busiestDay.fullDay}` : 'Sem histórico suficiente',
      tone: getTrendTone(bookingChange), icon: Calendar, iconWrap: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Ticket médio',           value: formatCurrency(avgTicket),
      helper: ticketChange >= 0 ? `+${ticketChange}% por visita` : `${ticketChange}% por visita`,
      microcopy: avgTicket >= 25 ? 'Boa valorização por cliente' : 'Há margem para upsell',
      tone: getTrendTone(ticketChange), icon: BadgePercent, iconWrap: 'bg-violet-100 text-violet-600',
    },
    {
      label: 'Taxa de no-show',        value: `${noShowRate}%`,
      helper: noShowChange === 0 ? 'Sem alteração face ao mês passado' : `${Math.abs(noShowChange)}% ${noShowChange < 0 ? 'melhor' : 'pior'} que o mês passado`,
      microcopy: noShowRate >= 12 ? 'Atenção a confirmações e lembretes' : 'Nível saudável para operação',
      tone: getTrendTone(noShowChange, true), icon: AlertTriangle, iconWrap: 'bg-rose-100 text-rose-600',
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
      tone: occupancySignal === 'Dia forte'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : occupancySignal === 'Baixa ocupação'
          ? 'border-warning-100 bg-warning-50 text-warning-700'
          : 'border-blue-100 bg-blue-50 text-blue-700',
    },
    {
      title: 'Janela de atenção',
      text: noShowRate >= 12
        ? 'No-show acima do saudável. Reforça lembretes e confirmação manual.'
        : 'Faltas controladas. Dá para operar com previsibilidade.',
      icon: TriangleAlert,
      tone: noShowRate >= 12
        ? 'border-danger-100 bg-danger-50 text-danger-700'
        : 'border-neutral-200 bg-neutral-50 text-ink-soft',
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Visão consolidada do dia, desempenho mensal e sinais rápidos para atuação."
          actions={
            <Link to="/admin/bookings">
              <Button size="sm">Ver agendamentos</Button>
            </Link>
          }
        />

        {/* ── Hero + focus ──────────────────────────────── */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_20rem]">
          {/* Hero card */}
          <div className={`relative overflow-hidden rounded-2xl border border-neutral-200/70 bg-gradient-to-br ${heroGradient} from-white shadow-medium px-6 py-6 sm:px-8 sm:py-7`}>
            <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-primary-100/30 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)] lg:items-end">
              <div className="space-y-5">
                <div>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Control center</p>
                  <h2 className="mt-2.5 text-[1.5rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.75rem]">
                    Hoje a operação está {occupancySignal === 'Dia forte' ? 'forte' : occupancySignal === 'Baixa ocupação' ? 'mais calma' : 'estável'}.
                  </h2>
                  <p className="mt-2.5 max-w-2xl text-[13.5px] leading-6 text-ink-muted">
                    {format(now, "EEEE, d 'de' MMMM", { locale: pt })}. Usa este painel para perceber o ritmo da casa, onde estás a ganhar margem e onde convém agir cedo.
                  </p>
                </div>

                {/* Mini stats */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Receita acumulada', value: formatCurrency(thisRevenue), sub: `${revenueChange >= 0 ? '+' : ''}${revenueChange}% vs mês anterior`, positive: revenueChange >= 0 },
                    { label: 'Agenda de hoje', value: operationalToday.length, sub: `${upcoming.length} por confirmar` },
                    { label: 'Clientes hoje', value: customersToday, sub: `${monthlyActiveCustomers} ativos no mês · ${customers.length} na base` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-neutral-200/70 bg-white/80 p-4">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{s.label}</p>
                      <p className="mt-2 text-[1.6rem] font-semibold tracking-tight text-ink leading-none">{s.value}</p>
                      {'positive' in s ? (
                        <div className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.positive ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                          {s.positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {s.sub}
                        </div>
                      ) : (
                        <p className="mt-2.5 text-[12px] text-ink-muted">{s.sub}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Insight cards */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {insights.map((insight) => (
                  <div key={insight.title} className={`rounded-2xl border p-4 ${insight.tone}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/60 p-1.5">
                        <insight.icon size={14} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold">{insight.title}</p>
                        <p className="mt-0.5 text-[12.5px] leading-5">{insight.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Focus card */}
          <Card>
            <CardContent className="pt-6">
              <p className="eyebrow mb-4 text-ink-muted">Foco imediato</p>
              <div className="space-y-3">
                <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-4">
                  <p className="text-[13px] font-medium text-ink">Agenda por confirmar</p>
                  <p className="mt-1.5 text-[2rem] font-semibold tracking-tight text-ink leading-none">{upcoming.length}</p>
                  <p className="mt-2 text-[12.5px] text-ink-muted">Reservas pendentes ou confirmadas para hoje.</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-4 py-4">
                  <p className="text-[13px] font-medium text-ink">Estado do dia</p>
                  <p className="mt-1.5 text-[15px] font-semibold text-ink">{occupancySignal}</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
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
        </section>

        {/* ── Month stat cards ──────────────────────────── */}
        <section className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          {monthStats.map((stat) => {
            const badgeClass = stat.tone === 'positive'
              ? 'bg-success-100 text-success-700'
              : stat.tone === 'negative'
                ? 'bg-danger-50 text-danger-700'
                : 'bg-neutral-100 text-ink-muted'
            return (
              <Card key={stat.label}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13px] font-medium text-ink-muted">{stat.label}</p>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconWrap}`}>
                      <stat.icon size={16} />
                    </div>
                  </div>
                  <p className="mt-3 text-[1.9rem] font-semibold tracking-[-0.02em] text-ink leading-none">{stat.value}</p>
                  <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${badgeClass}`}>
                    {stat.tone === 'positive' ? <ArrowUpRight size={12} /> : stat.tone === 'negative' ? <ArrowDownRight size={12} /> : null}
                    {stat.helper}
                  </div>
                  <p className="mt-2.5 text-[12px] leading-5 text-ink-muted">{stat.microcopy}</p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        {/* ── Chart + today ─────────────────────────────── */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="flex-col gap-4 border-b border-neutral-100 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow mb-2 text-ink-muted">Momentum</p>
                <CardTitle className="text-[17px]">Tendência desta semana</CardTitle>
                <p className="mt-1 text-[13px] text-ink-muted">Leitura rápida do fluxo de bookings no arranque da semana.</p>
              </div>
              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 px-3 py-2 text-right">
                <p className="eyebrow text-ink-muted/70">Melhor dia</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">{busiestDay?.fullDay ?? 'Sem dados'}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-7 gap-2">
                {dailyDistribution.map((day) => {
                  const maxBookings = Math.max(...dailyDistribution.map((d) => d.bookings), 1)
                  const height = Math.max(16, (day.bookings / maxBookings) * 128)
                  return (
                    <div key={day.day} className="flex flex-col items-center gap-2.5">
                      <div className="flex h-36 w-full items-end rounded-2xl bg-neutral-100/80 px-1.5 py-1.5">
                        <div
                          className="w-full rounded-xl bg-gradient-to-t from-primary-600 via-primary-400 to-primary-300"
                          style={{ height, boxShadow: '0 8px 16px -10px rgba(var(--primary-600), 0.6)' }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{day.day}</p>
                        <p className="mt-0.5 text-[13px] font-semibold text-ink">{day.bookings}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="eyebrow text-ink-muted">Próximos</p>
              <CardTitle className="mt-1.5 text-[17px]">Agenda de hoje</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-ink">Sem bookings pendentes para hoje.</p>
                  <p className="mt-1 text-[12.5px] text-ink-muted">A agenda está limpa neste momento.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcoming.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200/70 bg-white px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-medium"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white">
                        <span className="text-[9px] uppercase tracking-[0.12em] text-white/40">hora</span>
                        <span className="text-[13px] font-semibold">{format(toWallClockDate(booking.startTime), 'HH:mm')}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13.5px] font-semibold text-ink">{getBookingClientName(booking)}</p>
                          <StatusBadge status={booking.status} />
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-ink-muted">
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

        {/* ── Top barbers + top services ────────────────── */}
        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="eyebrow text-ink-muted">Performance</p>
              <CardTitle className="mt-1.5 text-[17px]">Top barbeiros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-1">
              {topBarbers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-8 text-center text-[13px] text-ink-muted">
                  Sem dados fechados este mês.
                </p>
              ) : topBarbers.map((barber, i) => (
                <div key={barber.name} className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-ink-muted'}`}>
                      <Users size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{barber.name}</p>
                        <p className="text-[13.5px] font-semibold text-ink">{formatCurrency(barber.revenue)}</p>
                      </div>
                      <p className="mt-0.5 text-[12px] text-ink-muted">{barber.count} serviços concluídos no mês</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      style={{ width: `${(barber.revenue / (topBarbers[0]?.revenue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="eyebrow text-ink-muted">Procura</p>
              <CardTitle className="mt-1.5 text-[17px]">Serviços mais pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-1">
              {topServices.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-8 text-center text-[13px] text-ink-muted">
                  Sem dados para mostrar este mês.
                </p>
              ) : topServices.map((service) => (
                <div key={service.serviceId} className="rounded-2xl border border-neutral-200/70 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${serviceColor(service.serviceId)} text-white`}>
                      <Scissors size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{service.name}</p>
                        <p className="text-[13.5px] font-semibold text-ink">{service.count}×</p>
                      </div>
                      <p className="mt-0.5 text-[12px] text-ink-muted">
                        {service.count === maxServiceCount ? 'Serviço líder do mês' : 'Continua a puxar ocupação'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-1.5 rounded-full bg-gradient-to-r ${serviceColor(service.serviceId)}`}
                      style={{ width: `${(service.count / maxServiceCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </AdminLayout>
  )
}
