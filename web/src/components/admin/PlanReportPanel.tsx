import { useRef, type WheelEvent as ReactWheelEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { endOfMonth, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns'
import { getDateFnsLocale } from '@/i18n/dateFnsLocale'
import { Activity, CreditCard, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Spinner'
import { formatCurrency, redirectVerticalWheelToParent } from '@/lib/utils'

export interface PlanReport {
  period: { from: string; to: string }
  overview: {
    totalPlans: number
    activePlans: number
    totalSubscribers: number
    totalEstimatedRecurringRevenue: number
    totalBookingsUsed: number
    inactiveSubscribers: number
    averageUsagePerSubscriber: number
  }
  plans: Array<{
    id: string
    name: string
    price: number
    intervalDays: number
    subscribers: number
    activeCustomers: number
    inactiveSubscribers: number
    bookingsUsed: number
    usagePerSubscriber: number
    estimatedRecurringRevenue: number
    revenueFromBookings: number
    allowedServicesCount: number
    active: boolean
  }>
  insights: string[]
}

const now = new Date()
export const PLAN_REPORT_PERIODS = [
  { labelKey: 'reports.planReport.periods.thisMonth', from: startOfMonth(now), to: endOfMonth(now) },
  { labelKey: 'reports.planReport.periods.lastMonth', from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
  { labelKey: 'reports.planReport.periods.last30Days', from: subDays(now, 29), to: now },
  { labelKey: 'reports.planReport.periods.thisYear', from: startOfYear(now), to: now },
]

interface PlanReportPanelProps {
  report?: PlanReport
  isLoading?: boolean
  isError?: boolean
  error?: unknown
  periodIdx: number
  onPeriodChange: (value: number) => void
  actions?: React.ReactNode
}

export function PlanReportPanel({
  report,
  isLoading = false,
  isError = false,
  error,
  periodIdx,
  onPeriodChange,
  actions,
}: PlanReportPanelProps) {
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const { t, i18n } = useTranslation('admin')
  const dateFnsLocale = getDateFnsLocale(i18n.language)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <PageLoader />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {t('reports.planReport.loadError')}: {error instanceof Error ? error.message : t('reports.planReport.unknownError')}
          </div>
        </CardContent>
      </Card>
    )
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    redirectVerticalWheelToParent(event, tableScrollRef.current)
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-zinc-400">{t('reports.planReport.noData')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('reports.planReport.title')}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodIdx}
            onChange={(e) => onPeriodChange(Number(e.target.value))}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PLAN_REPORT_PERIODS.map((item, idx) => (
              <option key={item.labelKey} value={idx}>{t(item.labelKey)}</option>
            ))}
          </select>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <p className="text-sm text-zinc-500">
          {format(new Date(report.period.from), 'PP', { locale: dateFnsLocale })} - {format(new Date(report.period.to), 'PP', { locale: dateFnsLocale })}
        </p>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: t('reports.planReport.metrics.activeSubscribers'), value: report.overview.totalSubscribers, icon: Users, helper: t('reports.planReport.metrics.inactiveSubscribers', { count: report.overview.inactiveSubscribers }) },
            { label: t('reports.planReport.metrics.estimatedRevenue'), value: formatCurrency(report.overview.totalEstimatedRecurringRevenue), icon: TrendingUp, helper: t('reports.planReport.metrics.registeredPlans', { count: report.overview.totalPlans }) },
            { label: t('reports.planReport.metrics.periodUsage'), value: report.overview.totalBookingsUsed, icon: Activity, helper: t('reports.planReport.metrics.usagePerSubscriber', { count: report.overview.averageUsagePerSubscriber.toFixed(1) }) },
            { label: t('reports.planReport.metrics.activePlans'), value: report.overview.activePlans, icon: CreditCard, helper: t('reports.planReport.metrics.enabledPlansOnly') },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
                <item.icon size={18} />
              </div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.label}</p>
              <p className="mt-2 text-xs text-zinc-400">{item.helper}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <p className="font-semibold">{t('reports.planReport.performanceByPlan')}</p>
            </div>
            <div ref={tableScrollRef} onWheel={handleWheel} className="overflow-x-auto px-4 py-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="py-3 text-left text-xs uppercase tracking-wide text-zinc-400">{t('reports.planReport.table.plan')}</th>
                    <th className="py-3 text-right text-xs uppercase tracking-wide text-zinc-400">{t('reports.planReport.table.subscribers')}</th>
                    <th className="py-3 text-right text-xs uppercase tracking-wide text-zinc-400">{t('reports.planReport.table.usage')}</th>
                    <th className="py-3 text-right text-xs uppercase tracking-wide text-zinc-400">{t('reports.planReport.table.recurring')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-zinc-50 dark:border-zinc-800/60">
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-xs text-zinc-400">{t('reports.planReport.table.planMeta', { services: plan.allowedServicesCount, days: plan.intervalDays })}</p>
                        </div>
                      </td>
                      <td className="py-3 text-right">{plan.subscribers}</td>
                      <td className="py-3 text-right">{plan.bookingsUsed}</td>
                      <td className="py-3 text-right font-semibold text-emerald-600">{formatCurrency(plan.estimatedRecurringRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.planReport.insights')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {report.insights.length === 0 ? (
                  <p className="text-sm text-zinc-400">{t('reports.planReport.noInsights')}</p>
                ) : (
                  report.insights.map((insight) => (
                    <div key={insight} className="rounded-xl bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-800/50">
                      {insight}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.planReport.opportunities')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {report.plans.slice(0, 4).map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{plan.name}</p>
                      <span className="text-xs text-zinc-400">{t('reports.planReport.usagePerCustomer', { count: plan.usagePerSubscriber.toFixed(1) })}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{t('reports.planReport.inactiveSubscribersPeriod', { count: plan.inactiveSubscribers })}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
