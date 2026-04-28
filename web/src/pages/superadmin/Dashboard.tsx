import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Building2, Calendar, TrendingUp, Users } from 'lucide-react'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'
import { superadminApi } from '@/lib/api'
import { useSuperAuthStore } from '@/store/superauth'

const PLAN_COLORS: Record<string, { badge: string; bar: string }> = {
  FREE:  { badge: 'bg-white/[0.06] text-white/40', bar: 'bg-white/25'  },
  BASIC: { badge: 'bg-blue-500/15  text-blue-300',  bar: 'bg-blue-400'  },
  PRO:   { badge: 'bg-amber-500/15 text-amber-300', bar: 'bg-amber-400' },
}

export default function SuperAdminDashboard() {
  const { token } = useSuperAuthStore()
  const { t } = useTranslation(['superadmin', 'common'])

  const { data } = useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn:  () => superadminApi.stats(token!),
    enabled:  !!token,
  })

  const total           = data?.totalBarbershops  ?? 0
  const totalBookings   = data?.totalBookings     ?? 0
  const totalCustomers  = data?.totalCustomers    ?? 0
  const thisMonth       = data?.bookingsThisMonth ?? 0
  const paidShops       = data?.planCounts
    ?.filter((i: { plan: string }) => i.plan !== 'FREE')
    .reduce((s: number, i: { count: number }) => s + i.count, 0) ?? 0
  const proShops        = data?.planCounts?.find((i: { plan: string }) => i.plan === 'PRO')?.count ?? 0
  const adoptionRate    = total > 0 ? Math.round((paidShops / total) * 100) : 0
  const avgBookings     = total > 0 ? (totalBookings / total).toFixed(1) : '0'

  const PLAN_LABELS: Record<string, string> = {
    FREE: t('common:plan.FREE'), BASIC: t('common:plan.BASIC'), PRO: t('common:plan.PRO'),
  }

  const stats = [
    { label: t('barbershops.title'), value: total, sub: t('dashboard.stats.paidShops', { count: paidShops }), icon: Building2, accent: 'text-blue-300' },
    { label: t('admin:layout.nav.bookings', { ns: 'admin' }), value: totalBookings, sub: t('dashboard.stats.thisMonth', { count: thisMonth }), icon: Calendar, accent: 'text-emerald-300' },
    { label: t('admin:layout.nav.customers', { ns: 'admin' }), value: totalCustomers, sub: t('dashboard.stats.avgPerShop', { value: avgBookings }), icon: Users, accent: 'text-violet-300' },
    { label: t('dashboard.stats.adoption'), value: `${adoptionRate}%`, sub: t('dashboard.stats.proShops', { count: proShops }), icon: TrendingUp, accent: 'text-amber-300' },
  ]

  return (
    <SuperAdminLayout>
      <div className="space-y-4">

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-[12px] font-medium text-white/40">{s.label}</p>
                <s.icon size={15} className={s.accent} />
              </div>
              <p className="text-[2rem] font-semibold tracking-tight text-white leading-none">{s.value}</p>
              <p className="mt-2 text-[12px] text-white/30">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-semibold text-white">{t('barbershops.title')} — {t('common:plan.FREE')} / {t('common:plan.BASIC')} / {t('common:plan.PRO')}</h2>
              <p className="text-[12px] text-white/30">{paidShops} / {total}</p>
            </div>
            <div className="space-y-3">
              {data?.planCounts?.map((plan: { plan: string; count: number }) => {
                const pct = total > 0 ? (plan.count / total) * 100 : 0
                const colors = PLAN_COLORS[plan.plan] ?? PLAN_COLORS.FREE
                return (
                  <div key={plan.plan}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${colors.badge}`}>
                          {PLAN_LABELS[plan.plan] ?? plan.plan}
                        </span>
                        <span className="text-[12px] text-white/35">{plan.count}</span>
                      </div>
                      <span className="text-[12px] text-white/50">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className={`h-full rounded-full transition-all duration-700 ${colors.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-6">
            <h2 className="text-[14px] font-semibold text-white mb-5">{t('dashboard.metrics.title')}</h2>
            <div className="space-y-4">
              {[
                { label: t('dashboard.metrics.bookingsThisMonth'), value: thisMonth },
                { label: t('dashboard.metrics.avgPerShop'), value: avgBookings },
                { label: t('dashboard.metrics.proShops'), value: proShops },
                { label: t('dashboard.metrics.paidAdoption'), value: `${adoptionRate}%` },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <p className="text-[12.5px] text-white/40">{m.label}</p>
                  <p className="text-[14px] font-semibold text-white">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </SuperAdminLayout>
  )
}
