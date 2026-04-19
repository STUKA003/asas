import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, endOfMonth, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
  AlertTriangle,
  Award,
  BadgePercent,
  Calendar,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  Package,
  Scissors,
  Sparkles,
  TrendingUp,
  UserMinus,
  Users,
  Wallet,
} from 'lucide-react'
import { barbershopApi, bookingsApi, plansReportApi } from '@/lib/api'
import type { Barbershop } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { PLAN_REPORT_PERIODS, PlanReportPanel, type PlanReport } from '@/components/admin/PlanReportPanel'
import { buildGeneralReportPdfHtml, buildPlanReportPdfHtml } from '@/components/admin/Reports.pdf'
import type { ReportData } from '@/components/admin/Reports.types'
import { CompactList, MetricCard, RankList } from '@/components/admin/Reports.widgets'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'

const now = new Date()
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: new Date(now.getFullYear(), index, 1).toLocaleDateString('pt-PT', { month: 'long' }),
}))
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => now.getFullYear() - 3 + index)
const PERIODS = [
  { label: 'Este mês', from: startOfMonth(now), to: endOfMonth(now) },
  { label: 'Mês passado', from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
  { label: 'Últimos 7 dias', from: subDays(now, 6), to: now },
  { label: 'Últimos 30 dias', from: subDays(now, 29), to: now },
  { label: 'Este ano', from: startOfYear(now), to: now },
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatMinutesToHours(value: number) {
  return `${(value / 60).toFixed(1)}h`
}

export default function Reports() {
  const [reportSection, setReportSection] = useState<'general' | 'plans'>('general')
  const [planPeriodIdx, setPlanPeriodIdx] = useState(0)
  const [filterMode, setFilterMode] = useState<'preset' | 'month'>('preset')
  const [periodIdx, setPeriodIdx] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const period = filterMode === 'preset'
    ? PERIODS[periodIdx]
    : {
        label: `${MONTH_OPTIONS[selectedMonth].label} de ${selectedYear}`,
        from: startOfMonth(new Date(selectedYear, selectedMonth, 1)),
        to: endOfMonth(new Date(selectedYear, selectedMonth, 1)),
      }

  const { data, isLoading, isError, error } = useQuery<ReportData>({
    queryKey: ['reports', filterMode, period.label, period.from.toISOString(), period.to.toISOString()],
    queryFn: () => bookingsApi.reports({
      from: period.from.toISOString(),
      to: period.to.toISOString(),
    }),
    retry: 1,
  })
  const { data: barbershop } = useQuery<Barbershop>({
    queryKey: ['barbershop'],
    queryFn: () => barbershopApi.get(),
    staleTime: 60_000,
  })
  const planPeriod = PLAN_REPORT_PERIODS[planPeriodIdx]
  const {
    data: planReport,
    isLoading: isPlanLoading,
    isError: isPlanError,
    error: planError,
  } = useQuery<PlanReport>({
    queryKey: ['plans-report', planPeriod.from.toISOString(), planPeriod.to.toISOString()],
    queryFn: () => plansReportApi.get({
      from: planPeriod.from.toISOString(),
      to: planPeriod.to.toISOString(),
    }),
    retry: 1,
    enabled: reportSection === 'plans',
  })

  function handleExportPdf() {
    const sourcePeriod = reportSection === 'plans'
      ? planReport ? `${format(new Date(planReport.period.from), "d MMM yyyy", { locale: pt })} - ${format(new Date(planReport.period.to), "d MMM yyyy", { locale: pt })}` : null
      : data ? `${format(new Date(data.period.from), "d MMM yyyy", { locale: pt })} - ${format(new Date(data.period.to), "d MMM yyyy", { locale: pt })}` : null
    const html = reportSection === 'plans'
      ? planReport && sourcePeriod ? buildPlanReportPdfHtml(planReport, sourcePeriod, barbershop) : null
      : data && sourcePeriod ? buildGeneralReportPdfHtml(data, sourcePeriod, barbershop) : null

    if (!html) return

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')
    if (!printWindow) return

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 60_000)
  }

  const headlineSeries = data?.billing.revenueByDay?.length
    ? data.billing.revenueByDay
    : data?.billing.revenueByWeek?.length
      ? data.billing.revenueByWeek
      : data?.billing.revenueByMonth ?? []

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Relatórios</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Analisa o desempenho da barbearia por período.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setReportSection('general')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              reportSection === 'general'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Relatório geral
          </button>
          <button
            type="button"
            onClick={() => setReportSection('plans')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              reportSection === 'plans'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            Relatório de planos
          </button>
        </div>

        {reportSection === 'plans' ? (
          <PlanReportPanel
            report={planReport}
            isLoading={isPlanLoading}
            isError={isPlanError}
            error={planError}
            periodIdx={planPeriodIdx}
            onPeriodChange={setPlanPeriodIdx}
            actions={
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!planReport}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Download size={16} />
                Descarregar PDF
              </button>
            }
          />
        ) : isLoading ? <PageLoader /> : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            Erro ao carregar relatório: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </div>
        ) : !data ? null : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Relatório geral</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <select
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value as 'preset' | 'month')}
                      className="cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="preset">Períodos rápidos</option>
                      <option value="month">Mês / ano</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>

                  {filterMode === 'preset' ? (
                    <div className="relative">
                      <select
                        value={periodIdx}
                        onChange={(e) => setPeriodIdx(Number(e.target.value))}
                        className="cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {PERIODS.map((item, idx) => (
                          <option key={item.label} value={idx}>{item.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-sm font-medium capitalize focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {MONTH_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      </div>

                      <div className="relative">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          {YEAR_OPTIONS.map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={!data}
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    <Download size={16} />
                    Descarregar PDF
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <p className="text-sm text-zinc-500">
                  {format(new Date(data.period.from), "d MMM", { locale: pt })} - {format(new Date(data.period.to), "d 'de' MMMM yyyy", { locale: pt })}
                </p>
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    {
                      label: 'Receita total',
                      value: formatCurrency(data.overview.totalRevenue),
                      icon: Wallet,
                      helper: `${formatCurrency(data.overview.planRevenue)} de planos`,
                      iconBg: 'bg-emerald-50 dark:bg-emerald-900/20',
                      iconColor: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      label: 'Ticket médio',
                      value: formatCurrency(data.overview.avgTicket),
                      icon: BadgePercent,
                      helper: `${data.overview.completedBookings} concluídos`,
                      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
                      iconColor: 'text-blue-600 dark:text-blue-400',
                    },
                    {
                      label: 'Agendamentos',
                      value: data.overview.totalBookings,
                      icon: Calendar,
                      helper: `${data.cancellations.cancelledBookings} cancelados`,
                      iconBg: 'bg-violet-50 dark:bg-violet-900/20',
                      iconColor: 'text-violet-600 dark:text-violet-400',
                    },
                    {
                      label: 'Perda de agenda',
                      value: formatPercent(data.cancellations.lossRate),
                      icon: AlertTriangle,
                      helper: `${data.cancellations.noShowBookings} faltas`,
                      iconBg: 'bg-red-50 dark:bg-red-900/20',
                      iconColor: 'text-red-600 dark:text-red-400',
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor}`}>
                        <item.icon size={18} />
                      </div>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{item.value}</p>
                      <p className="mt-0.5 text-xs font-medium text-zinc-500">{item.label}</p>
                      <p className="mt-1.5 text-xs text-zinc-400">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" /> 1. Faturação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Diária</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(data.billing.dailyRevenue)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Semanal</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(data.billing.weeklyRevenue)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Mensal</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(data.billing.monthlyRevenue)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Planos</p>
                    <p className="mt-2 text-2xl font-bold">{formatCurrency(data.overview.planRevenue)}</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                  <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Evolução no período</p>
                        <p className="text-xs text-zinc-400">Mostra a série disponível mais granular para o intervalo escolhido.</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                        {headlineSeries.length} pontos
                      </span>
                    </div>
                    <div className="space-y-3">
                      {headlineSeries.length === 0 ? (
                        <p className="py-6 text-center text-sm text-zinc-400">Sem faturação concluída neste período.</p>
                      ) : (
                        headlineSeries.slice(-6).map((item) => (
                          <div key={item.label}>
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <span className="text-sm text-zinc-600 dark:text-zinc-300">{item.label}</span>
                              <span className="text-sm font-semibold">{formatCurrency(item.revenue)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div
                                className="h-2 rounded-full bg-emerald-400"
                                style={{
                                  width: `${Math.max(6, (item.revenue / Math.max(...headlineSeries.map((entry) => entry.revenue), 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <RankList title="Serviços mais vendidos" icon={Scissors} items={data.topServices} accent="text-blue-500" empty="Sem serviços vendidos." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award size={16} className="text-amber-500" /> 2. Performance dos barbeiros
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {data.barbers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">Sem dados de barbeiros no período.</p>
                ) : (
                  <div className="space-y-3">
                    {data.barbers.map((barber, index) => (
                      <div key={barber.id} className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-semibold">{barber.name}</p>
                                <p className="text-xs text-zinc-400">{barber.bookings} cortes concluídos</p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-right sm:grid-cols-4">
                            <div>
                              <p className="text-xs text-zinc-400">Faturação</p>
                              <p className="font-semibold text-emerald-600">{formatCurrency(barber.revenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400">Ticket</p>
                              <p className="font-semibold">{formatCurrency(barber.avgTicket)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400">Ocupação</p>
                              <p className="font-semibold">{formatPercent(barber.occupancyRate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400">Planos</p>
                              <p className="font-semibold">{barber.planCustomersCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/60">
                            <p className="text-xs text-zinc-400">Tempo ocupado</p>
                            <p className="mt-1 text-sm font-semibold">{formatMinutesToHours(barber.occupiedMinutes)} / {formatMinutesToHours(barber.availableMinutes)}</p>
                          </div>
                          <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">
                            <p className="text-xs text-amber-700 dark:text-amber-300">Extras</p>
                            <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">{barber.extrasCount} vendidos · {formatCurrency(barber.extrasRevenue)}</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
                            <p className="text-xs text-emerald-700 dark:text-emerald-300">Produtos</p>
                            <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{barber.productsCount} vendidos · {formatCurrency(barber.productsRevenue)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 size={16} className="text-blue-500" /> 3. Ocupação da agenda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Ocupação</p>
                    <p className="mt-2 text-2xl font-bold">{formatPercent(data.occupancy.occupancyRate)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Horas ocupadas</p>
                    <p className="mt-2 text-2xl font-bold">{formatMinutesToHours(data.occupancy.totalOccupiedMinutes)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Horas mortas</p>
                    <p className="mt-2 text-2xl font-bold">{formatMinutesToHours(data.occupancy.deadMinutes)}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Capacidade</p>
                    <p className="mt-2 text-2xl font-bold">{formatMinutesToHours(data.occupancy.totalAvailableMinutes)}</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <p className="mb-4 text-sm font-semibold">Dias com mais movimento</p>
                    <div className="space-y-3">
                      {data.occupancy.busiestDays.length === 0 ? (
                        <p className="py-6 text-center text-sm text-zinc-400">Sem dados de agenda.</p>
                      ) : (
                        data.occupancy.busiestDays.map((day) => (
                          <div key={day.day} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900/60">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{day.label}</p>
                                <p className="text-xs text-zinc-400">{day.bookings} marcações</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">{formatPercent(day.occupancyRate)}</p>
                                <p className="text-xs text-zinc-400">{formatCurrency(day.revenue)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <p className="mb-4 text-sm font-semibold">Leitura diária</p>
                    <div className="space-y-3">
                      {data.occupancy.dailyAgenda.slice(-5).map((day) => (
                        <div key={day.day}>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="text-sm">{day.label}</span>
                            <span className="text-xs text-zinc-500">{formatPercent(day.occupancyRate)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div className="h-2 rounded-full bg-blue-400" style={{ width: `${Math.max(6, day.occupancyRate)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={16} className="text-violet-500" /> 4. Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Novos</p>
                      <p className="mt-2 text-2xl font-bold">{data.customers.newCustomers}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Recorrentes</p>
                      <p className="mt-2 text-2xl font-bold">{data.customers.recurringCustomers}</p>
                    </div>
                  </div>
                  <CompactList
                    title="Clientes mais frequentes"
                    items={data.customers.topCustomers}
                    empty="Sem frequência relevante neste período."
                    renderRight={(item) => `${item.periodVisits ?? 0} visitas`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package size={16} className="text-emerald-500" /> 5. Serviços e produtos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Receita de serviços</p>
                      <p className="mt-2 text-2xl font-bold">{formatCurrency(data.sales.servicesRevenue)}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Produtos vendidos</p>
                      <p className="mt-2 text-2xl font-bold">{data.sales.productsSold}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <p className="mb-3 text-sm font-semibold">Mix de vendas</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Serviços', value: data.sales.salesMix.services, color: 'bg-blue-400' },
                        { label: 'Extras', value: data.sales.salesMix.extras, color: 'bg-amber-400' },
                        { label: 'Produtos', value: data.sales.salesMix.products, color: 'bg-emerald-400' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span>{item.label}</span>
                            <span>{formatPercent(item.value)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.max(4, item.value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <RankList title="Produtos" icon={Package} items={data.topProducts} accent="text-emerald-500" empty="Sem produtos vendidos." />
                    <RankList title="Extras" icon={Sparkles} items={data.topExtras} accent="text-amber-500" empty="Sem extras vendidos." />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserMinus size={16} className="text-red-500" /> 6. Cancelamentos e faltas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-red-50 p-4 dark:bg-red-900/20">
                      <p className="text-xs uppercase tracking-wide text-red-700 dark:text-red-300">Cancelamentos</p>
                      <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-300">{data.cancellations.cancelledBookings}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-900/20">
                      <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">No-shows</p>
                      <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">{data.cancellations.noShowBookings}</p>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">Perda</p>
                      <p className="mt-2 text-2xl font-bold">{formatPercent(data.cancellations.lossRate)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <div className="space-y-3">
                      {[
                        { label: 'Taxa de cancelamento', value: data.cancellations.cancellationRate, color: 'bg-red-400' },
                        { label: 'Taxa de falta', value: data.cancellations.noShowRate, color: 'bg-amber-400' },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span>{item.label}</span>
                            <span>{formatPercent(item.value)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.max(4, item.value)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <CompactList
                  title="Clientes inativos"
                  items={data.customers.inactiveCustomers}
                  empty="Nenhum cliente inativo detetado."
                  renderRight={(item) => item.lastBookingAt ? format(new Date(item.lastBookingAt), "d MMM yyyy", { locale: pt }) : '—'}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles size={16} className="text-violet-500" /> 7. Insights automáticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {data.insights.length === 0 ? (
                      <p className="py-6 text-center text-sm text-zinc-400">Ainda não há insights suficientes neste período.</p>
                    ) : (
                      data.insights.map((insight, index) => (
                        <div
                          key={`${insight.title}-${index}`}
                          className={`rounded-2xl border px-4 py-4 ${
                            insight.tone === 'warning'
                              ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                              : insight.tone === 'positive'
                                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                                : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60'
                          }`}
                        >
                          <p className="text-sm font-semibold">{insight.title}</p>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{insight.description}</p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard label="Clientes com plano" value={data.overview.planBookingsCount} icon={CreditCard} tone="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" helper={`${formatCurrency(data.overview.planRevenue)} faturados`} />
              <MetricCard label="Clientes ativos no período" value={data.customers.activeCustomers} icon={Users} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300" />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
